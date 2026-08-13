"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Tiroir de filtres sur mobile.
 *
 * Le panneau lui-même reste rendu côté serveur et arrive ici en `children` :
 * ce composant ne fait qu'ouvrir et fermer. Les filtres restent donc de simples
 * liens, et le tiroir n'ajoute pas de logique à maintenir en double.
 */
export function MobileFilters({
  activeCount,
  children,
}: {
  activeCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("shop");

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="inline-flex h-11 items-center gap-2 rounded-md border-2 border-forest-800 px-4 text-sm font-semibold text-forest-800 transition-colors hover:bg-forest-50 lg:hidden"
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        {activeCount > 0 ? t("filtersWithCount", { count: activeCount }) : t("filters")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-forest-900/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("filters")}
            className="absolute inset-y-0 right-0 flex w-[min(22rem,90vw)] flex-col bg-cream-50 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-display text-lg font-semibold text-forest-900">
                {t("filters")}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="inline-flex size-11 items-center justify-center rounded-md text-forest-800 hover:bg-cream-100"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
