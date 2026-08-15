"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveStockThresholdAction, type TaxonomyState } from "@/app/actions/admin";

/**
 * Seuil d'alerte d'un format, modifiable dans la ligne du tableau.
 *
 * Ce n'est pas une quantité de stock : le régler ne bouge rien à l'inventaire,
 * il dit seulement à partir de quand le tableau de bord doit s'inquiéter. D'où
 * un champ direct, là où toute vraie quantité passe par un mouvement daté.
 */
export function StockThresholdForm({
  variantId,
  threshold,
  name,
}: {
  variantId: string;
  threshold: number;
  name: string;
}) {
  const [state, action] = useActionState<TaxonomyState, FormData>(
    saveStockThresholdAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="flex items-center justify-end gap-1.5">
      <input type="hidden" name="variantId" value={variantId} />
      <label className="sr-only" htmlFor={`seuil-${variantId}`}>
        Seuil d&apos;alerte pour {name}
      </label>
      <input
        id={`seuil-${variantId}`}
        name="threshold"
        type="number"
        min={0}
        step={1}
        defaultValue={threshold}
        className="tabular h-9 w-16 rounded-sm border border-line-strong bg-surface px-2 text-right text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
      />
      <Save />
      {state.status === "error" ? (
        <span role="alert" className="text-xs text-danger">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center rounded-md px-2 text-xs font-semibold text-forest-800 underline hover:bg-cream-100 disabled:opacity-50"
    >
      {pending ? "…" : "OK"}
    </button>
  );
}
