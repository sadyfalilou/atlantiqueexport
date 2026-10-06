"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * Champ de recherche d'une liste de l'administration.
 *
 * Le texte vit dans l'adresse (`?q=`) et non dans un état local : le filtre
 * survit à un rechargement, se partage par lien, et se range à côté des
 * filtres de statut qui existaient déjà. Les autres paramètres sont
 * conservés — chercher dans « à préparer » ne doit pas sortir de « à
 * préparer ».
 *
 * La frappe est temporisée : une adresse poussée à chaque lettre relancerait
 * une lecture de la base par caractère tapé.
 */
export function ListFilter({
  placeholder,
  label = "Rechercher",
}: {
  placeholder: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const current = searchParams.get("q") ?? "";
  const [value, setValue] = useState(current);
  const [seen, setSeen] = useState(current);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // L'adresse peut changer sans passer par le champ : un lien du tableau de
  // bord, un retour en arrière. Le champ se recale alors pendant le rendu —
  // un effet qui écrirait l'état provoquerait un second rendu à chaque
  // frappe, et effacerait ce qu'on est en train de taper.
  if (current !== seen) {
    setSeen(current);
    setValue(current);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function push(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next.trim()) params.set("q", next);
    else params.delete("q");

    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), 250);
  }

  return (
    <div className="relative w-full sm:w-72">
      <label className="sr-only" htmlFor="filtre-liste">
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
      />
      <input
        id="filtre-liste"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-line-strong bg-surface pr-10 pl-9 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            if (timer.current) clearTimeout(timer.current);
            setValue("");
            push("");
          }}
          className="absolute top-1/2 right-0 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-forest-900"
        >
          <X aria-hidden="true" className="size-4" />
          <span className="sr-only">Effacer la recherche</span>
        </button>
      ) : null}
      {pending ? (
        <span className="sr-only" role="status">
          Recherche en cours
        </span>
      ) : null}
    </div>
  );
}
