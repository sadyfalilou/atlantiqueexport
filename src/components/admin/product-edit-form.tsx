"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProductAction, type PricingState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import type { AdminProduct } from "@/lib/admin/queries";

const input =
  "h-11 rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const area =
  "rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const labelClass = "text-sm font-semibold text-forest-900";
const hint = "text-xs text-muted";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer les modifications"}
    </Button>
  );
}

/** Deux champs côte à côte, français puis anglais. */
function Bilingual({
  name,
  label,
  fr,
  en,
  rows,
  hintText,
}: {
  name: string;
  label: string;
  fr: string;
  en: string;
  rows?: number;
  hintText?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${name}Fr`}>
            {label} — français
          </label>
          {rows ? (
            <textarea
              id={`${name}Fr`}
              name={`${name}Fr`}
              rows={rows}
              defaultValue={fr}
              className={area}
            />
          ) : (
            <input
              id={`${name}Fr`}
              name={`${name}Fr`}
              defaultValue={fr}
              className={input}
            />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor={`${name}En`}>
            {label} — anglais
          </label>
          {rows ? (
            <textarea
              id={`${name}En`}
              name={`${name}En`}
              rows={rows}
              defaultValue={en}
              className={area}
            />
          ) : (
            <input
              id={`${name}En`}
              name={`${name}En`}
              defaultValue={en}
              className={input}
            />
          )}
        </div>
      </div>
      {hintText ? <p className={hint}>{hintText}</p> : null}
    </div>
  );
}

export function ProductEditForm({
  product,
  categories,
  brands,
}: {
  product: AdminProduct;
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
}) {
  const f = product.fields;
  const [state, action] = useActionState<PricingState, FormData>(updateProductAction, {
    status: "idle",
  });

  return (
    <form action={action} className="flex max-w-4xl flex-col gap-6">
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="slug" value={product.slug} />

      <Bilingual name="name" label="Nom" fr={f.nameFr} en={f.nameEn} />

      <Bilingual
        name="shortDescription"
        label="Accroche"
        fr={f.shortDescriptionFr}
        en={f.shortDescriptionEn}
        rows={2}
        hintText="Une phrase, affichée sous le titre de la fiche et reprise par les moteurs de recherche."
      />

      <Bilingual
        name="description"
        label="Description"
        fr={f.descriptionFr}
        en={f.descriptionEn}
        rows={5}
      />

      <Bilingual
        name="storage"
        label="Conservation"
        fr={f.storageFr}
        en={f.storageEn}
        rows={2}
        hintText="Comment garder le produit une fois acheté. À ne pas confondre avec la température de transport ci-dessous."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="categoryId">
            Catégorie
          </label>
          <select
            id="categoryId"
            name="categoryId"
            className={input}
            defaultValue={f.categoryId ?? ""}
          >
            <option value="">— Aucune —</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="brandId">
            Marque
          </label>
          <select
            id="brandId"
            name="brandId"
            className={input}
            defaultValue={f.brandId ?? ""}
          >
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
          <label className={labelClass} htmlFor="temperatureClass">
            Température de transport
          </label>
          <select
            id="temperatureClass"
            name="temperatureClass"
            className={input}
            defaultValue={f.temperatureClass}
          >
            <option value="ambient">Ambiante</option>
            <option value="fresh">Frais</option>
            <option value="refrigerated">Réfrigéré</option>
            <option value="frozen">Congelé</option>
          </select>
          <p className={hint}>
            Décide des modes de réception possibles : un produit congelé ne peut
            pas partir par la poste. Le modifier change ce que les clients
            pourront choisir.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="originCountry">
            Origine
          </label>
          <input
            id="originCountry"
            name="originCountry"
            defaultValue={f.originCountry}
            placeholder="SN"
            className={input}
          />
          <p className={hint}>
            Code du pays ou nom en clair. « SN » s&apos;affiche « Sénégal » sur la
            fiche.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="allergens">
          Allergènes
        </label>
        <input
          id="allergens"
          name="allergens"
          defaultValue={f.allergens.join(", ")}
          placeholder="arachides, gluten"
          className={input}
        />
        <p className={hint}>
          Séparés par des virgules. Laissé vide, la fiche indique
          « aucun allergène déclaré » — ne le laissez vide que si c&apos;est vrai.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-line bg-cream-50 p-4">
        <legend className="px-1 text-sm font-semibold text-forest-900">
          Mise en avant
        </legend>
        <label className="flex items-center gap-3 text-sm text-forest-900">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={f.isFeatured}
            className="size-4"
          />
          Afficher parmi les produits populaires de l&apos;accueil
        </label>
        <label className="flex items-center gap-3 text-sm text-forest-900">
          <input
            type="checkbox"
            name="isNew"
            defaultChecked={f.isNew}
            className="size-4"
          />
          Marquer comme nouveauté
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <Submit />
        {state.status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}
        {state.status === "saved" ? (
          <p role="status" className="text-sm text-success">
            Modifications enregistrées.
          </p>
        ) : null}
      </div>

      <p className={hint}>
        L&apos;adresse du produit reste <code>{product.slug}</code> même si vous
        changez son nom : elle est déjà indexée par les moteurs de recherche et
        partagée dans des liens, que la modifier transformerait en pages
        introuvables.
      </p>
    </form>
  );
}
