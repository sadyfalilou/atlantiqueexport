"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveShipmentAction, type TaxonomyState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import type { AdminShipment } from "@/lib/admin/queries";

const field =
  "h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const area =
  "w-full rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const labelClass = "text-sm font-semibold text-forest-900";

/**
 * Les étapes d'un arrivage, du quai de départ à la mise en vente. Elles ne
 * changent rien au site pour l'instant : elles vous servent à savoir où en est
 * la marchandise, et à répondre quand un client le demande.
 */
const STATUS_OPTIONS: Array<[string, string]> = [
  ["announced", "Annoncé"],
  ["reservations_open", "Réservations ouvertes"],
  ["in_transit", "En transit"],
  ["arrived", "Arrivé"],
  ["preparing", "En préparation"],
  ["available", "Disponible"],
  ["completed", "Terminé"],
  ["delayed", "Retardé"],
  ["cancelled", "Annulé"],
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer"}
    </Button>
  );
}

export function ShipmentEditor({ shipment }: { shipment: AdminShipment }) {
  const [state, action] = useActionState<TaxonomyState, FormData>(saveShipmentAction, {
    status: "idle",
  });

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={shipment.id} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="titleFr">
            Titre — français
          </label>
          <input
            id="titleFr"
            name="titleFr"
            required
            defaultValue={shipment.titleFr}
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="titleEn">
            Titre — anglais
          </label>
          <input
            id="titleEn"
            name="titleEn"
            required
            defaultValue={shipment.titleEn}
            className={field}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="originCountry">
            Pays d&apos;origine
          </label>
          <input
            id="originCountry"
            name="originCountry"
            defaultValue={shipment.originCountry}
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="etaDate">
            Date d&apos;arrivée prévue
          </label>
          <input
            id="etaDate"
            name="etaDate"
            type="date"
            defaultValue={shipment.etaDate}
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="reservationDeadline">
            Fin des réservations
          </label>
          <input
            id="reservationDeadline"
            name="reservationDeadline"
            type="date"
            defaultValue={shipment.reservationDeadline}
            className={field}
          />
        </div>
      </div>

      <div className="flex max-w-xs flex-col gap-1.5">
        <label className={labelClass} htmlFor="status">
          Où en est la marchandise
        </label>
        <select
          id="status"
          name="status"
          defaultValue={shipment.status}
          className={field}
        >
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="notesFr">
            Note publique — français
          </label>
          <textarea
            id="notesFr"
            name="notesFr"
            rows={3}
            defaultValue={shipment.notesFr}
            className={area}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="notesEn">
            Note publique — anglais
          </label>
          <textarea
            id="notesEn"
            name="notesEn"
            rows={3}
            defaultValue={shipment.notesEn}
            className={area}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Submit />
        {state.status === "saved" ? (
          <p role="status" className="text-sm text-success">
            Enregistré.
          </p>
        ) : null}
        {state.status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
