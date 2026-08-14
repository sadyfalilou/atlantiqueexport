"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { savePageAction, type TaxonomyState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import type { AdminPage } from "@/lib/admin/queries";

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

export function PageEditor({
  page,
  canChangeDraft,
}: {
  /** Absent pour une création. */
  page?: AdminPage;
  /** Seul le super administrateur peut lever la mention « brouillon ». */
  canChangeDraft: boolean;
}) {
  const [draft, setDraft] = useState(page?.isDraftLegal ?? false);
  const [state, action] = useActionState<TaxonomyState, FormData>(savePageAction, {
    status: "idle",
  });

  return (
    <form action={action} className="flex flex-col gap-6">
      {page ? <input type="hidden" name="id" value={page.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="slug">
            Adresse
          </label>
          <input
            id="slug"
            name="slug"
            required
            defaultValue={page?.slug ?? ""}
            placeholder="politiques/retours"
            readOnly={Boolean(page)}
            className={`${field} ${page ? "bg-cream-50 text-muted" : ""}`}
          />
          <p className="text-xs text-muted">
            {page
              ? "Figée : elle vit dans des liens déjà partagés et indexés."
              : "Sans barre oblique au début. Une barre au milieu crée un dossier, comme politiques/retours."}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 pt-6">
          <label className="flex items-center gap-2.5 text-sm text-forest-900">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={page?.isPublished ?? false}
              className="size-4"
            />
            Visible sur le site
          </label>

          <label
            className={`flex items-center gap-2.5 text-sm ${
              canChangeDraft ? "text-forest-900" : "text-muted"
            }`}
          >
            <input
              type="checkbox"
              name="isDraftLegal"
              checked={draft}
              disabled={!canChangeDraft}
              onChange={(event) => setDraft(event.target.checked)}
              className="size-4"
            />
            Brouillon juridique
          </label>
        </div>
      </div>

      {page?.isDraftLegal && !draft ? (
        <div
          role="note"
          className="flex gap-3 rounded-lg border-2 border-mango-700 bg-mango-50 p-4"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
          <p className="text-sm text-forest-900">
            Vous vous apprêtez à retirer la mention « brouillon ». L&apos;encadré
            d&apos;avertissement disparaîtra et la page redeviendra indexable :
            ce texte engagera alors l&apos;entreprise. Ne le faites qu&apos;après
            relecture par quelqu&apos;un de qualifié.
          </p>
        </div>
      ) : null}

      {!canChangeDraft ? (
        <p className="text-xs text-muted">
          La mention « brouillon juridique » ne peut être changée que par un super
          administrateur. Vous pouvez corriger le texte librement.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="titleFr">
            Titre — français
          </label>
          <input
            id="titleFr"
            name="titleFr"
            required
            defaultValue={page?.titleFr ?? ""}
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
            defaultValue={page?.titleEn ?? ""}
            className={field}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="bodyFr">
            Texte — français
          </label>
          <textarea
            id="bodyFr"
            name="bodyFr"
            rows={26}
            defaultValue={page?.bodyFr ?? ""}
            className={area}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="bodyEn">
            Texte — anglais
          </label>
          <textarea
            id="bodyEn"
            name="bodyEn"
            rows={26}
            defaultValue={page?.bodyEn ?? ""}
            className={area}
          />
        </div>
      </div>

      <details className="rounded-lg border border-line bg-cream-50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-forest-900">
          Comment mettre en forme le texte
        </summary>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted">
          <li>
            <code>## Titre</code> — un grand titre de section
          </li>
          <li>
            <code>### Sous-titre</code> — un titre plus petit
          </li>
          <li>
            <code>- élément</code> — une puce (une par ligne)
          </li>
          <li>
            <code>1. élément</code> — une liste numérotée
          </li>
          <li>
            <code>**important**</code> — du gras
          </li>
          <li>
            <code>[texte](/livraison)</code> — un lien interne
          </li>
          <li>
            <code>[écrire](mailto:info@atlantiqueexport.com)</code> — un lien courriel
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted">
          Séparez les paragraphes par une <strong>ligne vide</strong>. N&apos;imbriquez pas
          de gras dans du gras : les astérisques s&apos;afficheraient en clair.
        </p>
      </details>

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
