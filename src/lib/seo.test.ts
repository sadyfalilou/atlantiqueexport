import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Les deux modes de la boutique, éprouvés sans toucher à la base : basculer le
 * vrai réglage pour vérifier le mode réel reviendrait à ouvrir la boutique.
 */

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({ demo: true }));

vi.mock("@/lib/catalog/queries", () => ({
  getSiteSettings: async () => ({ allowProvisionalPrices: state.demo }),
  getProducts: async () => [{ slug: "thiakry" }],
  getCategories: async () => [
    { slug: "poudres-naturelles", isVirtual: false },
    { slug: "promotions", isVirtual: true },
  ],
  getRecipes: async () => [
    { slug: "jus-de-bissap", steps: [{ fr: "Infuser", en: "Steep" }] },
    { slug: "sans-etape", steps: [] },
  ],
  getIndexableSitePageSlugs: async () => ["livraison"],
}));

const { localizedAlternates, pageRobots, siteRobots } = await import("./seo");
const { default: robots } = await import("@/app/robots");
const { default: sitemap } = await import("@/app/sitemap");

describe("localizedAlternates", () => {
  it("donne à chaque page sa propre adresse, et ses trois liens de langue", () => {
    expect(localizedAlternates("en", "/produit/thiakry")).toEqual({
      canonical: "/en/produit/thiakry",
      languages: {
        fr: "/fr/produit/thiakry",
        en: "/en/produit/thiakry",
        "x-default": "/fr/produit/thiakry",
      },
    });
  });

  it("désigne l'accueil sans chemin", () => {
    expect(localizedAlternates("fr")?.canonical).toBe("/fr");
  });
});

describe("en mode démonstration", () => {
  beforeEach(() => {
    state.demo = true;
  });

  it("écarte tout le site de l'index, sans empêcher de lire le noindex", async () => {
    expect(await siteRobots()).toEqual({ index: false, follow: true });
  });

  it("ne laisse aucune page lever le blocage", async () => {
    // La fusion est superficielle : une page qui pose `robots` remplace celui
    // du gabarit. C'est ce qui aurait rouvert l'indexation.
    expect(await pageRobots(false)).toEqual({ index: false, follow: true });
  });

  it("autorise l'exploration mais n'annonce aucun plan", async () => {
    const result = await robots();
    expect(result.rules).toMatchObject({ allow: "/" });
    expect(result.sitemap).toBeUndefined();
  });

  it("publie un plan vide", async () => {
    expect(await sitemap()).toEqual([]);
  });
});

describe("en mode réel", () => {
  beforeEach(() => {
    state.demo = false;
  });

  it("rend le site indexable", async () => {
    expect(await siteRobots()).toEqual({ index: true, follow: true });
    expect(await pageRobots(false)).toEqual({ index: true, follow: true });
  });

  it("garde hors de l'index les pages qui ont leurs raisons", async () => {
    expect(await pageRobots(true)).toEqual({ index: false, follow: true });
  });

  it("annonce le plan du site, sur l'adresse www", async () => {
    expect((await robots()).sitemap).toBe("https://www.atlantiqueexport.com/sitemap.xml");
  });

  it("déclare chaque page dans les deux langues, liens de langue compris", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain("https://www.atlantiqueexport.com/fr/produit/thiakry");
    expect(urls).toContain("https://www.atlantiqueexport.com/en/produit/thiakry");
    expect(urls).toContain("https://www.atlantiqueexport.com/fr/livraison");

    // 6 rubriques + 1 catégorie + 1 produit + 1 recette + 1 page, × 2 langues.
    expect(entries).toHaveLength(20);

    const fiche = entries.find((e) => e.url.endsWith("/en/produit/thiakry"));
    expect(fiche?.alternates?.languages).toEqual({
      fr: "https://www.atlantiqueexport.com/fr/produit/thiakry",
      en: "https://www.atlantiqueexport.com/en/produit/thiakry",
      "x-default": "https://www.atlantiqueexport.com/fr/produit/thiakry",
    });
  });

  it("n'y met ni les rayons calculés, ni les recettes sans étape", async () => {
    const urls = (await sitemap()).map((e) => e.url).join("\n");
    expect(urls).not.toContain("/boutique/promotions");
    expect(urls).not.toContain("/recettes/sans-etape");
  });
});
