import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, Section } from "@/components/ui/layout-primitives";
import { Prose } from "@/components/shared/prose";
import { getSitePage, getSitePageSlugs } from "@/lib/catalog/queries";
import type { Locale } from "@/lib/types";

/**
 * Route attrape-tout sous `[locale]`, qui sert deux rôles.
 *
 * 1. **Les pages institutionnelles.** Le chemin est cherché dans la table
 *    `pages` : « livraison », « politiques/confidentialite »… Ajouter une page
 *    ne demande donc aucun code, seulement une ligne en base. La politique RLS
 *    ne rend visibles que les pages publiées : un brouillon reste introuvable
 *    même si son adresse est devinée.
 *
 * 2. **Le reste.** Sans cette route, une URL inconnue sous un segment
 *    dynamique servirait le 404 brut de Next.js, hors de notre mise en page.
 *    `notFound()` affiche le nôtre, avec l'en-tête, le pied de page et le
 *    message expliquant que la section est encore en construction.
 *
 * Les routes statiques ayant priorité, ce fichier s'efface de lui-même au fur
 * et à mesure que de vraies pages sont créées.
 */

export const revalidate = 300;

type Params = { locale: string; rest: string[] };

export async function generateStaticParams() {
  const slugs = await getSitePageSlugs();
  return slugs.map((slug) => ({ rest: slug.split("/") }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, rest } = await params;
  const page = await getSitePage(rest.join("/"));
  if (!page) return {};

  const typedLocale = locale as Locale;
  return {
    title: page.title[typedLocale],
    // Un brouillon juridique n'a rien à faire dans un moteur de recherche : il
    // serait cité comme la position de l'entreprise avant d'avoir été relu.
    robots: page.isDraftLegal ? { index: false, follow: true } : undefined,
  };
}

export default async function CatchAllRoute({ params }: { params: Promise<Params> }) {
  const { locale, rest } = await params;
  setRequestLocale(locale);

  const page = await getSitePage(rest.join("/"));
  if (!page) notFound();

  const typedLocale = locale as Locale;
  const t = await getTranslations("pages");

  const updated = new Date(page.updatedAt).toLocaleDateString(
    typedLocale === "en" ? "en-CA" : "fr-CA",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <Section className="py-8 lg:py-14">
      <Container>
        <article className="mx-auto max-w-[46rem]">
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900 lg:text-[2.5rem]">
            {page.title[typedLocale]}
          </h1>

          <p className="mt-2 text-sm text-muted">{t("updated", { date: updated })}</p>

          {page.isDraftLegal ? (
            <div
              role="note"
              className="mt-6 flex gap-3 rounded-lg border-2 border-mango-700 bg-mango-50 p-4"
            >
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-warning"
              />
              <div>
                <p className="font-semibold text-forest-900">{t("draftTitle")}</p>
                <p className="mt-1 text-sm text-forest-900">{t("draftBody")}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-8">
            <Prose body={page.body[typedLocale]} />
          </div>
        </article>
      </Container>
    </Section>
  );
}
