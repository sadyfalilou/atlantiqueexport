/**
 * Types du domaine Atlantique Export.
 *
 * Ils reflètent volontairement le schéma PostgreSQL décrit dans
 * docs/02-ARCHITECTURE.md. Tant que la base Supabase n'est pas en place
 * (lot 2), les mêmes types sont alimentés par les données de démonstration ;
 * le remplacement se fera dans src/lib/catalog/ sans toucher aux composants.
 */

export type Locale = "fr" | "en";

/** Texte traduisible — en base : deux colonnes `_fr` et `_en`. */
export interface LocalizedText {
  fr: string;
  en: string;
}

/** Détermine les modes de réception possibles (voir lib/fulfillment). */
export type TemperatureClass = "ambient" | "fresh" | "refrigerated" | "frozen";

export type FulfillmentMethod = "pickup" | "local_delivery" | "shipping";

/**
 * Statut fiscal. Au Canada la majorité des produits d'épicerie de base est
 * détaxée ; collations et boissons sont généralement taxables.
 * À faire valider par un comptable avant la mise en production.
 */
export type TaxClass = "zero_rated" | "standard";

export type StockStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "coming_soon"
  | "preorder"
  | "incoming";

export type SaleUnit =
  | "unit"
  | "bag"
  | "pack"
  | "kg"
  | "lb"
  | "case"
  | "carton";

export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  description?: LocalizedText;
  /** Catégorie de navigation qui pointe vers une route dédiée (nouveautés, promotions). */
  isVirtual?: boolean;
  href?: string;
  parentId?: string | null;
  position: number;
  showInMegaMenu: boolean;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  description?: LocalizedText;
  originCountry?: string;
  isPartner: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  label: LocalizedText;
  saleUnit: SaleUnit;
  /** Poids net en grammes lorsqu'il est fixe. */
  netWeightG: number | null;
  /** Produit dont le prix dépend du poids réel (poisson entier, par exemple). */
  isVariableWeight: boolean;
  minWeightG?: number;
  maxWeightG?: number;
  pricePerKgCents?: number;
  /** Prix particulier, en cents CAD. */
  retailPriceCents: number;
  /** Prix barré, pour une promotion. */
  compareAtPriceCents?: number | null;
  /** Prix professionnel — jamais servi à un compte non approuvé. */
  wholesalePriceCents?: number | null;
  /** Vrai tant que le prix affiché est une valeur de démonstration. */
  priceIsProvisional?: boolean;
  /** Quantité disponible à la vente, calculée en base (détenu moins réservé). */
  availableQuantity?: number;
  minQty: number;
  stepQty: number;
}

/** Options de découpe, activées produit par produit. */
export interface PreparationOption {
  code: "whole" | "scaled" | "gutted" | "cleaned" | "steaks" | "fillets";
  label: LocalizedText;
  priceDeltaCents: number;
  prepTimeMinutes: number;
  isDefault: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  description?: LocalizedText;
  categorySlug: string;
  brandSlug?: string | null;
  originCountry: string;
  temperatureClass: TemperatureClass;
  taxClass: TaxClass;
  stockStatus: StockStatus;
  variants: ProductVariant[];
  preparationOptions?: PreparationOption[];
  imageUrl?: string | null;
  /** Texte alternatif de la photo, dans les deux langues. */
  imageAlt?: LocalizedText | null;
  tags: string[];
  allergens: string[];
  ingredients?: LocalizedText;
  storage?: LocalizedText;
  isFeatured: boolean;
  isNew: boolean;
  isWholesaleOnly?: boolean;
}

export type ShipmentStatus =
  | "announced"
  | "reservations_open"
  | "in_transit"
  | "arrived"
  | "preparing"
  | "available"
  | "completed"
  | "delayed"
  | "cancelled";

export interface Shipment {
  id: string;
  code: string;
  title: LocalizedText;
  originCountry: string;
  status: ShipmentStatus;
  etaDate: string;
  reservationDeadline: string;
  items: Array<{
    productSlug: string;
    plannedQuantity: number;
    reservedQuantity: number;
    depositCents: number;
  }>;
}

export interface Recipe {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  productSlugs: string[];
  imageUrl?: string | null;
}
