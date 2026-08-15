import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogueView } from "@/components/catalog/catalogue-view";
import { applyFilters, parseFilters } from "@/lib/catalog/filters";
import { getCatalogue, getCategories } from "@/lib/catalog/queries";
import type { Locale } from "@/lib/types";

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = await searchParams;
  const filters = parseFilters(query);
  const t = await getTranslations("shop");

  const [categories, catalogue] = await Promise.all([
    getCategories(),
    getCatalogue({
      categorySlug: filters.category,
      brandSlug: filters.brand,
      temperatures: filters.temperatures,
    }),
  ]);

  return (
    <CatalogueView
      title={t("title")}
      subtitle={t("subtitle")}
      products={applyFilters(catalogue, filters)}
      categories={categories.filter((c) => !c.isVirtual)}
      filters={filters}
      params={query}
      pathname="/boutique"
      locale={locale as Locale}
    />
  );
}
