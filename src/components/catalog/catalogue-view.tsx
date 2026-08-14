import { getTranslations } from "next-intl/server";
import { Container, Section } from "@/components/ui/layout-primitives";
import { FilterPanel } from "@/components/catalog/filter-panel";
import { MobileFilters } from "@/components/catalog/mobile-filters";
import { ProductGrid } from "@/components/catalog/product-grid";
import { SortSelect } from "@/components/catalog/sort-select";
import { countActiveFilters, type CatalogFilters } from "@/lib/catalog/filters";
import type { Category, Locale, Product } from "@/lib/types";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Vue de catalogue, partagée par la boutique, les pages de catégorie, les
 * nouveautés et les promotions. Toutes affichent la même chose : un en-tête,
 * des filtres, un tri, une grille.
 */
export async function CatalogueView({
  title,
  subtitle,
  products,
  categories,
  filters,
  params,
  pathname,
  locale,
  showFilters = true,
}: {
  title: string;
  subtitle?: string;
  products: Product[];
  categories: Category[];
  filters: CatalogFilters;
  params: SearchParams;
  pathname: string;
  locale: Locale;
  showFilters?: boolean;
}) {
  const t = await getTranslations("shop");
  const activeCount = countActiveFilters(filters);

  const panel = showFilters ? (
    <FilterPanel
      categories={categories}
      filters={filters}
      params={params}
      pathname={pathname}
      locale={locale}
    />
  ) : null;

  return (
    <Section className="py-8 lg:py-14">
      <Container>
        <header className="mb-8">
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900 lg:text-[2.5rem]">
            {title}
          </h1>
          {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
        </header>

        {/* Les deux colonnes ne valent QUE s'il y a un panneau de filtres.
            Sans lui, l'`aside` n'est pas rendu, la liste de produits devient le
            premier enfant de la grille et hérite de la colonne de 16 rem
            prévue pour les filtres : les cartes se retrouvaient écrasées sur
            un quart de la largeur. C'est ce qui arrivait aux pages Nouveautés
            et Promotions, qui masquent les filtres. */}
        <div className={panel ? "lg:grid lg:grid-cols-[16rem_1fr] lg:gap-10" : undefined}>
          {panel ? (
            <aside className="hidden lg:block" aria-label={t("filters")}>
              {panel}
            </aside>
          ) : null}

          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="tabular text-sm text-muted" aria-live="polite">
                {t("results", { count: products.length })}
              </p>
              <div className="flex w-full items-center gap-3 sm:w-auto">
                {panel ? (
                  <MobileFilters activeCount={activeCount}>{panel}</MobileFilters>
                ) : null}
                <SortSelect
                  value={filters.sort}
                  pathname={pathname}
                  query={params}
                />
              </div>
            </div>

            <ProductGrid products={products} locale={locale} />
          </div>
        </div>
      </Container>
    </Section>
  );
}
