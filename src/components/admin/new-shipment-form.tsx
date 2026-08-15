"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { createShipmentAction, type TaxonomyState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

const field =
  "h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      <Plus aria-hidden="true" className="size-4" />
      {pending ? "Création…" : "Créer l'arrivage"}
    </Button>
  );
}

export function NewShipmentForm() {
  const [state, action] = useActionState<TaxonomyState, FormData>(createShipmentAction, {
    status: "idle",
  });

  return (
    <form
      action={action}
      className="flex max-w-2xl flex-col gap-4 rounded-lg border border-line bg-surface p-5"
    >
      <h2 className="font-display text-base font-semibold text-forest-900">
        Nouvel arrivage
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-forest-900" htmlFor="titleFr">
            Titre — français
          </label>
          <input
            id="titleFr"
            name="titleFr"
            required
            maxLength={200}
            placeholder="Madd du Sénégal"
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-forest-900" htmlFor="titleEn">
            Titre — anglais
          </label>
          <input
            id="titleEn"
            name="titleEn"
            required
            maxLength={200}
            placeholder="Madd from Senegal"
            className={field}
          />
        </div>
      </div>

      <div className="flex max-w-xs flex-col gap-1.5">
        <label className="text-sm font-semibold text-forest-900" htmlFor="originCountry">
          Pays d&apos;origine
        </label>
        <input
          id="originCountry"
          name="originCountry"
          maxLength={60}
          placeholder="Sénégal"
          className={field}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Submit />
        {state.status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}
      </div>

      <p className="text-xs text-muted">
        Les dates, les formats annoncés et la mise en ligne se règlent sur l&apos;écran
        suivant. L&apos;arrivage reste invisible du site tant que vous ne le publiez pas.
      </p>
    </form>
  );
}
