"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSessionClient,
  getStaffMember,
  hasRole,
  logAdminAction,
} from "@/lib/supabase/auth";

/**
 * Actions de l'administration.
 *
 * Chacune revérifie le rôle de la personne connectée. Le garde du layout
 * protège l'AFFICHAGE des pages ; il ne protège pas les actions, qui sont
 * appelables directement. Sans ce contrôle, connaître l'identifiant d'une
 * commande suffirait à la faire passer en « payée ».
 */

export type SignInState = { status: "idle" | "error"; message?: string };

const credentials = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
});

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Adresse ou mot de passe invalide." };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Message volontairement identique pour un compte inexistant et un mot de
    // passe erroné : distinguer les deux révélerait quelles adresses existent.
    return { status: "error", message: "Adresse ou mot de passe invalide." };
  }

  const member = await getStaffMember();
  if (!member) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "Ce compte n'a pas accès à l'administration.",
    };
  }

  redirect("/admin");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/connexion");
}

/* -------------------------------------------------------------------------- */
/* Commandes                                                                   */
/* -------------------------------------------------------------------------- */

const orderIdSchema = z.object({ orderId: z.uuid() });

/**
 * Valide un virement Interac reçu.
 *
 * C'est l'action la plus lourde de conséquence de tout l'espace : elle
 * déclare qu'un paiement a été encaissé. Elle est donc réservée aux rôles
 * `super_admin` et `manager`, et journalisée avec l'identité de son auteur.
 */
export async function confirmInteracPaymentAction(formData: FormData): Promise<void> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) return;

  const parsed = orderIdSchema.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) return;

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("orders")
    .select("id, order_number, total_cents, payment_status")
    .eq("id", parsed.data.orderId)
    .limit(1);

  const order = existing?.[0];
  if (!order || order.payment_status === "paid") return;

  await supabase.from("payments").insert({
    order_id: order.id,
    provider: "interac",
    payment_type: "full",
    amount_cents: order.total_cents,
    status: "paid",
    confirmed_by: member.userId,
    confirmed_at: new Date().toISOString(),
  });

  await supabase
    .from("orders")
    .update({ payment_status: "paid", status: "confirmed" })
    .eq("id", order.id);

  await logAdminAction(member.userId, "interac.confirm", "orders", order.id, {
    order_number: order.order_number,
    amount_cents: order.total_cents,
  });

  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${order.order_number}`);
}

const statusSchema = z.object({
  orderId: z.uuid(),
  status: z.enum([
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "out_for_delivery",
    "delivered",
    "completed",
    "cancelled",
  ]),
});

export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager", "picker", "driver")) return;

  const parsed = statusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.orderId)
    .select("order_number");

  await logAdminAction(member.userId, "order.status", "orders", parsed.data.orderId, {
    to: parsed.data.status,
  });

  revalidatePath("/admin/commandes");
  if (data?.[0]) revalidatePath(`/admin/commandes/${data[0].order_number}`);
}

/* -------------------------------------------------------------------------- */
/* Prix et publication                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Convertit un montant saisi en dollars vers des cents entiers.
 * Accepte la virgule comme la point décimal ; une chaîne vide vaut « non
 * renseigné » et non zéro — la distinction compte pour un prix barré.
 */
function parseAmount(value: FormDataEntryValue | null): number | null | undefined {
  if (value === null) return undefined;
  const text = String(value).trim().replace(",", ".");
  if (text === "") return null;
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

export type PricingState = { status: "idle" | "saved" | "error"; message?: string };

/**
 * Enregistre les prix d'un produit, format par format.
 *
 * Dès qu'un prix de détail est saisi, `price_is_provisional` retombe à faux :
 * la valeur cesse d'être une donnée de démonstration. C'est ce drapeau qui
 * conditionne l'ouverture réelle de la boutique.
 */
export async function saveProductPricesAction(
  _previous: PricingState,
  formData: FormData,
): Promise<PricingState> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) {
    return { status: "error", message: "Vous n'avez pas les droits nécessaires." };
  }

  const productId = formData.get("productId");
  if (typeof productId !== "string" || !z.uuid().safeParse(productId).success) {
    return { status: "error", message: "Produit inconnu." };
  }

  const supabase = createAdminClient();
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, sku")
    .eq("product_id", productId);

  const changes: Array<Record<string, unknown>> = [];

  for (const row of (variants ?? []) as Array<{ id: string; sku: string }>) {
    const retail = parseAmount(formData.get(`retail-${row.id}`));
    const compareAt = parseAmount(formData.get(`compare-${row.id}`));
    const wholesale = parseAmount(formData.get(`wholesale-${row.id}`));

    if (retail === undefined || retail === null) {
      return {
        status: "error",
        message: `Prix de détail manquant ou invalide pour ${row.sku}.`,
      };
    }
    if (compareAt === undefined || wholesale === undefined) {
      return { status: "error", message: `Montant invalide pour ${row.sku}.` };
    }
    if (compareAt !== null && compareAt <= retail) {
      return {
        status: "error",
        message: `Le prix barré de ${row.sku} doit être supérieur au prix de vente : sinon la réduction affichée serait fausse.`,
      };
    }

    changes.push({
      id: row.id,
      retail_price_cents: retail,
      compare_at_price_cents: compareAt,
      wholesale_price_cents: wholesale,
      // Un prix saisi à la main n'est plus une valeur de démonstration.
      price_is_provisional: false,
    });
  }

  for (const change of changes) {
    const { id, ...fields } = change;
    await supabase.from("product_variants").update(fields).eq("id", id as string);
  }

  await logAdminAction(member.userId, "product.prices", "products", productId, {
    variants: changes.length,
  });

  revalidatePath("/admin/produits");
  revalidatePath(`/admin/produits`, "layout");
  return { status: "saved" };
}

export async function togglePublishAction(formData: FormData): Promise<void> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) return;

  const productId = formData.get("productId");
  const publish = formData.get("publish") === "1";
  if (typeof productId !== "string") return;

  const supabase = createAdminClient();
  // Le déclencheur en base refuse de publier un produit dont une variante
  // active attend son prix, sauf si le mode démonstration est actif.
  const { error } = await supabase
    .from("products")
    .update({ published_at: publish ? new Date().toISOString() : null })
    .eq("id", productId);

  if (!error) {
    await logAdminAction(
      member.userId,
      publish ? "product.publish" : "product.unpublish",
      "products",
      productId,
    );
  }

  revalidatePath("/admin/produits");
}

/**
 * Sort la boutique du mode « prix de démonstration ».
 *
 * Refusé tant qu'un format actif porte encore un prix provisoire : basculer
 * dans cet état publierait des montants inventés comme s'ils étaient réels.
 */
export async function disableProvisionalPricesAction(): Promise<void> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin")) return;

  const supabase = createAdminClient();
  const { data: remaining } = await supabase
    .from("product_variants")
    .select("id")
    .eq("price_is_provisional", true)
    .eq("is_active", true);

  if ((remaining ?? []).length > 0) return;

  await supabase
    .from("site_settings")
    .update({ allow_provisional_prices: false })
    .eq("id", true);

  await logAdminAction(member.userId, "settings.disable_provisional_prices", "site_settings", null);

  revalidatePath("/admin/produits");
  revalidatePath("/", "layout");
}
