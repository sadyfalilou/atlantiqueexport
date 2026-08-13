import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CatalogueView } from "@/components/catalog/catalogue-view";
import { applyFilters, parseFilters } from "@/lib/catalog/filters";
import {
  getCatalogue,
  getCategoryBySlug,
  getMegaMenuCategories,
} from "@/lib/catalog/queries";
import type { Locale } from "@/lib/types";

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateStaticParams() {
  const categories = await getMegaMenuCategories();
  return categories.filter((c) => !c.isVirtual).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  const name = category.name[locale as Locale];
  return {
    title: name,
    description: category.description?.[locale as Locale],
    alternates: { canonical: `/${locale}/boutique/${slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale, category: slug } = await params;
  setRequestLocale(locale);

  const category = await getCategoryBySlug(slug);
  if (!category || category.isVirtual) notFound();

  const query = await searchParams;
  // La catégorie vient du chemin, pas des paramètres : on l'impose au filtre
  // pour que le panneau latéral reflète bien la page où l'on se trouve.
  const filters = { ...parseFilters(query), category: slug };

  const [categories, catalogue] = await Promise.all([
    getMegaMenuCategories(),
    getCatalogue({
      categorySlug: slug,
      brandSlug: filters.brand,
      temperatures: filters.temperatures,
    }),
  ]);

  const typedLocale = locale as Locale;

  return (
    <CatalogueView
      title={category.name[typedLocale]}
      subtitle={category.description?.[typedLocale]}
      products={applyFilters(catalogue, filters)}
      categories={categories.filter((c) => !c.isVirtual)}
      filters={filters}
      params={query}
      pathname={`/boutique/${slug}`}
      locale={typedLocale}
    />
  );
}
