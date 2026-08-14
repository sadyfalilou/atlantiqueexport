"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import {
  saveBrandAction,
  saveCategoryAction,
  type TaxonomyState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import type { AdminBrand, AdminCategory } from "@/lib/admin/queries";

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
        Enregistré.
      </p>
    );
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Catégories                                                                  */
/* -------------------------------------------------------------------------- */

export function CategoryRow({ category }: { category: AdminCategory }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<TaxonomyState, FormData>(saveCategoryAction, {
    status: "idle",
  });

  return (
    <li className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-semibold text-forest-900">
            {category.nameFr}
            {category.isVirtual ? (
              <span className="ml-2 rounded-full bg-cream-100 px-2 py-0.5 text-xs text-muted">
                rayon calculé
              </span>
            ) : null}
            {!category.isActive ? (
              <span className="ml-2 rounded-full bg-cream-100 px-2 py-0.5 text-xs text-warning">
                masquée
              </span>
            ) : null}
          </p>
          <p className={hint}>
            <code>{category.slug}</code> · {category.productCount} produit
            {category.productCount > 1 ? "s" : ""} · position {category.position}
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
          <input type="hidden" name="id" value={category.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`cat-fr-${category.id}`}>
                Nom — français
              </label>
              <input
                id={`cat-fr-${category.id}`}
                name="nameFr"
                defaultValue={category.nameFr}
                required
                className={input}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`cat-en-${category.id}`}>
                Nom — anglais
              </label>
              <input
                id={`cat-en-${category.id}`}
                name="nameEn"
                defaultValue={category.nameEn}
                required
                className={input}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`cat-dfr-${category.id}`}>
                Description — français
              </label>
              <textarea
                id={`cat-dfr-${category.id}`}
                name="descriptionFr"
                rows={2}
                defaultValue={category.descriptionFr}
                className="rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`cat-den-${category.id}`}>
                Description — anglais
              </label>
              <textarea
                id={`cat-den-${category.id}`}
                name="descriptionEn"
                rows={2}
                defaultValue={category.descriptionEn}
                className="rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div className="flex w-28 flex-col gap-1.5">
              <label className={labelClass} htmlFor={`cat-pos-${category.id}`}>
                Position
              </label>
              <input
                id={`cat-pos-${category.id}`}
                name="position"
                inputMode="numeric"
                defaultValue={String(category.position)}
                className={input}
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm text-forest-900">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={category.isActive}
                className="size-4"
              />
              Visible sur le site
            </label>
            <label className="flex items-center gap-2.5 text-sm text-forest-900">
              <input
                type="checkbox"
                name="showInMegaMenu"
                defaultChecked={category.showInMegaMenu}
                className="size-4"
              />
              Dans le méga-menu
            </label>
          </div>

          {category.productCount > 0 ? (
            <p className={hint}>
              La masquer retirera {category.productCount} produit
              {category.productCount > 1 ? "s" : ""} de la navigation. Les fiches
              resteront accessibles par leur adresse.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            <Submit label="Enregistrer" />
            <Feedback state={state} />
          </div>
        </form>
      ) : null}
    </li>
  );
}

export function NewCategoryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<TaxonomyState, FormData>(
    async (previous, formData) => {
      const result = await saveCategoryAction(previous, formData);
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
      <h2 className="font-display text-base font-semibold text-forest-900">
        Nouvelle catégorie
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="new-cat-fr">
            Nom — français
          </label>
          <input id="new-cat-fr" name="nameFr" required className={input} />
          <p className={hint}>L&apos;adresse de la catégorie en découle.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="new-cat-en">
            Nom — anglais
          </label>
          <input id="new-cat-en" name="nameEn" required className={input} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div className="flex w-28 flex-col gap-1.5">
          <label className={labelClass} htmlFor="new-cat-pos">
            Position
          </label>
          <input id="new-cat-pos" name="position" inputMode="numeric" defaultValue="0" className={input} />
        </div>
        <label className="flex items-center gap-2.5 text-sm text-forest-900">
          <input type="checkbox" name="isActive" defaultChecked className="size-4" />
          Visible sur le site
        </label>
        <label className="flex items-center gap-2.5 text-sm text-forest-900">
          <input type="checkbox" name="showInMegaMenu" defaultChecked className="size-4" />
          Dans le méga-menu
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="secondary">
          <Plus aria-hidden="true" className="size-4" />
          Créer la catégorie
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Marques                                                                     */
/* -------------------------------------------------------------------------- */

export function BrandRow({ brand }: { brand: AdminBrand }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<TaxonomyState, FormData>(saveBrandAction, {
    status: "idle",
  });

  return (
    <li className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-semibold text-forest-900">
            {brand.name}
            {!brand.isActive ? (
              <span className="ml-2 rounded-full bg-cream-100 px-2 py-0.5 text-xs text-warning">
                masquée
              </span>
            ) : null}
            {brand.isPartner ? (
              <span className="ml-2 rounded-full bg-cream-100 px-2 py-0.5 text-xs text-muted">
                partenaire
              </span>
            ) : null}
          </p>
          <p className={hint}>
            <code>{brand.slug}</code> · {brand.productCount} produit
            {brand.productCount > 1 ? "s" : ""}
            {brand.originCountry ? ` · ${brand.originCountry}` : ""}
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
          <input type="hidden" name="id" value={brand.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`brand-name-${brand.id}`}>
                Nom
              </label>
              <input
                id={`brand-name-${brand.id}`}
                name="name"
                defaultValue={brand.name}
                required
                className={input}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`brand-origin-${brand.id}`}>
                Origine
              </label>
              <input
                id={`brand-origin-${brand.id}`}
                name="originCountry"
                defaultValue={brand.originCountry}
                className={input}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`brand-dfr-${brand.id}`}>
                Description — français
              </label>
              <textarea
                id={`brand-dfr-${brand.id}`}
                name="descriptionFr"
                rows={2}
                defaultValue={brand.descriptionFr}
                className="rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor={`brand-den-${brand.id}`}>
                Description — anglais
              </label>
              <textarea
                id={`brand-den-${brand.id}`}
                name="descriptionEn"
                rows={2}
                defaultValue={brand.descriptionEn}
                className="rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2.5 text-sm text-forest-900">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={brand.isActive}
                className="size-4"
              />
              Visible sur le site
            </label>
            <label className="flex items-center gap-2.5 text-sm text-forest-900">
              <input
                type="checkbox"
                name="isPartner"
                defaultChecked={brand.isPartner}
                className="size-4"
              />
              Marque partenaire
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Submit label="Enregistrer" />
            <Feedback state={state} />
          </div>
        </form>
      ) : null}
    </li>
  );
}

export function NewBrandForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<TaxonomyState, FormData>(
    async (previous, formData) => {
      const result = await saveBrandAction(previous, formData);
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
      <h2 className="font-display text-base font-semibold text-forest-900">
        Nouvelle marque
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="new-brand-name">
            Nom
          </label>
          <input id="new-brand-name" name="name" required className={input} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="new-brand-origin">
            Origine
          </label>
          <input id="new-brand-origin" name="originCountry" placeholder="Sénégal" className={input} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2.5 text-sm text-forest-900">
          <input type="checkbox" name="isActive" defaultChecked className="size-4" />
          Visible sur le site
        </label>
        <label className="flex items-center gap-2.5 text-sm text-forest-900">
          <input type="checkbox" name="isPartner" className="size-4" />
          Marque partenaire
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="secondary">
          <Plus aria-hidden="true" className="size-4" />
          Créer la marque
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
