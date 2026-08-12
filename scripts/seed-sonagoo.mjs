/**
 * Importe le catalogue Sonagoo dans Supabase.
 *
 *   npm run seed:sonagoo
 *
 * Rejouable sans créer de doublons : tout passe par des upserts sur `slug`
 * ou `sku`. Relancer le script après avoir corrigé le fichier JSON met la
 * base à jour sans rien dupliquer.
 *
 * ⚠️ AUCUN PRIX N'EST IMPORTÉ. Le catalogue fournisseur est libellé en FCFA ;
 * les prix de vente canadiens seront saisis séparément. Les variantes sont
 * donc créées à 0, marquées `price_is_provisional`, et les produits restent
 * NON PUBLIÉS — un déclencheur en base refuse d'ailleurs de publier un
 * produit dont une variante attend encore son prix.
 *
 * Le script écrit ensuite docs/prix-a-definir.csv : la liste des formats à
 * chiffrer, prête à remplir.
 */

import { writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
process.loadEnvFile(fileURLToPath(new URL(".env.local", root)));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const secret = process.env.SUPABASE_SECRET_KEY.trim();

const headers = {
  apikey: secret,
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
};

async function request(path, init = {}) {
  // `init` est étalé EN PREMIER : sinon son propre champ `headers` écrase
  // l'objet fusionné et la requête part sans clé d'API.
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

/** Upsert sur une contrainte d'unicité, avec retour des lignes écrites. */
const upsert = (table, onConflict, rows) =>
  request(`/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });

/** Les formats du catalogue Sonagoo, traduits en variantes vendables. */
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

const seed = JSON.parse(
  await readFile(fileURLToPath(new URL("supabase/seed/sonagoo.json", root)), "utf8"),
);

console.log("\nImport du catalogue Sonagoo\n");

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

// --- Marque ------------------------------------------------------------------

const [brand] = await upsert("brands", "slug", [
  {
    slug: seed.brand.slug,
    name: seed.brand.name,
    description_fr: seed.brand.description_fr,
    description_en: seed.brand.description_en,
    origin_country: seed.brand.origin_country,
    is_partner: seed.brand.is_partner,
    is_active: true,
  },
]);
console.log(`  ✓ marque ${brand.name}`);

// --- Fournisseur -------------------------------------------------------------
// Pas de contrainte d'unicité sur le nom : on cherche avant d'insérer.

const existingSuppliers = await get(
  `/rest/v1/suppliers?name=eq.${encodeURIComponent(seed.supplier.name)}&select=id`,
);
let supplierId = existingSuppliers[0]?.id;
if (!supplierId) {
  const [created] = await request("/rest/v1/suppliers", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([seed.supplier]),
  });
  supplierId = created.id;
}
console.log(`  ✓ fournisseur ${seed.supplier.name} (table interne)`);

// --- Produits ----------------------------------------------------------------

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
    brand_id: brand.id,
    supplier_id: supplierId,
    origin_country: "SN",
    temperature_class: "ambient",
    tax_class: p.tax ?? "zero_rated",
    // Rien n'est encore en stock : le dire plutôt que de laisser croire
    // à une disponibilité immédiate.
    availability_status: "coming_soon",
    allergens: p.allergens ?? [],
    // Non publié : le prix de vente canadien n'est pas fixé.
    published_at: null,
  })),
);
const productId = Object.fromEntries(products.map((p) => [p.slug, p.id]));
console.log(`  ✓ ${products.length} produits (non publiés)`);

// --- Variantes ---------------------------------------------------------------

const variantRows = [];
for (const product of seed.products) {
  product.formats.forEach((formatKey, index) => {
    const format = FORMATS[formatKey];
    if (!format) throw new Error(`Format inconnu : ${formatKey}`);
    variantRows.push({
      product_id: productId[product.slug],
      sku: `AE-SNG-${product.code}-${formatKey.toUpperCase()}`,
      label_fr: format.fr,
      label_en: format.en,
      sale_unit: format.unit,
      net_weight_g: format.g,
      retail_price_cents: 0,
      price_is_provisional: true,
      position: index,
      is_active: true,
    });
  });
}

const variants = await upsert("product_variants", "sku", variantRows);
console.log(`  ✓ ${variants.length} variantes, toutes en prix provisoire`);

// --- Fichier de saisie des prix ----------------------------------------------

const bySlug = Object.fromEntries(seed.products.map((p) => [p.slug, p]));
const productBySku = Object.fromEntries(
  variantRows.map((v) => [
    v.sku,
    seed.products.find((p) => productId[p.slug] === v.product_id),
  ]),
);

const lines = [
  "sku,produit,format,poids_g,prix_detail_cad,prix_gros_cad",
  ...variantRows
    .map((v) => {
      const product = productBySku[v.sku];
      const name = product.fr.replace(/,/g, " ");
      return `${v.sku},${name},${v.label_fr},${v.net_weight_g ?? ""},,`;
    })
    .sort(),
];
await writeFile(
  fileURLToPath(new URL("docs/prix-a-definir.csv", root)),
  lines.join("\n") + "\n",
  "utf8",
);
console.log(`  ✓ docs/prix-a-definir.csv — ${variantRows.length} lignes à chiffrer`);

// --- Points à trancher --------------------------------------------------------

const notes = Object.values(bySlug).filter((p) => p.note);
if (notes.length > 0) {
  console.log("\n  Points à confirmer avec le fournisseur :");
  for (const product of notes) {
    console.log(`    • ${product.fr} — ${product.note}`);
  }
}

console.log("\nImport terminé.\n");
