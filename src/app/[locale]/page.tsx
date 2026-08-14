import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/layout-primitives";
import { Hero } from "@/components/home/hero";
import { CategoryGrid } from "@/components/home/category-grid";
import { ProductRow } from "@/components/home/product-row";
import { ShipmentHighlight } from "@/components/home/shipment-highlight";
import {
  AboutSection,
  BrandsSection,
  RecipesSection,
  ReviewsSection,
  SocialSection,
} from "@/components/home/sections";
import { Newsletter } from "@/components/home/newsletter";
import {
  getColdProducts,
  getFeaturedProducts,
  getFreshProducts,
  getNaturalProducts,
  getNewProducts,
  getPromotedProducts,
  getSiteSettings,
} from "@/lib/catalog/queries";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/types";

/**
 * La page est prérendue, puis régénérée toutes les cinq minutes. Sans cela,
 * le catalogue serait figé au moment de la compilation et une modification de
 * prix ou de stock n'apparaîtrait qu'au redéploiement suivant.
 */
export const revalidate = 300;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Le segment `[locale]` avale tout chemin d'un seul niveau. Un navigateur
  // qui réclame /favicon.ico faisait donc rendre l'accueil avec la « langue »
  // « favicon.ico », et chaque `titre[locale]` renvoyait `undefined` : les
  // journaux se remplissaient d'exceptions à chaque visite. Le garde du layout
  // arrive trop tard — la page se rend en parallèle et jette avant lui.
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const typedLocale = locale as Locale;

  const [featured, fresh, cold, produce, natural, deals, settings] =
    await Promise.all([
      getFeaturedProducts(8),
      getNewProducts(4),
      getColdProducts(4),
      getFreshProducts(4),
      getNaturalProducts(4),
      getPromotedProducts(4),
      getSiteSettings(),
    ]);

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Atlantique Export",
    url: "https://atlantiqueexport.com",
    description: t("about.body"),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Montréal",
      addressRegion: "QC",
      addressCountry: "CA",
    },
    sameAs: ["https://www.instagram.com/atlantique_export_/"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* Le bandeau est piloté par le réglage en base : il disparaîtra de
          lui-même le jour où les vrais prix seront saisis et où
          `allow_provisional_prices` repassera à faux. */}
      {settings.allowProvisionalPrices ? (
        <div className="bg-mango-50 text-forest-900">
          <Container>
            <p className="flex items-start gap-2 py-2.5 text-sm">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {tCommon("demoNotice")}
            </p>
          </Container>
        </div>
      ) : null}

      <Hero />

      <CategoryGrid locale={typedLocale} />

      <ProductRow
        title={t("popular.title")}
        subtitle={t("popular.subtitle")}
        products={featured}
        href="/boutique"
        locale={typedLocale}
      />

      <ProductRow
        className="bg-cream-100"
        title={t("new.title")}
        subtitle={t("new.subtitle")}
        products={fresh}
        href="/nouveautes"
        locale={typedLocale}
      />

      <ProductRow
        title={t("cold.title")}
        subtitle={t("cold.subtitle")}
        products={cold}
        href="/boutique/produits-surgeles"
        locale={typedLocale}
      />

      <ProductRow
        className="bg-cream-100"
        title={t("fresh.title")}
        subtitle={t("fresh.subtitle")}
        products={produce}
        href="/boutique/fruits-legumes"
        locale={typedLocale}
      />

      <ProductRow
        title={t("natural.title")}
        subtitle={t("natural.subtitle")}
        products={natural}
        href="/boutique/poudres-naturelles"
        locale={typedLocale}
      />

      <ProductRow
        className="bg-cream-100"
        title={t("deals.title")}
        subtitle={t("deals.subtitle")}
        products={deals}
        href="/promotions"
        locale={typedLocale}
        emptyMessage={t("deals.empty")}
      />

      <ShipmentHighlight locale={typedLocale} />

      <BrandsSection locale={typedLocale} />

      <RecipesSection locale={typedLocale} />

      <AboutSection />

      <ReviewsSection />

      <Newsletter />

      <SocialSection />
    </>
  );
}
