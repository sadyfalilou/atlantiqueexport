import type { ReactNode } from "react";

/**
 * État vide : une icône, une explication, et si possible une sortie.
 * Utilisé notamment pour la section « Avis » tant qu'aucun avis authentique
 * n'a été publié — nous n'affichons jamais de témoignage fictif.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
      {icon ? (
        <div className="mb-4 text-forest-600" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <p className="font-display text-lg font-semibold text-forest-900">
        {title}
      </p>
      {body ? (
        <p className="mt-2 max-w-[38rem] text-sm text-muted">{body}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
