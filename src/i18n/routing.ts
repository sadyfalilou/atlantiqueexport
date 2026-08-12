import { defineRouting } from "next-intl/routing";

export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Le préfixe est toujours présent (/fr, /en) : les URL restent explicites,
  // indexables et partageables, sans page qui change de langue selon le navigateur.
  localePrefix: "always",
});
