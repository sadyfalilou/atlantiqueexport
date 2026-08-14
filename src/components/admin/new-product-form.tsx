"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createProductAction, type NewProductState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

const field =
  "h-11 rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const label = "text-sm font-semibold text-forest-900";
const hint = "text-xs text-muted";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Création en cours…" : "Créer le produit"}
    </Button>
  );
}

export function NewProductForm({
  categories,
  brands,
}: {
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
}) {
  const [state, action] = useActionState<NewProductState, FormData>(
    createProductAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-8">
      <fieldset className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
        <legend className="px-1 font-display text-base font-semibold text-forest-900">
          Le produit
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="nameFr">
              Nom en français <span className="text-danger">*</span>
            </label>
            <input id="nameFr" name="nameFr" required maxLength={160} className={field} />
            <p className={hint}>L&apos;adresse du produit en découle.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="nameEn">
              Nom en anglais <span className="text-danger">*</span>
            </label>
            <input id="nameEn" name="nameEn" required maxLength={160} className={field} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="categoryId">
              Catégorie
            </label>
            <select id="categoryId" name="categoryId" className={field} defaultValue="">
              <option value="">— Aucune pour l&apos;instant —</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="brandId">
              Marque
            </label>
            <select id="brandId" name="brandId" className={field} defaultValue="">
              <option value="">— Aucune —</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="temperatureClass">
              Conservation <span className="text-danger">*</span>
            </label>
            <select
              id="temperatureClass"
              name="temperatureClass"
              className={field}
              defaultValue="ambient"
            >
              <option value="ambient">Ambiante</option>
              <option value="fresh">Frais</option>
              <option value="refrigerated">Réfrigéré</option>
              <option value="frozen">Congelé</option>
            </select>
            <p className={hint}>
              Détermine les modes de livraison possibles : un produit congelé ne
              peut pas partir par la poste.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="originCountry">
              Pays d&apos;origine
            </label>
            <input
              id="originCountry"
              name="originCountry"
              maxLength={80}
              placeholder="Sénégal"
              className={field}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="descriptionFr">
              Description en français
            </label>
            <textarea
              id="descriptionFr"
              name="descriptionFr"
              rows={4}
              maxLength={4000}
              className="rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="descriptionEn">
              Description en anglais
            </label>
            <textarea
              id="descriptionEn"
              name="descriptionEn"
              rows={4}
              maxLength={4000}
              className="rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
        <legend className="px-1 font-display text-base font-semibold text-forest-900">
          Le premier format
        </legend>
        <p className={hint}>
          Un produit sans format n&apos;a ni prix ni stock : il ne serait pas
          vendable. Vous pourrez en ajouter d&apos;autres ensuite.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="variantLabelFr">
              Format en français <span className="text-danger">*</span>
            </label>
            <input
              id="variantLabelFr"
              name="variantLabelFr"
              required
              maxLength={120}
              placeholder="Sachet 500 g"
              className={field}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="variantLabelEn">
              Format en anglais <span className="text-danger">*</span>
            </label>
            <input
              id="variantLabelEn"
              name="variantLabelEn"
              required
              maxLength={120}
              placeholder="500 g bag"
              className={field}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="sku">
              Code SKU <span className="text-danger">*</span>
            </label>
            <input
              id="sku"
              name="sku"
              required
              maxLength={60}
              placeholder="AE-FONIO-500"
              className={field}
            />
            <p className={hint}>Unique dans tout le catalogue.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="retailPrice">
              Prix de vente <span className="text-danger">*</span>
            </label>
            <input
              id="retailPrice"
              name="retailPrice"
              required
              inputMode="decimal"
              placeholder="12,99"
              className={field}
            />
            <p className={hint}>En dollars. La virgule est acceptée.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="netWeightG">
              Poids net
            </label>
            <input
              id="netWeightG"
              name="netWeightG"
              inputMode="numeric"
              placeholder="500"
              className={field}
            />
            <p className={hint}>En grammes. Sert au prix au kilo.</p>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <Submit />
        {state.status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}
      </div>

      <p className={hint}>
        Le produit est créé <strong>non publié</strong> : il n&apos;apparaît pas
        sur le site tant que vous ne l&apos;avez pas publié depuis sa fiche, une
        fois la photo ajoutée et la description relue.
      </p>
    </form>
  );
}
