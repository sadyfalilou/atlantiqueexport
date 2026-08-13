"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { PARAM, SORT_OPTIONS, type SortOption } from "@/lib/catalog/filters";

/**
 * Sélecteur de tri.
 *
 * Il modifie l'URL plutôt qu'un état local : le tri choisi fait donc partie du
 * lien que l'on peut partager, au même titre que les filtres.
 */
export function SortSelect({
  value,
  pathname,
  query,
}: {
  value: SortOption;
  /** Chemin courant, sans la locale — la navigation localisée s'en charge. */
  pathname: string;
  /** Paramètres actuels, hors tri. */
  query: Record<string, string | string[] | undefined>;
}) {
  const t = useTranslations("shop");
  const router = useRouter();

  function onChange(next: string) {
    const search = new URLSearchParams();
    for (const [key, item] of Object.entries(query)) {
      if (key === PARAM.sort || item === undefined) continue;
      for (const one of Array.isArray(item) ? item : [item]) search.append(key, one);
    }
    if (next !== "popularite") search.append(PARAM.sort, next);
    const queryString = search.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  }

  return (
    // À 320 px, l'intitulé « Trier par » et le menu ne tiennent pas côte à côte
    // avec le bouton de filtres : l'intitulé passe alors en lecture d'écran
    // seule, et le menu prend la largeur restante plutôt que de déborder.
    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:flex-none">
      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap sm:text-muted">
        {t("sort")}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full min-w-0 rounded-sm border border-line-strong bg-surface px-2 text-sm font-semibold text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:w-auto"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t(`sortOptions.${option}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
