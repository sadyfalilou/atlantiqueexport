import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bascule « en ligne / masqué », posée directement dans les listes.
 *
 * Retirer un produit ou une recette du site est une décision fréquente et
 * urgente — une rupture de stock, une recette à corriger. L'obliger à passer
 * par la fiche puis par un formulaire complet coûte trop cher pour un geste
 * qui doit être immédiat.
 *
 * Sans droit d'écriture, l'état reste affiché mais n'est plus cliquable :
 * l'information vaut d'être lue même quand on ne peut pas la changer.
 */
export function PublishToggle({
  action,
  idField,
  id,
  isPublished,
  canEdit,
  publishedLabel = "En ligne",
  hiddenLabel = "Masqué",
}: {
  action: (formData: FormData) => void | Promise<void>;
  idField: string;
  id: string;
  isPublished: boolean;
  canEdit: boolean;
  publishedLabel?: string;
  hiddenLabel?: string;
}) {
  const icon = isPublished ? (
    <Eye aria-hidden="true" className="size-4" />
  ) : (
    <EyeOff aria-hidden="true" className="size-4" />
  );

  if (!canEdit) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${
          isPublished ? "text-success" : "text-muted"
        }`}
      >
        {icon}
        {isPublished ? publishedLabel : hiddenLabel}
      </span>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name={idField} value={id} />
      <input type="hidden" name="publish" value={isPublished ? "0" : "1"} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        title={isPublished ? "Retirer du site" : "Mettre en ligne"}
        className={isPublished ? "text-success" : "text-muted"}
      >
        {icon}
        {isPublished ? publishedLabel : hiddenLabel}
        {/*
          L'intitulé visible dit l'état — c'est ce qu'on parcourt des yeux dans
          une colonne. Le geste est ajouté pour les lecteurs d'écran, à la
          suite du texte visible et non à sa place : remplacer l'intitulé par
          un `aria-label` casserait la commande vocale, qui cherche justement
          les mots affichés.
        */}
        <span className="sr-only">
          {isPublished ? " — retirer du site" : " — mettre en ligne"}
        </span>
      </Button>
    </form>
  );
}
