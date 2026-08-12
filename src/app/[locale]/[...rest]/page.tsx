import { notFound } from "next/navigation";

/**
 * Route attrape-tout sous `[locale]`.
 *
 * Sans elle, une URL comme /fr/boutique ne correspond à aucune route et
 * Next.js sert son 404 brut, hors de notre mise en page. La racine de
 * l'application étant définie sous un segment dynamique (`app/[locale]`),
 * c'est le cas que la documentation de Next 16 signale comme non couvert par
 * un simple `not-found.js`.
 *
 * Ici, l'URL correspond, `notFound()` est appelée, et c'est notre
 * `[locale]/not-found.tsx` qui s'affiche — avec l'en-tête, le pied de page et
 * le message expliquant que la section est encore en construction.
 *
 * Les routes statiques ayant priorité sur l'attrape-tout, ce fichier
 * s'effacera de lui-même au fur et à mesure que les vraies pages seront
 * créées. Il n'y aura rien à supprimer.
 */
export default function CatchAllRoute(): never {
  notFound();
}
