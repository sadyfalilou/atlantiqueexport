import "server-only";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { getSiteSettings } from "@/lib/catalog/queries";

/**
 * Référencement : une seule source pour l'adresse du site, les liens entre
 * langues et la décision d'indexer.
 *
 * Tout était auparavant dispersé, et deux défauts en sont nés, constatés en
 * ligne le 13 septembre 2026 :
 *
 * 1. Les adresses pointaient vers `atlantiqueexport.com`, qui redirige vers
 *    `www`. Chaque page désignait donc comme « vraie » adresse une URL qui
 *    envoie ailleurs.
 * 2. Le gabarit posait `alternates: { canonical: "/fr" }`, et la fusion des
 *    métadonnées est superficielle : toute page qui ne redéfinissait pas ce
 *    bloc en héritait tel quel. Boutique, Nouveautés, Recettes, Arrivages,
 *    Promotions et les pages de contenu se déclaraient ainsi doublons de
 *    l'accueil. Celles qui le redéfinissaient perdaient au contraire leurs
 *    liens de langue.
 *
 * Chaque page publique appelle donc `localizedAlternates` avec son propre
 * chemin, qui produit ensemble l'adresse canonique et les liens de langue.
 */

/** L'adresse que Vercel sert réellement : l'apex y redirige. */
export const SITE_URL = "https://www.atlantiqueexport.com";

/**
 * Adresse canonique et liens de langue d'une page.
 *
 * `path` est le chemin sans préfixe de langue : « /boutique », « /produit/x »,
 * ou rien pour l'accueil. Les adresses sont identiques dans les deux langues —
 * seul le préfixe change — ce qui permet de les construire sans table de
 * correspondance.
 */
export function localizedAlternates(locale: string, path = ""): Metadata["alternates"] {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, `/${l}${path}`]),
  );
  // `x-default` : la version servie à qui ne parle ni français ni anglais.
  languages["x-default"] = `/${routing.defaultLocale}${path}`;

  return { canonical: `/${locale}${path}`, languages };
}

/**
 * Le site peut-il être indexé ?
 *
 * Seulement quand la boutique est en mode réel. En mode démonstration, les
 * pages affichent des prix inventés : les laisser indexer, c'est les voir
 * resurgir dans les résultats de recherche après l'ouverture.
 *
 * Le même interrupteur bloque déjà les données structurées des produits. Le
 * jour où la boutique passe en mode réel, le site devient indexable de lui-même
 * — la bascule revalide tout le gabarit.
 */
export async function isIndexable(): Promise<boolean> {
  const settings = await getSiteSettings();
  return !settings.allowProvisionalPrices;
}

/**
 * Consigne d'indexation posée par le gabarit, donc héritée par toute page qui
 * n'en définit pas.
 *
 * `follow` reste vrai en démonstration : Google doit pouvoir parcourir les
 * pages pour y lire le `noindex`. Le bloquer dans `robots.txt` aurait l'effet
 * inverse — une page qu'il ne peut pas lire, il ne peut pas apprendre à ne pas
 * l'indexer.
 */
export async function siteRobots(): Promise<Metadata["robots"]> {
  return (await isIndexable())
    ? { index: true, follow: true }
    : { index: false, follow: true };
}

/**
 * Pour une page qui a ses propres raisons de ne pas être indexée.
 *
 * ⚠️ La fusion étant superficielle, une page qui définit `robots` REMPLACE
 * celui du gabarit. Rendre `undefined` ou `{ index: true }` en démonstration
 * lèverait le blocage pour cette page. Cette fonction garantit que le mode
 * démonstration l'emporte toujours.
 */
export async function pageRobots(restricted: boolean): Promise<Metadata["robots"]> {
  if (restricted || !(await isIndexable())) return { index: false, follow: true };
  return { index: true, follow: true };
}
