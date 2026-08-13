import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FulfillmentMethod, TemperatureClass } from "@/lib/types";

/**
 * Tunnel de commande.
 *
 * Le calcul du montant, la réservation du stock et la prise de créneau se font
 * dans la fonction PostgreSQL `place_order`, en une seule transaction. Ce
 * module ne fait que lui présenter des paramètres validés et interpréter sa
 * réponse : aucune règle de gestion n'est dupliquée ici.
 */

const GUEST_COOKIE = "ae_commandes";

export interface PickupLocation {
  id: string;
  name: string;
  instructions: string | null;
}

export interface DeliveryZone {
  id: string;
  name: string;
  postalPrefixes: string[];
  feeCents: number;
  freeThresholdCents: number | null;
  minOrderCents: number;
  allowedTemperatures: TemperatureClass[];
}

export interface Slot {
  id: string;
  method: FulfillmentMethod;
  zoneId: string | null;
  pickupLocationId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  remaining: number;
}

type Row = Record<string, unknown>;

export async function getLogistics(): Promise<{
  pickupLocations: PickupLocation[];
  zones: DeliveryZone[];
  slots: Slot[];
}> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [pickup, zones, slots] = await Promise.all([
    supabase.from("pickup_locations").select("*").eq("is_active", true).order("name"),
    supabase.from("delivery_zones").select("*").eq("is_active", true).order("position"),
    supabase
      .from("delivery_slots")
      .select("*")
      .eq("is_active", true)
      .gte("slot_date", today)
      .order("slot_date")
      .order("start_time"),
  ]);

  return {
    pickupLocations: ((pickup.data ?? []) as Row[]).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      instructions: (row.instructions_fr as string | null) ?? null,
    })),
    zones: ((zones.data ?? []) as Row[]).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      postalPrefixes: (row.postal_prefixes as string[]) ?? [],
      feeCents: row.fee_cents as number,
      freeThresholdCents: (row.free_shipping_threshold_cents as number | null) ?? null,
      minOrderCents: (row.min_order_cents as number) ?? 0,
      allowedTemperatures: (row.allowed_temperature_classes as TemperatureClass[]) ?? [],
    })),
    slots: ((slots.data ?? []) as Row[])
      // Un créneau complet ne doit pas être proposé.
      .filter((row) => ((row.remaining_capacity as number) ?? 0) > 0)
      .map((row) => ({
        id: row.id as string,
        method: row.method as FulfillmentMethod,
        zoneId: (row.zone_id as string | null) ?? null,
        pickupLocationId: (row.pickup_location_id as string | null) ?? null,
        date: row.slot_date as string,
        startTime: String(row.start_time).slice(0, 5),
        endTime: String(row.end_time).slice(0, 5),
        remaining: (row.remaining_capacity as number) ?? 0,
      })),
  };
}

/** Zone correspondant à un code postal, par ses trois premiers caractères. */
export function findZone(zones: DeliveryZone[], postalCode: string): DeliveryZone | null {
  const normalised = postalCode.replace(/\s+/g, "").toUpperCase();
  if (normalised.length < 3) return null;
  const prefix2 = normalised.slice(0, 2);
  const prefix3 = normalised.slice(0, 3);

  return (
    zones.find((zone) =>
      zone.postalPrefixes.some(
        (p) => p.toUpperCase() === prefix2 || p.toUpperCase() === prefix3,
      ),
    ) ?? null
  );
}

/* -------------------------------------------------------------------------- */
/* Création                                                                    */
/* -------------------------------------------------------------------------- */

export interface PlaceOrderInput {
  cartId: string;
  email: string;
  phone: string | null;
  locale: string;
  method: FulfillmentMethod;
  pickupLocationId: string | null;
  zoneId: string | null;
  slotId: string | null;
  address: Record<string, string> | null;
  notes: string | null;
}

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; totalCents: number }
  | { ok: false; message: string };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const supabase = createAdminClient();
  const guestToken = randomBytes(24).toString("base64url");

  const { data, error } = await supabase.rpc("place_order", {
    p_cart_id: input.cartId,
    p_email: input.email,
    p_phone: input.phone,
    p_locale: input.locale,
    p_method: input.method,
    p_pickup_location_id: input.pickupLocationId,
    p_zone_id: input.zoneId,
    p_slot_id: input.slotId,
    p_address: input.address,
    p_notes: input.notes,
    p_guest_token: guestToken,
  });

  if (error) {
    // Les messages de la fonction sont rédigés pour être lus par un client :
    // « Stock insuffisant : 10 demandé(s), 3 disponible(s) », « Créneau
    // complet »… On les transmet tels quels plutôt que de les remplacer par
    // un « une erreur est survenue » qui n'aiderait personne.
    return { ok: false, message: error.message };
  }

  const row = (Array.isArray(data) ? data[0] : data) as Row | undefined;
  if (!row) return { ok: false, message: "Commande non créée" };

  // Le jeton permet au client de consulter sa commande sans compte. Il est
  // rangé dans un cookie httpOnly ; on en conserve plusieurs, pour que
  // commander deux fois de suite ne fasse pas perdre la première.
  const store = await cookies();
  const known = store.get(GUEST_COOKIE)?.value.split(",").filter(Boolean) ?? [];
  store.set(GUEST_COOKIE, [...known.slice(-9), guestToken].join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });

  return {
    ok: true,
    orderNumber: row.order_number as string,
    totalCents: row.total_cents as number,
  };
}

/* -------------------------------------------------------------------------- */
/* Consultation                                                                */
/* -------------------------------------------------------------------------- */

export interface OrderSummary {
  orderNumber: string;
  email: string;
  status: string;
  paymentStatus: string;
  method: FulfillmentMethod;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  placedAt: string;
  slot: { date: string; startTime: string; endTime: string } | null;
  address: Record<string, string> | null;
  items: Array<{
    name: string;
    label: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
}

/**
 * Une commande n'est consultable que par le porteur de son jeton, rangé dans
 * un cookie httpOnly. Connaître le numéro de commande ne suffit pas : sans
 * cela, une numérotation lisible comme AE-2026-00042 laisserait deviner les
 * commandes voisines.
 */
export async function getOrderForCurrentVisitor(
  orderNumber: string,
): Promise<OrderSummary | null> {
  const store = await cookies();
  const tokens = store.get(GUEST_COOKIE)?.value.split(",").filter(Boolean) ?? [];
  if (tokens.length === 0) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select(
      `order_number, email, status, payment_status, fulfillment_method,
       subtotal_cents, delivery_fee_cents, total_cents, placed_at,
       delivery_address, guest_token,
       slot:delivery_slots(slot_date, start_time, end_time),
       items:order_items(product_name_snapshot, unit_label_snapshot, quantity,
                         unit_price_cents, line_total_cents)`,
    )
    .eq("order_number", orderNumber)
    .limit(1);

  const row = ((data ?? []) as Row[])[0];
  if (!row) return null;
  if (!tokens.includes(row.guest_token as string)) return null;

  const slot = row.slot as Row | null;

  return {
    orderNumber: row.order_number as string,
    email: row.email as string,
    status: row.status as string,
    paymentStatus: row.payment_status as string,
    method: row.fulfillment_method as FulfillmentMethod,
    subtotalCents: row.subtotal_cents as number,
    deliveryFeeCents: row.delivery_fee_cents as number,
    totalCents: row.total_cents as number,
    placedAt: row.placed_at as string,
    slot: slot
      ? {
          date: slot.slot_date as string,
          startTime: String(slot.start_time).slice(0, 5),
          endTime: String(slot.end_time).slice(0, 5),
        }
      : null,
    address: (row.delivery_address as Record<string, string> | null) ?? null,
    items: ((row.items as Row[] | null) ?? []).map((item) => ({
      name: item.product_name_snapshot as string,
      label: item.unit_label_snapshot as string,
      quantity: item.quantity as number,
      unitPriceCents: item.unit_price_cents as number,
      lineTotalCents: item.line_total_cents as number,
    })),
  };
}
