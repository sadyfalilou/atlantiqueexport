"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveRecipeAction, type TaxonomyState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import type { AdminRecipe } from "@/lib/admin/queries";

const field =
  "h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const area =
  "w-full rounded-sm border border-line-strong bg-surface p-3 font-mono text-[13px] leading-relaxed text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const labelClass = "text-sm font-semibold text-forest-900";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer"}
    </Button>
  );
}

export function RecipeEditor({ recipe }: { recipe: AdminRecipe }) {
  const [state, action] = useActionState<TaxonomyState, FormData>(saveRecipeAction, {
    status: "idle",
  });

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={recipe.id} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="titleFr">
            Titre — français
          </label>
          <input
            id="titleFr"
            name="titleFr"
            required
            defaultValue={recipe.titleFr}
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
            defaultValue={recipe.titleEn}
            className={field}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="descriptionFr">
            Accroche — français
          </label>
          <textarea
            id="descriptionFr"
            name="descriptionFr"
            rows={2}
            defaultValue={recipe.descriptionFr}
            className="w-full rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="descriptionEn">
            Accroche — anglais
          </label>
          <textarea
            id="descriptionEn"
            name="descriptionEn"
            rows={2}
            defaultValue={recipe.descriptionEn}
            className="w-full rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="prepTime">
            Préparation (min)
          </label>
          <input
            id="prepTime"
            name="prepTime"
            inputMode="numeric"
            defaultValue={String(recipe.prepTimeMinutes)}
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="cookTime">
            Cuisson (min)
          </label>
          <input
            id="cookTime"
            name="cookTime"
            inputMode="numeric"
            defaultValue={String(recipe.cookTimeMinutes)}
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="servings">
            Portions
          </label>
          <input
            id="servings"
            name="servings"
            inputMode="numeric"
            defaultValue={String(recipe.servings)}
            className={field}
          />
        </div>
        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2.5 text-sm text-forest-900">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={recipe.isPublished}
              className="size-4"
            />
            Visible sur le site
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="ingredients">
          Ingrédients
        </label>
        <textarea
          id="ingredients"
          name="ingredients"
          rows={10}
          defaultValue={recipe.ingredientsText}
          placeholder={"2 c. à soupe de poudre de baobab | 2 tbsp baobab powder\n1 litre d'eau\n3 c. à soupe de sucre | 3 tbsp sugar"}
          className={area}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="steps">
          Préparation, une étape par ligne
        </label>
        <textarea
          id="steps"
          name="steps"
          rows={12}
          defaultValue={recipe.stepsText}
          placeholder={"Délayer la poudre dans un peu d'eau tiède. | Dissolve the powder in a little warm water.\nAjouter le reste de l'eau et remuer.\nSucrer à votre goût et servir bien frais."}
          className={area}
        />
      </div>

      <div className="rounded-lg border border-line bg-cream-50 p-4 text-sm text-muted">
        <p>
          <strong className="text-forest-900">Une ligne par entrée.</strong> Séparez le
          français de l&apos;anglais par une barre verticale <code>|</code>.
        </p>
        <p className="mt-2">
          Sans barre, le même texte sert dans les deux langues — pratique pour
          « 1 litre d&apos;eau », qui n&apos;a pas besoin d&apos;être traduit.
        </p>
        <p className="mt-2">
          Une recette <strong className="text-forest-900">sans étape ne peut pas être
          publiée</strong> : elle mettrait en ligne une page qui n&apos;apprend rien.
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
            Enregistré. La page publique est déjà à jour.
          </p>
        ) : null}
      </div>
    </form>
  );
}
