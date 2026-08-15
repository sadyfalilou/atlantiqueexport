import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogueView } from "@/components/catalog/catalogue-view";
import { parseFilters, sortProducts } from "@/lib/catalog/filters";
import { getCategories, getNewProducts } from "@/lib/catalog/queries";
import type { Locale } from "@/lib/types";

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.new" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function NewProductsPage({
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
  const t = await getTranslations("home.new");

  const [categories, products] = await Promise.all([
    getCategories(),
    getNewProducts(100),
  ]);

  return (
    <CatalogueView
      title={t("title")}
      subtitle={t("subtitle")}
      products={sortProducts(products, filters.sort)}
      categories={categories}
      filters={filters}
      params={query}
      pathname="/nouveautes"
      locale={locale as Locale}
      // La page EST déjà un filtre : en superposer un second n'apporterait
      // que de la confusion. Le tri reste disponible.
      showFilters={false}
    />
  );
}
