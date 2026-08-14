"use client";

import Image from "next/image";
import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import {
  deleteProductPhotoAction,
  setPrimaryPhotoAction,
  uploadProductPhotoAction,
  type PhotoState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import type { AdminPhoto } from "@/lib/admin/queries";

function SubmitButton() {
  // `useFormStatus` doit vivre dans un enfant du formulaire pour le voir.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      <ImagePlus aria-hidden="true" className="size-4" />
      {pending ? "Envoi en cours…" : "Ajouter la photo"}
    </Button>
  );
}

export function PhotoManager({
  productId,
  slug,
  productName,
  photos,
}: {
  productId: string;
  slug: string;
  productName: string;
  photos: AdminPhoto[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action] = useActionState<PhotoState, FormData>(
    async (previous, formData) => {
      const result = await uploadProductPhotoAction(previous, formData);
      if (result.status === "saved") formRef.current?.reset();
      return result;
    },
    { status: "idle" },
  );

  return (
    <div className="flex flex-col gap-6">
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="overflow-hidden rounded-lg border border-line bg-surface"
            >
              <div className="relative aspect-square bg-cream-100">
                <Image
                  src={photo.url}
                  alt={photo.altFr || productName}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover"
                />
                {photo.isPrimary ? (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-forest-800 px-2.5 py-1 text-xs font-semibold text-white">
                    <Star aria-hidden="true" className="size-3" />
                    Principale
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-2 p-2">
                {photo.isPrimary ? (
                  <span className="px-2 text-xs text-muted">Affichée en premier</span>
                ) : (
                  <form action={setPrimaryPhotoAction}>
                    <input type="hidden" name="photoId" value={photo.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center rounded-md px-2 text-xs font-semibold text-forest-800 underline hover:bg-cream-100"
                    >
                      Définir comme principale
                    </button>
                  </form>
                )}

                <form action={deleteProductPhotoAction}>
                  <input type="hidden" name="photoId" value={photo.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button
                    type="submit"
                    aria-label="Supprimer cette photo"
                    className="inline-flex size-9 items-center justify-center rounded-md text-danger hover:bg-cream-100"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-line-strong bg-cream-50 p-5 text-sm text-muted">
          Aucune photo. Tant qu&apos;il n&apos;y en a pas, le site affiche un motif portant
          l&apos;initiale du produit — visiblement un substitut, jamais une fausse photo.
        </p>
      )}

      <form
        ref={formRef}
        action={action}
        className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5"
      >
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="slug" value={slug} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="photo" className="text-sm font-semibold text-forest-900">
            Fichier
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="text-sm text-forest-900 file:mr-3 file:h-11 file:rounded-md file:border-0 file:bg-cream-100 file:px-4 file:text-sm file:font-semibold file:text-forest-800"
          />
          <p className="text-xs text-muted">
            JPEG, PNG, WebP ou AVIF, 5 Mo au maximum. Une image carrée s&apos;affiche
            le mieux : le site la recadre au centre.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="altFr" className="text-sm font-semibold text-forest-900">
              Description de l&apos;image, en français
            </label>
            <input
              id="altFr"
              name="altFr"
              type="text"
              maxLength={160}
              placeholder="Sachet de café Touba moulu, 250 g"
              className="h-11 rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="altEn" className="text-sm font-semibold text-forest-900">
              Description de l&apos;image, en anglais
            </label>
            <input
              id="altEn"
              name="altEn"
              type="text"
              maxLength={160}
              placeholder="Bag of ground Touba coffee, 250 g"
              className="h-11 rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
            />
          </div>
        </div>

        <p className="text-xs text-muted">
          Ces descriptions sont lues à voix haute par les lecteurs d&apos;écran et
          s&apos;affichent si l&apos;image ne charge pas. Laissées vides, le nom du produit
          sert de secours.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton />
          {state.status === "error" ? (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          ) : null}
          {state.status === "saved" ? (
            <p role="status" className="text-sm text-success">
              Photo ajoutée.
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
