"use client";

import { Globe } from "lucide-react";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

/**
 * Bascule de langue. On conserve le chemin courant : passer de
 * /fr/boutique à /en/boutique ne ramène pas l'utilisateur à l'accueil.
 */
export function LocaleSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  function switchTo(next: Locale) {
    router.replace(
      // @ts-expect-error — les paramètres dynamiques sont conservés tels quels
      { pathname, params },
      { locale: next },
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Globe aria-hidden="true" className="size-4 text-cream-200" />
      <span className="sr-only">{label}</span>
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          aria-current={code === locale ? "true" : undefined}
          className={`rounded-sm px-1.5 py-1 text-xs font-semibold uppercase transition-colors ${
            code === locale
              ? "bg-forest-700 text-white"
              : "text-cream-200 hover:text-white"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
