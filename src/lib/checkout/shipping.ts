/**
 * Règle de choix d'une zone d'expédition.
 *
 * Dans un module à part, sans `server-only` : le formulaire de commande s'en
 * sert pour annoncer les frais au client, et le serveur pour les vérifier. La
 * mettre dans `checkout.ts`, qui touche à Supabase et donc à `next/headers`,
 * ferait échouer la compilation du composant client.
 *
 * ⚠️ Cette règle est écrite deux fois : ici pour l'affichage, et dans
 * `find_shipping_zone` en SQL pour la facturation. C'est la seconde qui fait
 * foi. Les deux doivent dire la même chose.
 */

/** Une destination desservie par la poste, et son tarif. */
export interface ShippingZone {
  id: string;
  name: string;
  countryCode: string;
  /** Provinces ou États couverts. Vide = tout le pays. */
  regionCodes: string[];
  feeCents: number;
  freeThresholdCents: number | null;
}

/**
 * La zone qui s'applique à une destination.
 *
 * La zone RÉGIONALE l'emporte sur la nationale : sans cette priorité, une zone
 * « Canada » capterait les provinces éloignées auxquelles on voulait
 * précisément appliquer un tarif plus élevé.
 */
export function findShippingZone(
  zones: ShippingZone[],
  country: string,
  region: string,
): ShippingZone | null {
  const c = country.trim().toUpperCase();
  const r = region.trim().toUpperCase();

  const candidates = zones.filter(
    (zone) =>
      zone.countryCode === c &&
      (zone.regionCodes.length === 0 || zone.regionCodes.includes(r)),
  );

  return candidates.find((zone) => zone.regionCodes.length > 0) ?? candidates[0] ?? null;
}
