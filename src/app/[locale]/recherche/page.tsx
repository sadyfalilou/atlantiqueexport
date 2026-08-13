import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, Section } from "@/components/ui/layout-primitives";
import { ProductGrid } from "@/components/catalog/product-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { searchProducts } from "@/lib/catalog/queries";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  // Les pages de résultats n'ont pas à être indexées : elles se déclinent à
  // l'infini et n'apportent rien à un moteur de recherche.
  return { title: t("title"), robots: { index: false } };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = await searchParams;
  const term = typeof query.q === "string" ? query.q : "";

  const t = await getTranslations("search");
  const results = term.trim() ? await searchProducts(term, 48) : [];

  return (
    <Section className="py-8 lg:py-14">
      <Container>
        <h1 className="font-display text-[1.75rem] font-semibold text-forest-900 lg:text-[2.5rem]">
          {t("title")}
        </h1>

        {/* Formulaire GET : la recherche a son adresse propre, partageable,
            et fonctionne sans JavaScript. */}
        <form action={`/${locale}/recherche`} method="get" className="mt-6 max-w-[36rem]">
          <label htmlFor="q" className="mb-2 block text-sm font-semibold text-forest-900">
            {t("label")}
          </label>
          <div className="flex gap-2">
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={term}
              autoFocus
              placeholder={t("placeholder")}
              className="h-12 min-w-0 flex-1 rounded-sm border border-line-strong bg-surface px-3 text-base text-forest-900 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
            />
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
            >
              {t("submit")}
            </button>
          </div>
          <p className="mt-2 text-sm text-muted">{t("hint")}</p>
        </form>

        <div className="mt-10">
          {!term.trim() ? null : results.length === 0 ? (
            <EmptyState
              icon={<Search className="size-8" />}
              title={t("noResultTitle", { term })}
              body={t("noResultBody")}
              action={
                <Link
                  href="/boutique"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  {t("browseShop")}
                </Link>
              }
            />
          ) : (
            <>
              <p className="mb-6 text-sm text-muted" aria-live="polite">
                {t("results", { count: results.length, term })}
              </p>
              <ProductGrid products={results} locale={locale as Locale} />
            </>
          )}
        </div>
      </Container>
    </Section>
  );
}
