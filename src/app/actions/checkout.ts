"use server";

import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { getCartId } from "@/lib/cart/cart";
import {
  findShippingZone,
  findZone,
  getLogistics,
  placeOrder,
} from "@/lib/checkout/checkout";
import { isKnownRegion } from "@/lib/regions";
import { queueOrderPlacedEmails } from "@/lib/resend/order-emails";
import { getCurrentCustomer } from "@/lib/supabase/account";

/**
 * Passage de commande.
 *
 * Rien de ce qui touche à l'argent n'est accepté depuis le formulaire : ni
 * montant, ni frais de livraison, ni identifiant de zone. Le client choisit un
 * mode, un créneau et donne ses coordonnées ; le reste est déduit côté serveur,
 * puis calculé dans la transaction PostgreSQL.
 */

const schema = z.object({
  method: z.enum(["pickup", "local_delivery", "shipping"]),
  email: z.email().max(254),
  phone: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(2).max(120),
  slotId: z.uuid().optional().or(z.literal("")),
  pickupLocationId: z.uuid().optional().or(z.literal("")),
  line1: z.string().trim().max(160).optional(),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(10).optional(),
  // Destination d'expédition. Absentes pour un ramassage ou une livraison
  // locale, qui sont toujours au Québec.
  country: z.string().trim().length(2).optional(),
  province: z.string().trim().length(2).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type CheckoutState = {
  status: "idle" | "error";
  message?: string;
  field?: string;
};

export async function placeOrderAction(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { status: "error", message: "invalid", field: String(issue?.path?.[0] ?? "") };
  }

  const input = parsed.data;
  const cartId = await getCartId();
  if (!cartId) return { status: "error", message: "empty_cart" };

  const locale = (formData.get("locale") as string) === "en" ? "en" : "fr";
  const { zones, shippingZones } = await getLogistics();

  let zoneId: string | null = null;
  let address: Record<string, string> | null = null;

  if (input.method === "local_delivery") {
    if (!input.line1 || !input.city || !input.postalCode) {
      return { status: "error", message: "address_required" };
    }

    // La zone est déduite du code postal, jamais reçue du formulaire : sinon
    // il suffirait de désigner la zone la moins chère pour payer moins.
    const zone = findZone(zones, input.postalCode);
    if (!zone) return { status: "error", message: "outside_zones", field: "postalCode" };

    zoneId = zone.id;
    address = {
      fullName: input.fullName,
      line1: input.line1,
      ...(input.line2 ? { line2: input.line2 } : {}),
      city: input.city,
      postalCode: input.postalCode.toUpperCase(),
      province: "QC",
      country: "CA",
    };
  }

  if (input.method === "shipping") {
    if (!input.line1 || !input.city || !input.postalCode) {
      return { status: "error", message: "address_required" };
    }

    const country = (input.country ?? "CA").toUpperCase();
    const province = (input.province ?? "").toUpperCase();

    // La destination est vérifiée ici ET en base. Le refus de `place_order`
    // fait autorité ; celui-ci n'existe que pour rendre un message clair sur
    // le bon champ plutôt qu'une exception SQL traduite à la louche.
    if (!isKnownRegion(country, province)) {
      return { status: "error", message: "invalid", field: "province" };
    }
    if (!findShippingZone(shippingZones, country, province)) {
      return { status: "error", message: "outside_shipping", field: "country" };
    }

    address = {
      fullName: input.fullName,
      line1: input.line1,
      ...(input.line2 ? { line2: input.line2 } : {}),
      city: input.city,
      postalCode: input.postalCode.toUpperCase(),
      province,
      country,
    };
  }

  // Une commande passée en étant connecté est rattachée au compte : elle
  // apparaît alors dans l'historique. Sans session, elle reste consultable par
  // son jeton, comme avant.
  const customer = await getCurrentCustomer();

  const result = await placeOrder({
    cartId,
    userId: customer?.id ?? null,
    email: input.email,
    phone: input.phone ?? null,
    locale,
    method: input.method,
    pickupLocationId: input.pickupLocationId || null,
    zoneId,
    slotId: input.slotId || null,
    address,
    notes: input.notes ?? null,
  });

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  // Confirmation détaillée puis instructions Interac. Les articles et les
  // montants sont relus en base par cette fonction, jamais recopiés d'ici :
  // les seuls chiffres qui font foi sont ceux que la transaction a calculés.
  //
  // Le virement Interac est pour l'instant le seul moyen de paiement, y
  // compris pour un ramassage — Stripe est reporté en phase 2.
  await queueOrderPlacedEmails(result.orderNumber, input.fullName);

  redirect({
    href: `/commande/${result.orderNumber}`,
    locale,
  });

  // `redirect` interrompt l'exécution en levant une exception. Ce retour n'est
  // jamais atteint ; il satisfait seulement le typage.
  return { status: "idle" };
}
