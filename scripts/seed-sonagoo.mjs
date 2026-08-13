/**
 * Importe le catalogue dans Supabase.
 *
 *   npm run seed:sonagoo
 *
 * Rejouable sans créer de doublons : tout passe par des upserts sur `slug`
 * ou `sku`. Relancer le script après avoir corrigé le fichier JSON met la
 * base à jour sans rien dupliquer.
 *
 * ⚠️ LES PRIX ET LES STOCKS SONT FICTIFS.
 *
 * Le catalogue fournisseur est libellé en FCFA et n'est pas converti. Les
 * montants ci-dessous sont des valeurs de démonstration, demandées par
 * Atlantique Export pour voir le site fonctionner en attendant les vrais
 * prix. Chaque variante reste marquée `price_is_provisional`, et le réglage
 * `site_settings.allow_provisional_prices` autorise leur publication.
 *
 * AVANT LA PREMIÈRE VENTE RÉELLE, deux gestes sont obligatoires :
 *   1. saisir les vrais prix et remettre price_is_provisional à faux ;
 *   2. basculer allow_provisional_prices à faux, ce qui réactive le
 *      garde-fou interdisant de publier un produit non chiffré ;
 *   3. remettre les stocks à leur valeur réelle (voir la fin de ce fichier).
 */

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const path = (p) => fileURLToPath(new URL(p, root));

process.loadEnvFile(path(".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const secret = process.env.SUPABASE_SECRET_KEY.trim();

const headers = {
  apikey: secret,
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
};

async function request(path, init = {}) {
  const response = await fetch(url + path, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(
      `${init.method ?? "GET"} ${path} → HTTP ${response.status} ${JSON.stringify(body)}`,
    );
  }
  return body;
}

const get = (path) => request(path);

const upsert = (table, onConflict, rows) =>
  request(`/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });

/* -------------------------------------------------------------------------- */
/* Formats                                                                     */
/* -------------------------------------------------------------------------- */

const FORMATS = {
  "50g": { g: 50, unit: "bag", fr: "Sachet 50 g", en: "50 g bag" },
  "100g": { g: 100, unit: "bag", fr: "Sachet 100 g", en: "100 g bag" },
  "125g": { g: 125, unit: "bag", fr: "Sachet 125 g", en: "125 g bag" },
  "250g": { g: 250, unit: "bag", fr: "Sachet 250 g", en: "250 g bag" },
  "500g": { g: 500, unit: "bag", fr: "Sachet 500 g", en: "500 g bag" },
  "1kg": { g: 1000, unit: "bag", fr: "Sachet 1 kg", en: "1 kg bag" },
  "3kg": { g: 3000, unit: "bag", fr: "Sac 3 kg", en: "3 kg bag" },
  box: { g: null, unit: "unit", fr: "Boîte", en: "Box" },
  sachet: { g: null, unit: "bag", fr: "Sachet", en: "Pack" },
};

/* -------------------------------------------------------------------------- */
/* ⚠️ Prix de DÉMONSTRATION, en cents CAD                                      */
/*                                                                             */
/* Ce ne sont pas des prix de vente. Ils ne proviennent d'aucune conversion du */
/* catalogue FCFA : ce sont des ordres de grandeur plausibles pour une épicerie */
/* afroalimentaire montréalaise, choisis pour que le site soit présentable en   */
/* attendant la grille réelle.                                                  */
/* -------------------------------------------------------------------------- */

const DEMO_PRICES_BY_CATEGORY = {
  "poudres-naturelles": { "500g": 1499, "1kg": 2699 },
  "epices-condiments": { "250g": 999, "500g": 1799, "1kg": 3299 },
  "cereales-feculents": { "500g": 899, "1kg": 1599 },
  collations: { "50g": 349, "100g": 599, sachet: 899 },
  "thes-boissons": { "500g": 1599, "1kg": 2899, box: 1299 },
  "plats-preparations": { "500g": 1399, "1kg": 2499 },
  "produits-surgeles": { "500g": 1699, "1kg": 2999 },
};

/** Produits dont le prix ne suit pas celui de leur catégorie. */
const DEMO_PRICE_OVERRIDES = {
  wass: { "125g": 699, "250g": 1199, "500g": 2199, "1kg": 3999 },
  "cafe-touba": { "500g": 1699, "1kg": 2999 },
  "ngalakh-instantane": { "1kg": 2299, "3kg": 5999 },
  "madd-sachet": { sachet: 799 },
  "mangue-sechee": { sachet: 999 },
};

function demoPrice(product, formatKey) {
  const price =
    DEMO_PRICE_OVERRIDES[product.slug]?.[formatKey] ??
    DEMO_PRICES_BY_CATEGORY[product.cat]?.[formatKey];
  if (price == null) {
    throw new Error(
      `Aucun prix de démonstration pour ${product.slug} au format ${formatKey}`,
    );
  }
  return price;
}

/** Stock de démonstration, pour que le site ne soit pas entièrement vide. */
const DEMO_STOCK_QUANTITY = 24;

/* -------------------------------------------------------------------------- */

const seed = JSON.parse(await readFile(path("supabase/seed/sonagoo.json"), "utf8"));

console.log("\nImport du catalogue\n");

// --- Catégories --------------------------------------------------------------

const categories = await upsert(
  "categories",
  "slug",
  seed.categories.map((c) => ({
    slug: c.slug,
    name_fr: c.fr,
    name_en: c.en,
    description_fr: c.descFr,
    description_en: c.descEn,
    position: c.position,
    is_active: true,
    show_in_mega_menu: true,
  })),
);
const categoryId = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
console.log(`  ✓ ${categories.length} catégories`);

// --- Marques ------------------------------------------------------------------

const brands = await upsert(
  "brands",
  "slug",
  seed.brands.map((b) => ({
    slug: b.slug,
    name: b.name,
    description_fr: b.description_fr,
    description_en: b.description_en,
    origin_country: b.origin_country,
    is_partner: b.is_partner,
    // Une marque masquée disparaît du site sans que ses produits en pâtissent :
    // la politique RLS filtre la marque, pas le catalogue.
    is_active: b.isActive ?? true,
  })),
);
const brandId = Object.fromEntries(brands.map((b) => [b.slug, b.id]));
console.log(`  ✓ ${brands.length} marques`);

// --- Fournisseur ---------------------------------------------------------------

const existing = await get(
  `/rest/v1/suppliers?name=eq.${encodeURIComponent(seed.supplier.name)}&select=id`,
);
let supplierId = existing[0]?.id;
if (!supplierId) {
  const [created] = await request("/rest/v1/suppliers", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([seed.supplier]),
  });
  supplierId = created.id;
}
console.log(`  ✓ fournisseur ${seed.supplier.name} (table interne)`);

// --- Produits ------------------------------------------------------------------

const publishedAt = new Date().toISOString();

const products = await upsert(
  "products",
  "slug",
  seed.products.map((p) => ({
    slug: p.slug,
    name_fr: p.fr,
    name_en: p.en,
    short_description_fr: p.shortFr,
    short_description_en: p.shortEn,
    description_fr: p.descFr,
    description_en: p.descEn,
    category_id: categoryId[p.cat],
    brand_id: brandId[p.brand ?? "sonagoo"],
    supplier_id: p.supplier === null ? null : supplierId,
    origin_country: "SN",
    temperature_class: p.temperature ?? "ambient",
    tax_class: p.tax ?? "zero_rated",
    availability_status: "in_stock",
    allergens: p.allergens ?? [],
    is_featured: seed.editorial.featured.includes(p.slug),
    is_new: seed.editorial.new.includes(p.slug),
    published_at: publishedAt,
  })),
);
const productId = Object.fromEntries(products.map((p) => [p.slug, p.id]));
console.log(`  ✓ ${products.length} produits publiés`);

// --- Variantes ------------------------------------------------------------------

const variantRows = [];
for (const product of seed.products) {
  product.formats.forEach((formatKey, index) => {
    const format = FORMATS[formatKey];
    if (!format) throw new Error(`Format inconnu : ${formatKey}`);
    const retail = demoPrice(product, formatKey);
    // Remise de démonstration : le prix barré est reconstitué à partir du
    // pourcentage, de sorte que la promotion affichée soit cohérente.
    const discount = seed.editorial.promotions[product.slug];
    const compareAt = discount
      ? Math.round(retail / (1 - discount / 100))
      : null;
    variantRows.push({
      product_id: productId[product.slug],
      sku: `AE-${product.brand === "atlantique-export" ? "AEX" : "SNG"}-${product.code}-${formatKey.toUpperCase()}`,
      label_fr: format.fr,
      label_en: format.en,
      sale_unit: format.unit,
      net_weight_g: format.g,
      retail_price_cents: retail,
      compare_at_price_cents: compareAt,
      wholesale_price_cents: Math.round(retail * 0.78),
      // Le drapeau reste levé : ces montants ne sont pas des prix de vente.
      price_is_provisional: true,
      position: index,
      is_active: true,
    });
  });
}

const variants = await upsert("product_variants", "sku", variantRows);
console.log(`  ✓ ${variants.length} variantes, aux prix de démonstration`);

// --- Stock de démonstration -----------------------------------------------------
// Écriture directe du niveau, sans passer par receive_stock : on évite ainsi
// d'inscrire au registre des mouvements des réceptions qui n'ont jamais eu lieu.

const stockRows = variants.map((v) => ({
  variant_id: v.id,
  quantity_on_hand: DEMO_STOCK_QUANTITY,
}));
await upsert("stock_levels", "variant_id", stockRows);
console.log(`  ✓ stock de démonstration : ${DEMO_STOCK_QUANTITY} par format`);

// --- Recettes ----------------------------------------------------------------------
// Contenu éditorial réel : aucune donnée inventée, seulement des préparations
// traditionnelles. Les étapes détaillées seront rédigées au lot consacré au
// contenu ; ces fiches donnent déjà titre, description et temps.

const recipes = await upsert(
  "recipes",
  "slug",
  seed.recipes.map((r) => ({
    slug: r.slug,
    title_fr: r.titleFr,
    title_en: r.titleEn,
    description_fr: r.descFr,
    description_en: r.descEn,
    prep_time_minutes: r.prep,
    cook_time_minutes: r.cook,
    servings: r.servings,
    is_published: true,
    published_at: publishedAt,
  })),
);
console.log(`  ✓ ${recipes.length} recettes publiées`);

// --- Fichier de saisie des prix réels --------------------------------------------

const productBySku = Object.fromEntries(
  variantRows.map((v) => [
    v.sku,
    seed.products.find((p) => productId[p.slug] === v.product_id),
  ]),
);

const lines = [
  "sku,produit,format,poids_g,prix_demo_cad,prix_detail_cad,prix_gros_cad",
  ...variantRows
    .map((v) => {
      const name = productBySku[v.sku].fr.replace(/,/g, " ");
      const demo = (v.retail_price_cents / 100).toFixed(2);
      return `${v.sku},${name},${v.label_fr},${v.net_weight_g ?? ""},${demo},,`;
    })
    .sort(),
];
await writeFile(path("docs/prix-a-definir.csv"), lines.join("\n") + "\n", "utf8");
console.log(`  ✓ docs/prix-a-definir.csv — ${variantRows.length} formats à chiffrer`);

// --- Rappels ----------------------------------------------------------------------

const notes = seed.products.filter((p) => p.note);
if (notes.length > 0) {
  console.log("\n  À confirmer avec le fournisseur :");
  for (const product of notes) console.log(`    • ${product.fr} — ${product.note}`);
}

console.log(`
  ⚠️  Prix ET stocks affichés sont fictifs. Avant la première vente :
      1. saisir les vrais prix, puis passer price_is_provisional à faux
      2. passer site_settings.allow_provisional_prices à faux
      3. remettre les stocks à zéro :
         update public.stock_levels set quantity_on_hand = 0;
`);
