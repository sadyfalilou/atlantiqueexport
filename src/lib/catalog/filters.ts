import type { Product, ProductVariant, TemperatureClass } from "@/lib/types";

/**
 * Filtres et tri du catalogue.
 *
 * L'état vit entièrement dans l'URL : une sélection de filtres se partage par
 * copier-coller, se met en favori, revient avec le bouton « précédent » et
 * reste indexable. Les paramètres sont en français, comme les routes.
 *
 * Le tri et le filtre par prix travaillent sur la variante la moins chère de
 * chaque produit, puisque c'est elle qui s'affiche sur la carte.
 */

export const SORT_OPTIONS = [
  "popularite",
  "nouveautes",
  "prix-croissant",
  "prix-decroissant",
  "promotions",
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export const TEMPERATURES: TemperatureClass[] = [
  "ambient",
  "fresh",
  "refrigerated",
  "frozen",
];

export interface CatalogFilters {
  category?: string;
  brand?: string;
  temperatures: TemperatureClass[];
  onlyPromo: boolean;
  onlyNew: boolean;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort: SortOption;
}

/** Noms des paramètres d'URL, en un seul endroit. */
export const PARAM = {
  category: "categorie",
  brand: "marque",
  temperature: "temperature",
  promo: "promo",
  isNew: "nouveau",
  minPrice: "prix-min",
  maxPrice: "prix-max",
  sort: "tri",
} as const;

type SearchParams = Record<string, string | string[] | undefined>;

const asArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/** Convertit un montant saisi en dollars (« 12,50 ») en cents entiers. */
function parsePrice(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

export function parseFilters(params: SearchParams): CatalogFilters {
  const sortValue = params[PARAM.sort];
  const sort = SORT_OPTIONS.includes(sortValue as SortOption)
    ? (sortValue as SortOption)
    : "popularite";

  return {
    category: (params[PARAM.category] as string) || undefined,
    brand: (params[PARAM.brand] as string) || undefined,
    temperatures: asArray(params[PARAM.temperature]).filter((t): t is TemperatureClass =>
      TEMPERATURES.includes(t as TemperatureClass),
    ),
    onlyPromo: params[PARAM.promo] === "1",
    onlyNew: params[PARAM.isNew] === "1",
    minPriceCents: parsePrice(params[PARAM.minPrice] as string),
    maxPriceCents: parsePrice(params[PARAM.maxPrice] as string),
    sort,
  };
}

/**
 * Reconstruit une chaîne de requête en modifiant un seul paramètre.
 * Passer `null` le retire — c'est ainsi qu'un filtre se décoche.
 */
export function buildQuery(
  params: SearchParams,
  changes: Record<string, string | string[] | null>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key in changes) continue;
    for (const item of asArray(value)) search.append(key, item);
  }

  for (const [key, value] of Object.entries(changes)) {
    if (value === null) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== "") search.append(key, item);
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Ajoute ou retire une valeur d'un paramètre à choix multiples. */
export function toggleValue(
  params: SearchParams,
  key: string,
  value: string,
): string {
  const current = asArray(params[key]);
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  return buildQuery(params, { [key]: next.length > 0 ? next : null });
}

export function countActiveFilters(filters: CatalogFilters): number {
  return (
    (filters.category ? 1 : 0) +
    (filters.brand ? 1 : 0) +
    filters.temperatures.length +
    (filters.onlyPromo ? 1 : 0) +
    (filters.onlyNew ? 1 : 0) +
    (filters.minPriceCents !== undefined ? 1 : 0) +
    (filters.maxPriceCents !== undefined ? 1 : 0)
  );
}

/* -------------------------------------------------------------------------- */
/* Application des filtres                                                     */
/* -------------------------------------------------------------------------- */

export function entryVariant(product: Product): ProductVariant {
  return product.variants.reduce((cheapest, current) =>
    current.retailPriceCents < cheapest.retailPriceCents ? current : cheapest,
  );
}

export function hasPromotion(product: Product): boolean {
  return product.variants.some(
    (v) => v.compareAtPriceCents != null && v.compareAtPriceCents > v.retailPriceCents,
  );
}

/**
 * Le filtrage par prix et le tri se font en mémoire : le prix vit sur la
 * variante, et trier des produits par « prix de leur variante la moins chère »
 * demanderait une vue SQL dédiée. À l'échelle du catalogue — quelques dizaines
 * de références — c'est inutile. À revoir au-delà de quelques milliers.
 */
export function applyFilters(
  products: Product[],
  filters: CatalogFilters,
): Product[] {
  const filtered = products.filter((product) => {
    if (product.variants.length === 0) return false;
    if (filters.onlyPromo && !hasPromotion(product)) return false;
    if (filters.onlyNew && !product.isNew) return false;

    // Un produit entre dans la fourchette dès qu'UN de ses formats y entre,
    // pas seulement le moins cher. Sans cela, chercher les produits à plus de
    // 25 $ ne renverrait rien alors que plusieurs sacs d'un kilo dépassent ce
    // montant : leur sachet de 500 g, lui, est en dessous.
    const withinRange = product.variants.some((variant) => {
      const price = variant.retailPriceCents;
      if (filters.minPriceCents !== undefined && price < filters.minPriceCents) {
        return false;
      }
      if (filters.maxPriceCents !== undefined && price > filters.maxPriceCents) {
        return false;
      }
      return true;
    });

    return withinRange;
  });

  return sortProducts(filtered, filters.sort);
}

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const sorted = [...products];
  const price = (p: Product) => entryVariant(p).retailPriceCents;

  switch (sort) {
    case "prix-croissant":
      return sorted.sort((a, b) => price(a) - price(b));
    case "prix-decroissant":
      return sorted.sort((a, b) => price(b) - price(a));
    case "nouveautes":
      return sorted.sort(
        (a, b) => Number(b.isNew) - Number(a.isNew) || a.name.fr.localeCompare(b.name.fr),
      );
    case "promotions":
      return sorted.sort(
        (a, b) =>
          Number(hasPromotion(b)) - Number(hasPromotion(a)) ||
          a.name.fr.localeCompare(b.name.fr),
      );
    case "popularite":
    default:
      // Faute de données de vente, « populaire » signifie « mis en avant par
      // l'équipe ». Le tri deviendra réel quand les commandes existeront.
      return sorted.sort(
        (a, b) =>
          Number(b.isFeatured) - Number(a.isFeatured) ||
          a.name.fr.localeCompare(b.name.fr),
      );
  }
}
