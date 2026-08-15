"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveDeliveryZoneAction, type TaxonomyState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { AdminDeliveryZone } from "@/lib/admin/queries";

const input =
  "h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const labelClass = "text-sm font-semibold text-forest-900";
const hint = "text-xs text-muted";

/** Cents → dollars, dans la forme qu'on saisit : « 7.99 ». */
function toDollars(cents: number | null): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer"}
    </Button>
  );
}

export function DeliveryZoneRow({ zone }: { zone: AdminDeliveryZone }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<TaxonomyState, FormData>(
    saveDeliveryZoneAction,
    { status: "idle" },
  );

  return (
    <li className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-semibold text-forest-900">
            {zone.name}
            {!zone.isActive ? (
              <span className="ml-2 rounded-full bg-cream-100 px-2 py-0.5 text-xs text-warning">
                inactive
              </span>
            ) : null}
          </p>
          <p className={hint}>
            {formatPrice(zone.feeCents, "fr")} de frais ·{" "}
            {zone.freeThresholdCents == null
              ? "jamais gratuite"
              : `gratuite dès ${formatPrice(zone.freeThresholdCents, "fr")}`}{" "}
            · minimum {formatPrice(zone.minOrderCents, "fr")} ·{" "}
            {zone.postalPrefixes.join(", ") || "aucun code postal"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold text-forest-800 underline hover:bg-cream-100"
        >
          {open ? "Fermer" : "Modifier"}
        </button>
      </div>

      {open ? (
        <form action={action} className="flex flex-col gap-4 border-t border-line p-4">
          <input type="hidden" name="id" value={zone.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`zone-name-${zone.id}`}>
                Nom de la zone
              </label>
              <input
                id={`zone-name-${zone.id}`}
                name="name"
                required
                maxLength={120}
                defaultValue={zone.name}
                className={input}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`zone-prefixes-${zone.id}`}>
                Codes postaux desservis
              </label>
              <input
                id={`zone-prefixes-${zone.id}`}
                name="prefixes"
                defaultValue={zone.postalPrefixes.join(", ")}
                className={input}
              />
              <p className={hint}>
                Les premiers caractères, séparés par des virgules : « H1, H2, H3 ». La
                zone d&apos;un client est retrouvée à partir de son code postal.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`zone-fee-${zone.id}`}>
                Frais de livraison ($)
              </label>
              <input
                id={`zone-fee-${zone.id}`}
                name="fee"
                inputMode="decimal"
                required
                defaultValue={toDollars(zone.feeCents)}
                className={input}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`zone-free-${zone.id}`}>
                Gratuite à partir de ($)
              </label>
              <input
                id={`zone-free-${zone.id}`}
                name="freeThreshold"
                inputMode="decimal"
                defaultValue={toDollars(zone.freeThresholdCents)}
                className={input}
              />
              <p className={hint}>Laissez vide pour ne jamais l&apos;offrir.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`zone-min-${zone.id}`}>
                Commande minimum ($)
              </label>
              <input
                id={`zone-min-${zone.id}`}
                name="minOrder"
                inputMode="decimal"
                required
                defaultValue={toDollars(zone.minOrderCents)}
                className={input}
              />
              <p className={hint}>
                Sous ce montant, la commande est refusée pour cette zone.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div className="flex w-28 flex-col gap-1.5">
              <label className={labelClass} htmlFor={`zone-pos-${zone.id}`}>
                Position
              </label>
              <input
                id={`zone-pos-${zone.id}`}
                name="position"
                inputMode="numeric"
                defaultValue={String(zone.position)}
                className={input}
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm text-forest-900">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={zone.isActive}
                className="size-4"
              />
              Zone desservie
            </label>
          </div>

          <p className={hint}>
            Températures acceptées : {zone.allowedTemperatures.join(", ") || "aucune"}.
            Elles ne se modifient pas ici — décider qu&apos;une zone cesse d&apos;accepter
            le surgelé retire des produits de la vente, et mérite son propre écran.
          </p>

          {zone.orderCount > 0 ? (
            <p className={hint}>
              {zone.orderCount} commande{zone.orderCount > 1 ? "s" : ""} déjà livrée
              {zone.orderCount > 1 ? "s" : ""} dans cette zone. Leurs montants sont figés :
              modifier les tarifs ne touche que les commandes à venir.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            <Submit />
            {state.status === "error" ? (
              <p role="alert" className="text-sm text-danger">
                {state.message}
              </p>
            ) : null}
            {state.status === "saved" ? (
              <p role="status" className="text-sm text-success">
                Enregistré.
              </p>
            ) : null}
          </div>
        </form>
      ) : null}
    </li>
  );
}
