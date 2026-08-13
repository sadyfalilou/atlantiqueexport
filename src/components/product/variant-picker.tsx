"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatPrice, formatUnitPrice } from "@/lib/utils";
import type { Locale, ProductVariant } from "@/lib/types";

/**
 * Choix du format, et prix qui suit.
 *
 * Le bouton d'ajout au panier est présent mais DÉSACTIVÉ, avec une explication
 * écrite juste en dessous : le panier n'existe pas encore. Un bouton actif qui
 * ne ferait rien serait un mensonge à l'écran ; un bouton absent laisserait
 * croire que le produit n'est pas vendable.
 */
export function VariantPicker({
  variants,
  locale,
}: {
  variants: ProductVariant[];
  locale: Locale;
}) {
  const t = useTranslations("product");
  const [selectedId, setSelectedId] = useState(variants[0]?.id);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  if (!selected) return null;

  const unitPrice = selected.isVariableWeight
    ? `${formatPrice(selected.pricePerKgCents ?? 0, locale)}/kg`
    : formatUnitPrice(selected.retailPriceCents, selected.netWeightG, locale);

  const hasDeal =
    selected.compareAtPriceCents != null &&
    selected.compareAtPriceCents > selected.retailPriceCents;

  return (
    <div>
      {variants.length > 1 ? (
        <fieldset>
          <legend className="text-sm font-semibold text-forest-900">
            {t("chooseFormat")}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {variants.map((variant) => {
              const isSelected = variant.id === selected.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedId(variant.id)}
                  aria-pressed={isSelected}
                  className={`inline-flex h-11 items-center rounded-md border-2 px-4 text-sm font-semibold transition-colors ${
                    isSelected
                      ? "border-forest-800 bg-forest-50 text-forest-900"
                      : "border-line-strong text-forest-900 hover:border-forest-600"
                  }`}
                >
                  {variant.label[locale]}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <p className="text-sm text-muted">{selected.label[locale]}</p>
      )}

      <div className="mt-6 flex flex-wrap items-baseline gap-3">
        <span className="tabular font-display text-[2rem] font-semibold text-forest-900">
          {formatPrice(selected.retailPriceCents, locale)}
        </span>
        {hasDeal ? (
          <span className="tabular text-lg text-muted line-through">
            {formatPrice(selected.compareAtPriceCents ?? 0, locale)}
          </span>
        ) : null}
        {unitPrice ? (
          <span className="tabular text-sm text-muted">{unitPrice}</span>
        ) : null}
      </div>

      {selected.isVariableWeight ? (
        <p className="mt-2 text-sm text-muted">{t("billedAtMaxWeight")}</p>
      ) : null}

      {selected.priceIsProvisional ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-warning">
          <Info aria-hidden="true" className="size-4" />
          {t("provisionalPrice")}
        </p>
      ) : null}

      <div className="mt-6">
        <Button size="lg" disabled aria-describedby="cart-unavailable">
          {t("addToCart")}
        </Button>
        <p id="cart-unavailable" className="mt-2 max-w-[32rem] text-sm text-muted">
          {t("cartComingSoon")}
        </p>
      </div>
    </div>
  );
}
