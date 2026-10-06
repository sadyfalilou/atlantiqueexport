/**
 * Recherche dans les listes de l'administration.
 *
 * Les comparaisons se font sans accents et sans casse : on cherche « thiere »
 * et on trouve « Thiéré », on cherche « CAFE » et on trouve « Café Touba ».
 * Taper l'accent juste n'est pas le travail de quelqu'un qui cherche un
 * produit dans un tableau de quatre-vingts lignes.
 */

/** Minuscules, sans accents, espaces réduits. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Vrai si chaque mot de la requête se retrouve quelque part dans les champs.
 *
 * Chaque mot séparément, et non la chaîne entière : « madd 1kg » trouve la
 * ligne même si le format est écrit avant le nom, ce qui dépend du tableau.
 * Une requête vide ne filtre rien.
 */
export function matches(
  query: string,
  ...fields: Array<string | number | null | undefined>
): boolean {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = normalize(
    fields.filter((field) => field !== null && field !== undefined).join(" "),
  );

  return terms.every((term) => haystack.includes(term));
}
