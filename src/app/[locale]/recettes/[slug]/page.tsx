import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, Users } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section } from "@/components/ui/layout-primitives";
import { getRecipeBySlug, getRecipes } from "@/lib/catalog/queries";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/types";

export const revalidate = 300;

export async function generateStaticParams() {
  const recipes = await getRecipes(50);
  return recipes.map((recipe) => ({ slug: recipe.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return {};

  const typedLocale = locale as Locale;
  return {
    title: recipe.title[typedLocale],
    description: recipe.description[typedLocale],
    alternates: { canonical: `/${locale}/recettes/${slug}` },
  };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();

  const typedLocale = locale as Locale;
  const t = await getTranslations("recipes");
  const total = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  const written = recipe.steps.length > 0;

  /**
   * Les données structurées ne sont émises que si la recette est écrite.
   * Déclarer une `Recipe` sans ingrédients ni étapes ferait remonter dans les
   * moteurs de recherche une fiche vide, au nom d'Atlantique Export.
   */
  const jsonLd = written
    ? {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: recipe.title[typedLocale],
        description: recipe.description[typedLocale],
        recipeYield: recipe.servings > 0 ? String(recipe.servings) : undefined,
        prepTime: recipe.prepTimeMinutes ? `PT${recipe.prepTimeMinutes}M` : undefined,
        cookTime: recipe.cookTimeMinutes ? `PT${recipe.cookTimeMinutes}M` : undefined,
        recipeIngredient: recipe.ingredients.map((line) => line[typedLocale]),
        recipeInstructions: recipe.steps.map((line, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          text: line[typedLocale],
        })),
      }
    : null;

  return (
    <Section className="py-6 lg:py-12">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <Container>
        <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/recettes" className="hover:underline">
                {t("title")}
              </Link>
            </li>
            <ChevronRight aria-hidden="true" className="size-3.5" />
            <li aria-current="page" className="text-forest-900">
              {recipe.title[typedLocale]}
            </li>
          </ol>
        </nav>

        <article className="mx-auto max-w-[46rem]">
          <h1 className="font-display text-[1.875rem] leading-tight font-semibold text-forest-900 lg:text-[2.5rem]">
            {recipe.title[typedLocale]}
          </h1>

          <p className="mt-3 text-lg text-muted">{recipe.description[typedLocale]}</p>

          <div className="mt-6 flex flex-wrap items-center gap-6 border-y border-line py-4 text-sm">
            {recipe.prepTimeMinutes > 0 ? (
              <span className="inline-flex items-center gap-2">
                <Clock aria-hidden="true" className="size-4 text-muted" />
                <span className="text-muted">{t("prep")}</span>
                <strong className="tabular text-forest-900">
                  {t("minutes", { count: recipe.prepTimeMinutes })}
                </strong>
              </span>
            ) : null}
            {recipe.cookTimeMinutes > 0 ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-muted">{t("cook")}</span>
                <strong className="tabular text-forest-900">
                  {t("minutes", { count: recipe.cookTimeMinutes })}
                </strong>
              </span>
            ) : null}
            {total > 0 && recipe.cookTimeMinutes > 0 ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-muted">{t("total")}</span>
                <strong className="tabular text-forest-900">
                  {t("minutes", { count: total })}
                </strong>
              </span>
            ) : null}
            {recipe.servings > 0 ? (
              <span className="inline-flex items-center gap-2">
                <Users aria-hidden="true" className="size-4 text-muted" />
                <strong className="tabular text-forest-900">
                  {t("servings", { count: recipe.servings })}
                </strong>
              </span>
            ) : null}
          </div>

          {!written ? (
            <p className="mt-8 rounded-lg border border-dashed border-line-strong bg-cream-50 p-5 text-muted">
              {t("notWrittenYet")}
            </p>
          ) : (
            <div className="mt-8 grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-12">
              <section>
                <h2 className="font-display text-xl font-semibold text-forest-900">
                  {t("ingredients")}
                </h2>
                {recipe.ingredients.length > 0 ? (
                  <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-muted">
                    {recipe.ingredients.map((line, index) => (
                      <li key={index}>{line[typedLocale]}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted">{t("noIngredients")}</p>
                )}
              </section>

              <section>
                <h2 className="font-display text-xl font-semibold text-forest-900">
                  {t("steps")}
                </h2>
                <ol className="mt-4 flex flex-col gap-4">
                  {recipe.steps.map((line, index) => (
                    <li key={index} className="flex gap-4">
                      <span
                        aria-hidden="true"
                        className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-forest-800 font-semibold text-cream-50"
                      >
                        {index + 1}
                      </span>
                      <p className="pt-1 text-muted">{line[typedLocale]}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </article>
      </Container>
    </Section>
  );
}
