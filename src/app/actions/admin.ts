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
