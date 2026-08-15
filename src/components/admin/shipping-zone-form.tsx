"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Globe, Plus } from "lucide-react";
import { saveShippingZoneAction, type TaxonomyState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { COUNTRY_NAMES } from "@/lib/regions";
import { formatPrice } from "@/lib/utils";
import type { AdminShippingZone } from "@/lib/admin/queries";

const input =
  "h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const labelClass = "text-sm font-semibold text-forest-900";
const hint = "text-xs text-muted";

function toDollars(cents: number | null): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Enregistrement…" : label}
    </Button>
  );
}

/**
 * Champs communs à la création et à la modification d'une zone d'expédition.
 *
 * Le pays et les régions vivent ensemble : changer de pays sans vider les
 * codes de région laisserait « QC » sur une zone américaine, que l'action
 * refuserait — autant le faire ici, où l'on voit ce qu'on fait.
 */
function Fields({ zone, idPrefix }: { zone?: AdminShippingZone; idPrefix: string }) {
  const [country, setCountry] = useState(zone?.countryCode ?? "CA");
  const [regions, setRegions] = useState((zone?.regionCodes ?? []).join(", "));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${idPrefix}-name`}>
            Nom de la destination
          </label>
          <input
            id={`${idPrefix}-name`}
            name="name"
            required
            maxLength={120}
            defaultValue={zone?.name}
            placeholder="États-Unis"
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${idPrefix}-country`}>
            Pays
          </label>
          <select
            id={`${idPrefix}-country`}
            name="countryCode"
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
              setRegions("");
            }}
            className={input}
          >
            {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor={`${idPrefix}-regions`}>
          {country === "US" ? "États couverts" : "Provinces couvertes"}
        </label>
        <input
          id={`${idPrefix}-regions`}
          name="regionCodes"
          value={regions}
          onChange={(event) => setRegions(event.target.value)}
          placeholder={country === "US" ? "NY, VT, MA" : "QC, ON"}
          className={input}
        />
        <p className={hint}>
          Codes à deux lettres, séparés par des virgules. <strong>Laissez vide</strong>{" "}
          pour couvrir tout le pays. Une zone régionale l&apos;emporte sur la zone
          nationale : c&apos;est ainsi qu&apos;on facture plus cher les provinces
          éloignées sans toucher au reste.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${idPrefix}-fee`}>
            Frais ($)
          </label>
          <input
            id={`${idPrefix}-fee`}
            name="fee"
            inputMode="decimal"
            required
            defaultValue={toDollars(zone?.feeCents ?? null)}
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${idPrefix}-free`}>
            Offerte à partir de ($)
          </label>
          <input
            id={`${idPrefix}-free`}
            name="freeThreshold"
            inputMode="decimal"
            defaultValue={toDollars(zone?.freeThresholdCents ?? null)}
            className={input}
          />
          <p className={hint}>Vide = jamais offerte.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${idPrefix}-position`}>
            Position
          </label>
          <input
            id={`${idPrefix}-position`}
            name="position"
            inputMode="numeric"
            defaultValue={String(zone?.position ?? 0)}
            className={input}
          />
        </div>
      </div>
    </>
  );
}

export function ShippingZoneRow({ zone }: { zone: AdminShippingZone }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<TaxonomyState, FormData>(
    saveShippingZoneAction,
    { status: "idle" },
  );

  return (
    <li className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold text-forest-900">
            <Globe aria-hidden="true" className="size-4 shrink-0" />
            {zone.name}
            {!zone.isActive ? (
              <span className="rounded-full bg-cream-100 px-2 py-0.5 text-xs text-warning">
                non desservie
              </span>
            ) : null}
          </p>
          <p className={hint}>
            {COUNTRY_NAMES[zone.countryCode] ?? zone.countryCode}
            {zone.regionCodes.length > 0 ? ` · ${zone.regionCodes.join(", ")}` : " · tout le pays"}
            {" · "}
            {formatPrice(zone.feeCents, "fr")}
            {zone.freeThresholdCents != null
              ? `, offerte dès ${formatPrice(zone.freeThresholdCents, "fr")}`
              : ""}
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
          <Fields zone={zone} idPrefix={`sz-${zone.id}`} />

          <label className="flex items-center gap-2.5 text-sm text-forest-900">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={zone.isActive}
              className="size-4"
            />
            Destination desservie
          </label>

          <div className="flex flex-wrap items-center gap-4">
            <Submit label="Enregistrer" />
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

export function NewShippingZoneForm() {
  const [state, action] = useActionState<TaxonomyState, FormData>(
    saveShippingZoneAction,
    { status: "idle" },
  );

  return (
    <form
      action={action}
      className="flex max-w-3xl flex-col gap-4 rounded-lg border border-line bg-surface p-5"
    >
      <h3 className="font-display text-base font-semibold text-forest-900">
        Nouvelle destination
      </h3>

      <Fields idPrefix="new-sz" />
      <input type="hidden" name="isActive" value="on" />

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="secondary">
          <Plus aria-hidden="true" className="size-4" />
          Ajouter la destination
        </Button>
        {state.status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}
        {state.status === "saved" ? (
          <p role="status" className="text-sm text-success">
            Destination ajoutée.
          </p>
        ) : null}
      </div>

      <p className={hint}>
        Une adresse sans destination correspondante n&apos;est pas expédiable : la
        commande est refusée avec un message clair, plutôt que partir à zéro franc de
        frais de port.
      </p>
    </form>
  );
}
