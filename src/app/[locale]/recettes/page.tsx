import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Users } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section } from "@/components/ui/layout-primitives";
import { EmptyState } from "@/components/shared/empty-state";
import { getRecipes } from "@/lib/catalog/queries";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/types";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "recipes" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function RecipesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const t = await getTranslations("recipes");
  const recipes = await getRecipes(50);

  return (
    <Section className="py-8 lg:py-14">
      <Container>
        <header className="mb-8">
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900 lg:text-[2.5rem]">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-[42rem] text-muted">{t("subtitle")}</p>
        </header>

        {recipes.length === 0 ? (
          <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => {
              const total = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
              // Une recette sans étapes n'est pas encore écrite. On l'annonce
              // plutôt que de laisser le visiteur ouvrir une page vide.
              const written = recipe.steps.length > 0;

              return (
                <li key={recipe.id}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-shadow hover:shadow-md">
                    <div className="flex aspect-[16/10] items-center justify-center bg-cream-100">
                      <span
                        aria-hidden="true"
                        className="font-display text-4xl font-semibold text-forest-800/20"
                      >
                        {recipe.title[typedLocale].charAt(0)}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <h2 className="font-display text-lg font-semibold text-forest-900">
                        <Link
                          href={`/recettes/${recipe.slug}`}
                          className="after:absolute after:inset-0 hover:underline"
                        >
                          {recipe.title[typedLocale]}
                        </Link>
                      </h2>

                      <p className="mt-1 flex-1 text-sm text-muted">
                        {recipe.description[typedLocale]}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
                        {total > 0 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock aria-hidden="true" className="size-4" />
                            {t("minutes", { count: total })}
                          </span>
                        ) : null}
                        {recipe.servings > 0 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Users aria-hidden="true" className="size-4" />
                            {t("servings", { count: recipe.servings })}
                          </span>
                        ) : null}
                      </div>

                      {!written ? (
                        <p className="mt-3 text-xs text-warning">{t("comingSoon")}</p>
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </Section>
  );
}
