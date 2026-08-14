"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { queueEmail } from "@/lib/resend";
import { newsletterSchema } from "@/lib/validation/newsletter";

/**
 * Le client n'affiche jamais un texte venu du serveur : l'action renvoie un
 * statut, le composant choisit le message dans la langue courante.
 */
export type NewsletterState = {
  status: "idle" | "invalid" | "accepted" | "error";
};

export async function subscribeToNewsletter(
  _previousState: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    locale: formData.get("locale") ?? "fr",
  });

  if (!parsed.success) {
    return { status: "invalid" };
  }

  const db = createAdminClient();
  const { email, locale } = parsed.data;

  // Vérifie si l'adresse est déjà inscrite
  const { data: existing } = await db
    .from("newsletter_subscribers")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    // Déjà inscrit, accepter silencieusement (évite les énumérations)
    return { status: "accepted" };
  }

  try {
    // Enregistre l'abonnement
    const { error: insertError } = await db.from("newsletter_subscribers").insert({
      email,
      locale,
    });

    if (insertError) {
      console.error("Erreur lors de l'inscription:", insertError);
      return { status: "error" };
    }

    // Le formulaire ne demande que l'adresse : on ne connaît donc aucun nom.
    // Le modèle sait saluer sans — « Bonjour, merci de vous être inscrit ».
    // Découper l'adresse pour en tirer un prénom donnerait « Bonjour
    // sadyfalilou1988 », ce qui est pire que pas de nom du tout.
    await queueEmail({
      type: "welcome",
      recipientEmail: email,
      locale,
      data: { recipientName: null },
    });

    return { status: "accepted" };
  } catch (err) {
    console.error("Erreur lors de la souscription:", err);
    return { status: "error" };
  }
}
