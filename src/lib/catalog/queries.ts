import "server-only";
import { createCatalogClient } from "@/lib/supabase/server";
import type {
  Brand,
  Category,
  LocalizedText,
  Product,
  ProductVariant,
  Recipe,
  RecipeLine,
  Shipment,
  StockStatus,
  TemperatureClass,
} from "@/lib/types";

/**
 * Accès au catalogue.
 *
 * Les données viennent de Supabase, lues avec la clé publique et donc soumises
 * aux politiques RLS : un produit non publié est invisible ici comme il l'est
 * depuis le navigateur.
 *
 * Les colonnes des variantes sont énumérées une à une, et `wholesale_price_cents`
 * en est volontairement absente : le tarif professionnel n'est pas accordé aux
 * rôles publics, et un `select=*` échouerait donc — c'est le comportement voulu.
 */

const VARIANT_COLUMNS = [
  "id",
  "sku",
  "label_fr",
  "label_en",
  "sale_unit",
  "net_weight_g",
  "is_variable_weight",
  "min_weight_g",
  "max_weight_g",
  "price_per_kg_cents",
  "retail_price_cents",
  "compare_at_price_cents",
  "price_is_provisional",
  "min_qty",
  "step_qty",
  "position",
  "is_active",
].join(",");

const PRODUCT_SELECT = `
  id, slug, name_fr, name_en,
  short_description_fr, short_description_en,
  description_fr, description_en,
  origin_country, temperature_class, tax_class, availability_status,
  allergens, tags, is_featured, is_new, is_wholesale_only,
  category:categories!products_category_id_fkey(slug),
  brand:brands!products_brand_id_fkey(slug),
  images:product_images(storage_path, alt_fr, alt_en, position, is_primary),
  variants:product_variants(${VARIANT_COLUMNS}, stock:stock_levels(quantity_available))
`;

/**
 * Adresse publique d'un fichier du bucket `produits`.
 *
 * Le bucket est public : l'URL est donc prévisible et se met en cache, sans
 * jeton qui expire. Construite ici plutôt que rangée en base, pour que changer
 * de projet Supabase ne demande pas de réécrire toutes les lignes.
 */
export function productImageUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/storage/v1/object/public/produits/${storagePath}`;
}

/* -------------------------------------------------------------------------- */
/* Conversion des lignes vers les types du domaine                             */
/* -------------------------------------------------------------------------- */

type Row = Record<string, unknown>;

const text = (row: Row, field: string) => (row[field] as string | null) ?? "";

function toLocalized(row: Row, base: string) {
  return { fr: text(row, `${base}_fr`), en: text(row, `${base}_en`) };
}

function toVariant(row: Row): ProductVariant {
  return {
    id: row.id as string,
    sku: row.sku as string,
    label: toLocalized(row, "label"),
    saleUnit: row.sale_unit as ProductVariant["saleUnit"],
    netWeightG: (row.net_weight_g as number | null) ?? null,
    isVariableWeight: Boolean(row.is_variable_weight),
    minWeightG: (row.min_weight_g as number | null) ?? undefined,
    maxWeightG: (row.max_weight_g as number | null) ?? undefined,
    pricePerKgCents: (row.price_per_kg_cents as number | null) ?? undefined,
    retailPriceCents: row.retail_price_cents as number,
    compareAtPriceCents: (row.compare_at_price_cents as number | null) ?? null,
    // Le tarif professionnel n'est jamais servi ici.
    wholesalePriceCents: null,
    priceIsProvisional: Boolean(row.price_is_provisional),
    minQty: (row.min_qty as number) ?? 1,
    stepQty: (row.step_qty as number) ?? 1,
    availableQuantity: readAvailability(row),
  };
}

/** PostgREST renvoie la relation tantôt en objet, tantôt en tableau. */
function readAvailability(row: Row): number {
  const stock = row.stock as Row | Row[] | null | undefined;
  const entry = Array.isArray(stock) ? stock[0] : stock;
  return (entry?.quantity_available as number | undefined) ?? 0;
}

function toProduct(row: Row): Product {
  const variants = ((row.variants as Row[] | null) ?? [])
    .filter((v) => v.is_active !== false)
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map(toVariant);

  const category = row.category as { slug: string } | null;
  const brand = row.brand as { slug: string } | null;

  // La photo principale, sinon la première dans l'ordre choisi. Un produit sans
  // photo garde `null`, et l'affichage retombe sur le substitut plutôt que sur
  // une image cassée.
  const images = ((row.images as Row[] | null) ?? []).sort(
    (a, b) =>
      Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) ||
      ((a.position as number) ?? 0) - ((b.position as number) ?? 0),
  );
  const cover = images[0];

  return {
    id: row.id as string,
    slug: row.slug as string,
    name: toLocalized(row, "name"),
    shortDescription: toLocalized(row, "short_description"),
    description: toLocalized(row, "description"),
    categorySlug: category?.slug ?? "",
    brandSlug: brand?.slug ?? null,
    originCountry: (row.origin_country as string | null) ?? "",
    temperatureClass: row.temperature_class as TemperatureClass,
    taxClass: row.tax_class as Product["taxClass"],
    stockStatus: row.availability_status as StockStatus,
    variants,
    imageUrl: cover ? productImageUrl(cover.storage_path as string) : null,
    imageAlt: cover
      ? {
          fr: (cover.alt_fr as string | null) ?? "",
          en: (cover.alt_en as string | null) ?? "",
        }
      : null,
    tags: (row.tags as string[] | null) ?? [],
    allergens: (row.allergens as string[] | null) ?? [],
    isFeatured: Boolean(row.is_featured),
    isNew: Boolean(row.is_new),
    isWholesaleOnly: Boolean(row.is_wholesale_only),
  };
}

function toCategory(row: Row): Category {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: toLocalized(row, "name"),
    description: row.description_fr
      ? toLocalized(row, "description")
      : undefined,
    isVirtual: Boolean(row.is_virtual),
    href: (row.href as string | null) ?? undefined,
    parentId: (row.parent_id as string | null) ?? null,
    position: (row.position as number) ?? 0,
    showInMegaMenu: Boolean(row.show_in_mega_menu),
  };
}

function toBrand(row: Row): Brand {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description_fr ? toLocalized(row, "description") : undefined,
    originCountry: (row.origin_country as string | null) ?? undefined,
    isPartner: Boolean(row.is_partner),
  };
}

/** Toute erreur Supabase remonte : mieux vaut une page en échec qu'un catalogue
 *  silencieusement vide, qui passerait pour une rupture de stock générale. */
function unwrap<T>(result: {
  data: unknown;
  error: { message: string } | null;
}): T {
  if (result.error) throw new Error(`Supabase : ${result.error.message}`);
  return (result.data ?? []) as T;
}

/* -------------------------------------------------------------------------- */
/* Requêtes                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Les catégories visibles du site.
 *
 * `is_active` est l'interrupteur général : une catégorie éteinte disparaît de
 * toutes les listes ET sa page devient introuvable. C'est cette liste que
 * doivent servir la boutique, la grille d'accueil et les filtres.
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = createCatalogClient();
  const rows = unwrap<Row[]>(
    await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("position"),
  );
  return rows.map(toCategory);
}

/**
 * Les catégories du menu de navigation, un sous-ensemble des précédentes.
 *
 * Réservée à l'en-tête et au pied de page. L'employer ailleurs viderait de son
 * sens la case « Dans le méga-menu », qui masquerait alors la catégorie du
 * site entier au lieu du seul menu — c'était le cas jusqu'ici.
 */
export async function getMegaMenuCategories(): Promise<Category[]> {
  return (await getCategories()).filter((c) => c.showInMegaMenu);
}

export async function getCategoryBySlug(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug);
}

export async function getBrands(): Promise<Brand[]> {
  const supabase = createCatalogClient();
  const rows = unwrap<Row[]>(
    await supabase.from("brands").select("*").eq("is_active", true).order("name"),
  );
  return rows.map(toBrand);
}

export async function getBrandBySlug(slug: string) {
  return (await getBrands()).find((b) => b.slug === slug);
}

export async function getProducts(limit = 200): Promise<Product[]> {
  const supabase = createCatalogClient();
  const rows = unwrap<Row[]>(
    await supabase.from("products").select(PRODUCT_SELECT).order("name_fr").limit(limit),
  );
  return rows.map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const supabase = createCatalogClient();
  const rows = unwrap<Row[]>(
    await supabase.from("products").select(PRODUCT_SELECT).eq("slug", slug).limit(1),
  );
  return rows[0] ? toProduct(rows[0]) : undefined;
}

export async function getProductsByCategory(
  categorySlug: string,
  limit = 100,
): Promise<Product[]> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return [];

  const supabase = createCatalogClient();
  const rows = unwrap<Row[]>(
    await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("category_id", category.id)
      .order("name_fr")
      .limit(limit),
  );
  return rows.map(toProduct);
}

/**
 * Catalogue filtré. Les critères que PostgreSQL sait traiter — catégorie,
 * marque, température — sont appliqués côté base ; le prix et le tri, qui
 * dépendent de la variante la moins chère, le sont ensuite en mémoire
 * (voir `applyFilters`).
 */
export async function getCatalogue(criteria: {
  categorySlug?: string;
  brandSlug?: string;
  temperatures?: TemperatureClass[];
}): Promise<Product[]> {
  const supabase = createCatalogClient();
  let request = supabase.from("products").select(PRODUCT_SELECT);

  if (criteria.categorySlug) {
    const category = await getCategoryBySlug(criteria.categorySlug);
    if (!category) return [];
    request = request.eq("category_id", category.id);
  }

  if (criteria.brandSlug) {
    const brand = await getBrandBySlug(criteria.brandSlug);
    if (!brand) return [];
    request = request.eq("brand_id", brand.id);
  }

  if (criteria.temperatures && criteria.temperatures.length > 0) {
    request = request.in("temperature_class", criteria.temperatures);
  }

  const rows = unwrap<Row[]>(await request.order("name_fr").limit(500));
  return rows.map(toProduct);
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const supabase = createCatalogClient();
  const rows = unwrap<Row[]>(
    await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_featured", true)
      .order("name_fr")
      .limit(limit),
  );
  return rows.map(toProduct);
}

export async function getNewProducts(limit = 8): Promise<Product[]> {
  const supabase = createCatalogClient();
  const rows = unwrap<Row[]>(
    await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_new", true)
      .order("published_at", { ascending: false })
      .limit(limit),
  );
  return rows.map(toProduct);
}

/** Un produit est en promotion dès qu'une de ses variantes porte un prix barré. */
export async function getPromotedProducts(limit = 8): Promise<Product[]> {
  const supabase = createCatalogClient();
  const discounted = unwrap<Row[]>(
    await supabase
      .from("product_variants")
      .select("product_id")
      .not("compare_at_price_cents", "is", null),
  );
  const ids = [...new Set(discounted.map((v) => v.product_id as string))];
  if (ids.length === 0) return [];

  const rows = unwrap<Row[]>(
    await supabase.from("products").select(PRODUCT_SELECT).in("id", ids).limit(limit),
  );
  return rows.map(toProduct);
}

async function getByTemperature(
  classes: TemperatureClass[],
  limit: number,
): Promise<Product[]> {
  const supabase = createCatalogClient();
  const rows = unwrap<Row[]>(
    await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .in("temperature_class", classes)
      .order("name_fr")
      .limit(limit),
  );
  return rows.map(toProduct);
}

export async function getColdProducts(limit = 8) {
  return getByTemperature(["frozen", "refrigerated"], limit);
}

export async function getFreshProducts(limit = 8) {
  return getByTemperature(["fresh"], limit);
}

export async function getNaturalProducts(limit = 8) {
  const supabase = createCatalogClient();
  const rows = unwrap<Row[]>(
    await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("temperature_class", "ambient")
      .limit(200),
  );
  return rows
    .map(toProduct)
    .filter((p) => p.categorySlug === "poudres-naturelles")
    .slice(0, limit);
}

export async function getOpenShipments(): Promise<Shipment[]> {
  const supabase = createCatalogClient();
  const rows = unwrap<Row[]>(
    await supabase
      .from("shipments")
      .select(
        `*, items:shipment_items(
           variant_id, planned_quantity, remaining_quantity, deposit_cents,
           variant:product_variants(
             label_fr, label_en, product:products(slug, name_fr, name_en)
           )
         )`,
      )
      .not("status", "in", "(completed,cancelled)")
      .order("eta_date"),
  );

  return rows.map((row) => ({
    id: row.id as string,
    code: row.code as string,
    title: toLocalized(row, "title"),
    originCountry: (row.origin_country as string | null) ?? "",
    status: row.status as Shipment["status"],
    etaDate: (row.eta_date as string | null) ?? "",
    reservationDeadline: (row.reservation_deadline as string | null) ?? "",
    items: ((row.items as Row[] | null) ?? []).map((item) => {
      // Le nom et le format viennent de la jointure. Les chercher ensuite par
      // slug coûtait une requête par ligne, et affichait un identifiant brut
      // quand elle ne trouvait rien.
      const variant = (item.variant ?? {}) as Row;
      const product = (variant.product ?? {}) as Row;

      return {
        variantId: item.variant_id as string,
        productSlug: (product.slug as string) ?? "",
        name: toLocalized(product, "name"),
        label: toLocalized(variant, "label"),
        plannedQuantity: item.planned_quantity as number,
        reservedQuantity:
          (item.planned_quantity as number) - (item.remaining_quantity as number),
        depositCents: (item.deposit_cents as number) ?? 0,
      };
    }),
  }));
}

export async function getRecipes(limit?: number): Promise<Recipe[]> {
  const supabase = createCatalogClient();
  const rows = unwrap<Row[]>(
    await supabase
      .from("recipes")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(limit ?? 50),
  );

  return rows.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    title: toLocalized(row, "title"),
    description: toLocalized(row, "description"),
    prepTimeMinutes: (row.prep_time_minutes as number) ?? 0,
    cookTimeMinutes: (row.cook_time_minutes as number) ?? 0,
    servings: (row.servings as number) ?? 0,
    ingredients: toRecipeLines(row.ingredients),
    steps: toRecipeLines(row.steps),
    productSlugs: [],
    imageUrl: (row.image_url as string | null) ?? null,
  }));
}

/**
 * Les lignes d'une recette viennent d'une colonne `jsonb` libre. On ne fait
 * donc confiance à rien : une entrée sans texte est écartée plutôt que rendue
 * en ligne vide, et un tableau mal formé donne une liste vide, pas une erreur.
 */
function toRecipeLines(value: unknown): RecipeLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return { fr: entry, en: entry };
      if (entry && typeof entry === "object") {
        const row = entry as Record<string, unknown>;
        const fr = typeof row.fr === "string" ? row.fr : "";
        const en = typeof row.en === "string" ? row.en : "";
        return {
          fr: fr || en,
          en: en || fr,
          variantSku: typeof row.variantSku === "string" ? row.variantSku : null,
        };
      }
      return { fr: "", en: "" };
    })
    .filter((line) => line.fr.trim().length > 0);
}

export async function getRecipeBySlug(slug: string) {
  return (await getRecipes(50)).find((r) => r.slug === slug);
}

/**
 * Réglages du site. `allowProvisionalPrices` pilote le bandeau d'avertissement :
 * tant qu'il est vrai, les prix affichés sont des valeurs de démonstration et
 * le visiteur doit le savoir.
 */
export async function getSiteSettings(): Promise<{
  allowProvisionalPrices: boolean;
}> {
  const supabase = createCatalogClient();
  const rows = unwrap<Row[]>(
    await supabase.from("site_settings").select("allow_provisional_prices").limit(1),
  );
  return {
    allowProvisionalPrices: Boolean(rows[0]?.allow_provisional_prices),
  };
}

/** Prix affiché : la variante la moins chère, celle qui sert d'entrée de gamme. */
export function getEntryVariant(product: Product) {
  return product.variants.reduce((cheapest, current) =>
    current.retailPriceCents < cheapest.retailPriceCents ? current : cheapest,
  );
}

/**
 * Recherche produit.
 *
 * La normalisation — minuscules, accents — est faite par la fonction SQL, au
 * même endroit que l'indexation, pour que les deux ne puissent pas diverger.
 * Le terme est transmis comme paramètre : il n'est jamais concaténé dans une
 * requête.
 */
export async function searchProducts(query: string, limit = 24): Promise<Product[]> {
  const term = query.trim();
  if (term.length === 0) return [];

  const supabase = createCatalogClient();
  const { data, error } = await supabase.rpc("search_products", {
    p_query: term,
    p_limit: limit,
  });

  if (error) throw new Error(`Supabase : ${error.message}`);

  const ids = ((data ?? []) as Row[]).map((row) => row.id as string);
  if (ids.length === 0) return [];

  // La fonction renvoie les colonnes de `products` sans les relations ; on
  // recharge les mêmes lignes avec variantes et catégorie, en conservant
  // l'ordre de pertinence établi par SQL.
  const rows = unwrap<Row[]>(
    await supabase.from("products").select(PRODUCT_SELECT).in("id", ids),
  );

  const byId = new Map(rows.map((row) => [row.id as string, toProduct(row)]));
  return ids.map((id) => byId.get(id)).filter((p): p is Product => p != null);
}

/* -------------------------------------------------------------------------- */
/* Pages institutionnelles                                                     */
/* -------------------------------------------------------------------------- */

export interface SitePage {
  slug: string;
  title: LocalizedText;
  body: LocalizedText;
  /** Texte juridique non encore relu par un professionnel. */
  isDraftLegal: boolean;
  updatedAt: string;
}

/**
 * Une page institutionnelle, par son chemin (« livraison »,
 * « politiques/confidentialite »).
 *
 * La lecture passe par la clé publique : la politique RLS ne rend visibles que
 * les pages publiées, si bien qu'un brouillon reste invisible même si son
 * adresse est devinée.
 */
export async function getSitePage(slug: string): Promise<SitePage | null> {
  const supabase = createCatalogClient();
  const { data, error } = await supabase
    .from("pages")
    .select("slug, title_fr, title_en, body_fr, body_en, is_draft_legal, updated_at")
    .eq("slug", slug)
    .limit(1);

  if (error) throw new Error(`Supabase : ${error.message}`);

  const row = ((data ?? []) as Row[])[0];
  if (!row) return null;

  return {
    slug: row.slug as string,
    title: toLocalized(row, "title"),
    body: toLocalized(row, "body"),
    isDraftLegal: Boolean(row.is_draft_legal),
    updatedAt: row.updated_at as string,
  };
}

/** Chemins des pages publiées, pour la prégénération. */
export async function getSitePageSlugs(): Promise<string[]> {
  const supabase = createCatalogClient();
  const { data } = await supabase.from("pages").select("slug").limit(100);
  return ((data ?? []) as Row[]).map((row) => row.slug as string);
}
