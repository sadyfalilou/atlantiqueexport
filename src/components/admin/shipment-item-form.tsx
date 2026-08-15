"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { addShipmentItemAction, type TaxonomyState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

const field =
  "h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const labelClass = "text-sm font-semibold text-forest-900";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      <Plus aria-hidden="true" className="size-4" />
      {pending ? "Ajout…" : "Ajouter au manifeste"}
    </Button>
  );
}

export function ShipmentItemForm({
  shipmentId,
  variants,
}: {
  shipmentId: string;
  variants: Array<{ variantId: string; sku: string; label: string; name: string }>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action] = useActionState<TaxonomyState, FormData>(
    async (previous, formData) => {
      const result = await addShipmentItemAction(previous, formData);
      // Vider le formulaire après coup : on ajoute rarement un seul format, et
      // ressaisir par-dessus les valeurs précédentes fait ajouter des doublons.
      if (result.status === "saved") formRef.current?.reset();
      return result;
    },
    { status: "idle" },
  );

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-4 grid items-end gap-4 rounded-lg border border-line bg-cream-50 p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
    >
      <input type="hidden" name="shipmentId" value={shipmentId} />

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="variantId">
          Format
        </label>
        <select id="variantId" name="variantId" required className={field} defaultValue="">
          <option value="" disabled>
            — Choisissez un format —
          </option>
          {variants.map((variant) => (
            <option key={variant.variantId} value={variant.variantId}>
              {variant.name} — {variant.label} ({variant.sku})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="plannedQuantity">
          Quantité annoncée
        </label>
        <input
          id="plannedQuantity"
          name="plannedQuantity"
          type="number"
          min={1}
          step={1}
          required
          className={field}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="deposit">
          Acompte ($)
        </label>
        <input
          id="deposit"
          name="deposit"
          type="text"
          inputMode="decimal"
          placeholder="0"
          className={field}
        />
      </div>

      <Submit />

      {state.status === "error" ? (
        <p role="alert" className="text-sm text-danger sm:col-span-4">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
