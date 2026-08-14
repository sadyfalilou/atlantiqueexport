"use server";

import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { createSessionClient } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCartId } from "@/lib/cart/cart";
import { queueEmail } from "@/lib/resend";

/**
 * Comptes clients.
 *
 * Trois principes gouvernent ce fichier.
 *
 * 1. **Aucun message ne révèle si une adresse est connue.** Ni à
 *    l'inscription, ni à la connexion, ni à la réinitialisation. Répondre
 *    « cette adresse n'existe pas » transformerait le formulaire en annuaire
 *    de la clientèle, exploitable par n'importe qui.
 * 2. **Commander sans compte reste possible.** Rien ici n'est obligatoire ;
 *    le compte apporte l'historique et les adresses enregistrées, pas le droit
 *    d'acheter.
 * 3. **Le courriel de réinitialisation part par Resend**, avec le gabarit de
 *    la marque, et non par le service intégré de Supabase — dont le débit est
 *    limité et l'expéditeur étranger au domaine.
 */

export type AccountState = {
  status: "idle" | "error" | "checkEmail" | "sent";
  message?: string;
};

const credentials = z.object({
  email: z.email().max(254),
  password: z.string().min(8, "Huit caractères au minimum.").max(200),
  locale: z.enum(["fr", "en"]).optional(),
});

/**
 * Rattache le panier de l'invité au compte qui vient de se connecter.
 *
 * Sans cela, quelqu'un qui remplit son panier puis se connecte pour payer le
 * verrait se vider sous ses yeux — le pire moment pour perdre une commande.
 */
async function attachCartToUser(userId: string) {
  const cartId = await getCartId();
  if (!cartId) return;

  const db = createAdminClient();
  await db.from("carts").update({ user_id: userId }).eq("id", cartId);
}

export async function signUpAction(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Adresse ou mot de passe invalide.",
    };
  }

  const locale = parsed.data.locale ?? "fr";
  const fullName = String(formData.get("fullName") ?? "").trim();

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Repris par le déclencheur qui crée le profil à l'inscription.
      data: { full_name: fullName || null, locale },
    },
  });

  if (error) {
    console.error("Inscription refusée :", error.message);
    return {
      status: "error",
      message: "L'inscription n'a pas abouti. Vérifiez l'adresse et réessayez.",
    };
  }

  // Sans session, Supabase attend une confirmation par courriel. On le dit,
  // plutôt que de laisser la personne croire qu'elle est connectée.
  if (!data.session) {
    return { status: "checkEmail" };
  }

  if (data.user) await attachCartToUser(data.user.id);
  redirect({ href: "/compte", locale });
  return { status: "idle" };
}

export async function signInAction(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Adresse ou mot de passe invalide." };
  }

  const locale = parsed.data.locale ?? "fr";
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    // Message identique pour un compte inexistant, un mot de passe erroné et
    // une adresse non confirmée : les distinguer révélerait quelles adresses
    // sont inscrites.
    return { status: "error", message: "Adresse ou mot de passe invalide." };
  }

  await attachCartToUser(data.user.id);
  redirect({ href: "/compte", locale });
  return { status: "idle" };
}

export async function signOutCustomerAction(formData: FormData): Promise<void> {
  const locale = formData.get("locale") === "en" ? "en" : "fr";
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect({ href: "/", locale });
}

/**
 * Demande de réinitialisation.
 *
 * Le lien est fabriqué côté serveur avec la clé de service, puis expédié par
 * Resend avec le gabarit de la marque. La réponse est **toujours la même**,
 * que l'adresse existe ou non.
 */
export async function requestPasswordResetAction(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const email = z.email().max(254).safeParse(formData.get("email"));
  const locale = formData.get("locale") === "en" ? "en" : "fr";

  if (!email.success) {
    return { status: "error", message: "Adresse courriel invalide." };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const db = createAdminClient();

  const { data, error } = await db.auth.admin.generateLink({
    type: "recovery",
    email: email.data,
    options: { redirectTo: `${site}/auth/callback?next=/${locale}/compte/mot-de-passe` },
  });

  if (error) {
    // Compte inconnu, le plus souvent. On journalise et on répond comme si
    // tout s'était bien passé.
    console.warn("Réinitialisation : lien non généré —", error.message);
    return { status: "sent" };
  }

  const link = data.properties?.action_link;
  if (link) {
    await queueEmail({
      type: "password_reset",
      recipientEmail: email.data,
      locale,
      data: { recipientName: null, resetLink: link, expiresIn: "60 minutes" },
    });
  }

  return { status: "sent" };
}

/** Pose le nouveau mot de passe, une fois le lien de réinitialisation suivi. */
export async function updatePasswordAction(
  _previous: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const password = z
    .string()
    .min(8, "Huit caractères au minimum.")
    .max(200)
    .safeParse(formData.get("password"));
  const locale = formData.get("locale") === "en" ? "en" : "fr";

  if (!password.success) {
    return { status: "error", message: password.error.issues[0]?.message };
  }

  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return {
      status: "error",
      message: "Ce lien a expiré. Demandez-en un nouveau.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) {
    return { status: "error", message: "Le mot de passe n'a pas pu être changé." };
  }

  redirect({ href: "/compte", locale });
  return { status: "idle" };
}
