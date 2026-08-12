import { ArrowRight, Clock, MessageSquare, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Container,
  Section,
  SectionHeading,
} from "@/components/ui/layout-primitives";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SocialPhotoIcon } from "@/components/shared/social-icon";
import { getBrands, getRecipes } from "@/lib/catalog/queries";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export async function BrandsSection({ locale }: { locale: Locale }) {
  const t = await getTranslations("home.brands");
  const brands = await getBrands();

  return (
    <Section className="bg-cream-100">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/marques/${brand.slug}`}
                className="flex h-full flex-col rounded-lg border border-line bg-surface p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-12 shrink-0 items-center justify-center rounded-md bg-cream-100 font-display text-xl font-semibold text-forest-800"
                  >
                    {brand.name.charAt(0)}
                  </span>
                  <span className="font-display text-lg font-semibold text-forest-900">
                    {brand.name}
                  </span>
                </div>
                {brand.description ? (
                  <p className="mt-3 text-sm text-muted">
                    {brand.description[locale]}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

export async function RecipesSection({ locale }: { locale: Locale }) {
  const t = await getTranslations("home.recipes");
  const recipes = await getRecipes(3);

  return (
    <Section>
      <Container>
        <SectionHeading
          title={t("title")}
          subtitle={t("subtitle")}
          action={
            <Link
              href="/recettes"
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-mango-800 hover:underline"
            >
              {t("cta")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          }
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-shadow hover:shadow-md">
                <div className="flex aspect-[16/10] items-center justify-center bg-cream-100">
                  <span
                    aria-hidden="true"
                    className="font-display text-4xl font-semibold text-forest-800/20"
                  >
                    {recipe.title[locale].charAt(0)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-display text-lg font-semibold text-forest-900">
                    <Link href={`/recettes/${recipe.slug}`}>
                      {recipe.title[locale]}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    {recipe.description[locale]}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock aria-hidden="true" className="size-3.5" />
                      {t("minutes", {
                        count: recipe.prepTimeMinutes + recipe.cookTimeMinutes,
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users aria-hidden="true" className="size-3.5" />
                      {t("servings", { count: recipe.servings })}
                    </span>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

export async function AboutSection() {
  const t = await getTranslations("home.about");

  return (
    <Section className="bg-forest-800 text-cream-50">
      <Container>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-[1.75rem] font-semibold lg:text-[2.25rem]">
              {t("title")}
            </h2>
            <p className="mt-4 max-w-[38rem] text-cream-200">{t("body")}</p>
            <Link
              href="/a-propos"
              className={cn(
                buttonVariants({ size: "md" }),
                "mt-6 border-2 border-cream-200 bg-transparent text-cream-50 hover:bg-forest-700",
              )}
            >
              {t("cta")}
            </Link>
          </div>
          <div
            aria-hidden="true"
            className="hidden aspect-[16/10] items-center justify-center rounded-xl border border-forest-700 bg-forest-900 lg:flex"
          >
            <span className="font-display text-5xl font-semibold text-cream-50/15">
              Montréal
            </span>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/**
 * Aucun avis fictif n'est affiché. La section existe et reste vide,
 * honnêtement, jusqu'aux premiers avis authentiques.
 */
export async function ReviewsSection() {
  const t = await getTranslations("home.reviews");

  return (
    <Section>
      <Container>
        <SectionHeading title={t("title")} />
        <EmptyState
          icon={<MessageSquare className="size-8" />}
          title={t("emptyTitle")}
          body={t("emptyBody")}
        />
      </Container>
    </Section>
  );
}

export async function SocialSection() {
  const t = await getTranslations("home.social");

  return (
    <Section className="bg-cream-100">
      <Container>
        <div className="flex flex-col items-center gap-4 text-center">
          <Badge variant="neutral">Instagram</Badge>
          <h2 className="font-display text-[1.5rem] font-semibold text-forest-900">
            {t("title")}
          </h2>
          <p className="max-w-[34rem] text-muted">{t("body")}</p>
          <a
            href="https://www.instagram.com/atlantique_export_/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "secondary", size: "md" }))}
          >
            <SocialPhotoIcon className="size-4" />
            @atlantique_export_
          </a>
        </div>
      </Container>
    </Section>
  );
}
