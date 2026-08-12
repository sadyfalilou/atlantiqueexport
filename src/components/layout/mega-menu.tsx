"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Category, Locale } from "@/lib/types";

/**
 * Méga-menu « Boutique ».
 *
 * Les colonnes sont construites à partir de la table `categories` : aucune
 * catégorie n'est écrite en dur. Ouverture au survol à la souris, au clic ou
 * à la touche Entrée au clavier, fermeture par Échap ou par clic extérieur.
 */
export function MegaMenu({
  categories,
  locale,
  label,
  allLabel,
}: {
  categories: Category[];
  locale: Locale;
  label: string;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Le survol ouvre déjà le menu ; sans ce drapeau, le clic qui suit le
  // refermerait immédiatement.
  const openedByHover = useRef(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function scheduleClose() {
    closeTimer.current = setTimeout(() => {
      openedByHover.current = false;
      setOpen(false);
    }, 120);
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  /** Ouverture au survol, réservée aux pointeurs qui survolent réellement. */
  function handlePointerEnter(event: React.PointerEvent) {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    if (!open) openedByHover.current = true;
    setOpen(true);
  }

  function handleClick() {
    if (openedByHover.current) {
      // Le menu vient de s'ouvrir au survol : le clic le confirme,
      // il ne le referme pas.
      openedByHover.current = false;
      setOpen(true);
      return;
    }
    setOpen((value) => !value);
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onPointerEnter={handlePointerEnter}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={handleClick}
        className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700"
      >
        {label}
        <ChevronDown
          aria-hidden="true"
          className={`size-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          className="absolute top-full left-0 z-50 mt-1 w-[min(56rem,calc(100vw-4rem))] rounded-lg border border-line bg-surface p-6 shadow-lg"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <ul className="grid grid-cols-2 gap-x-8 gap-y-1 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={category.href ?? `/boutique/${category.slug}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-sm px-2 py-2 text-sm text-forest-900 transition-colors hover:bg-cream-100 hover:text-forest-700"
                >
                  <span className="font-semibold">{category.name[locale]}</span>
                  {category.description ? (
                    <span className="mt-0.5 block text-xs text-muted">
                      {category.description[locale]}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-line pt-4">
            <Link
              href="/boutique"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-mango-800 hover:underline"
            >
              {allLabel}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
