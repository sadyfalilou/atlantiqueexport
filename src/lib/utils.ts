import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Tous les montants circulent en cents entiers pour éviter les erreurs
 * d'arrondi des nombres flottants. Le formatage est le seul endroit où
 * l'on repasse en unité monétaire.
 */
export function formatPrice(cents: number, locale: string = "fr"): string {
  return new Intl.NumberFormat(locale === "en" ? "en-CA" : "fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

/** Prix rapporté au kilo, affiché à côté du prix de vente (« 12,99 $ · 25,98 $/kg »). */
export function formatUnitPrice(
  cents: number,
  weightGrams: number | null,
  locale: string = "fr",
): string | null {
  if (!weightGrams || weightGrams <= 0) return null;
  const perKilo = Math.round((cents / weightGrams) * 1000);
  return `${formatPrice(perKilo, locale)}/kg`;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Une chaîne « AAAA-MM-JJ » est interprétée par JavaScript comme minuit UTC.
 * Formatée dans le fuseau de Montréal (UTC-4/-5), elle reculait d'un jour :
 * un arrivage annoncé le 18 s'affichait le 17. On force donc UTC pour les
 * dates sans heure, et on garde le fuseau local pour les horodatages réels.
 */
export function formatDate(date: string | Date, locale: string = "fr"): string {
  const isDateOnly = typeof date === "string" && DATE_ONLY.test(date);

  return new Intl.DateTimeFormat(locale === "en" ? "en-CA" : "fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(isDateOnly ? { timeZone: "UTC" } : {}),
  }).format(typeof date === "string" ? new Date(date) : date);
}
