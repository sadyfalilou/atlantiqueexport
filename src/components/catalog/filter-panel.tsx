import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  PARAM,
  TEMPERATURES,
  buildQuery,
  countActiveFilters,
  toggleValue,
  type CatalogFilters,
} from "@/lib/catalog/filters";
import { cn } from "@/lib/utils";
import type { Category, Locale } from "@/lib/types";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Panneau de filtres.
 *
 * Chaque filtre est un LIEN, pas une case à cocher pilotée par du JavaScript :
 * la page fonctionne sans script, chaque combinaison a sa propre URL, et le
 * bouton « précédent » du navigateur se comporte comme l'utilisateur l'attend.
 * Le filtre par prix est un formulaire GET, pour la même raison.
 */
export async function FilterPanel({
  categories,
  filters,
  params,
  pathname,
  locale,
}: {
  categories: Category[];
  filters: CatalogFilters;
  params: SearchParams;
  pathname: string;
  locale: Locale;
}) {
  const t = await getTranslations("shop");
  const tTemperature = await getTranslations("temperature");
  const activeCount = countActiveFilters(filters);

  return (
    <div className="space-y-8">
      {activeCount > 0 ? (
        <Link
          href={pathname}
          className="inline-flex min-h-9 items-center text-sm font-semibold text-mango-800 hover:underline"
        >
          {t("clearAll")}
        </Link>
      ) : null}

      {/* --- Catégories ---
          La catégorie vit dans le CHEMIN (/boutique/poudres-naturelles), pas
          dans un paramètre : l'URL reste lisible et il ne peut pas y avoir de
          contradiction entre le chemin et la requête. Les autres filtres sont
          conservés au passage d'une catégorie à l'autre. */}
      <fieldset>
        <legend className="text-xs font-semibold tracking-wide text-muted uppercase">
          {t("category")}
        </legend>
        <ul className="mt-3 space-y-0.5">
          <li>
            <FilterLink
              href={`/boutique${buildQuery(params, { [PARAM.category]: null })}`}
              selected={!filters.category}
              label={t("allCategories")}
            />
          </li>
          {categories.map((category) => {
            const selected = filters.category === category.slug;
            const query = buildQuery(params, { [PARAM.category]: null });
            return (
              <li key={category.id}>
                <FilterLink
                  href={
                    selected
                      ? `/boutique${query}`
                      : `/boutique/${category.slug}${query}`
                  }
                  selected={selected}
                  label={category.name[locale]}
                />
              </li>
            );
          })}
        </ul>
      </fieldset>

      {/* --- Conservation --- */}
      <fieldset>
        <legend className="text-xs font-semibold tracking-wide text-muted uppercase">
          {t("temperature")}
        </legend>
        <ul className="mt-3 space-y-0.5">
          {TEMPERATURES.map((temperature) => (
            <li key={temperature}>
              <FilterLink
                href={`${pathname}${toggleValue(params, PARAM.temperature, temperature)}`}
                selected={filters.temperatures.includes(temperature)}
                label={tTemperature(temperature)}
              />
            </li>
          ))}
        </ul>
      </fieldset>

      {/* --- Raccourcis --- */}
      <fieldset>
        <legend className="sr-only">{t("filters")}</legend>
        <ul className="space-y-0.5">
          <li>
            <FilterLink
              href={`${pathname}${buildQuery(params, {
                [PARAM.promo]: filters.onlyPromo ? null : "1",
              })}`}
              selected={filters.onlyPromo}
              label={t("onlyPromo")}
            />
          </li>
          <li>
            <FilterLink
              href={`${pathname}${buildQuery(params, {
                [PARAM.isNew]: filters.onlyNew ? null : "1",
              })}`}
              selected={filters.onlyNew}
              label={t("onlyNew")}
            />
          </li>
        </ul>
      </fieldset>

      {/* --- Prix : formulaire GET, donc fonctionnel sans JavaScript --- */}
      <form action={pathname} method="get" className="space-y-3">
        <fieldset>
          <legend className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t("price")}
          </legend>

          {/* Les autres filtres sont conservés à la soumission. */}
          {Object.entries(params).flatMap(([key, value]) =>
            key === PARAM.minPrice || key === PARAM.maxPrice
              ? []
              : (Array.isArray(value) ? value : [value]).map((item, index) =>
                  item === undefined ? null : (
                    <input
                      key={`${key}-${index}`}
                      type="hidden"
                      name={key}
                      value={item}
                    />
                  ),
                ),
          )}

          <div className="mt-3 flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">{t("priceMin")}</span>
              <input
                type="number"
                name={PARAM.minPrice}
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder={t("priceMin")}
                defaultValue={
                  filters.minPriceCents !== undefined
                    ? (filters.minPriceCents / 100).toFixed(2)
                    : ""
                }
                className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
              />
            </label>
            <span aria-hidden="true" className="text-muted">
              –
            </span>
            <label className="flex-1">
              <span className="sr-only">{t("priceMax")}</span>
              <input
                type="number"
                name={PARAM.maxPrice}
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder={t("priceMax")}
                defaultValue={
                  filters.maxPriceCents !== undefined
                    ? (filters.maxPriceCents / 100).toFixed(2)
                    : ""
                }
                className="h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md border-2 border-forest-800 px-4 text-sm font-semibold text-forest-800 transition-colors hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
          >
            {t("apply")}
          </button>
        </fieldset>
      </form>
    </div>
  );
}

function FilterLink({
  href,
  selected,
  label,
}: {
  href: string;
  selected: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex min-h-9 items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
        selected
          ? "bg-forest-50 font-semibold text-forest-900"
          : "text-forest-900 hover:bg-cream-100",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[3px] border",
          selected ? "border-forest-800 bg-forest-800" : "border-line-strong",
        )}
      >
        {selected ? <Check className="size-3 text-white" /> : null}
      </span>
      {label}
    </Link>
  );
}
