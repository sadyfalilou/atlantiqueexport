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
 * `confirmed` et `completed` n'y figurent pas : le premier est déjà couvert
 * par le courriel de paiement, le second est une écriture interne.
 *
 * `cancelled` non plus, mais pour une autre raison : une annulation n'a de
 * sens à annoncer que si l'on peut en donner le motif. Celle qui suit un
 * virement non reçu l'a — c'est `queueOrderExpiredEmail`. Une annulation
 * décidée à la main dans l'administration ne l'a pas, et un courriel qui dirait
 * seulement « annulée » inquiéterait sans rien expliquer.
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

/** Formate des cents en dollars canadiens, selon la langue du client. */
function money(cents: number, locale: "fr" | "en"): string {
  return new Intl.NumberFormat(locale === "en" ? "en-CA" : "fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

/**
 * Met en queue les deux courriels qui suivent une commande : la confirmation
 * détaillée, puis les instructions de virement Interac.
 *
 * Les articles et les montants sont **relus depuis `order_items`**, jamais
 * repris du panier ni du formulaire. Le panier est vidé par la transaction de
 * commande, et surtout les montants qui font foi sont ceux que PostgreSQL a
 * calculés — un récapitulatif qui ne correspondrait pas à la somme réclamée
 * serait pire que pas de récapitulatif du tout.
 */
export async function queueOrderPlacedEmails(
  orderNumber: string,
  fallbackName?: string | null,
): Promise<void> {
  try {
    const db = createAdminClient();

    const { data, error } = await db
      .from("orders")
      .select(
        `email, locale, fulfillment_method, delivery_address, placed_at,
         subtotal_cents, delivery_fee_cents, total_cents,
         items:order_items(product_name_snapshot, unit_label_snapshot, quantity,
                           unit_price_cents, line_total_cents)`,
      )
      .eq("order_number", orderNumber)
      .limit(1);

    const order = data?.[0];
    if (error || !order) {
      console.error("Courriels de commande : commande introuvable", orderNumber, error);
      return;
    }

    const locale = order.locale === "en" ? "en" : "fr";
    const address = order.delivery_address as { fullName?: string } | null;
    const recipientName = address?.fullName?.trim() || fallbackName?.trim() || null;
    const email = order.email as string;

    const rows = (order.items ?? []) as Array<{
      product_name_snapshot: string;
      unit_label_snapshot: string;
      quantity: number;
      unit_price_cents: number;
      line_total_cents: number;
    }>;

    const items = rows.map((row) => ({
      name: row.unit_label_snapshot
        ? `${row.product_name_snapshot} — ${row.unit_label_snapshot}`
        : row.product_name_snapshot,
      quantity: row.quantity,
      pricePerUnit: `${money(row.unit_price_cents, locale)} / ${locale === "en" ? "unit" : "unité"}`,
      total: money(row.line_total_cents, locale),
    }));

    const feeCents = order.delivery_fee_cents as number;

    await queueEmail({
      type: "order_confirmation",
      recipientEmail: email,
      recipientName: recipientName ?? undefined,
      locale,
      data: {
        recipientName,
        orderNumber,
        orderDate: new Date((order.placed_at as string) ?? Date.now()).toLocaleDateString(
          locale === "en" ? "en-CA" : "fr-CA",
          { day: "numeric", month: "long", year: "numeric" },
        ),
        items,
        subtotal: money(order.subtotal_cents as number, locale),
        // Zéro n'est pas « 0,00 $ » ici : c'est un ramassage ou la gratuité
        // acquise, et le dire vaut mieux que de laisser calculer.
        shippingFee: feeCents === 0 ? (locale === "en" ? "Free" : "Offerts") : money(feeCents, locale),
        total: money(order.total_cents as number, locale),
        fulfillmentMethod: order.fulfillment_method as string,
        fulfillmentDetails: "",
      },
    });

    await queueEmail({
      type: "interac_pending",
      recipientEmail: email,
      recipientName: recipientName ?? undefined,
      locale,
      data: {
        recipientName,
        orderNumber,
        totalAmount: money(order.total_cents as number, locale),
        // Laissée vide tant que l'adresse réelle n'est pas connue : le gabarit
        // dit alors de ne rien envoyer, plutôt que d'afficher une adresse
        // d'exemple vers laquelle quelqu'un virerait de l'argent.
        recipientEmail: process.env.INTERAC_RECIPIENT_EMAIL || "",
        securityAnswer: process.env.INTERAC_SECURITY_ANSWER || null,
      },
    });
  } catch (err) {
    console.error("Mise en queue des courriels de commande échouée :", err);
  }
}

/**
 * Met en queue le courriel d'une commande annulée faute de virement.
 *
 * Appelé après l'expiration, une fois le stock déjà rendu : si la mise en
 * queue échoue, la commande reste correctement annulée. L'inverse — annuler
 * sans prévenir — serait bien pire.
 */
export async function queueOrderExpiredEmail(
  orderId: string,
  hours: number,
): Promise<void> {
  try {
    const order = await loadOrder(orderId);
    if (!order) return;

    await queueEmail({
      type: "order_expired",
      recipientEmail: order.email,
      recipientName: order.recipientName ?? undefined,
      locale: order.locale,
      data: {
        recipientName: order.recipientName,
        orderNumber: order.orderNumber,
        hours,
      },
    });
  } catch (err) {
    console.error("Mise en queue du courriel d'annulation échouée :", err);
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
