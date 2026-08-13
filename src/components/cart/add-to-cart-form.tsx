"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Minus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { notifyCartUpdated } from "@/components/cart/cart-badge";
import { addToCartAction, type AddToCartState } from "@/app/actions/cart";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="flex-1 sm:flex-none">
      {label}
    </Button>
  );
}

/**
 * Ajout au panier.
 *
 * Seuls l'identifiant de variante et la quantité sont envoyés. Le prix n'est
 * jamais transmis : il est relu en base à l'affichage du panier comme au
 * paiement, ce qui rend toute manipulation depuis le navigateur sans effet.
 */
export function AddToCartForm({
  variantId,
  maxQuantity,
}: {
  variantId: string;
  maxQuantity: number;
}) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const [quantity, setQuantity] = useState(1);
  const [state, formAction] = useActionState<AddToCartState, FormData>(
    addToCartAction,
    { status: "idle" },
  );

  useEffect(() => {
    if (state.status === "added") notifyCartUpdated();
  }, [state]);

  const soldOut = maxQuantity <= 0;

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="quantity" value={quantity} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-md border-2 border-line-strong">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1 || soldOut}
            aria-label={t("decrease")}
            className="inline-flex size-11 items-center justify-center rounded-l-md text-forest-800 transition-colors hover:bg-cream-100 disabled:opacity-40"
          >
            <Minus aria-hidden="true" className="size-4" />
          </button>
          <span
            className="tabular w-10 text-center text-base font-semibold text-forest-900"
            aria-live="polite"
            aria-label={t("quantity")}
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            disabled={quantity >= maxQuantity || soldOut}
            aria-label={t("increase")}
            className="inline-flex size-11 items-center justify-center rounded-r-md text-forest-800 transition-colors hover:bg-cream-100 disabled:opacity-40"
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </div>

        {soldOut ? (
          <Button size="lg" disabled aria-describedby="cart-feedback">
            {t("soldOut")}
          </Button>
        ) : (
          <SubmitButton label={t("addToCart")} />
        )}
      </div>

      <p id="cart-feedback" role="status" aria-live="polite" className="mt-3 text-sm">
        {soldOut ? <span className="text-muted">{t("soldOutHelp")}</span> : null}

        {state.status === "added" ? (
          <span className="inline-flex flex-wrap items-center gap-1.5 text-success">
            <Check aria-hidden="true" className="size-4" />
            {t("added")}
            <Link href="/panier" className="font-semibold underline">
              {t("viewCart")}
            </Link>
          </span>
        ) : null}

        {state.status === "out_of_stock" ? (
          <span className="inline-flex items-center gap-1.5 text-warning">
            <AlertCircle aria-hidden="true" className="size-4" />
            {t("stockLimit", { count: state.available ?? 0 })}
          </span>
        ) : null}

        {/* Deux causes distinctes, deux messages : dire « produit
            indisponible » sur une quantité hors bornes égarerait le client. */}
        {state.status === "invalid" ? (
          <span className="inline-flex items-center gap-1.5 text-danger">
            <AlertCircle aria-hidden="true" className="size-4" />
            {t("invalidQuantity")}
          </span>
        ) : null}

        {state.status === "unavailable" ? (
          <span className="inline-flex items-center gap-1.5 text-danger">
            <AlertCircle aria-hidden="true" className="size-4" />
            {t("unavailable")}
          </span>
        ) : null}
      </p>
    </form>
  );
}
