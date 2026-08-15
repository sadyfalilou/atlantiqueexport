/**
 * Provinces canadiennes et États américains.
 *
 * Une liste fermée plutôt qu'un champ libre : le tarif d'expédition se choisit
 * d'après ce code, et « Qc », « Québec » ou « QUEBEC » saisis à la main ne
 * correspondraient à rien. Les codes sont ceux de la poste, à deux lettres.
 */

export interface Region {
  code: string;
  name: string;
}

export const CA_REGIONS: Region[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "Colombie-Britannique" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "Nouveau-Brunswick" },
  { code: "NL", name: "Terre-Neuve-et-Labrador" },
  { code: "NS", name: "Nouvelle-Écosse" },
  { code: "NT", name: "Territoires du Nord-Ouest" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Île-du-Prince-Édouard" },
  { code: "QC", name: "Québec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

export const US_REGIONS: Region[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "Californie" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DC", name: "District de Columbia" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Floride" },
  { code: "GA", name: "Géorgie" },
  { code: "HI", name: "Hawaï" },
  { code: "IA", name: "Iowa" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiane" },
  { code: "MA", name: "Massachusetts" },
  { code: "MD", name: "Maryland" },
  { code: "ME", name: "Maine" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MO", name: "Missouri" },
  { code: "MS", name: "Mississippi" },
  { code: "MT", name: "Montana" },
  { code: "NC", name: "Caroline du Nord" },
  { code: "ND", name: "Dakota du Nord" },
  { code: "NE", name: "Nebraska" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "Nouveau-Mexique" },
  { code: "NV", name: "Nevada" },
  { code: "NY", name: "New York" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvanie" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "Caroline du Sud" },
  { code: "SD", name: "Dakota du Sud" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VA", name: "Virginie" },
  { code: "VT", name: "Vermont" },
  { code: "WA", name: "Washington" },
  { code: "WI", name: "Wisconsin" },
  { code: "WV", name: "Virginie-Occidentale" },
  { code: "WY", name: "Wyoming" },
];

export const COUNTRY_NAMES: Record<string, string> = {
  CA: "Canada",
  US: "États-Unis",
};

export function regionsOf(countryCode: string): Region[] {
  return countryCode === "US" ? US_REGIONS : CA_REGIONS;
}

export function isKnownRegion(countryCode: string, code: string): boolean {
  return regionsOf(countryCode).some((region) => region.code === code.toUpperCase());
}
