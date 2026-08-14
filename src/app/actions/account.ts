"use server";

import { revalidatePath } from "next/cache";
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

/* -------------------------------------------------------------------------- */
/* Profil                                                                      */
/* -------------------------------------------------------------------------- */

export type ProfileState = { status: "idle" | "saved" | "error"; message?: string };

/**
 * Enregistre le profil.
 *
 * L'écriture passe par la **session du client**, pas par la clé de service :
 * la politique `profiles_update_self` limite en base chaque personne à sa
 * propre ligne. Le serveur n'a donc aucun identifiant à filtrer, et aucun
 * moyen d'écrire dans le profil de quelqu'un d'autre.
 */
export async function saveProfileAction(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = z
    .object({
      fullName: z.string().trim().max(120).optional(),
      phone: z.string().trim().max(40).optional(),
      locale: z.enum(["fr", "en"]),
    })
    .safeParse({
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
      locale: formData.get("profileLocale"),
    });

  if (!parsed.success) {
    return { status: "error", message: "Coordonnées invalides." };
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Vous n'êtes plus connecté." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName || null,
      phone: parsed.data.phone || null,
      locale: parsed.data.locale,
      marketing_opt_in: formData.get("marketingOptIn") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Enregistrement du profil refusé :", error.message);
    return { status: "error", message: "L'enregistrement a échoué." };
  }

  revalidatePath("/", "layout");
  return { status: "saved" };
}

/* -------------------------------------------------------------------------- */
/* Adresses                                                                    */
/* -------------------------------------------------------------------------- */

const addressInput = z.object({
  id: z.uuid().optional().or(z.literal("")),
  label: z.string().trim().max(60).optional(),
  fullName: z.string().trim().min(2).max(120),
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2).max(80),
  province: z.string().trim().min(2).max(40),
  postalCode: z.string().trim().min(6).max(10),
  phone: z.string().trim().max(40).optional(),
});

export async function saveAddressAction(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = addressInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path?.[0] ?? "");
    return { status: "error", message: `Champ incomplet ou invalide : ${field}.` };
  }
  const input = parsed.data;

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Vous n'êtes plus connecté." };

  const isDefault = formData.get("isDefault") === "on";

  const values = {
    user_id: user.id,
    label: input.label || null,
    full_name: input.fullName,
    line1: input.line1,
    line2: input.line2 || null,
    city: input.city,
    province: input.province.toUpperCase(),
    // Le code postal est rangé en majuscules : la zone de livraison se déduit
    // de son préfixe, et « h2x » ne correspondrait à rien.
    postal_code: input.postalCode.toUpperCase(),
    phone: input.phone || null,
    is_default: isDefault,
    updated_at: new Date().toISOString(),
  };

  // Une seule adresse par défaut : on retire l'ancienne avant de poser la
  // nouvelle, sinon deux adresses se disputeraient la place au paiement.
  if (isDefault) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);
  }

  const { error } = input.id
    ? await supabase.from("addresses").update(values).eq("id", input.id)
    : await supabase.from("addresses").insert(values);

  if (error) {
    console.error("Enregistrement de l'adresse refusé :", error.message);
    return { status: "error", message: "L'enregistrement a échoué." };
  }

  revalidatePath("/", "layout");
  return { status: "saved" };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const id = formData.get("addressId");
  if (typeof id !== "string" || !z.uuid().safeParse(id).success) return;

  // La politique `addresses_own` refuse la suppression d'une adresse qui n'est
  // pas la sienne : inutile de le revérifier ici, la base s'en charge.
  const supabase = await createSessionClient();
  await supabase.from("addresses").delete().eq("id", id);

  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------------------- */
/* Compte professionnel                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Demande d'ouverture d'un compte professionnel.
 *
 * `business_accounts` n'accorde au client qu'un droit de LECTURE : personne ne
 * peut s'octroyer un tarif de gros en insérant sa propre ligne. La demande
 * passe donc par la clé de service, en statut `pending`, et c'est
 * l'administration qui tranche.
 */
export async function requestBusinessAccountAction(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = z
    .object({
      companyName: z.string().trim().min(2).max(200),
      businessNumber: z.string().trim().max(60).optional(),
      contactName: z.string().trim().max(120).optional(),
      contactPhone: z.string().trim().max(40).optional(),
      notes: z.string().trim().max(1000).optional(),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { status: "error", message: "Le nom de l'établissement est requis." };
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Vous n'êtes plus connecté." };

  const db = createAdminClient();
  const { error } = await db.from("business_accounts").upsert(
    {
      profile_id: user.id,
      company_name: parsed.data.companyName,
      business_number: parsed.data.businessNumber || null,
      contact_name: parsed.data.contactName || null,
      contact_email: user.email,
      contact_phone: parsed.data.contactPhone || null,
      notes: parsed.data.notes || null,
      // Jamais autre chose que « en attente » : le tarif de gros se décide
      // dans l'administration, pas dans un formulaire public.
      status: "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  );

  if (error) {
    console.error("Demande de compte professionnel refusée :", error.message);
    return { status: "error", message: "La demande n'a pas pu être enregistrée." };
  }

  revalidatePath("/", "layout");
  return { status: "saved" };
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
