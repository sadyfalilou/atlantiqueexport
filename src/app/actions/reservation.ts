"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCustomer } from "@/lib/supabase/account";
import { queueEmail } from "@/lib/resend";

/**
 * Réservation sur un arrivage.
 *
 * Le décompte et l'écriture se font dans `place_reservation`, en une seule
 * transaction : réserver puis écrire en deux appels laisserait, en cas
 * d'échec du second, de la marchandise bloquée pour une réservation
 * inexistante.
 *
 * La quantité disponible n'est pas revérifiée ici. Elle l'est en base, sous
 * verrou : deux personnes qui réservent la dernière caisse en même temps ne
 * peuvent pas passer toutes les deux, et une vérification préalable côté
 * serveur ne ferait qu'ajouter une illusion de sécurité.
 */

export type ReservationState = {
  status: "idle" | "saved" | "error";
  message?: string;
};

const input = z.object({
  itemId: z.uuid(),
  quantity: z.string().trim(),
  email: z.email().max(254),
  phone: z.string().trim().max(40).optional(),
  locale: z.enum(["fr", "en"]).optional(),
});

/** Messages de la base, traduits pour le client. */
function readable(message: string, locale: "fr" | "en"): string {
  if (/date limite/i.test(message)) {
    return locale === "fr"
      ? "Les réservations sont closes pour cet arrivage."
      : "Reservations are closed for this arrival.";
  }
  if (/insuffisante/i.test(message)) {
    return locale === "fr"
      ? "Il ne reste pas assez de quantité pour cette réservation."
      : "There is not enough left for this reservation.";
  }
  if (/pas ouvert/i.test(message)) {
    return locale === "fr"
      ? "Cet arrivage n'est pas ouvert aux réservations."
      : "This arrival is not open for reservations.";
  }
  return locale === "fr"
    ? "La réservation n'a pas abouti. Réessayez dans un moment."
    : "The reservation did not go through. Please try again shortly.";
}

export async function placeReservationAction(
  _previous: ReservationState,
  formData: FormData,
): Promise<ReservationState> {
  const parsed = input.safeParse(Object.fromEntries(formData));
  const locale = (formData.get("locale") === "en" ? "en" : "fr") as "fr" | "en";

  if (!parsed.success) {
    return {
      status: "error",
      message:
        locale === "fr"
          ? "Vérifiez votre adresse courriel et la quantité demandée."
          : "Check your email address and the requested quantity.",
    };
  }

  const quantity = Number.parseInt(parsed.data.quantity, 10);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {
      status: "error",
      message:
        locale === "fr" ? "Quantité invalide." : "Invalid quantity.",
    };
  }

  // Rattachée au compte si la personne est connectée, pour qu'elle retrouve
  // ses réservations. Réserver sans compte reste possible : l'adresse
  // courriel suffit, comme pour commander.
  const customer = await getCurrentCustomer();

  const db = createAdminClient();
  const { data, error } = await db.rpc("place_reservation", {
    p_shipment_item_id: parsed.data.itemId,
    p_quantity: quantity,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone || null,
    p_locale: locale,
    p_user_id: customer?.id ?? null,
  });

  if (error) {
    console.error("Réservation refusée :", error.message);
    return { status: "error", message: readable(error.message, locale) };
  }

  // Le courriel part APRÈS la transaction : mis en file avant, il annoncerait
  // une réservation qu'un échec aurait annulée. Son échec à lui ne doit pas
  // faire perdre la réservation, d'où le try.
  try {
    await queueEmail({
      type: "preorder_confirmation",
      recipientEmail: parsed.data.email,
      recipientName: customer?.fullName ?? undefined,
      locale,
      data: { recipientName: customer?.fullName ?? parsed.data.email },
    });
  } catch (err) {
    console.error("Courriel de précommande non mis en file :", err);
  }

  revalidatePath("/", "layout");

  const remaining = (data as Array<{ remaining: number }> | null)?.[0]?.remaining;
  return {
    status: "saved",
    message:
      locale === "fr"
        ? `Réservation enregistrée. Il reste ${remaining ?? 0} unité(s) sur cet arrivage.`
        : `Reservation confirmed. ${remaining ?? 0} unit(s) left on this arrival.`,
  };
}
