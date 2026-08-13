import { describe, expect, it } from "vitest";
import {
  applyFilters,
  buildQuery,
  entryVariant,
  parseFilters,
  sortProducts,
  toggleValue,
} from "./filters";
import type { Product, ProductVariant } from "@/lib/types";

function variant(id: string, cents: number, compareAt?: number): ProductVariant {
  return {
    id,
    sku: id,
    label: { fr: id, en: id },
    saleUnit: "bag",
    netWeightG: 500,
    isVariableWeight: false,
    retailPriceCents: cents,
    compareAtPriceCents: compareAt ?? null,
    minQty: 1,
    stepQty: 1,
  };
}

function product(
  slug: string,
  variants: ProductVariant[],
  extra: Partial<Product> = {},
): Product {
  return {
    id: slug,
    slug,
    name: { fr: slug, en: slug },
    shortDescription: { fr: "", en: "" },
    categorySlug: "poudres-naturelles",
    brandSlug: null,
    originCountry: "SN",
    temperatureClass: "ambient",
    taxClass: "zero_rated",
    stockStatus: "in_stock",
    variants,
    tags: [],
    allergens: [],
    isFeatured: false,
    isNew: false,
    ...extra,
  };
}

const base = { temperatures: [], onlyPromo: false, onlyNew: false, sort: "popularite" as const };

describe("parseFilters", () => {
  it("retient les valeurs par défaut sur une URL vide", () => {
    const filters = parseFilters({});
    expect(filters.sort).toBe("popularite");
    expect(filters.temperatures).toEqual([]);
    expect(filters.onlyPromo).toBe(false);
  });

  it("ignore un tri inconnu plutôt que de le propager", () => {
    expect(parseFilters({ tri: "n-importe-quoi" }).sort).toBe("popularite");
  });

  it("écarte les températures qui ne font pas partie du domaine", () => {
    expect(parseFilters({ temperature: ["frozen", "tiède"] }).temperatures).toEqual([
      "frozen",
    ]);
  });

  it("accepte la virgule décimale dans les prix", () => {
    expect(parseFilters({ "prix-min": "12,50" }).minPriceCents).toBe(1250);
  });

  it("refuse un prix négatif ou illisible", () => {
    expect(parseFilters({ "prix-min": "-5" }).minPriceCents).toBeUndefined();
    expect(parseFilters({ "prix-max": "abc" }).maxPriceCents).toBeUndefined();
  });
});

describe("buildQuery et toggleValue", () => {
  it("conserve les paramètres non touchés", () => {
    expect(buildQuery({ tri: "prix-croissant" }, { promo: "1" })).toContain(
      "tri=prix-croissant",
    );
  });

  it("retire un paramètre passé à null", () => {
    expect(buildQuery({ promo: "1" }, { promo: null })).toBe("");
  });

  it("ajoute puis retire une valeur multiple", () => {
    const added = toggleValue({}, "temperature", "frozen");
    expect(added).toBe("?temperature=frozen");
    expect(toggleValue({ temperature: "frozen" }, "temperature", "frozen")).toBe("");
  });
});

describe("applyFilters", () => {
  const cheap = product("bon-marche", [variant("a", 349)]);
  const mixed = product("mixte", [variant("b", 1499), variant("c", 2699)]);
  const promo = product("promo", [variant("d", 999, 1299)]);
  const fresh = product("nouveau", [variant("e", 500)], { isNew: true });
  const catalogue = [cheap, mixed, promo, fresh];

  it("ne garde que les produits en promotion", () => {
    expect(applyFilters(catalogue, { ...base, onlyPromo: true })).toEqual([promo]);
  });

  it("ne garde que les nouveautés", () => {
    expect(applyFilters(catalogue, { ...base, onlyNew: true })).toEqual([fresh]);
  });

  it("retient un produit dès qu'UN de ses formats entre dans la fourchette", () => {
    // Régression : le filtre portait auparavant sur la seule variante la moins
    // chère, si bien qu'un sac d'un kilo à 26,99 $ restait introuvable en
    // cherchant les produits à plus de 25 $.
    const result = applyFilters(catalogue, { ...base, minPriceCents: 2500 });
    expect(result).toEqual([mixed]);
  });

  it("écarte un produit sans aucune variante", () => {
    const empty = product("vide", []);
    expect(applyFilters([empty], base)).toEqual([]);
  });
});

describe("sortProducts", () => {
  const a = product("a", [variant("a", 500)]);
  const b = product("b", [variant("b", 100)]);
  const c = product("c", [variant("c", 300)], { isFeatured: true });

  it("trie par prix croissant sur la variante la moins chère", () => {
    expect(sortProducts([a, b, c], "prix-croissant").map((p) => p.slug)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("trie par prix décroissant", () => {
    expect(sortProducts([a, b, c], "prix-decroissant").map((p) => p.slug)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("place les produits mis en avant en tête du tri par popularité", () => {
    expect(sortProducts([a, b, c], "popularite")[0].slug).toBe("c");
  });

  it("ne modifie pas le tableau reçu", () => {
    const input = [a, b];
    sortProducts(input, "prix-croissant");
    expect(input.map((p) => p.slug)).toEqual(["a", "b"]);
  });
});

describe("entryVariant", () => {
  it("retient la variante la moins chère, quel que soit son rang", () => {
    const p = product("p", [variant("gros", 2699), variant("petit", 1499)]);
    expect(entryVariant(p).id).toBe("petit");
  });
});
