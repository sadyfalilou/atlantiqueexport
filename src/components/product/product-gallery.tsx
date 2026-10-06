"use client";

import Image from "next/image";
import { useState } from "react";
import { ProductPlaceholder } from "@/components/shared/product-placeholder";

/**
 * Les photos d'un produit.
 *
 * La fiche n'en montrait qu'une : les suivantes étaient bien envoyées, bien
 * rangées, et invisibles. Les vignettes n'apparaissent qu'à partir de deux
 * photos — une rangée d'une seule vignette sous l'image qu'elle répète
 * n'apprend rien à personne.
 *
 * Des boutons, pas des images cliquables : on y arrive au clavier, et un
 * lecteur d'écran annonce « Photo 2 sur 3 » plutôt qu'un fichier sans nom.
 */
export function ProductGallery({
  images,
  name,
  placeholderLabel,
  photoLabels,
  listLabel,
  children,
}: {
  images: Array<{ url: string; alt: string }>;
  name: string;
  placeholderLabel: string;
  /** « Photo 2 sur 3 » pour chaque vignette, traduit côté serveur : une
      fonction ne traverse pas la frontière entre serveur et navigateur. */
  photoLabels: string[];
  listLabel: string;
  /** Pastilles posées sur l'image principale. */
  children?: React.ReactNode;
}) {
  const [current, setCurrent] = useState(0);
  const shown = images[current];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface">
        {shown ? (
          <Image
            src={shown.url}
            alt={shown.alt.trim() || name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="object-cover"
          />
        ) : (
          <ProductPlaceholder name={name} label={placeholderLabel} />
        )}

        {children ? (
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">{children}</div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul aria-label={listLabel} className="grid grid-cols-5 gap-2">
          {images.map((image, index) => {
            const active = index === current;
            return (
              <li key={image.url}>
                <button
                  type="button"
                  onClick={() => setCurrent(index)}
                  aria-current={active ? "true" : undefined}
                  className={`relative block aspect-square w-full overflow-hidden rounded-md border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 ${
                    active ? "border-forest-800" : "border-line hover:border-line-strong"
                  }`}
                >
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="20vw"
                    className="object-cover"
                  />
                  <span className="sr-only">{photoLabels[index]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
