import { formatPrice, formatUnitPrice } from "@/lib/utils";
import type { Locale, ProductVariant } from "@/lib/types";

/**
 * Affiche le prix de vente, le prix barré éventuel et le prix rapporté au
 * kilo — obligatoire pour comparer honnêtement des formats différents.
 */
export function PriceDisplay({
  variant,
  locale,
  fromLabel,
  showFrom = false,
}: {
  variant: ProductVariant;
  locale: Locale;
  fromLabel: string;
  showFrom?: boolean;
}) {
  const hasDeal =
    variant.compareAtPriceCents != null &&
    variant.compareAtPriceCents > variant.retailPriceCents;

  const unitPrice = variant.isVariableWeight
    ? `${formatPrice(variant.pricePerKgCents ?? 0, locale)}/kg`
    : formatUnitPrice(variant.retailPriceCents, variant.netWeightG, locale);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2">
        {showFrom ? (
          <span className="text-xs text-muted">{fromLabel}</span>
        ) : null}
        <span className="tabular text-lg font-bold text-forest-900 lg:text-[1.375rem]">
          {formatPrice(variant.retailPriceCents, locale)}
        </span>
        {hasDeal ? (
          <span className="tabular text-sm text-muted line-through">
            {formatPrice(variant.compareAtPriceCents ?? 0, locale)}
          </span>
        ) : null}
      </div>
      {unitPrice ? (
        <p className="tabular mt-0.5 text-xs text-muted">{unitPrice}</p>
      ) : null}
    </div>
  );
}
