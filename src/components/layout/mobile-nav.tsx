"use client";

import { useEffect, useState } from "react";
import { Menu, User, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/logo";
import type { Category, Locale } from "@/lib/types";

interface NavLink {
  href: string;
  label: string;
}

/**
 * Tiroir de navigation mobile. Il piège le défilement du corps pendant
 * l'ouverture et se ferme avec Échap.
 */
export function MobileNav({
  categories,
  locale,
  links,
  labels,
}: {
  categories: Category[];
  locale: Locale;
  links: NavLink[];
  labels: { open: string; close: string; categories: string; account: string };
}) {
  const [open, setOpen] = useState(false);

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
        aria-label={labels.open}
        aria-expanded={open}
        className="inline-flex size-11 items-center justify-center rounded-md text-cream-50 transition-colors hover:bg-forest-700 lg:hidden"
      >
        <Menu aria-hidden="true" className="size-6" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-forest-900/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto bg-cream-50 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-label={labels.categories}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              {/* Fond crème : c'est la déclinaison d'origine qui convient ici. */}
              <Logo variant="wordmark" className="h-8" />

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={labels.close}
                className="inline-flex size-11 items-center justify-center rounded-md text-forest-800 hover:bg-cream-100"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <nav className="px-2 py-3">
              {/*
                Le compte en tête du tiroir : c'est là qu'on le cherche, et il
                n'y figurait pas. Détaché des autres liens, parce qu'il ne
                mène pas à une page du catalogue mais à ses propres commandes.
              */}
              <Link
                href="/compte"
                onClick={() => setOpen(false)}
                className="mb-2 flex items-center gap-2.5 rounded-md border border-line px-3 py-3 text-base font-semibold text-forest-900 hover:bg-cream-100"
              >
                <User aria-hidden="true" className="size-5" />
                {labels.account}
              </Link>

              <ul>
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-3 text-base font-semibold text-forest-900 hover:bg-cream-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="mt-4 px-3 text-xs font-semibold tracking-wide text-muted uppercase">
                {labels.categories}
              </p>
              <ul className="mt-1">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={category.href ?? `/boutique/${category.slug}`}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-2.5 text-sm text-forest-900 hover:bg-cream-100"
                    >
                      {category.name[locale]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
