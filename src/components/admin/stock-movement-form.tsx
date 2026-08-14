"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { recordStockMovementAction, type StockState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

const field =
  "h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const labelClass = "text-sm font-semibold text-forest-900";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer le mouvement"}
    </Button>
  );
}

export function StockMovementForm({
  variants,
}: {
  variants: Array<{
    variantId: string;
    sku: string;
    label: string;
    name: string;
    onHand: number;
  }>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState("reception");

  const [state, action] = useActionState<StockState, FormData>(
    async (previous, formData) => {
      const result = await recordStockMovementAction(previous, formData);
      if (result.status === "saved") formRef.current?.reset();
      return result;
    },
    { status: "idle" },
  );

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5"
    >
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
              {variant.name} — {variant.label} ({variant.sku}) · {variant.onHand} détenus
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="movementType">
            Nature du mouvement
          </label>
          <select
            id="movementType"
            name="movementType"
            className={field}
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="reception">Réception — marchandise reçue</option>
            <option value="adjustment">Ajustement — correction de comptage</option>
            <option value="loss">Perte — casse, péremption, vol</option>
            <option value="return">Retour — marchandise revenue en stock</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="quantity">
            Nombre d&apos;unités
          </label>
          <input
            id="quantity"
            name="quantity"
            required
            inputMode="numeric"
            placeholder="12"
            className={field}
          />
          <p className="text-xs text-muted">
            Toujours un nombre positif. C&apos;est la nature du mouvement qui
            décide s&apos;il ajoute ou retire.
          </p>
        </div>
      </div>

      {/* Seul l'ajustement est ambigu : il corrige dans les deux sens. */}
      {type === "adjustment" ? (
        <fieldset className="flex flex-col gap-2 rounded-lg border border-line bg-cream-50 p-4">
          <legend className="px-1 text-sm font-semibold text-forest-900">
            Sens de la correction
          </legend>
          <label className="flex items-center gap-2.5 text-sm text-forest-900">
            <input type="radio" name="direction" value="in" defaultChecked className="size-4" />
            Il y en a <strong>plus</strong> que ce qu&apos;indique le système
          </label>
          <label className="flex items-center gap-2.5 text-sm text-forest-900">
            <input type="radio" name="direction" value="out" className="size-4" />
            Il y en a <strong>moins</strong> que ce qu&apos;indique le système
          </label>
        </fieldset>
      ) : null}

      {type === "reception" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="lotCode">
              Numéro de lot
            </label>
            <input id="lotCode" name="lotCode" maxLength={80} className={field} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="expiresAt">
              Date de péremption
            </label>
            <input id="expiresAt" name="expiresAt" type="date" className={field} />
            <p className="text-xs text-muted">
              Facultatifs, mais indispensables pour retrouver une marchandise en
              cas de rappel.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="reason">
          Motif
        </label>
        <input
          id="reason"
          name="reason"
          maxLength={300}
          placeholder="Livraison du 14 août, palette 3"
          className={field}
        />
        <p className="text-xs text-muted">
          Ce que vous écrirez ici est la seule chose qui expliquera cet écart
          dans six mois.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Submit />
        {state.status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}
        {state.status === "saved" ? (
          <p role="status" className="text-sm text-success">
            Mouvement enregistré.
          </p>
        ) : null}
      </div>
    </form>
  );
}
