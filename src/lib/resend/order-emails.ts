import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { queueEmail, type EmailType } from "./index";

/**
 * Courriels déclenchés par l'avancement d'une commande.
 *
 * Le tunnel de commande met déjà en queue la confirmation et les instructions
 * Interac. Tout ce qui suit se décide dans l'administration : le virement est
 * encaissé, la commande est préparée, prête, en route, livrée. Sans ces
 * courriels, un client qui a viré son argent n'entend plus jamais parler de sa
 * commande.
 *
 * Deux règles tiennent tout le fichier :
 *
 * 1. **Un courriel ne fait jamais échouer une action d'administration.** Le
 *    virement est encaissé ou il ne l'est pas ; que Resend soit joignable n'a
 *    rien à y voir. Les erreurs sont donc journalisées, jamais propagées.
 * 2. **Les données sont relues en base**, jamais reçues du formulaire. Un
 *    formulaire falsifié ne doit pas pouvoir choisir le destinataire.
 */

/**
 * Statuts de commande qui méritent un courriel, et lequel.
 *
 * `confirmed`, `completed` et `cancelled` n'y figurent pas : le premier est
 * déjà couvert par le courriel de paiement, le deuxième est une écriture
 * interne, et le troisième n'a pas de modèle — annoncer une annulation sans
 * en donner le motif ni le remboursement ferait plus de mal que de bien.
 */
const STATUS_EMAILS = {
  preparing: "order_preparing",
  ready_for_pickup: "ready_for_pickup",
  out_for_delivery: "in_delivery",
  delivered: "order_delivered",
} as const satisfies Record<string, EmailType>;

export type NotifiableStatus = keyof typeof STATUS_EMAILS;

export function isNotifiableStatus(status: string): status is NotifiableStatus {
  return status in STATUS_EMAILS;
}

type OrderContext = {
  orderNumber: string;
  email: string;
  locale: "fr" | "en";
  recipientName: string | null;
  fulfillmentMethod: string;
  pickupLocationId: string | null;
  slotId: string | null;
};

/**
 * Relit la commande et en tire de quoi écrire un courriel.
 *
 * Le nom du client n'est pas garanti : `orders` ne le stocke que dans
 * `delivery_address`, absente d'une commande en ramassage. On tente ensuite le
 * profil, puis on renonce — les modèles savent saluer sans nom.
 */
async function loadOrder(orderId: string): Promise<OrderContext | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("orders")
    .select(
      "order_number, email, locale, fulfillment_method, delivery_address, user_id, pickup_location_id, slot_id",
    )
    .eq("id", orderId)
    .limit(1);

  const order = data?.[0];
  if (error || !order) {
    console.error("Courriel de commande : commande introuvable", orderId, error);
    return null;
  }

  const address = order.delivery_address as { fullName?: string } | null;
  let recipientName = address?.fullName?.trim() || null;

  if (!recipientName && order.user_id) {
    const { data: profile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", order.user_id)
      .limit(1);
    recipientName = (profile?.[0]?.full_name as string | null)?.trim() || null;
  }

  return {
    orderNumber: order.order_number as string,
    email: order.email as string,
    locale: order.locale === "en" ? "en" : "fr",
    recipientName,
    fulfillmentMethod: order.fulfillment_method as string,
    pickupLocationId: (order.pickup_location_id as string | null) ?? null,
    slotId: (order.slot_id as string | null) ?? null,
  };
}

/**
 * Compose le bloc « où et quand venir chercher sa commande ».
 *
 * Rien n'est inventé ici : si le point de ramassage porte encore son adresse
 * provisoire, c'est cette mention qui part, pas une adresse plausible.
 */
async function buildPickupDetails(order: OrderContext): Promise<string> {
  const db = createAdminClient();
  const lines: string[] = [];

  if (order.pickupLocationId) {
    const { data } = await db
      .from("pickup_locations")
      .select("name, address, opening_hours, instructions_fr, instructions_en")
      .eq("id", order.pickupLocationId)
      .limit(1);

    const place = data?.[0];
    if (place) {
      lines.push(place.name as string);

      const address = place.address as Record<string, string> | null;
      if (address) {
        const street = [address.line1, address.line2].filter(Boolean).join(", ");
        const city = [address.city, address.province].filter(Boolean).join(", ");
        if (street) lines.push(street);
        if (city) lines.push(city);
      }

      const hours = place.opening_hours as { note?: string } | null;
      if (hours?.note) lines.push(hours.note);

      const instructions =
        order.locale === "en" ? place.instructions_en : place.instructions_fr;
      if (instructions) lines.push("", instructions as string);
    }
  }

  if (order.slotId) {
    const { data } = await db
      .from("delivery_slots")
      .select("slot_date, start_time, end_time")
      .eq("id", order.slotId)
      .limit(1);

    const slot = data?.[0];
    if (slot) {
      const date = new Date(`${slot.slot_date}T00:00:00`).toLocaleDateString(
        order.locale === "en" ? "en-CA" : "fr-CA",
        { weekday: "long", day: "numeric", month: "long" },
      );
      const from = String(slot.start_time).slice(0, 5);
      const to = String(slot.end_time).slice(0, 5);
      const label = order.locale === "en" ? "Time slot" : "Créneau";
      lines.unshift(`${label} : ${date}, ${from} – ${to}`, "");
    }
  }

  if (lines.length === 0) {
    return order.locale === "en"
      ? "The pickup details will be sent to you shortly."
      : "Les détails du ramassage vous seront communiqués sous peu.";
  }

  return lines.join("\n");
}

/** Met en queue le courriel correspondant à un changement de statut. */
export async function queueOrderStatusEmail(
  orderId: string,
  status: NotifiableStatus,
): Promise<void> {
  try {
    const order = await loadOrder(orderId);
    if (!order) return;

    const type = STATUS_EMAILS[status];
    const data: Record<string, unknown> = {
      recipientName: order.recipientName,
      orderNumber: order.orderNumber,
    };

    if (type === "ready_for_pickup") {
      data.pickupDetails = await buildPickupDetails(order);
    }

    await queueEmail({
      type,
      recipientEmail: order.email,
      recipientName: order.recipientName ?? undefined,
      locale: order.locale,
      data,
    });
  } catch (err) {
    // Un courriel raté ne doit pas empêcher la commande d'avancer.
    console.error(`Mise en queue du courriel « ${status} » échouée :`, err);
  }
}

/** Met en queue le courriel qui accuse réception d'un paiement. */
export async function queuePaymentConfirmedEmail(orderId: string): Promise<void> {
  try {
    const order = await loadOrder(orderId);
    if (!order) return;

    await queueEmail({
      type: "payment_confirmed",
      recipientEmail: order.email,
      recipientName: order.recipientName ?? undefined,
      locale: order.locale,
      data: {
        recipientName: order.recipientName,
        orderNumber: order.orderNumber,
      },
    });
  } catch (err) {
    console.error("Mise en queue du courriel de paiement échouée :", err);
  }
}
