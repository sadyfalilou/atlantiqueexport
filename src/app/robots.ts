import type { MetadataRoute } from "next";
import { isIndexable, SITE_URL } from "@/lib/seo";

export const revalidate = 300;

/**
 * Consignes aux robots d'exploration.
 *
 * ⚠️ Même en démonstration, l'exploration reste AUTORISÉE. C'est le `noindex`
 * posé sur chaque page qui écarte le site de l'index. Interdire `/` ici aurait
 * l'effet inverse de celui recherché : Google ne pourrait plus lire ce
 * `noindex`, et garderait en mémoire les adresses qu'il connaît déjà, sans
 * contenu mais toujours affichées dans les résultats.
 *
 * Le plan du site n'est annoncé qu'à l'ouverture, pour la même raison qu'il
 * reste vide avant : ne pas soumettre des pages qu'on demande de ne pas indexer.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const indexable = await isIndexable();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Ni l'administration, ni les routes techniques, ni le retour des liens
      // envoyés par courriel n'ont de contenu à explorer.
      disallow: ["/admin", "/api/", "/auth/"],
    },
    ...(indexable ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  };
}
