"use server";

import { newsletterSchema } from "@/lib/validation/newsletter";

/**
 * Le client n'affiche jamais un texte venu du serveur : l'action renvoie un
 * statut, le composant choisit le message dans la langue courante.
 */
export type NewsletterState = {
  status: "idle" | "invalid" | "accepted";
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

  // La persistance arrive au lot 2, avec la table `newsletter_subscribers`
  // et l'envoi de confirmation via Resend. Tant qu'elle n'existe pas, on ne
  // prétend pas avoir enregistré l'inscription : le message le dit clairement.
  return { status: "accepted" };
}
