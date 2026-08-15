"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { createRecipeAction, type TaxonomyState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

const field =
  "h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      <Plus aria-hidden="true" className="size-4" />
      {pending ? "Création…" : "Créer et rédiger"}
    </Button>
  );
}

export function NewRecipeForm() {
  const [state, action] = useActionState<TaxonomyState, FormData>(createRecipeAction, {
    status: "idle",
  });

  return (
    <form
      action={action}
      className="flex max-w-2xl flex-col gap-4 rounded-lg border border-line bg-surface p-5"
    >
      <h2 className="font-display text-base font-semibold text-forest-900">
        Nouvelle recette
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-forest-900" htmlFor="titleFr">
            Titre — français
          </label>
          <input id="titleFr" name="titleFr" required maxLength={200} className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-forest-900" htmlFor="titleEn">
            Titre — anglais
          </label>
          <input id="titleEn" name="titleEn" required maxLength={200} className={field} />
        </div>
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
        Les ingrédients, les étapes et les durées s&apos;écrivent sur l&apos;écran
        suivant, où vous pouvez enregistrer autant de fois que nécessaire. La recette
        reste masquée du site tant que vous ne la publiez pas.
      </p>
    </form>
  );
}
