"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Power, Trash2 } from "lucide-react";
import {
  addVariantAction,
  deleteVariantAction,
  toggleVariantActiveAction,
  type PricingState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { AdminVariant } from "@/lib/admin/queries";

const input =
  "h-11 rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const labelClass = "text-sm font-semibold text-forest-900";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      <Plus aria-hidden="true" className="size-4" />
      {pending ? "Ajout en cours…" : "Ajouter ce format"}
    </Button>
  );
}

export function VariantManager({
  productId,
  slug,
  variants,
}: {
  productId: string;
  slug: string;
  variants: AdminVariant[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action] = useActionState<PricingState, FormData>(
    async (previous, formData) => {
      const result = await addVariantAction(previous, formData);
      if (result.status === "saved") formRef.current?.reset();
      return result;
    },
    { status: "idle" },
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Format</th>
              <th scope="col" className="px-4 py-3">SKU</th>
              <th scope="col" className="px-4 py-3">Prix</th>
              <th scope="col" className="px-4 py-3">Stock</th>
              <th scope="col" className="px-4 py-3">État</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {variants.map((variant) => (
              <tr key={variant.id} className={variant.isActive ? "" : "bg-cream-50"}>
                <td className="px-4 py-3 font-semibold text-forest-900">
                  {variant.label}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{variant.sku}</td>
                <td className="tabular px-4 py-3">
                  {formatPrice(variant.retailPriceCents, "fr")}
                </td>
                <td className="tabular px-4 py-3">{variant.available}</td>
                <td className="px-4 py-3">
                  {variant.isActive ? (
                    <span className="text-success">En vente</span>
                  ) : (
                    <span className="text-muted">Retiré</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <form action={toggleVariantActiveAction}>
                      <input type="hidden" name="variantId" value={variant.id} />
                      <input type="hidden" name="slug" value={slug} />
                      <input
                        type="hidden"
                        name="active"
                        value={variant.isActive ? "0" : "1"}
                      />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-forest-800 hover:bg-cream-100"
                      >
                        <Power aria-hidden="true" className="size-3.5" />
                        {variant.isActive ? "Retirer de la vente" : "Remettre en vente"}
                      </button>
                    </form>

                    {/* Proposé pour tous : le serveur refuse en silence si le
                        format a déjà été commandé ou a bougé en stock. */}
                    <form action={deleteVariantAction}>
                      <input type="hidden" name="variantId" value={variant.id} />
                      <input type="hidden" name="slug" value={slug} />
                      <button
                        type="submit"
                        aria-label={`Supprimer le format ${variant.label}`}
                        title="Possible uniquement si le format n'a jamais été commandé"
                        className="inline-flex size-9 items-center justify-center rounded-md text-danger hover:bg-cream-100"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        <strong>Retirer de la vente</strong> fait disparaître le format du site et
        des paniers, en gardant son historique — c&apos;est le geste habituel.
        La suppression n&apos;est possible que pour un format jamais commandé et
        sans mouvement de stock : au-delà, elle effacerait le registre.
      </p>

      <form
        ref={formRef}
        action={action}
        className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5"
      >
        <h3 className="font-display text-base font-semibold text-forest-900">
          Ajouter un format
        </h3>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="slug" value={slug} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="labelFr">
              Libellé — français
            </label>
            <input
              id="labelFr"
              name="labelFr"
              required
              maxLength={120}
              placeholder="Sachet 1 kg"
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="labelEn">
              Libellé — anglais
            </label>
            <input
              id="labelEn"
              name="labelEn"
              required
              maxLength={120}
              placeholder="1 kg bag"
              className={input}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="variantSku">
              Code SKU
            </label>
            <input
              id="variantSku"
              name="sku"
              required
              maxLength={60}
              placeholder="AE-ARRAW-1KG"
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="variantPrice">
              Prix de vente
            </label>
            <input
              id="variantPrice"
              name="retailPrice"
              required
              inputMode="decimal"
              placeholder="18,99"
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="variantWeight">
              Poids net
            </label>
            <input
              id="variantWeight"
              name="netWeightG"
              inputMode="numeric"
              placeholder="1000"
              className={input}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Submit />
          {state.status === "error" ? (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          ) : null}
          {state.status === "saved" ? (
            <p role="status" className="text-sm text-success">
              Format ajouté. Son stock est à zéro tant qu&apos;une réception n&apos;a
              pas été enregistrée.
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
