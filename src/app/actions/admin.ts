"use server";

import { randomUUID } from "node:crypto";
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
import {
  isNotifiableStatus,
  queueOrderStatusEmail,
  queuePaymentConfirmedEmail,
} from "@/lib/resend/order-emails";

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

  // Le garde `payment_status === "paid"` plus haut interdit de rejouer cette
  // action : le client ne recevra donc pas deux fois le même accusé.
  await queuePaymentConfirmedEmail(order.id);

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

  // Lu avant l'écriture, pour le seul journal d'audit : savoir d'où l'on vient
  // vaut mieux que de savoir seulement où l'on va.
  const { data: previous } = await supabase
    .from("orders")
    .select("status")
    .eq("id", parsed.data.orderId)
    .limit(1);

  // Le `neq` fait tout le travail : PostgreSQL ne met à jour la ligne que si
  // elle n'est pas déjà dans ce statut, et ne renvoie donc rien au second
  // appel. Deux clics sur « en préparation », ou deux employés qui cliquent
  // en même temps, n'envoient qu'un seul courriel — ce qu'un contrôle en
  // JavaScript, lu puis écrit en deux temps, ne garantirait pas.
  const { data } = await supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.orderId)
    .neq("status", parsed.data.status)
    .select("order_number");

  const changed = data?.[0];
  if (!changed) return;

  await logAdminAction(member.userId, "order.status", "orders", parsed.data.orderId, {
    from: previous?.[0]?.status ?? null,
    to: parsed.data.status,
  });

  if (isNotifiableStatus(parsed.data.status)) {
    await queueOrderStatusEmail(parsed.data.orderId, parsed.data.status);
  }

  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${changed.order_number}`);
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

/* -------------------------------------------------------------------------- */
/* Création d'un produit                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Réduit un nom en identifiant d'URL : « Pulpe de madd congelée » devient
 * « pulpe-de-madd-congelee ». Les accents sont décomposés puis retirés, pour
 * qu'une URL reste lisible et tapable.
 */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    // Les accents deviennent des caractères combinants après NFD ; on les
    // retire par leur plage Unicode plutôt qu'en les collant dans le source,
    // où ils seraient invisibles à la relecture.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const newProduct = z.object({
  nameFr: z.string().trim().min(2).max(160),
  nameEn: z.string().trim().min(2).max(160),
  categoryId: z.uuid().optional().or(z.literal("")),
  brandId: z.uuid().optional().or(z.literal("")),
  originCountry: z.string().trim().max(80).optional(),
  temperatureClass: z.enum(["ambient", "fresh", "refrigerated", "frozen"]),
  descriptionFr: z.string().trim().max(4000).optional(),
  descriptionEn: z.string().trim().max(4000).optional(),
  // Le premier format est obligatoire : un produit sans variante n'a ni prix
  // ni stock, donc rien à vendre. Mieux vaut le refuser que créer une coquille.
  variantLabelFr: z.string().trim().min(1).max(120),
  variantLabelEn: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(2).max(60),
  netWeightG: z.string().trim().optional(),
});

export type NewProductState = { status: "idle" | "error"; message?: string };

export async function createProductAction(
  _previous: NewProductState,
  formData: FormData,
): Promise<NewProductState> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) {
    return { status: "error", message: "Vous n'avez pas les droits nécessaires." };
  }

  const parsed = newProduct.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path?.[0] ?? "");
    return { status: "error", message: `Champ incomplet ou invalide : ${field}.` };
  }
  const input = parsed.data;

  const price = parseAmount(formData.get("retailPrice"));
  if (price === undefined || price === null) {
    return { status: "error", message: "Indiquez un prix de vente pour le format." };
  }

  const weight = input.netWeightG ? Number.parseInt(input.netWeightG, 10) : null;
  if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) {
    return { status: "error", message: "Le poids net doit être un nombre de grammes." };
  }

  const supabase = createAdminClient();

  // Le slug doit être unique. Plutôt que d'échouer sur la contrainte, on
  // suffixe : « fonio », puis « fonio-2 », « fonio-3 ».
  const base = slugify(input.nameFr);
  if (!base) return { status: "error", message: "Le nom ne donne aucune adresse valide." };

  let slug = base;
  for (let attempt = 2; attempt <= 50; attempt += 1) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .limit(1);
    if (!data?.length) break;
    slug = `${base}-${attempt}`;
  }

  const { data: created, error: productError } = await supabase
    .from("products")
    .insert({
      slug,
      name_fr: input.nameFr,
      name_en: input.nameEn,
      description_fr: input.descriptionFr || null,
      description_en: input.descriptionEn || null,
      category_id: input.categoryId || null,
      brand_id: input.brandId || null,
      origin_country: input.originCountry || null,
      temperature_class: input.temperatureClass,
      // Jamais publié à la création : le produit n'a ni photo ni description
      // relue. C'est à vous de décider quand il paraît.
      published_at: null,
    })
    .select("id")
    .single();

  if (productError || !created) {
    console.error("Création du produit refusée :", productError);
    const duplicate = productError?.code === "23505";
    return {
      status: "error",
      message: duplicate
        ? "Un produit porte déjà cette adresse. Changez légèrement le nom."
        : "La création a échoué.",
    };
  }

  const { error: variantError } = await supabase.from("product_variants").insert({
    product_id: created.id,
    sku: input.sku,
    label_fr: input.variantLabelFr,
    label_en: input.variantLabelEn,
    net_weight_g: weight,
    retail_price_cents: price,
    // Le prix vient d'être saisi à la main : ce n'est pas une valeur de
    // démonstration, contrairement à celles importées du catalogue Sonagoo.
    price_is_provisional: false,
    position: 0,
  });

  if (variantError) {
    // Sans format, le produit est invendable. On défait plutôt que de laisser
    // une fiche à moitié créée dans le catalogue.
    await supabase.from("products").delete().eq("id", created.id);
    console.error("Création du format refusée :", variantError);
    return {
      status: "error",
      message:
        variantError.code === "23505"
          ? "Ce code SKU est déjà utilisé par un autre format."
          : "Le format n'a pas pu être créé, le produit a donc été annulé.",
    };
  }

  await logAdminAction(member.userId, "product.create", "products", created.id, {
    slug,
    sku: input.sku,
  });

  revalidatePath("/admin/produits");
  redirect(`/admin/produits/${slug}`);
}

/* -------------------------------------------------------------------------- */
/* Modification d'un produit                                                   */
/* -------------------------------------------------------------------------- */

const editProduct = z.object({
  productId: z.uuid(),
  slug: z.string().trim().min(1),
  nameFr: z.string().trim().min(2).max(160),
  nameEn: z.string().trim().min(2).max(160),
  shortDescriptionFr: z.string().trim().max(400).optional(),
  shortDescriptionEn: z.string().trim().max(400).optional(),
  descriptionFr: z.string().trim().max(4000).optional(),
  descriptionEn: z.string().trim().max(4000).optional(),
  storageFr: z.string().trim().max(400).optional(),
  storageEn: z.string().trim().max(400).optional(),
  categoryId: z.uuid().optional().or(z.literal("")),
  brandId: z.uuid().optional().or(z.literal("")),
  originCountry: z.string().trim().max(80).optional(),
  temperatureClass: z.enum(["ambient", "fresh", "refrigerated", "frozen"]),
  allergens: z.string().trim().max(400).optional(),
});

/**
 * Enregistre les informations d'un produit existant.
 *
 * **L'adresse (`slug`) n'est pas modifiable.** Elle est déjà indexée par les
 * moteurs de recherche, partagée dans des liens et peut-être imprimée quelque
 * part ; la changer transformerait chacun de ces liens en page introuvable.
 * Renommer un produit ne touche donc que ce qui s'affiche.
 */
export async function updateProductAction(
  _previous: PricingState,
  formData: FormData,
): Promise<PricingState> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) {
    return { status: "error", message: "Vous n'avez pas les droits nécessaires." };
  }

  const parsed = editProduct.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path?.[0] ?? "");
    return { status: "error", message: `Champ incomplet ou invalide : ${field}.` };
  }
  const input = parsed.data;

  // Saisis séparés par des virgules, rangés en tableau. Les doublons et les
  // entrées vides disparaissent : « gluten, , Gluten » donne un seul allergène.
  const allergens = Array.from(
    new Set(
      (input.allergens ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({
      name_fr: input.nameFr,
      name_en: input.nameEn,
      short_description_fr: input.shortDescriptionFr || null,
      short_description_en: input.shortDescriptionEn || null,
      description_fr: input.descriptionFr || null,
      description_en: input.descriptionEn || null,
      storage_fr: input.storageFr || null,
      storage_en: input.storageEn || null,
      category_id: input.categoryId || null,
      brand_id: input.brandId || null,
      origin_country: input.originCountry || null,
      temperature_class: input.temperatureClass,
      allergens,
      is_featured: formData.get("isFeatured") === "on",
      is_new: formData.get("isNew") === "on",
    })
    .eq("id", input.productId);

  if (error) {
    console.error("Modification du produit refusée :", error);
    return { status: "error", message: "L'enregistrement a échoué." };
  }

  await logAdminAction(member.userId, "product.update", "products", input.productId, {
    slug: input.slug,
  });

  revalidatePath(`/admin/produits/${input.slug}`);
  revalidatePath("/admin/produits");
  // La fiche publique et la boutique sont prégénérées : sans cela, le nouveau
  // nom n'apparaîtrait qu'à la prochaine revalidation, dans cinq minutes.
  revalidatePath("/", "layout");
  return { status: "saved" };
}

/* -------------------------------------------------------------------------- */
/* Formats d'un produit                                                        */
/* -------------------------------------------------------------------------- */

const newVariant = z.object({
  productId: z.uuid(),
  slug: z.string().trim().min(1),
  labelFr: z.string().trim().min(1).max(120),
  labelEn: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(2).max(60),
  netWeightG: z.string().trim().optional(),
});

/** Ajoute un format à un produit existant. */
export async function addVariantAction(
  _previous: PricingState,
  formData: FormData,
): Promise<PricingState> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) {
    return { status: "error", message: "Vous n'avez pas les droits nécessaires." };
  }

  const parsed = newVariant.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path?.[0] ?? "");
    return { status: "error", message: `Champ incomplet ou invalide : ${field}.` };
  }
  const input = parsed.data;

  const price = parseAmount(formData.get("retailPrice"));
  if (price === undefined || price === null) {
    return { status: "error", message: "Indiquez un prix de vente." };
  }

  const weight = input.netWeightG ? Number.parseInt(input.netWeightG, 10) : null;
  if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) {
    return { status: "error", message: "Le poids net doit être un nombre de grammes." };
  }

  const supabase = createAdminClient();

  // Le nouveau format se range après les autres.
  const { data: existing } = await supabase
    .from("product_variants")
    .select("position")
    .eq("product_id", input.productId);

  const position = (existing ?? []).reduce(
    (max, row) => Math.max(max, ((row.position as number) ?? 0) + 1),
    0,
  );

  const { error } = await supabase.from("product_variants").insert({
    product_id: input.productId,
    sku: input.sku,
    label_fr: input.labelFr,
    label_en: input.labelEn,
    net_weight_g: weight,
    retail_price_cents: price,
    price_is_provisional: false,
    position,
  });

  if (error) {
    console.error("Ajout du format refusé :", error);
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "Ce code SKU est déjà utilisé par un autre format."
          : "Le format n'a pas pu être ajouté.",
    };
  }

  await logAdminAction(member.userId, "variant.create", "products", input.productId, {
    sku: input.sku,
  });

  revalidatePath(`/admin/produits/${input.slug}`);
  revalidatePath("/", "layout");
  return { status: "saved" };
}

/**
 * Active ou retire un format de la vente.
 *
 * Désactiver plutôt que supprimer, par défaut : un format retiré disparaît du
 * site et des paniers, mais son historique de stock et ses lignes de commande
 * restent lisibles. Supprimer effacerait le registre des mouvements.
 */
export async function toggleVariantActiveAction(formData: FormData): Promise<void> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) return;

  const variantId = formData.get("variantId");
  const slug = String(formData.get("slug") ?? "");
  const active = formData.get("active") === "1";
  if (typeof variantId !== "string" || !z.uuid().safeParse(variantId).success) return;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_variants")
    .update({ is_active: active })
    .eq("id", variantId)
    .select("product_id, sku");

  if (data?.[0]) {
    await logAdminAction(
      member.userId,
      active ? "variant.activate" : "variant.deactivate",
      "products",
      data[0].product_id as string,
      { sku: data[0].sku },
    );
  }

  revalidatePath(`/admin/produits/${slug}`);
  revalidatePath("/", "layout");
}

/**
 * Supprime un format — réservé à ceux qui n'ont jamais été commandés.
 *
 * `order_items` conserve un instantané du nom et du prix, donc l'historique
 * survivrait à la suppression ; mais le registre des mouvements de stock, lui,
 * disparaîtrait en cascade. Un format qui a servi se désactive, il ne
 * s'efface pas.
 */
export async function deleteVariantAction(formData: FormData): Promise<void> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) return;

  const variantId = formData.get("variantId");
  const slug = String(formData.get("slug") ?? "");
  if (typeof variantId !== "string" || !z.uuid().safeParse(variantId).success) return;

  const supabase = createAdminClient();

  const { data: ordered } = await supabase
    .from("order_items")
    .select("id")
    .eq("variant_id", variantId)
    .limit(1);

  if (ordered && ordered.length > 0) return;

  const { data: moved } = await supabase
    .from("stock_movements")
    .select("id")
    .eq("variant_id", variantId)
    .limit(1);

  if (moved && moved.length > 0) return;

  const { data } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId)
    .select("product_id, sku");

  if (data?.[0]) {
    await logAdminAction(
      member.userId,
      "variant.delete",
      "products",
      data[0].product_id as string,
      { sku: data[0].sku },
    );
  }

  revalidatePath(`/admin/produits/${slug}`);
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------------------- */
/* Catégories et marques                                                       */
/* -------------------------------------------------------------------------- */

export type TaxonomyState = { status: "idle" | "saved" | "error"; message?: string };

const categoryInput = z.object({
  id: z.uuid().optional().or(z.literal("")),
  nameFr: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
  descriptionFr: z.string().trim().max(1000).optional(),
  descriptionEn: z.string().trim().max(1000).optional(),
  position: z.string().trim().optional(),
});

export async function saveCategoryAction(
  _previous: TaxonomyState,
  formData: FormData,
): Promise<TaxonomyState> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) {
    return { status: "error", message: "Vous n'avez pas les droits nécessaires." };
  }

  const parsed = categoryInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Nom manquant ou trop court." };
  }
  const input = parsed.data;

  const position = Number.parseInt(input.position || "0", 10);
  const supabase = createAdminClient();

  const values = {
    name_fr: input.nameFr,
    name_en: input.nameEn,
    description_fr: input.descriptionFr || null,
    description_en: input.descriptionEn || null,
    position: Number.isFinite(position) ? position : 0,
    is_active: formData.get("isActive") === "on",
    show_in_mega_menu: formData.get("showInMegaMenu") === "on",
  };

  if (input.id) {
    // L'adresse d'une catégorie n'est pas modifiable, pour la même raison que
    // celle d'un produit : elle vit dans des liens déjà partagés.
    const { error } = await supabase
      .from("categories")
      .update(values)
      .eq("id", input.id);
    if (error) {
      console.error("Modification de la catégorie refusée :", error);
      return { status: "error", message: "L'enregistrement a échoué." };
    }
    await logAdminAction(member.userId, "category.update", "categories", input.id);
  } else {
    const slug = slugify(input.nameFr);
    if (!slug) return { status: "error", message: "Le nom ne donne aucune adresse valide." };

    const { error } = await supabase.from("categories").insert({ ...values, slug });
    if (error) {
      console.error("Création de la catégorie refusée :", error);
      return {
        status: "error",
        message:
          error.code === "23505"
            ? "Une catégorie porte déjà cette adresse."
            : "La création a échoué.",
      };
    }
    await logAdminAction(member.userId, "category.create", "categories", null, { slug });
  }

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { status: "saved" };
}

const brandInput = z.object({
  id: z.uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(120),
  descriptionFr: z.string().trim().max(1000).optional(),
  descriptionEn: z.string().trim().max(1000).optional(),
  originCountry: z.string().trim().max(80).optional(),
});

export async function saveBrandAction(
  _previous: TaxonomyState,
  formData: FormData,
): Promise<TaxonomyState> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) {
    return { status: "error", message: "Vous n'avez pas les droits nécessaires." };
  }

  const parsed = brandInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Nom manquant ou trop court." };
  }
  const input = parsed.data;

  const supabase = createAdminClient();
  const values = {
    name: input.name,
    description_fr: input.descriptionFr || null,
    description_en: input.descriptionEn || null,
    origin_country: input.originCountry || null,
    is_active: formData.get("isActive") === "on",
    is_partner: formData.get("isPartner") === "on",
  };

  if (input.id) {
    const { error } = await supabase.from("brands").update(values).eq("id", input.id);
    if (error) {
      console.error("Modification de la marque refusée :", error);
      return { status: "error", message: "L'enregistrement a échoué." };
    }
    await logAdminAction(member.userId, "brand.update", "brands", input.id);
  } else {
    const slug = slugify(input.name);
    if (!slug) return { status: "error", message: "Le nom ne donne aucune adresse valide." };

    const { error } = await supabase.from("brands").insert({ ...values, slug });
    if (error) {
      console.error("Création de la marque refusée :", error);
      return {
        status: "error",
        message:
          error.code === "23505"
            ? "Une marque porte déjà cette adresse."
            : "La création a échoué.",
      };
    }
    await logAdminAction(member.userId, "brand.create", "brands", null, { slug });
  }

  revalidatePath("/admin/marques");
  revalidatePath("/", "layout");
  return { status: "saved" };
}

/* -------------------------------------------------------------------------- */
/* Pages institutionnelles                                                     */
/* -------------------------------------------------------------------------- */

const pageInput = z.object({
  id: z.uuid().optional().or(z.literal("")),
  slug: z.string().trim().min(1).max(120),
  titleFr: z.string().trim().min(2).max(200),
  titleEn: z.string().trim().min(2).max(200),
  bodyFr: z.string().max(60000).optional(),
  bodyEn: z.string().max(60000).optional(),
});

/**
 * Enregistre une page institutionnelle.
 *
 * Deux cases décident de ce que le visiteur voit, et méritent d'être
 * comprises avant d'être cochées :
 *
 * - **Publiée** — la politique RLS ne montre au public que les pages
 *   publiées. Décocher retire la page du site sans la supprimer.
 * - **Brouillon juridique** — affiche l'encadré « à faire valider » et retire
 *   la page de l'indexation. La décocher revient à déclarer que le texte a
 *   été relu et engage l'entreprise ; c'est pour cela qu'elle est réservée au
 *   super administrateur.
 */
export async function savePageAction(
  _previous: TaxonomyState,
  formData: FormData,
): Promise<TaxonomyState> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) {
    return { status: "error", message: "Vous n'avez pas les droits nécessaires." };
  }

  const parsed = pageInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path?.[0] ?? "");
    return { status: "error", message: `Champ incomplet ou invalide : ${field}.` };
  }
  const input = parsed.data;

  const supabase = createAdminClient();

  // Retirer la mention « brouillon » déclare qu'un professionnel a relu le
  // texte. Un gestionnaire peut corriger une faute ; seul le super
  // administrateur peut engager l'entreprise sur un contenu juridique.
  const wantsDraft = formData.get("isDraftLegal") === "on";
  const canChangeDraft = hasRole(member, "super_admin");

  const values: Record<string, unknown> = {
    slug: input.slug,
    title_fr: input.titleFr,
    title_en: input.titleEn,
    body_fr: input.bodyFr || null,
    body_en: input.bodyEn || null,
    is_published: formData.get("isPublished") === "on",
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data: before } = await supabase
      .from("pages")
      .select("is_draft_legal")
      .eq("id", input.id)
      .limit(1);

    const previousDraft = Boolean(before?.[0]?.is_draft_legal);
    values.is_draft_legal = canChangeDraft ? wantsDraft : previousDraft;

    const { error } = await supabase.from("pages").update(values).eq("id", input.id);
    if (error) {
      console.error("Modification de la page refusée :", error);
      return { status: "error", message: "L'enregistrement a échoué." };
    }

    await logAdminAction(member.userId, "page.update", "pages", input.id, {
      slug: input.slug,
      draft_legal: values.is_draft_legal,
    });

    if (!canChangeDraft && wantsDraft !== previousDraft) {
      return {
        status: "error",
        message:
          "Texte enregistré, mais seul un super administrateur peut retirer ou poser la mention « brouillon juridique ».",
      };
    }
  } else {
    // Une page créée ici part en brouillon juridique si la case est cochée,
    // et non publiée par défaut : on ne met pas un texte en ligne par accident.
    values.is_draft_legal = wantsDraft;

    const { error } = await supabase.from("pages").insert(values);
    if (error) {
      console.error("Création de la page refusée :", error);
      return {
        status: "error",
        message:
          error.code === "23505"
            ? "Une page occupe déjà cette adresse."
            : "La création a échoué.",
      };
    }
    await logAdminAction(member.userId, "page.create", "pages", null, { slug: input.slug });
  }

  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${input.slug}`);
  // La page publique est prégénérée : sans cela, la correction n'apparaîtrait
  // qu'à la revalidation suivante, cinq minutes plus tard.
  revalidatePath("/", "layout");
  return { status: "saved" };
}

/* -------------------------------------------------------------------------- */
/* Recettes                                                                    */
/* -------------------------------------------------------------------------- */

const recipeInput = z.object({
  id: z.uuid(),
  titleFr: z.string().trim().min(2).max(200),
  titleEn: z.string().trim().min(2).max(200),
  descriptionFr: z.string().trim().max(600).optional(),
  descriptionEn: z.string().trim().max(600).optional(),
  prepTime: z.string().trim().optional(),
  cookTime: z.string().trim().optional(),
  servings: z.string().trim().optional(),
  ingredients: z.string().max(8000).optional(),
  steps: z.string().max(20000).optional(),
});

/**
 * Une ligne par entrée, les deux langues séparées par une barre verticale :
 *
 *   2 c. à soupe de poudre de baobab | 2 tbsp baobab powder
 *
 * Sans barre, le même texte sert dans les deux langues — pratique pour
 * « 1 litre d'eau », qui n'a pas besoin d'être traduit.
 */
function parseRecipeLines(raw: string | undefined) {
  return (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [fr, en] = line.split("|").map((part) => part.trim());
      return { fr, en: en || fr };
    })
    .filter((line) => line.fr.length > 0);
}

function parseCount(raw: string | undefined): number {
  const value = Number.parseInt((raw ?? "").trim() || "0", 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Crée une recette, vide, puis ouvre son éditeur.
 *
 * Seuls les deux titres sont demandés : le reste s'écrit dans la foulée, sur
 * un écran fait pour ça. Réclamer ingrédients et étapes dans un formulaire de
 * création obligerait à tout rédiger d'un trait, sans pouvoir enregistrer en
 * chemin.
 *
 * La recette naît **non publiée**, et l'action d'enregistrement refuse de
 * publier une recette sans étape : elle ne peut donc pas paraître vide.
 */
export async function createRecipeAction(
  _previous: TaxonomyState,
  formData: FormData,
): Promise<TaxonomyState> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) {
    return { status: "error", message: "Vous n'avez pas les droits nécessaires." };
  }

  const parsed = z
    .object({
      titleFr: z.string().trim().min(2).max(200),
      titleEn: z.string().trim().min(2).max(200),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { status: "error", message: "Les deux titres sont requis." };
  }

  const base = slugify(parsed.data.titleFr);
  if (!base) return { status: "error", message: "Le titre ne donne aucune adresse valide." };

  const supabase = createAdminClient();

  // Même suffixage que pour les produits : « thiakry », puis « thiakry-2 ».
  let slug = base;
  for (let attempt = 2; attempt <= 50; attempt += 1) {
    const { data } = await supabase.from("recipes").select("id").eq("slug", slug).limit(1);
    if (!data?.length) break;
    slug = `${base}-${attempt}`;
  }

  const { error } = await supabase.from("recipes").insert({
    slug,
    title_fr: parsed.data.titleFr,
    title_en: parsed.data.titleEn,
    ingredients: [],
    steps: [],
    is_published: false,
  });

  if (error) {
    console.error("Création de la recette refusée :", error);
    return { status: "error", message: "La création a échoué." };
  }

  await logAdminAction(member.userId, "recipe.create", "recipes", null, { slug });

  revalidatePath("/admin/recettes");
  redirect(`/admin/recettes/${slug}`);
}

export async function saveRecipeAction(
  _previous: TaxonomyState,
  formData: FormData,
): Promise<TaxonomyState> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) {
    return { status: "error", message: "Vous n'avez pas les droits nécessaires." };
  }

  const parsed = recipeInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path?.[0] ?? "");
    return { status: "error", message: `Champ incomplet ou invalide : ${field}.` };
  }
  const input = parsed.data;

  const ingredients = parseRecipeLines(input.ingredients);
  const steps = parseRecipeLines(input.steps);
  const wantsPublished = formData.get("isPublished") === "on";

  // Publier une recette sans étapes met en ligne une page qui n'apprend rien,
  // et ferait remonter une fiche vide dans les moteurs de recherche.
  if (wantsPublished && steps.length === 0) {
    return {
      status: "error",
      message:
        "Une recette sans étape ne peut pas être publiée. Écrivez la préparation, ou décochez « visible sur le site ».",
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("recipes")
    .update({
      title_fr: input.titleFr,
      title_en: input.titleEn,
      description_fr: input.descriptionFr || null,
      description_en: input.descriptionEn || null,
      prep_time_minutes: parseCount(input.prepTime),
      cook_time_minutes: parseCount(input.cookTime),
      servings: parseCount(input.servings),
      ingredients,
      steps,
      is_published: wantsPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    console.error("Modification de la recette refusée :", error);
    return { status: "error", message: "L'enregistrement a échoué." };
  }

  await logAdminAction(member.userId, "recipe.update", "recipes", input.id, {
    ingredients: ingredients.length,
    steps: steps.length,
  });

  revalidatePath("/admin/recettes");
  revalidatePath("/", "layout");
  return { status: "saved" };
}

/* -------------------------------------------------------------------------- */
/* Mouvements de stock                                                         */
/* -------------------------------------------------------------------------- */

export type StockState = { status: "idle" | "saved" | "error"; message?: string };

const stockMovement = z.object({
  variantId: z.uuid(),
  // `reception` et `return` font entrer de la marchandise, `loss` en fait
  // sortir, `adjustment` corrige dans les deux sens.
  movementType: z.enum(["reception", "adjustment", "loss", "return"]),
  quantity: z.string().trim().min(1),
  direction: z.enum(["in", "out"]).optional(),
  reason: z.string().trim().max(300).optional(),
  lotCode: z.string().trim().max(80).optional(),
  expiresAt: z.string().trim().max(10).optional(),
});

/**
 * Enregistre une réception, un ajustement ou une perte.
 *
 * Rien n'écrit `stock_levels` directement : tout passe par la fonction SQL,
 * qui verrouille la ligne, refuse de descendre sous les quantités déjà
 * réservées et écrit le registre dans la même transaction. Une quantité
 * corrigée sans trace est un écart d'inventaire que plus personne ne saura
 * expliquer trois mois plus tard.
 */
export async function recordStockMovementAction(
  _previous: StockState,
  formData: FormData,
): Promise<StockState> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) {
    return { status: "error", message: "Vous n'avez pas les droits nécessaires." };
  }

  const parsed = stockMovement.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Formulaire incomplet." };
  }
  const input = parsed.data;

  const quantity = Number.parseInt(input.quantity, 10);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { status: "error", message: "Indiquez un nombre d'unités supérieur à zéro." };
  }

  // La quantité est toujours saisie en positif ; c'est le type de mouvement,
  // ou le sens choisi pour un ajustement, qui décide du signe. Demander un
  // nombre négatif à quelqu'un qui déclare une casse serait une invitation à
  // se tromper.
  const negative =
    input.movementType === "loss" ||
    (input.movementType === "adjustment" && input.direction === "out");

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("record_stock_movement", {
    p_variant_id: input.variantId,
    p_quantity_delta: negative ? -quantity : quantity,
    p_movement_type: input.movementType,
    p_actor_id: member.userId,
    p_reason: input.reason || null,
    p_lot_code: input.movementType === "reception" ? input.lotCode || null : null,
    p_expires_at:
      input.movementType === "reception" && input.expiresAt ? input.expiresAt : null,
  });

  if (error) {
    // Les messages de la fonction sont écrits pour être lus tels quels par la
    // personne qui saisit : « il n'y a que 12 en stock » vaut mieux que
    // « violation de contrainte ».
    console.error("Mouvement de stock refusé :", error);
    return { status: "error", message: error.message };
  }

  await logAdminAction(member.userId, "stock.movement", "product_variants", input.variantId, {
    type: input.movementType,
    delta: negative ? -quantity : quantity,
  });

  revalidatePath("/admin/stocks");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { status: "saved" };
}

/* -------------------------------------------------------------------------- */
/* Photographies                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Formats acceptés, vérifiés ici en plus du bucket.
 *
 * Le bucket refuse déjà tout le reste, mais un refus côté base remonte comme
 * une erreur opaque ; ce contrôle-ci permet d'expliquer le problème à la
 * personne qui téléverse.
 */
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type PhotoState = { status: "idle" | "saved" | "error"; message?: string };

/**
 * Téléverse une photo et l'attache au produit.
 *
 * Le fichier part sous un nom tiré au sort, jamais sous celui d'origine :
 * « IMG_4821 (copie).JPG » ferait une URL fragile, et un nom fourni par
 * l'utilisateur permettrait d'écraser un fichier existant en le devinant.
 */
export async function uploadProductPhotoAction(
  _previous: PhotoState,
  formData: FormData,
): Promise<PhotoState> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) {
    return { status: "error", message: "Vous n'avez pas les droits nécessaires." };
  }

  const productId = formData.get("productId");
  const file = formData.get("photo");
  const slug = String(formData.get("slug") ?? "");

  if (typeof productId !== "string" || !z.uuid().safeParse(productId).success) {
    return { status: "error", message: "Produit inconnu." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choisissez une image." };
  }
  if (!IMAGE_TYPES.includes(file.type)) {
    return {
      status: "error",
      message: "Format refusé. Utilisez du JPEG, du PNG, du WebP ou de l'AVIF.",
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mo = (file.size / 1024 / 1024).toFixed(1);
    return {
      status: "error",
      message: `Image trop lourde (${mo} Mo). La limite est de 5 Mo — exportez-la en plus petit.`,
    };
  }

  const supabase = createAdminClient();
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const storagePath = `${productId}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("produits")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Téléversement refusé :", uploadError);
    return { status: "error", message: "Le téléversement a échoué. Réessayez." };
  }

  const { data: existing } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId);

  const count = (existing ?? []).length;

  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    alt_fr: String(formData.get("altFr") ?? "").trim() || null,
    alt_en: String(formData.get("altEn") ?? "").trim() || null,
    position: count,
    // La première photo devient la principale d'office : sans cela, un produit
    // avec une seule photo n'en afficherait aucune.
    is_primary: count === 0,
  });

  if (insertError) {
    // Le fichier est déjà en ligne : le retirer évite de laisser un orphelin
    // que plus rien ne référence et que personne ne saura retrouver.
    await supabase.storage.from("produits").remove([storagePath]);
    console.error("Enregistrement de la photo refusé :", insertError);
    return { status: "error", message: "La photo n'a pas pu être enregistrée." };
  }

  await logAdminAction(member.userId, "product.photo.add", "products", productId, {
    storage_path: storagePath,
  });

  revalidatePath(`/admin/produits/${slug}`);
  revalidatePath("/", "layout");
  return { status: "saved" };
}

export async function deleteProductPhotoAction(formData: FormData): Promise<void> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) return;

  const photoId = formData.get("photoId");
  const slug = String(formData.get("slug") ?? "");
  if (typeof photoId !== "string" || !z.uuid().safeParse(photoId).success) return;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_images")
    .select("id, product_id, storage_path, is_primary")
    .eq("id", photoId)
    .limit(1);

  const photo = data?.[0];
  if (!photo) return;

  await supabase.from("product_images").delete().eq("id", photoId);
  await supabase.storage.from("produits").remove([photo.storage_path as string]);

  // Si la principale disparaît, la suivante prend le relais — sinon le produit
  // se retrouverait avec des photos mais plus aucune à afficher.
  if (photo.is_primary) {
    const { data: rest } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", photo.product_id as string)
      .order("position")
      .limit(1);
    if (rest?.[0]) {
      await supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", rest[0].id as string);
    }
  }

  await logAdminAction(
    member.userId,
    "product.photo.remove",
    "products",
    photo.product_id as string,
    { storage_path: photo.storage_path },
  );

  revalidatePath(`/admin/produits/${slug}`);
  revalidatePath("/", "layout");
}

export async function setPrimaryPhotoAction(formData: FormData): Promise<void> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) return;

  const photoId = formData.get("photoId");
  const slug = String(formData.get("slug") ?? "");
  if (typeof photoId !== "string" || !z.uuid().safeParse(photoId).success) return;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_images")
    .select("product_id")
    .eq("id", photoId)
    .limit(1);

  const productId = data?.[0]?.product_id as string | undefined;
  if (!productId) return;

  // L'ancienne principale est retirée AVANT que la nouvelle soit posée :
  // un index unique interdit deux principales pour un même produit, et
  // l'ordre inverse ferait échouer la mise à jour.
  await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId)
    .eq("is_primary", true);

  await supabase.from("product_images").update({ is_primary: true }).eq("id", photoId);

  revalidatePath(`/admin/produits/${slug}`);
  revalidatePath("/", "layout");
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
