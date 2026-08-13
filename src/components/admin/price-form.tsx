"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveProductPricesAction, type PricingState } from "@/app/actions/admin";
import type { AdminVariant } from "@/lib/admin/queries";

const cell =
  "tabular h-11 w-28 rounded-sm border border-line-strong bg-surface px-2 text-right text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer les prix"}
    </Button>
  );
}

/** Les montants sont saisis en dollars et convertis en cents côté serveur. */
const toDollars = (cents: number | null) =>
  cents == null ? "" : (cents / 100).toFixed(2);

export function PriceForm({
  productId,
  variants,
}: {
  productId: string;
  variants: AdminVariant[];
}) {
  const [state, formAction] = useActionState<PricingState, FormData>(
    saveProductPricesAction,
    { status: "idle" },
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Format</th>
              <th scope="col" className="px-4 py-3 text-right">Prix de vente</th>
              <th scope="col" className="px-4 py-3 text-right">Prix barré</th>
              <th scope="col" className="px-4 py-3 text-right">Prix de gros</th>
              <th scope="col" className="px-4 py-3 text-right">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {variants.map((variant) => (
              <tr key={variant.id}>
                <td className="px-4 py-3">
                  <span className="block font-semibold text-forest-900">
                    {variant.label}
                  </span>
                  <span className="block text-xs text-muted">{variant.sku}</span>
                  {variant.priceIsProvisional ? (
                    <span className="mt-1 inline-block text-xs font-semibold text-warning">
                      prix de démonstration
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right">
                  <label>
                    <span className="sr-only">Prix de vente pour {variant.sku}</span>
                    <input
                      name={`retail-${variant.id}`}
                      type="text"
                      inputMode="decimal"
                      required
                      defaultValue={toDollars(variant.retailPriceCents)}
                      className={cell}
                    />
                  </label>
                </td>
                <td className="px-4 py-3 text-right">
                  <label>
                    <span className="sr-only">Prix barré pour {variant.sku}</span>
                    <input
                      name={`compare-${variant.id}`}
                      type="text"
                      inputMode="decimal"
                      placeholder="—"
                      defaultValue={toDollars(variant.compareAtPriceCents)}
                      className={cell}
                    />
                  </label>
                </td>
                <td className="px-4 py-3 text-right">
                  <label>
                    <span className="sr-only">Prix de gros pour {variant.sku}</span>
                    <input
                      name={`wholesale-${variant.id}`}
                      type="text"
                      inputMode="decimal"
                      placeholder="—"
                      defaultValue={toDollars(variant.wholesalePriceCents)}
                      className={cell}
                    />
                  </label>
                </td>
                <td className="tabular px-4 py-3 text-right text-muted">
                  {variant.available}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-muted">
        Laissez le prix barré vide s&apos;il n&apos;y a pas de promotion. Enregistrer retire
        la mention « prix de démonstration ».
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Submit />

        <p role="status" aria-live="polite" className="text-sm">
          {state.status === "saved" ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <Check aria-hidden="true" className="size-4" />
              Prix enregistrés.
            </span>
          ) : null}
          {state.status === "error" ? (
            <span className="inline-flex items-center gap-1.5 text-danger">
              <AlertCircle aria-hidden="true" className="size-4" />
              {state.message}
            </span>
          ) : null}
        </p>
      </div>
    </form>
  );
}
