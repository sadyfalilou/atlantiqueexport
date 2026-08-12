/**
 * ⚠️ DONNÉES DE DÉMONSTRATION — NE PAS UTILISER EN PRODUCTION ⚠️
 *
 * Tous les prix de ce fichier sont FICTIFS et servent uniquement au
 * développement. Les prix de vente réels seront saisis en dollars canadiens
 * depuis l'administration (lot 2), jamais convertis depuis un catalogue
 * fournisseur en FCFA.
 *
 * Ce fichier disparaîtra au profit des requêtes Supabase ; l'interface
 * exposée par src/lib/catalog/ restera identique.
 */

import type {
  Brand,
  Category,
  PreparationOption,
  Product,
  ProductVariant,
  Recipe,
  Shipment,
  StockStatus,
  TaxClass,
  TemperatureClass,
} from "@/lib/types";

export const IS_DEMO_DATA = true;

/* -------------------------------------------------------------------------- */
/* Catégories — administrables en base, jamais codées en dur dans l'interface  */
/* -------------------------------------------------------------------------- */

export const demoCategories: Category[] = [
  {
    id: "cat-01",
    slug: "poissons-fruits-de-mer",
    name: { fr: "Poissons et fruits de mer", en: "Fish and seafood" },
    description: {
      fr: "Poissons frais et surgelés, crevettes et fruits de mer.",
      en: "Fresh and frozen fish, shrimp and seafood.",
    },
    position: 1,
    showInMegaMenu: true,
  },
  {
    id: "cat-02",
    slug: "poissons-transformes",
    name: { fr: "Poissons transformés", en: "Processed fish" },
    description: {
      fr: "Poissons fumés, séchés, salés et fermentés.",
      en: "Smoked, dried, salted and fermented fish.",
    },
    position: 2,
    showInMegaMenu: true,
  },
  {
    id: "cat-03",
    slug: "fruits-legumes",
    name: { fr: "Fruits et légumes", en: "Fruits and vegetables" },
    description: {
      fr: "Fruits tropicaux et légumes africains de saison.",
      en: "Tropical fruits and seasonal African vegetables.",
    },
    position: 3,
    showInMegaMenu: true,
  },
  {
    id: "cat-04",
    slug: "produits-surgeles",
    name: { fr: "Produits surgelés", en: "Frozen products" },
    description: {
      fr: "Pulpes, légumes et préparations conservés au froid.",
      en: "Pulps, vegetables and preparations kept frozen.",
    },
    position: 4,
    showInMegaMenu: true,
  },
  {
    id: "cat-05",
    slug: "cereales-feculents",
    name: { fr: "Céréales et féculents", en: "Grains and starches" },
    description: {
      fr: "Thiéré, fonio, arraw, thiakry et brisures.",
      en: "Thiéré, fonio, arraw, thiakry and grits.",
    },
    position: 5,
    showInMegaMenu: true,
  },
  {
    id: "cat-06",
    slug: "poudres-naturelles",
    name: { fr: "Poudres naturelles", en: "Natural powders" },
    description: {
      fr: "Bouye, bissap, moringa et autres poudres traditionnelles.",
      en: "Baobab, hibiscus, moringa and other traditional powders.",
    },
    position: 6,
    showInMegaMenu: true,
  },
  {
    id: "cat-07",
    slug: "epices-condiments",
    name: { fr: "Épices et condiments", en: "Spices and condiments" },
    description: {
      fr: "Épices moulues, mélanges et condiments du marché.",
      en: "Ground spices, blends and market condiments.",
    },
    position: 7,
    showInMegaMenu: true,
  },
  {
    id: "cat-08",
    slug: "thes-boissons",
    name: { fr: "Thés et boissons", en: "Teas and drinks" },
    description: {
      fr: "Infusions, thés et préparations de boissons.",
      en: "Infusions, teas and drink preparations.",
    },
    position: 8,
    showInMegaMenu: true,
  },
  {
    id: "cat-09",
    slug: "collations",
    name: { fr: "Collations", en: "Snacks" },
    description: {
      fr: "Coco râpé, fruits séchés et grignotines.",
      en: "Grated coconut, dried fruit and snacks.",
    },
    position: 9,
    showInMegaMenu: true,
  },
  {
    id: "cat-10",
    slug: "plats-preparations",
    name: { fr: "Plats et préparations", en: "Dishes and preparations" },
    description: {
      fr: "Bases de plats et sauces prêtes à cuisiner.",
      en: "Dish bases and ready-to-cook sauces.",
    },
    position: 10,
    showInMegaMenu: true,
  },
  {
    id: "cat-11",
    slug: "nouveautes",
    name: { fr: "Nouveautés", en: "New arrivals" },
    isVirtual: true,
    href: "/nouveautes",
    position: 11,
    showInMegaMenu: true,
  },
  {
    id: "cat-12",
    slug: "promotions",
    name: { fr: "Promotions", en: "Deals" },
    isVirtual: true,
    href: "/promotions",
    position: 12,
    showInMegaMenu: true,
  },
];

/* -------------------------------------------------------------------------- */
/* Marques                                                                     */
/* -------------------------------------------------------------------------- */

export const demoBrands: Brand[] = [
  {
    id: "brand-01",
    slug: "sonagoo",
    name: "Sonagoo",
    description: {
      fr: "Marque partenaire sénégalaise de poudres, céréales et préparations traditionnelles.",
      en: "Senegalese partner brand of powders, grains and traditional preparations.",
    },
    originCountry: "SN",
    isPartner: true,
  },
  {
    id: "brand-02",
    slug: "atlantique-export",
    name: "Atlantique Export",
    description: {
      fr: "Notre sélection maison, choisie directement auprès des producteurs.",
      en: "Our own selection, sourced directly from producers.",
    },
    originCountry: "CA",
    isPartner: false,
  },
];

/* -------------------------------------------------------------------------- */
/* Fabriques de variantes                                                      */
/* -------------------------------------------------------------------------- */

function weightLabel(grams: number): string {
  return grams >= 1000
    ? `${(grams / 1000).toString().replace(".", ",")} kg`
    : `${grams} g`;
}

function weightLabelEn(grams: number): string {
  return grams >= 1000 ? `${grams / 1000} kg` : `${grams} g`;
}

/** Sachet à poids fixe — le format le plus courant du catalogue. */
function bag(
  sku: string,
  grams: number,
  cents: number,
  compareAt?: number,
): ProductVariant {
  return {
    id: `var-${sku}`,
    sku,
    label: {
      fr: `Sachet ${weightLabel(grams)}`,
      en: `${weightLabelEn(grams)} bag`,
    },
    saleUnit: "bag",
    netWeightG: grams,
    isVariableWeight: false,
    retailPriceCents: cents,
    compareAtPriceCents: compareAt ?? null,
    wholesalePriceCents: Math.round(cents * 0.78),
    minQty: 1,
    stepQty: 1,
  };
}

/** Caisse destinée aux restaurants et revendeurs. */
function box(
  sku: string,
  grams: number,
  cents: number,
  unitCount: number,
): ProductVariant {
  return {
    id: `var-${sku}`,
    sku,
    label: {
      fr: `Caisse de ${unitCount} × ${weightLabel(grams)}`,
      en: `Case of ${unitCount} × ${weightLabelEn(grams)}`,
    },
    saleUnit: "case",
    netWeightG: grams * unitCount,
    isVariableWeight: false,
    retailPriceCents: cents,
    compareAtPriceCents: null,
    wholesalePriceCents: Math.round(cents * 0.82),
    minQty: 1,
    stepQty: 1,
  };
}

/**
 * Variante vendue au poids. Conformément au MVP décrit en architecture,
 * le client est facturé au poids haut de la tranche : le montant est donc
 * connu et définitif au moment de l'achat.
 */
function variableWeight(
  sku: string,
  minG: number,
  maxG: number,
  pricePerKgCents: number,
): ProductVariant {
  return {
    id: `var-${sku}`,
    sku,
    label: {
      fr: `Pièce entière · environ ${weightLabel(minG)} à ${weightLabel(maxG)}`,
      en: `Whole piece · approx. ${weightLabelEn(minG)} to ${weightLabelEn(maxG)}`,
    },
    saleUnit: "unit",
    netWeightG: null,
    isVariableWeight: true,
    minWeightG: minG,
    maxWeightG: maxG,
    pricePerKgCents,
    retailPriceCents: Math.round((maxG / 1000) * pricePerKgCents),
    compareAtPriceCents: null,
    wholesalePriceCents: Math.round((maxG / 1000) * pricePerKgCents * 0.8),
    minQty: 1,
    stepQty: 1,
  };
}

/** Options de découpe du poisson, activées produit par produit. */
const fishPreparation: PreparationOption[] = [
  {
    code: "whole",
    label: { fr: "Entier", en: "Whole" },
    priceDeltaCents: 0,
    prepTimeMinutes: 0,
    isDefault: true,
  },
  {
    code: "scaled",
    label: { fr: "Écaillé", en: "Scaled" },
    priceDeltaCents: 0,
    prepTimeMinutes: 5,
    isDefault: false,
  },
  {
    code: "gutted",
    label: { fr: "Vidé", en: "Gutted" },
    priceDeltaCents: 100,
    prepTimeMinutes: 8,
    isDefault: false,
  },
  {
    code: "cleaned",
    label: { fr: "Écaillé et vidé", en: "Scaled and gutted" },
    priceDeltaCents: 150,
    prepTimeMinutes: 12,
    isDefault: false,
  },
  {
    code: "steaks",
    label: { fr: "Découpé en darnes", en: "Cut into steaks" },
    priceDeltaCents: 250,
    prepTimeMinutes: 15,
    isDefault: false,
  },
  {
    code: "fillets",
    label: { fr: "Découpé en filets", en: "Filleted" },
    priceDeltaCents: 400,
    prepTimeMinutes: 20,
    isDefault: false,
  },
];

/* -------------------------------------------------------------------------- */
/* Fabrique de produit                                                         */
/* -------------------------------------------------------------------------- */

interface ProductInput {
  slug: string;
  fr: string;
  en: string;
  shortFr: string;
  shortEn: string;
  category: string;
  variants: ProductVariant[];
  temperature?: TemperatureClass;
  tax?: TaxClass;
  origin?: string;
  status?: StockStatus;
  brand?: string | null;
  tags?: string[];
  allergens?: string[];
  featured?: boolean;
  isNew?: boolean;
  preparation?: PreparationOption[];
  wholesaleOnly?: boolean;
}

let sequence = 0;

function make(input: ProductInput): Product {
  sequence += 1;
  return {
    id: `prod-${String(sequence).padStart(3, "0")}`,
    slug: input.slug,
    name: { fr: input.fr, en: input.en },
    shortDescription: { fr: input.shortFr, en: input.shortEn },
    categorySlug: input.category,
    brandSlug: input.brand === undefined ? "sonagoo" : input.brand,
    originCountry: input.origin ?? "SN",
    temperatureClass: input.temperature ?? "ambient",
    taxClass: input.tax ?? "zero_rated",
    stockStatus: input.status ?? "in_stock",
    variants: input.variants,
    preparationOptions: input.preparation,
    imageUrl: null, // remplacé par une vraie photo dès qu'elle est disponible
    tags: input.tags ?? [],
    allergens: input.allergens ?? [],
    isFeatured: input.featured ?? false,
    isNew: input.isNew ?? false,
    isWholesaleOnly: input.wholesaleOnly ?? false,
  };
}

/* -------------------------------------------------------------------------- */
/* Catalogue de démonstration                                                  */
/* -------------------------------------------------------------------------- */

export const demoProducts: Product[] = [
  /* --- Poudres naturelles ------------------------------------------------ */
  make({
    slug: "poudre-de-bouye",
    fr: "Poudre de bouye",
    en: "Baobab (bouye) powder",
    shortFr: "Pulpe de fruit du baobab réduite en poudre, base du jus de bouye.",
    shortEn: "Baobab fruit pulp ground into powder, the base of bouye juice.",
    category: "poudres-naturelles",
    featured: true,
    tags: ["populaire"],
    variants: [
      bag("AE-POU-BOU-200", 200, 1299),
      bag("AE-POU-BOU-500", 500, 2699),
      box("AE-POU-BOU-CS", 500, 24900, 10),
    ],
  }),
  make({
    slug: "poudre-de-bissap-rouge",
    fr: "Poudre de bissap rouge",
    en: "Red hibiscus (bissap) powder",
    shortFr: "Fleurs d'hibiscus rouges séchées et moulues.",
    shortEn: "Dried and ground red hibiscus flowers.",
    category: "poudres-naturelles",
    featured: true,
    variants: [bag("AE-POU-BIR-200", 200, 1199), bag("AE-POU-BIR-500", 500, 2499)],
  }),
  make({
    slug: "poudre-de-bissap-blanc",
    fr: "Poudre de bissap blanc",
    en: "White hibiscus (bissap) powder",
    shortFr: "Variété blanche du bissap, au goût plus doux.",
    shortEn: "White hibiscus variety, milder in taste.",
    category: "poudres-naturelles",
    variants: [bag("AE-POU-BIB-200", 200, 1249)],
  }),
  make({
    slug: "poudre-de-moringa",
    fr: "Poudre de moringa",
    en: "Moringa powder",
    shortFr: "Feuilles de moringa séchées à l'ombre et finement moulues.",
    shortEn: "Moringa leaves shade-dried and finely ground.",
    category: "poudres-naturelles",
    featured: true,
    isNew: true,
    variants: [bag("AE-POU-MOR-150", 150, 1499), bag("AE-POU-MOR-300", 300, 2699)],
  }),
  make({
    slug: "poudre-de-gingembre",
    fr: "Poudre de gingembre",
    en: "Ginger powder",
    shortFr: "Gingembre séché et moulu, piquant et parfumé.",
    shortEn: "Dried, ground ginger — pungent and fragrant.",
    category: "poudres-naturelles",
    variants: [bag("AE-POU-GIN-150", 150, 999)],
  }),
  make({
    slug: "poudre-de-solom",
    fr: "Poudre de solom",
    en: "Solom powder",
    shortFr: "Poudre traditionnelle utilisée dans les cocktails sénégalais.",
    shortEn: "Traditional powder used in Senegalese drink blends.",
    category: "poudres-naturelles",
    variants: [bag("AE-POU-SOL-200", 200, 1399)],
  }),
  make({
    slug: "poudre-de-souchet",
    fr: "Poudre de souchet",
    en: "Tiger nut powder",
    shortFr: "Souchet moulu, doux et légèrement sucré.",
    shortEn: "Ground tiger nut, mild and slightly sweet.",
    category: "poudres-naturelles",
    isNew: true,
    variants: [bag("AE-POU-SOU-250", 250, 1599)],
  }),
  make({
    slug: "poudre-de-cannelle",
    fr: "Poudre de cannelle",
    en: "Cinnamon powder",
    shortFr: "Cannelle moulue pour boissons et pâtisseries.",
    shortEn: "Ground cinnamon for drinks and baking.",
    category: "poudres-naturelles",
    variants: [bag("AE-POU-CAN-100", 100, 899)],
  }),
  make({
    slug: "poudre-de-girofle",
    fr: "Poudre de girofle",
    en: "Clove powder",
    shortFr: "Clous de girofle moulus, très aromatiques.",
    shortEn: "Ground cloves, intensely aromatic.",
    category: "poudres-naturelles",
    variants: [bag("AE-POU-GIR-100", 100, 949)],
  }),
  make({
    slug: "poudre-de-petit-cola",
    fr: "Poudre de petit cola",
    en: "Bitter kola powder",
    shortFr: "Petit cola séché et moulu.",
    shortEn: "Dried and ground bitter kola.",
    category: "poudres-naturelles",
    variants: [bag("AE-POU-PCO-100", 100, 1099)],
  }),

  /* --- Cocktails et préparations de boissons ----------------------------- */
  make({
    slug: "bouye-solom",
    fr: "Bouye-solom",
    en: "Bouye-solom blend",
    shortFr: "Mélange prêt à diluer de bouye et de solom.",
    shortEn: "Ready-to-mix blend of baobab and solom.",
    category: "thes-boissons",
    tax: "standard",
    featured: true,
    variants: [bag("AE-COC-BSO-250", 250, 1499)],
  }),
  make({
    slug: "bissap-a-la-menthe",
    fr: "Bissap à la menthe",
    en: "Mint hibiscus blend",
    shortFr: "Bissap rouge et menthe séchée, à infuser ou à diluer.",
    shortEn: "Red hibiscus and dried mint, to infuse or dilute.",
    category: "thes-boissons",
    tax: "standard",
    variants: [bag("AE-COC-BME-250", 250, 1399)],
  }),
  make({
    slug: "bouye-mangue",
    fr: "Bouye-mangue",
    en: "Bouye-mango blend",
    shortFr: "Bouye et mangue, un cocktail fruité.",
    shortEn: "Baobab and mango, a fruity blend.",
    category: "thes-boissons",
    tax: "standard",
    isNew: true,
    variants: [bag("AE-COC-BMA-250", 250, 1549)],
  }),
  make({
    slug: "bouye-fraise",
    fr: "Bouye-fraise",
    en: "Bouye-strawberry blend",
    shortFr: "Bouye relevé de fraise.",
    shortEn: "Baobab with strawberry.",
    category: "thes-boissons",
    tax: "standard",
    isNew: true,
    variants: [bag("AE-COC-BFR-250", 250, 1549)],
  }),
  make({
    slug: "ngalakh-instantane",
    fr: "Ngalakh instantané",
    en: "Instant ngalakh",
    shortFr: "Préparation instantanée pour le ngalakh, dessert de fête.",
    shortEn: "Instant preparation for ngalakh, a festive dessert.",
    category: "plats-preparations",
    tax: "standard",
    allergens: ["arachides"],
    variants: [bag("AE-COC-NGA-400", 400, 1899)],
  }),

  /* --- Céréales ---------------------------------------------------------- */
  make({
    slug: "thiere",
    fr: "Thiéré",
    en: "Thiéré (millet couscous)",
    shortFr: "Couscous de mil traditionnel, prêt à cuire à la vapeur.",
    shortEn: "Traditional millet couscous, ready to steam.",
    category: "cereales-feculents",
    featured: true,
    variants: [
      bag("AE-CER-THI-500", 500, 899),
      bag("AE-CER-THI-1000", 1000, 1599),
      box("AE-CER-THI-CS", 1000, 14900, 10),
    ],
  }),
  make({
    slug: "arraw",
    fr: "Arraw",
    en: "Arraw",
    shortFr: "Semoule de mil roulée, base de desserts et de bouillies.",
    shortEn: "Rolled millet semolina, a base for desserts and porridge.",
    category: "cereales-feculents",
    variants: [bag("AE-CER-ARR-500", 500, 999)],
  }),
  make({
    slug: "thiakry",
    fr: "Thiakry",
    en: "Thiakry",
    shortFr: "Semoule de mil pour le dessert au lait caillé.",
    shortEn: "Millet semolina for the classic curdled-milk dessert.",
    category: "cereales-feculents",
    featured: true,
    variants: [bag("AE-CER-TKR-500", 500, 949), bag("AE-CER-TKR-1000", 1000, 1699)],
  }),
  make({
    slug: "thiakry-coco",
    fr: "Thiakry coco",
    en: "Coconut thiakry",
    shortFr: "Thiakry parfumé à la noix de coco.",
    shortEn: "Thiakry flavoured with coconut.",
    category: "cereales-feculents",
    isNew: true,
    variants: [bag("AE-CER-TCO-500", 500, 1149)],
  }),
  make({
    slug: "thiakry-mangue",
    fr: "Thiakry mangue",
    en: "Mango thiakry",
    shortFr: "Thiakry parfumé à la mangue.",
    shortEn: "Thiakry flavoured with mango.",
    category: "cereales-feculents",
    isNew: true,
    variants: [bag("AE-CER-TMA-500", 500, 1149)],
  }),
  make({
    slug: "thiakry-papaye",
    fr: "Thiakry papaye",
    en: "Papaya thiakry",
    shortFr: "Thiakry parfumé à la papaye.",
    shortEn: "Thiakry flavoured with papaya.",
    category: "cereales-feculents",
    isNew: true,
    variants: [bag("AE-CER-TPA-500", 500, 1149)],
  }),
  make({
    slug: "fonio",
    fr: "Fonio",
    en: "Fonio",
    shortFr: "Céréale ancienne à grain fin, cuisson rapide.",
    shortEn: "Fine-grained ancient cereal, quick to cook.",
    category: "cereales-feculents",
    featured: true,
    variants: [bag("AE-CER-FON-500", 500, 1399), bag("AE-CER-FON-1000", 1000, 2499)],
  }),
  make({
    slug: "brisure-de-mais",
    fr: "Brisure de maïs",
    en: "Cracked corn",
    shortFr: "Maïs concassé pour bouillies et accompagnements.",
    shortEn: "Cracked corn for porridge and side dishes.",
    category: "cereales-feculents",
    variants: [bag("AE-CER-BMA-1000", 1000, 849)],
  }),
  make({
    slug: "sankal",
    fr: "Sankal",
    en: "Sankal",
    shortFr: "Mil concassé, texture rustique.",
    shortEn: "Cracked millet with a rustic texture.",
    category: "cereales-feculents",
    variants: [bag("AE-CER-SAN-1000", 1000, 899)],
  }),

  /* --- Collations -------------------------------------------------------- */
  make({
    slug: "coco-au-lait",
    fr: "Coco au lait",
    en: "Milk coconut snack",
    shortFr: "Coco râpé sucré au lait.",
    shortEn: "Grated coconut sweetened with milk.",
    category: "collations",
    tax: "standard",
    allergens: ["lait"],
    variants: [bag("AE-COL-CLA-150", 150, 699)],
  }),
  make({
    slug: "coco-gingembre",
    fr: "Coco gingembre",
    en: "Ginger coconut snack",
    shortFr: "Coco râpé relevé au gingembre.",
    shortEn: "Grated coconut with a ginger kick.",
    category: "collations",
    tax: "standard",
    variants: [bag("AE-COL-CGI-150", 150, 699)],
  }),
  make({
    slug: "coco-ananas",
    fr: "Coco ananas",
    en: "Pineapple coconut snack",
    shortFr: "Coco râpé à l'ananas.",
    shortEn: "Grated coconut with pineapple.",
    category: "collations",
    tax: "standard",
    variants: [bag("AE-COL-CAN-150", 150, 699)],
  }),
  make({
    slug: "coco-menthe",
    fr: "Coco menthe",
    en: "Mint coconut snack",
    shortFr: "Coco râpé à la menthe.",
    shortEn: "Grated coconut with mint.",
    category: "collations",
    tax: "standard",
    variants: [bag("AE-COL-CME-150", 150, 699)],
  }),
  make({
    slug: "coco-fraise-framboise",
    fr: "Coco fraise-framboise",
    en: "Strawberry-raspberry coconut snack",
    shortFr: "Coco râpé aux fruits rouges.",
    shortEn: "Grated coconut with red berries.",
    category: "collations",
    tax: "standard",
    isNew: true,
    variants: [bag("AE-COL-CFF-150", 150, 749)],
  }),
  make({
    slug: "mangue-sechee",
    fr: "Mangue séchée",
    en: "Dried mango",
    shortFr: "Lamelles de mangue séchée, sans sucre ajouté.",
    shortEn: "Dried mango slices, no added sugar.",
    category: "collations",
    tax: "standard",
    featured: true,
    variants: [bag("AE-COL-MSE-200", 200, 1299, 1599)],
  }),

  /* --- Thés et boissons -------------------------------------------------- */
  make({
    slug: "the-hibiscus",
    fr: "Thé hibiscus",
    en: "Hibiscus tea",
    shortFr: "Infusion de fleurs d'hibiscus, à boire chaude ou glacée.",
    shortEn: "Hibiscus flower infusion, hot or iced.",
    category: "thes-boissons",
    tax: "standard",
    variants: [bag("AE-THE-HIB-100", 100, 1099)],
  }),
  make({
    slug: "the-moringa",
    fr: "Thé moringa",
    en: "Moringa tea",
    shortFr: "Infusion de feuilles de moringa.",
    shortEn: "Moringa leaf infusion.",
    category: "thes-boissons",
    tax: "standard",
    variants: [bag("AE-THE-MOR-100", 100, 1199)],
  }),
  make({
    slug: "the-gingembre",
    fr: "Thé gingembre",
    en: "Ginger tea",
    shortFr: "Infusion de gingembre, vive et réchauffante.",
    shortEn: "Ginger infusion, bright and warming.",
    category: "thes-boissons",
    tax: "standard",
    variants: [bag("AE-THE-GIN-100", 100, 1049)],
  }),
  make({
    slug: "the-wass",
    fr: "Thé Wass",
    en: "Wass tea",
    shortFr: "Infusion traditionnelle sénégalaise.",
    shortEn: "Traditional Senegalese infusion.",
    category: "thes-boissons",
    tax: "standard",
    variants: [bag("AE-THE-WAS-100", 100, 1149)],
  }),
  make({
    slug: "cafe-touba",
    fr: "Café Touba",
    en: "Touba coffee",
    shortFr: "Café moulu au poivre de Selim, préparé à la sénégalaise.",
    shortEn: "Coffee ground with Selim pepper, Senegalese style.",
    category: "thes-boissons",
    tax: "standard",
    featured: true,
    variants: [
      bag("AE-CAF-TOU-250", 250, 1399),
      bag("AE-CAF-TOU-500", 500, 2499),
      box("AE-CAF-TOU-CS", 500, 22900, 10),
    ],
  }),

  /* --- Plats et préparations --------------------------------------------- */
  make({
    slug: "ngourbane",
    fr: "Ngourbane",
    en: "Ngourbane",
    shortFr: "Préparation traditionnelle prête à cuisiner.",
    shortEn: "Traditional ready-to-cook preparation.",
    category: "plats-preparations",
    tax: "standard",
    variants: [bag("AE-PLA-NGO-400", 400, 1699)],
  }),
  make({
    slug: "mbaxal-saloum",
    fr: "Mbaxal Saloum",
    en: "Mbaxal Saloum",
    shortFr: "Base du mbaxal, spécialité du Saloum.",
    shortEn: "Base for mbaxal, a Saloum speciality.",
    category: "plats-preparations",
    tax: "standard",
    allergens: ["arachides"],
    variants: [bag("AE-PLA-MBX-400", 400, 1799)],
  }),
  make({
    slug: "sauce-mboum",
    fr: "Sauce mboum",
    en: "Mboum sauce",
    shortFr: "Feuilles de mboum préparées en sauce.",
    shortEn: "Mboum leaves prepared as a sauce.",
    category: "plats-preparations",
    tax: "standard",
    temperature: "frozen",
    variants: [bag("AE-PLA-MBO-500", 500, 1499)],
  }),

  /* --- Fruits ------------------------------------------------------------ */
  make({
    slug: "madd",
    fr: "Madd frais",
    en: "Fresh madd",
    shortFr: "Fruit du madd, acidulé, disponible selon les arrivages.",
    shortEn: "Madd fruit, tangy, available with each shipment.",
    category: "fruits-legumes",
    temperature: "fresh",
    status: "incoming",
    featured: true,
    brand: "atlantique-export",
    variants: [
      {
        id: "var-AE-FRU-MAD-1KG",
        sku: "AE-FRU-MAD-1KG",
        label: { fr: "Panier 1 kg", en: "1 kg basket" },
        saleUnit: "kg",
        netWeightG: 1000,
        isVariableWeight: false,
        retailPriceCents: 2499,
        compareAtPriceCents: null,
        wholesalePriceCents: 1999,
        minQty: 1,
        stepQty: 1,
      },
    ],
  }),
  make({
    slug: "pulpe-de-madd",
    fr: "Pulpe de madd congelée",
    en: "Frozen madd pulp",
    shortFr: "Pulpe de madd surgelée, prête pour jus et smoothies.",
    shortEn: "Frozen madd pulp, ready for juices and smoothies.",
    category: "produits-surgeles",
    temperature: "frozen",
    featured: true,
    brand: "atlantique-export",
    variants: [bag("AE-SUR-PMA-500", 500, 1699), bag("AE-SUR-PMA-1000", 1000, 2999)],
  }),
  make({
    slug: "mangues-fraiches",
    fr: "Mangues fraîches",
    en: "Fresh mangoes",
    shortFr: "Mangues de saison, sélectionnées à maturité.",
    shortEn: "Seasonal mangoes, picked ripe.",
    category: "fruits-legumes",
    temperature: "fresh",
    status: "coming_soon",
    featured: true,
    brand: "atlantique-export",
    variants: [
      {
        id: "var-AE-FRU-MAN-BOX",
        sku: "AE-FRU-MAN-BOX",
        label: { fr: "Caisse 4 kg", en: "4 kg case" },
        saleUnit: "case",
        netWeightG: 4000,
        isVariableWeight: false,
        retailPriceCents: 4999,
        compareAtPriceCents: null,
        wholesalePriceCents: 3999,
        minQty: 1,
        stepQty: 1,
      },
    ],
  }),

  /* --- Poissons (démonstration du poids variable et de la découpe) -------- */
  make({
    slug: "tilapia-entier-surgele",
    fr: "Tilapia entier surgelé",
    en: "Whole frozen tilapia",
    shortFr: "Tilapia entier, surgelé à bord, découpe au choix.",
    shortEn: "Whole tilapia, frozen at sea, cut to order.",
    category: "poissons-fruits-de-mer",
    temperature: "frozen",
    featured: true,
    brand: "atlantique-export",
    preparation: fishPreparation,
    variants: [variableWeight("AE-POI-TIL-1", 1200, 1500, 1299)],
  }),
  make({
    slug: "thiof-surgele",
    fr: "Thiof (mérou) surgelé",
    en: "Frozen thiof (grouper)",
    shortFr: "Mérou entier surgelé, chair ferme.",
    shortEn: "Whole frozen grouper, firm flesh.",
    category: "poissons-fruits-de-mer",
    temperature: "frozen",
    status: "low_stock",
    brand: "atlantique-export",
    preparation: fishPreparation,
    variants: [variableWeight("AE-POI-THI-1", 1500, 2000, 2499)],
  }),
  make({
    slug: "yaboy-fume",
    fr: "Yaboy fumé",
    en: "Smoked yaboy (sardinella)",
    shortFr: "Sardinelle fumée au bois, prête à cuisiner.",
    shortEn: "Wood-smoked sardinella, ready to cook.",
    category: "poissons-transformes",
    temperature: "ambient",
    allergens: ["poisson"],
    brand: "atlantique-export",
    variants: [bag("AE-POT-YAB-250", 250, 1399)],
  }),
  make({
    slug: "kong-seche",
    fr: "Kong séché",
    en: "Dried kong",
    shortFr: "Poisson séché traditionnel, à réhydrater.",
    shortEn: "Traditional dried fish, to rehydrate.",
    category: "poissons-transformes",
    temperature: "ambient",
    allergens: ["poisson"],
    brand: "atlantique-export",
    variants: [bag("AE-POT-KON-200", 200, 1599)],
  }),
  make({
    slug: "guedj",
    fr: "Guedj",
    en: "Guedj (fermented fish)",
    shortFr: "Poisson fermenté et séché, condiment du thiéboudienne.",
    shortEn: "Fermented dried fish, the condiment of thiéboudienne.",
    category: "poissons-transformes",
    temperature: "ambient",
    allergens: ["poisson"],
    status: "out_of_stock",
    brand: "atlantique-export",
    variants: [bag("AE-POT-GUE-200", 200, 1499)],
  }),
];

/* -------------------------------------------------------------------------- */
/* Arrivages                                                                   */
/* -------------------------------------------------------------------------- */

export const demoShipments: Shipment[] = [
  {
    id: "ship-01",
    code: "AE-SN-2026-09",
    title: {
      fr: "Arrivage du Sénégal — madd et mangues",
      en: "Shipment from Senegal — madd and mangoes",
    },
    originCountry: "SN",
    status: "reservations_open",
    etaDate: "2026-09-18",
    reservationDeadline: "2026-09-05",
    items: [
      {
        productSlug: "madd",
        plannedQuantity: 300,
        reservedQuantity: 112,
        depositCents: 1000,
      },
      {
        productSlug: "mangues-fraiches",
        plannedQuantity: 200,
        reservedQuantity: 64,
        depositCents: 1500,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Recettes                                                                    */
/* -------------------------------------------------------------------------- */

export const demoRecipes: Recipe[] = [
  {
    id: "rec-01",
    slug: "jus-de-bouye",
    title: { fr: "Jus de bouye", en: "Baobab juice" },
    description: {
      fr: "La boisson de baobab classique, onctueuse et légèrement acidulée.",
      en: "The classic baobab drink — creamy and gently tart.",
    },
    prepTimeMinutes: 15,
    cookTimeMinutes: 0,
    servings: 6,
    productSlugs: ["poudre-de-bouye"],
  },
  {
    id: "rec-02",
    slug: "jus-de-bissap",
    title: { fr: "Jus de bissap", en: "Hibiscus juice" },
    description: {
      fr: "Infusion d'hibiscus servie bien fraîche, avec menthe et fleur d'oranger.",
      en: "Hibiscus infusion served chilled, with mint and orange blossom.",
    },
    prepTimeMinutes: 10,
    cookTimeMinutes: 10,
    servings: 8,
    productSlugs: ["poudre-de-bissap-rouge", "bissap-a-la-menthe"],
  },
  {
    id: "rec-03",
    slug: "smoothie-au-madd",
    title: { fr: "Smoothie au madd", en: "Madd smoothie" },
    description: {
      fr: "Pulpe de madd, lait et glace : un smoothie franchement acidulé.",
      en: "Madd pulp, milk and ice for a bracingly tangy smoothie.",
    },
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    servings: 2,
    productSlugs: ["pulpe-de-madd"],
  },
  {
    id: "rec-04",
    slug: "thiakry-traditionnel",
    title: { fr: "Thiakry traditionnel", en: "Traditional thiakry" },
    description: {
      fr: "Semoule de mil et lait caillé, le dessert de toutes les fêtes.",
      en: "Millet semolina and curdled milk — the dessert of every celebration.",
    },
    prepTimeMinutes: 20,
    cookTimeMinutes: 25,
    servings: 6,
    productSlugs: ["thiakry", "thiakry-coco"],
  },
  {
    id: "rec-05",
    slug: "preparation-du-fonio",
    title: { fr: "Préparation du fonio", en: "How to cook fonio" },
    description: {
      fr: "La cuisson à la vapeur du fonio, étape par étape.",
      en: "Steaming fonio, step by step.",
    },
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: 4,
    productSlugs: ["fonio"],
  },
  {
    id: "rec-06",
    slug: "cafe-touba",
    title: { fr: "Café Touba", en: "Touba coffee" },
    description: {
      fr: "Le café au poivre de Selim, préparé comme au Sénégal.",
      en: "Selim pepper coffee, brewed the Senegalese way.",
    },
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    servings: 4,
    productSlugs: ["cafe-touba"],
  },
];
