import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import {
  getCategories,
  getIndexableSitePageSlugs,
  getProducts,
  getRecipes,
} from "@/lib/catalog/queries";
import { isIndexable, SITE_URL } from "@/lib/seo";

/**
 * Plan du site, construit depuis la base.
 *
 * Relu toutes les cinq minutes, comme les pages : un produit publié y entre, un
 * produit retiré en sort, sans redéploiement.
 */
export const revalidate = 300;

/** Pages de rubrique, qui existent indépendamment du contenu en base. */
const SECTIONS = ["", "/boutique", "/nouveautes", "/promotions", "/recettes", "/arrivages"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // En démonstration, toutes les pages portent `noindex`. Les déclarer ici
  // serait se contredire, et la Search Console le signalerait comme une erreur
  // sur chaque adresse. Le plan reste donc vide jusqu'à l'ouverture.
  if (!(await isIndexable())) return [];

  const [products, categories, recipes, pages] = await Promise.all([
    getProducts(1000),
    getCategories(),
    getRecipes(200),
    getIndexableSitePageSlugs(),
  ]);

  const paths = [
    ...SECTIONS,
    // Les rayons calculés (Nouveautés, Promotions) sont déjà dans SECTIONS.
    ...categories.filter((c) => !c.isVirtual).map((c) => `/boutique/${c.slug}`),
    // Épuisés compris : une fiche en rupture reste une page utile et indexable.
    ...products.map((p) => `/produit/${p.slug}`),
    // Une recette sans étape affiche « en cours de rédaction » : elle n'a rien à
    // faire dans un plan soumis aux moteurs.
    ...recipes.filter((r) => r.steps.length > 0).map((r) => `/recettes/${r.slug}`),
    ...pages.map((slug) => `/${slug}`),
  ];

  const languagesOf = (path: string): Record<string, string> => ({
    ...Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])),
    "x-default": `${SITE_URL}/${routing.defaultLocale}${path}`,
  });

  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      alternates: { languages: languagesOf(path) },
    })),
  );
}
