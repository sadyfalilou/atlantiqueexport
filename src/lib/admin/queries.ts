import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { productImageUrl } from "@/lib/catalog/queries";

/**
 * Lectures de l'administration.
 *
 * Toutes passent par la clé de service, et ne doivent donc être appelées
 * qu'après vérification du rôle — ce dont se charge le layout `(protege)`.
 */

type Row = Record<string, unknown>;

export interface AdminOrder {
  id: string;
  orderNumber: string;
  email: string;
  phone: string | null;
  status: string;
  paymentStatus: string;
  method: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  placedAt: string;
  notes: string | null;
  address: Record<string, string> | null;
  slot: { date: string; startTime: string; endTime: string } | null;
  zoneName: string | null;
  items: Array<{
    name: string;
    sku: string;
    label: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
}

const ORDER_SELECT = `
  id, order_number, email, phone, status, payment_status, fulfillment_method,
  subtotal_cents, delivery_fee_cents, total_cents, placed_at, delivery_notes,
  delivery_address,
  slot:delivery_slots(slot_date, start_time, end_time),
  zone:delivery_zones(name),
  items:order_items(product_name_snapshot, sku_snapshot, unit_label_snapshot,
                    quantity, unit_price_cents, line_total_cents)
`;

function toOrder(row: Row): AdminOrder {
  const slot = row.slot as Row | null;
  const zone = row.zone as Row | null;

  return {
    id: row.id as string,
    orderNumber: row.order_number as string,
    email: row.email as string,
    phone: (row.phone as string | null) ?? null,
    status: row.status as string,
    paymentStatus: row.payment_status as string,
    method: row.fulfillment_method as string,
    subtotalCents: row.subtotal_cents as number,
    deliveryFeeCents: row.delivery_fee_cents as number,
    totalCents: row.total_cents as number,
    placedAt: row.placed_at as string,
    notes: (row.delivery_notes as string | null) ?? null,
    address: (row.delivery_address as Record<string, string> | null) ?? null,
    slot: slot
      ? {
          date: slot.slot_date as string,
          startTime: String(slot.start_time).slice(0, 5),
          endTime: String(slot.end_time).slice(0, 5),
        }
      : null,
    zoneName: (zone?.name as string | undefined) ?? null,
    items: ((row.items as Row[] | null) ?? []).map((item) => ({
      name: item.product_name_snapshot as string,
      sku: item.sku_snapshot as string,
      label: item.unit_label_snapshot as string,
      quantity: item.quantity as number,
      unitPriceCents: item.unit_price_cents as number,
      lineTotalCents: item.line_total_cents as number,
    })),
  };
}

export async function getOrders(filter?: {
  status?: string;
  paymentStatus?: string;
}): Promise<AdminOrder[]> {
  const supabase = createAdminClient();
  let request = supabase.from("orders").select(ORDER_SELECT);

  if (filter?.status) request = request.eq("status", filter.status);
  if (filter?.paymentStatus) request = request.eq("payment_status", filter.paymentStatus);

  const { data } = await request.order("placed_at", { ascending: false }).limit(200);
  return ((data ?? []) as Row[]).map(toOrder);
}

export async function getOrderByNumber(orderNumber: string): Promise<AdminOrder | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("order_number", orderNumber)
    .limit(1);

  const row = ((data ?? []) as Row[])[0];
  return row ? toOrder(row) : null;
}

export interface DashboardFigures {
  pendingPayment: number;
  toPrepare: number;
  todayPickups: number;
  todayDeliveries: number;
  paidRevenueCents: number;
  lowStock: Array<{ sku: string; name: string; available: number; threshold: number }>;
}

export async function getDashboard(): Promise<DashboardFigures> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [pending, toPrepare, slotsToday, paid, stock] = await Promise.all([
    supabase.from("orders").select("id").eq("payment_status", "pending"),
    supabase.from("orders").select("id").in("status", ["confirmed", "preparing"]),
    supabase
      .from("orders")
      .select("id, fulfillment_method, slot:delivery_slots!inner(slot_date)")
      .eq("delivery_slots.slot_date", today),
    supabase.from("orders").select("total_cents").eq("payment_status", "paid"),
    supabase
      .from("stock_levels")
      .select(
        "quantity_available, low_stock_threshold, variant:product_variants(sku, product:products(name_fr))",
      )
      .order("quantity_available")
      .limit(200),
  ]);

  const todayRows = (slotsToday.data ?? []) as Row[];

  const lowStock = ((stock.data ?? []) as Row[])
    .filter(
      (row) =>
        (row.quantity_available as number) <= (row.low_stock_threshold as number),
    )
    .slice(0, 10)
    .map((row) => {
      const variant = row.variant as Row | null;
      const product = variant?.product as Row | null;
      return {
        sku: (variant?.sku as string) ?? "",
        name: (product?.name_fr as string) ?? "",
        available: row.quantity_available as number,
        threshold: row.low_stock_threshold as number,
      };
    });

  return {
    pendingPayment: (pending.data ?? []).length,
    toPrepare: (toPrepare.data ?? []).length,
    todayPickups: todayRows.filter((r) => r.fulfillment_method === "pickup").length,
    todayDeliveries: todayRows.filter((r) => r.fulfillment_method === "local_delivery")
      .length,
    paidRevenueCents: ((paid.data ?? []) as Row[]).reduce(
      (total, row) => total + ((row.total_cents as number) ?? 0),
      0,
    ),
    lowStock,
  };
}

/* -------------------------------------------------------------------------- */
/* Produits et prix                                                            */
/* -------------------------------------------------------------------------- */

export interface AdminVariant {
  id: string;
  sku: string;
  label: string;
  retailPriceCents: number;
  compareAtPriceCents: number | null;
  wholesalePriceCents: number | null;
  priceIsProvisional: boolean;
  isActive: boolean;
  available: number;
}

export interface AdminPhoto {
  id: string;
  url: string;
  storagePath: string;
  altFr: string;
  altEn: string;
  isPrimary: boolean;
  position: number;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  categoryName: string | null;
  isPublished: boolean;
  hasProvisionalPrice: boolean;
  variants: AdminVariant[];
  photos: AdminPhoto[];
  /** Champs modifiables depuis la fiche. */
  fields: {
    nameFr: string;
    nameEn: string;
    shortDescriptionFr: string;
    shortDescriptionEn: string;
    descriptionFr: string;
    descriptionEn: string;
    storageFr: string;
    storageEn: string;
    categoryId: string | null;
    brandId: string | null;
    originCountry: string;
    temperatureClass: string;
    allergens: string[];
    isFeatured: boolean;
    isNew: boolean;
  };
}

const ADMIN_PRODUCT_SELECT = `
  id, slug, name_fr, name_en, published_at,
  short_description_fr, short_description_en,
  description_fr, description_en, storage_fr, storage_en,
  origin_country, temperature_class, allergens, is_featured, is_new,
  category_id, brand_id,
  category:categories(name_fr),
  images:product_images(id, storage_path, alt_fr, alt_en, position, is_primary),
  variants:product_variants(
    id, sku, label_fr, retail_price_cents, compare_at_price_cents,
    wholesale_price_cents, price_is_provisional, is_active, position,
    stock:stock_levels(quantity_available)
  )
`;

function toAdminProduct(row: Row): AdminProduct {
  const category = row.category as Row | null;
  const variants = ((row.variants as Row[] | null) ?? [])
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map((variant) => {
      const stock = variant.stock as Row | Row[] | null;
      const entry = Array.isArray(stock) ? stock[0] : stock;
      return {
        id: variant.id as string,
        sku: variant.sku as string,
        label: (variant.label_fr as string) ?? "",
        retailPriceCents: variant.retail_price_cents as number,
        compareAtPriceCents: (variant.compare_at_price_cents as number | null) ?? null,
        wholesalePriceCents: (variant.wholesale_price_cents as number | null) ?? null,
        priceIsProvisional: Boolean(variant.price_is_provisional),
        isActive: variant.is_active !== false,
        available: (entry?.quantity_available as number | undefined) ?? 0,
      };
    });

  const photos = ((row.images as Row[] | null) ?? [])
    .map((image) => ({
      id: image.id as string,
      storagePath: image.storage_path as string,
      url: productImageUrl(image.storage_path as string),
      altFr: (image.alt_fr as string | null) ?? "",
      altEn: (image.alt_en as string | null) ?? "",
      isPrimary: Boolean(image.is_primary),
      position: (image.position as number) ?? 0,
    }))
    .sort(
      (a, b) =>
        Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position,
    );

  return {
    id: row.id as string,
    slug: row.slug as string,
    name: (row.name_fr as string) ?? "",
    categoryName: (category?.name_fr as string | undefined) ?? null,
    isPublished: row.published_at != null,
    hasProvisionalPrice: variants.some((v) => v.isActive && v.priceIsProvisional),
    variants,
    photos,
    fields: {
      nameFr: (row.name_fr as string | null) ?? "",
      nameEn: (row.name_en as string | null) ?? "",
      shortDescriptionFr: (row.short_description_fr as string | null) ?? "",
      shortDescriptionEn: (row.short_description_en as string | null) ?? "",
      descriptionFr: (row.description_fr as string | null) ?? "",
      descriptionEn: (row.description_en as string | null) ?? "",
      storageFr: (row.storage_fr as string | null) ?? "",
      storageEn: (row.storage_en as string | null) ?? "",
      categoryId: (row.category_id as string | null) ?? null,
      brandId: (row.brand_id as string | null) ?? null,
      originCountry: (row.origin_country as string | null) ?? "",
      temperatureClass: (row.temperature_class as string | null) ?? "ambient",
      allergens: (row.allergens as string[] | null) ?? [],
      isFeatured: Boolean(row.is_featured),
      isNew: Boolean(row.is_new),
    },
  };
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .order("name_fr")
    .limit(500);

  return ((data ?? []) as Row[]).map(toAdminProduct);
}

export async function getAdminProduct(slug: string): Promise<AdminProduct | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .eq("slug", slug)
    .limit(1);

  const row = ((data ?? []) as Row[])[0];
  return row ? toAdminProduct(row) : null;
}

/**
 * Combien de formats attendent encore un vrai prix, et le site est-il
 * toujours en mode « prix de démonstration ». Sert à savoir s'il est possible
 * de basculer la boutique en mode réel.
 */
export async function getPricingReadiness(): Promise<{
  provisionalCount: number;
  allowProvisional: boolean;
}> {
  const supabase = createAdminClient();
  const [variants, settings] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id")
      .eq("price_is_provisional", true)
      .eq("is_active", true),
    supabase.from("site_settings").select("allow_provisional_prices").limit(1),
  ]);

  return {
    provisionalCount: (variants.data ?? []).length,
    allowProvisional: Boolean(
      ((settings.data ?? []) as Row[])[0]?.allow_provisional_prices,
    ),
  };
}

/** Listes déroulantes du formulaire de création d'un produit. */
export async function getProductFormOptions(): Promise<{
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
}> {
  const supabase = createAdminClient();
  const [categories, brands] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name_fr, is_virtual")
      .order("position"),
    supabase.from("brands").select("id, name").order("name"),
  ]);

  return {
    // Les catégories virtuelles — « Nouveautés », « Promotions » — sont des vues
    // calculées, pas des rayons : on ne peut pas y ranger un produit.
    categories: ((categories.data ?? []) as Row[])
      .filter((row) => !row.is_virtual)
      .map((row) => ({ id: row.id as string, name: row.name_fr as string })),
    brands: ((brands.data ?? []) as Row[]).map((row) => ({
      id: row.id as string,
      name: row.name as string,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Catégories et marques                                                       */
/* -------------------------------------------------------------------------- */

export interface AdminCategory {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  position: number;
  isActive: boolean;
  showInMegaMenu: boolean;
  isVirtual: boolean;
  productCount: number;
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const supabase = createAdminClient();
  const [categories, products] = await Promise.all([
    supabase.from("categories").select("*").order("position"),
    supabase.from("products").select("category_id"),
  ]);

  // Compté ici plutôt qu'en base : savoir combien de produits une catégorie
  // porte change ce qu'on ose en faire, et l'information doit être visible
  // avant de la désactiver.
  const counts = new Map<string, number>();
  for (const row of (products.data ?? []) as Row[]) {
    const id = row.category_id as string | null;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return ((categories.data ?? []) as Row[]).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    nameFr: (row.name_fr as string | null) ?? "",
    nameEn: (row.name_en as string | null) ?? "",
    descriptionFr: (row.description_fr as string | null) ?? "",
    descriptionEn: (row.description_en as string | null) ?? "",
    position: (row.position as number) ?? 0,
    isActive: row.is_active !== false,
    showInMegaMenu: Boolean(row.show_in_mega_menu),
    isVirtual: Boolean(row.is_virtual),
    productCount: counts.get(row.id as string) ?? 0,
  }));
}

export interface AdminBrand {
  id: string;
  slug: string;
  name: string;
  descriptionFr: string;
  descriptionEn: string;
  originCountry: string;
  isActive: boolean;
  isPartner: boolean;
  productCount: number;
}

export async function getAdminBrands(): Promise<AdminBrand[]> {
  const supabase = createAdminClient();
  const [brands, products] = await Promise.all([
    supabase.from("brands").select("*").order("name"),
    supabase.from("products").select("brand_id"),
  ]);

  const counts = new Map<string, number>();
  for (const row of (products.data ?? []) as Row[]) {
    const id = row.brand_id as string | null;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return ((brands.data ?? []) as Row[]).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    name: (row.name as string | null) ?? "",
    descriptionFr: (row.description_fr as string | null) ?? "",
    descriptionEn: (row.description_en as string | null) ?? "",
    originCountry: (row.origin_country as string | null) ?? "",
    isActive: row.is_active !== false,
    isPartner: Boolean(row.is_partner),
    productCount: counts.get(row.id as string) ?? 0,
  }));
}

/* -------------------------------------------------------------------------- */
/* Pages institutionnelles                                                     */
/* -------------------------------------------------------------------------- */

export interface AdminPage {
  id: string;
  slug: string;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  isPublished: boolean;
  isDraftLegal: boolean;
  updatedAt: string;
  /** Nombre de « [à confirmer] » restants, les deux langues confondues. */
  pendingCount: number;
}

const PLACEHOLDER = /\[(?:à confirmer|to confirm)\]/g;

function toAdminPage(row: Row): AdminPage {
  const bodyFr = (row.body_fr as string | null) ?? "";
  const bodyEn = (row.body_en as string | null) ?? "";

  return {
    id: row.id as string,
    slug: row.slug as string,
    titleFr: (row.title_fr as string | null) ?? "",
    titleEn: (row.title_en as string | null) ?? "",
    bodyFr,
    bodyEn,
    isPublished: Boolean(row.is_published),
    isDraftLegal: Boolean(row.is_draft_legal),
    updatedAt: row.updated_at as string,
    pendingCount:
      (bodyFr.match(PLACEHOLDER) ?? []).length + (bodyEn.match(PLACEHOLDER) ?? []).length,
  };
}

export async function getAdminPages(): Promise<AdminPage[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("pages").select("*").order("slug");
  return ((data ?? []) as Row[]).map(toAdminPage);
}

export async function getAdminPage(slug: string): Promise<AdminPage | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("pages").select("*").eq("slug", slug).limit(1);
  const row = ((data ?? []) as Row[])[0];
  return row ? toAdminPage(row) : null;
}

/* -------------------------------------------------------------------------- */
/* Recettes                                                                    */
/* -------------------------------------------------------------------------- */

export interface AdminRecipe {
  id: string;
  slug: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  /** Une ligne par entrée, « français | anglais » — la forme saisie. */
  ingredientsText: string;
  stepsText: string;
  isPublished: boolean;
  ingredientCount: number;
  stepCount: number;
}

/** `[{fr, en}]` → « français | anglais », une ligne par entrée. */
function linesToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      const row = (entry ?? {}) as Record<string, unknown>;
      const fr = typeof row.fr === "string" ? row.fr : "";
      const en = typeof row.en === "string" ? row.en : "";
      return en && en !== fr ? `${fr} | ${en}` : fr;
    })
    .filter(Boolean)
    .join("\n");
}

function toAdminRecipe(row: Row): AdminRecipe {
  const ingredients = Array.isArray(row.ingredients) ? row.ingredients : [];
  const steps = Array.isArray(row.steps) ? row.steps : [];

  return {
    id: row.id as string,
    slug: row.slug as string,
    titleFr: (row.title_fr as string | null) ?? "",
    titleEn: (row.title_en as string | null) ?? "",
    descriptionFr: (row.description_fr as string | null) ?? "",
    descriptionEn: (row.description_en as string | null) ?? "",
    prepTimeMinutes: (row.prep_time_minutes as number) ?? 0,
    cookTimeMinutes: (row.cook_time_minutes as number) ?? 0,
    servings: (row.servings as number) ?? 0,
    ingredientsText: linesToText(row.ingredients),
    stepsText: linesToText(row.steps),
    isPublished: Boolean(row.is_published),
    ingredientCount: ingredients.length,
    stepCount: steps.length,
  };
}

export async function getAdminRecipes(): Promise<AdminRecipe[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("recipes").select("*").order("title_fr");
  return ((data ?? []) as Row[]).map(toAdminRecipe);
}

export async function getAdminRecipe(slug: string): Promise<AdminRecipe | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("recipes").select("*").eq("slug", slug).limit(1);
  const row = ((data ?? []) as Row[])[0];
  return row ? toAdminRecipe(row) : null;
}
