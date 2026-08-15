"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarPlus, Plus } from "lucide-react";
import {
  createPickupLocationAction,
  generateSlotsAction,
  savePickupLocationAction,
  togglePickupLocationAction,
  type TaxonomyState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { PublishToggle } from "@/components/admin/publish-toggle";
import type { AdminPickupLocation } from "@/lib/admin/queries";

const input =
  "h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const labelClass = "text-sm font-semibold text-forest-900";
const hint = "text-xs text-muted";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Enregistrement…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: TaxonomyState }) {
  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-danger">
        {state.message}
      </p>
    );
  }
  if (state.status === "saved") {
    return (
      <p role="status" className="text-sm text-success">
        {state.message ?? "Enregistré."}
      </p>
    );
  }
  return null;
}

export function PickupLocationRow({ location }: { location: AdminPickupLocation }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<TaxonomyState, FormData>(
    savePickupLocationAction,
    { status: "idle" },
  );

  // « Adresse à confirmer » est ce que pose le script de semis. Tant qu'elle
  // est là, le client reçoit une promesse creuse à la confirmation de sa
  // commande — autant que ça saute aux yeux ici.
  const unconfirmed = /à confirmer/i.test(location.line1);

  return (
    <li className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-semibold text-forest-900">
            {location.name}
            {!location.isActive ? (
              <span className="ml-2 rounded-full bg-cream-100 px-2 py-0.5 text-xs text-warning">
                inactif
              </span>
            ) : null}
            {unconfirmed ? (
              <span className="ml-2 rounded-full bg-mango-50 px-2 py-0.5 text-xs text-mango-800">
                adresse à renseigner
              </span>
            ) : null}
          </p>
          <p className={hint}>
            {[location.line1, location.city, location.postalCode]
              .filter(Boolean)
              .join(", ")}
            {" · "}
            {location.upcomingSlots === 0 ? (
              <span className="text-warning">
                aucun créneau à venir — invisible du client
              </span>
            ) : (
              `${location.upcomingSlots} créneau${location.upcomingSlots > 1 ? "x" : ""} à venir`
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PublishToggle
            action={togglePickupLocationAction}
            idField="locationId"
            id={location.id}
            isPublished={location.isActive}
            canEdit
            publishedLabel="Proposé"
            hiddenLabel="Retiré"
          />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold text-forest-800 underline hover:bg-cream-100"
          >
            {open ? "Fermer" : "Modifier"}
          </button>
        </div>
      </div>

      {open ? (
        <form action={action} className="flex flex-col gap-4 border-t border-line p-4">
          <input type="hidden" name="id" value={location.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`pl-name-${location.id}`}>
                Nom affiché au client
              </label>
              <input
                id={`pl-name-${location.id}`}
                name="name"
                required
                defaultValue={location.name}
                className={input}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`pl-line1-${location.id}`}>
                Adresse
              </label>
              <input
                id={`pl-line1-${location.id}`}
                name="line1"
                required
                defaultValue={location.line1}
                className={input}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor={`pl-line2-${location.id}`}>
                Complément
              </label>
              <input
                id={`pl-line2-${location.id}`}
                name="line2"
                defaultValue={location.line2}
                className={input}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`pl-city-${location.id}`}>
                Ville
              </label>
              <input
                id={`pl-city-${location.id}`}
                name="city"
                required
                defaultValue={location.city}
                className={input}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`pl-postal-${location.id}`}>
                Code postal
              </label>
              <input
                id={`pl-postal-${location.id}`}
                name="postalCode"
                defaultValue={location.postalCode}
                className={input}
              />
            </div>
          </div>

          <input type="hidden" name="province" value={location.province || "QC"} />

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor={`pl-hours-${location.id}`}>
              Horaires
            </label>
            <input
              id={`pl-hours-${location.id}`}
              name="hoursNote"
              defaultValue={location.hoursNote}
              placeholder="Mardi au samedi, 10 h à 18 h"
              className={input}
            />
            <p className={hint}>
              Texte libre : les horaires d&apos;une épicerie changent au gré des
              arrivages, une grille rigide obligerait à mentir la moitié du temps.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`pl-inst-fr-${location.id}`}>
                Consignes — français
              </label>
              <textarea
                id={`pl-inst-fr-${location.id}`}
                name="instructionsFr"
                rows={3}
                defaultValue={location.instructionsFr}
                className="w-full rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`pl-inst-en-${location.id}`}>
                Consignes — anglais
              </label>
              <textarea
                id={`pl-inst-en-${location.id}`}
                name="instructionsEn"
                rows={3}
                defaultValue={location.instructionsEn}
                className="w-full rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900"
              />
            </div>
          </div>

          <input type="hidden" name="isActive" value={location.isActive ? "on" : ""} />

          <div className="flex flex-wrap items-center gap-4">
            <Submit label="Enregistrer" />
            <Feedback state={state} />
          </div>
        </form>
      ) : null}
    </li>
  );
}

export function SlotGeneratorForm({
  targets,
}: {
  targets: Array<{ value: string; label: string }>;
}) {
  const [state, action] = useActionState<TaxonomyState, FormData>(generateSlotsAction, {
    status: "idle",
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="slot-target">
            Pour
          </label>
          <select id="slot-target" name="target" required className={input} defaultValue="">
            <option value="" disabled>
              — Choisissez —
            </option>
            {targets.map((target) => (
              <option key={target.value} value={target.value}>
                {target.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="slot-from">
            Du
          </label>
          <input
            id="slot-from"
            name="from"
            type="date"
            required
            defaultValue={today}
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="slot-to">
            Au
          </label>
          <input id="slot-to" name="to" type="date" required className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="slot-start">
            De
          </label>
          <input
            id="slot-start"
            name="startTime"
            type="time"
            required
            defaultValue="10:00"
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="slot-end">
            À
          </label>
          <input
            id="slot-end"
            name="endTime"
            type="time"
            required
            defaultValue="14:00"
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="slot-capacity">
            Places par jour
          </label>
          <input
            id="slot-capacity"
            name="capacity"
            type="number"
            min={1}
            required
            defaultValue={8}
            className={input}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="secondary">
          <CalendarPlus aria-hidden="true" className="size-4" />
          Ouvrir les créneaux
        </Button>
        <Feedback state={state} />
      </div>

      <p className={hint}>
        Un créneau par jour sur la plage choisie, deux mois au maximum. Les créneaux déjà
        ouverts au même horaire sont laissés intacts : en changer la capacité ou l&apos;heure
        déplacerait les rendez-vous des clients qui les ont déjà pris.
      </p>
    </form>
  );
}

export function NewPickupLocationForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<TaxonomyState, FormData>(
    async (previous, formData) => {
      const result = await createPickupLocationAction(previous, formData);
      if (result.status === "saved") formRef.current?.reset();
      return result;
    },
    { status: "idle" },
  );

  return (
    <form
      ref={formRef}
      action={action}
      className="flex max-w-3xl flex-col gap-4 rounded-lg border border-line bg-surface p-5"
    >
      <h3 className="font-display text-base font-semibold text-forest-900">
        Nouveau point de ramassage
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="new-pl-name">
            Nom affiché au client
          </label>
          <input
            id="new-pl-name"
            name="name"
            required
            maxLength={120}
            placeholder="Ramassage à Laval"
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="new-pl-line1">
            Adresse
          </label>
          <input id="new-pl-line1" name="line1" required className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="new-pl-city">
            Ville
          </label>
          <input
            id="new-pl-city"
            name="city"
            required
            defaultValue="Montréal"
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="new-pl-postal">
            Code postal
          </label>
          <input id="new-pl-postal" name="postalCode" className={input} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="new-pl-hours">
            Horaires
          </label>
          <input
            id="new-pl-hours"
            name="hoursNote"
            placeholder="Mardi au samedi, 10 h à 18 h"
            className={input}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="secondary">
          <Plus aria-hidden="true" className="size-4" />
          Ajouter le point
        </Button>
        <Feedback state={state} />
      </div>

      <p className={hint}>
        Le point est actif dès sa création, mais <strong>invisible du client tant
        qu&apos;aucun créneau ne lui est rattaché</strong> : ouvrez-lui des créneaux
        ci-dessous. Les consignes bilingues se rédigent ensuite, en le modifiant.
      </p>
    </form>
  );
}
