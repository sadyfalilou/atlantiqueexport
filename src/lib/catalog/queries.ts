/**
 * Couche d'accès au catalogue.
 *
 * Toutes les fonctions sont asynchrones bien que les données de démonstration
 * soient synchrones : c'est la signature qu'auront les requêtes Supabase du
 * lot 2. Les composants n'auront donc pas à changer lorsque la vraie base
 * remplacera le fichier de démonstration.
 */

import {
  demoBrands,
  demoCategories,
  demoProducts,
  demoRecipes,
  demoShipments,
} from "@/data/demo-catalog";
import type {
  Brand,
  Category,
  Product,
  Recipe,
  Shipment,
} from "@/lib/types";

export async function getCategories(): Promise<Category[]> {
  return [...demoCategories].sort((a, b) => a.position - b.position);
}

export async function getMegaMenuCategories(): Promise<Category[]> {
  return (await getCategories()).filter((c) => c.showInMegaMenu);
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | undefined> {
  return demoCategories.find((c) => c.slug === slug);
}

export async function getBrands(): Promise<Brand[]> {
  return demoBrands;
}

export async function getBrandBySlug(slug: string): Promise<Brand | undefined> {
  return demoBrands.find((b) => b.slug === slug);
}

export async function getProducts(): Promise<Product[]> {
  return demoProducts;
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  return demoProducts.find((p) => p.slug === slug);
}

export async function getProductsByCategory(
  categorySlug: string,
): Promise<Product[]> {
  return demoProducts.filter((p) => p.categorySlug === categorySlug);
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  return demoProducts.filter((p) => p.isFeatured).slice(0, limit);
}

export async function getNewProducts(limit = 8): Promise<Product[]> {
  return demoProducts.filter((p) => p.isNew).slice(0, limit);
}

/** Un produit est en promotion dès qu'une de ses variantes porte un prix barré. */
export async function getPromotedProducts(limit = 8): Promise<Product[]> {
  return demoProducts
    .filter((p) =>
      p.variants.some(
        (v) =>
          v.compareAtPriceCents != null &&
          v.compareAtPriceCents > v.retailPriceCents,
      ),
    )
    .slice(0, limit);
}

export async function getColdProducts(limit = 8): Promise<Product[]> {
  return demoProducts
    .filter(
      (p) =>
        p.temperatureClass === "frozen" || p.temperatureClass === "refrigerated",
    )
    .slice(0, limit);
}

export async function getFreshProducts(limit = 8): Promise<Product[]> {
  return demoProducts
    .filter((p) => p.temperatureClass === "fresh")
    .slice(0, limit);
}

export async function getNaturalProducts(limit = 8): Promise<Product[]> {
  return demoProducts
    .filter((p) => p.categorySlug === "poudres-naturelles")
    .slice(0, limit);
}

export async function getOpenShipments(): Promise<Shipment[]> {
  return demoShipments.filter(
    (s) => !["completed", "cancelled"].includes(s.status),
  );
}

export async function getRecipes(limit?: number): Promise<Recipe[]> {
  return limit ? demoRecipes.slice(0, limit) : demoRecipes;
}

export async function getRecipeBySlug(
  slug: string,
): Promise<Recipe | undefined> {
  return demoRecipes.find((r) => r.slug === slug);
}

/** Prix affiché : la variante la moins chère, celle qui sert d'entrée de gamme. */
export function getEntryVariant(product: Product) {
  return product.variants.reduce((cheapest, current) =>
    current.retailPriceCents < cheapest.retailPriceCents ? current : cheapest,
  );
}
