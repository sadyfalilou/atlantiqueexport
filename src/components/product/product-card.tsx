import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { ProductPlaceholder } from "@/components/shared/product-placeholder";
import { PriceDisplay } from "@/components/product/price-display";
import { getEntryVariant } from "@/lib/catalog/queries";
import type { Locale, Product, StockStatus, TemperatureClass } from "@/lib/types";

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

/**
 * Un seul élément interactif par carte : le titre porte le lien et son
 * pseudo-élément couvre toute la carte. On évite ainsi les liens imbriqués,
 * qui cassent la navigation au clavier et les lecteurs d'écran.
 *
 * Le bouton « Ajouter au panier » sera greffé ici au lot 5, quand le panier
 * existera réellement — pas avant.
 */
export function ProductCard({
  product,
  locale,
}: {
  product: Product;
  locale: Locale;
}) {
  const t = useTranslations();
  const variant = getEntryVariant(product);
  const hasMultipleVariants = product.variants.length > 1;
  const hasDeal = product.variants.some(
    (v) =>
      v.compareAtPriceCents != null &&
      v.compareAtPriceCents > v.retailPriceCents,
  );

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md focus-within:shadow-md">
      <div className="relative aspect-[4/5] overflow-hidden bg-cream-100">
        <ProductPlaceholder
          name={product.name[locale]}
          label={t("common.photoComing")}
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {product.isNew ? (
            <Badge variant="new">{t("badge.new")}</Badge>
          ) : null}
          {hasDeal ? (
            <Badge variant="promo">{t("badge.promo")}</Badge>
          ) : null}
        </div>
        <div className="absolute right-3 bottom-3">
          <Badge variant={temperatureVariant[product.temperatureClass]}>
            {t(`temperature.${product.temperatureClass}`)}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={stockVariant[product.stockStatus]}>
            {t(`stock.${product.stockStatus}`)}
          </Badge>
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </div>

        <h3 className="font-sans text-base leading-snug font-semibold text-forest-900">
          <Link
            href={`/produit/${product.slug}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            <span className="line-clamp-2">{product.name[locale]}</span>
          </Link>
        </h3>

        <p className="text-xs text-muted">{variant.label[locale]}</p>

        <div className="mt-auto pt-2">
          <PriceDisplay
            variant={variant}
            locale={locale}
            fromLabel={t("product.from")}
            showFrom={hasMultipleVariants}
          />
        </div>
      </div>
    </article>
  );
}
