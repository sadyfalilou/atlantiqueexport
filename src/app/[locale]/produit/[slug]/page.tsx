import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section } from "@/components/ui/layout-primitives";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/product-image";
import { VariantPicker } from "@/components/product/variant-picker";
import {
  getCategoryBySlug,
  getProductBySlug,
  getProducts,
  getSiteSettings,
} from "@/lib/catalog/queries";
import { hasPromotion } from "@/lib/catalog/filters";
import type { Locale, StockStatus, TemperatureClass } from "@/lib/types";

export const revalidate = 300;

const temperatureVariant: Record<
  TemperatureClass,
  "ambient" | "fresh" | "refrigerated" | "frozen"
> = {
  ambient: "ambient",
  fresh: "fresh",
  refrigerated: "refrigerated",
  frozen: "frozen",
};

const stockVariant: Record<
  StockStatus,
  "inStock" | "lowStock" | "outOfStock" | "incoming"
> = {
  in_stock: "inStock",
  low_stock: "lowStock",
  out_of_stock: "outOfStock",
  coming_soon: "incoming",
  preorder: "incoming",
  incoming: "incoming",
};

export async function generateStaticParams() {
  const products = await getProducts(500);
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const typedLocale = locale as Locale;
  return {
    title: product.name[typedLocale],
    description: product.shortDescription[typedLocale],
    alternates: { canonical: `/${locale}/produit/${slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const typedLocale = locale as Locale;
  const t = await getTranslations("product");
  const tStock = await getTranslations("stock");
  const tTemperature = await getTranslations("temperature");
  const tShop = await getTranslations("shop");
  const tCommon = await getTranslations("common");

  const [category, settings] = await Promise.all([
    product.categorySlug ? getCategoryBySlug(product.categorySlug) : undefined,
    getSiteSettings(),
  ]);

  /**
   * Les données structurées ne sont émises QUE si les prix sont définitifs.
   * Publier une offre à un prix de démonstration reviendrait à alimenter les
   * moteurs de recherche avec un montant faux.
   */
  const jsonLd = settings.allowProvisionalPrices
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name[typedLocale],
        description: product.shortDescription[typedLocale],
        category: category?.name[typedLocale],
        offers: product.variants.map((variant) => ({
          "@type": "Offer",
          sku: variant.sku,
          price: (variant.retailPriceCents / 100).toFixed(2),
          priceCurrency: "CAD",
          availability:
            product.stockStatus === "out_of_stock"
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
        })),
      };

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
              <Link href="/boutique" className="hover:underline">
                {tShop("title")}
              </Link>
            </li>
            {category ? (
              <>
                <ChevronRight aria-hidden="true" className="size-3.5" />
                <li>
                  <Link
                    href={`/boutique/${category.slug}`}
                    className="hover:underline"
                  >
                    {category.name[typedLocale]}
                  </Link>
                </li>
              </>
            ) : null}
            <ChevronRight aria-hidden="true" className="size-3.5" />
            <li aria-current="page" className="text-forest-900">
              {product.name[typedLocale]}
            </li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface">
            <ProductImage
              src={product.imageUrl}
              alt={product.imageAlt?.[typedLocale]}
              name={product.name[typedLocale]}
              placeholderLabel={tCommon("photoComing")}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {product.isNew ? <Badge variant="new">{t("from")}</Badge> : null}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={temperatureVariant[product.temperatureClass]}>
                {tTemperature(product.temperatureClass)}
              </Badge>
              <Badge variant={stockVariant[product.stockStatus]}>
                {tStock(product.stockStatus)}
              </Badge>
              {hasPromotion(product) ? (
                <Badge variant="promo">{tShop("onlyPromo")}</Badge>
              ) : null}
            </div>

            <h1 className="mt-4 font-display text-[1.875rem] leading-tight font-semibold text-forest-900 lg:text-[2.5rem]">
              {product.name[typedLocale]}
            </h1>

            <p className="mt-3 max-w-[38rem] text-lg text-muted">
              {product.shortDescription[typedLocale]}
            </p>

            <div className="mt-8 border-t border-line pt-8">
              <VariantPicker variants={product.variants} locale={typedLocale} />
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
          {product.description?.[typedLocale] ? (
            <section>
              <h2 className="font-display text-xl font-semibold text-forest-900">
                {t("description")}
              </h2>
              <p className="mt-3 max-w-[42rem] text-muted">
                {product.description[typedLocale]}
              </p>
            </section>
          ) : null}

          <section>
            <h2 className="font-display text-xl font-semibold text-forest-900">
              {t("allergens")}
            </h2>
            <p className="mt-3 text-muted">
              {product.allergens.length > 0
                ? product.allergens.join(", ")
                : t("noAllergens")}
            </p>

            <dl className="mt-6 space-y-3 text-sm">
              {product.originCountry ? (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-muted">{t("origin")}</dt>
                  <dd className="font-semibold text-forest-900">
                    {product.originCountry === "SN" ? "Sénégal" : product.originCountry}
                  </dd>
                </div>
              ) : null}
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-muted">{t("conservation")}</dt>
                <dd className="font-semibold text-forest-900">
                  {tTemperature(product.temperatureClass)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </Container>
    </Section>
  );
}
