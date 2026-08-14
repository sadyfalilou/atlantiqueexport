import Image from "next/image";
import { ProductPlaceholder } from "@/components/shared/product-placeholder";

/**
 * Photo d'un produit, ou son substitut.
 *
 * Un seul composant pour les trois endroits qui montrent un produit — carte,
 * fiche et panier — afin que le jour où une photo est ajoutée, elle apparaisse
 * partout à la fois. Sans photo, le substitut reste : il ne fait pas semblant
 * d'être une image, il annonce qu'elle viendra.
 */
export function ProductImage({
  src,
  alt,
  name,
  placeholderLabel,
  sizes,
  priority = false,
}: {
  src?: string | null;
  /** Texte alternatif saisi à l'envoi ; à défaut, le nom du produit sert. */
  alt?: string | null;
  name: string;
  placeholderLabel: string;
  /** Largeurs d'affichage réelles, pour que Next serve la bonne définition. */
  sizes: string;
  priority?: boolean;
}) {
  if (!src) {
    return <ProductPlaceholder name={name} label={placeholderLabel} />;
  }

  return (
    <Image
      src={src}
      alt={alt?.trim() || name}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
    />
  );
}
