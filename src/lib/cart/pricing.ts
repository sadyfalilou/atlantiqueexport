import { availableMethods, blockingTemperature } from "@/lib/fulfillment";
import type {
  FulfillmentMethod,
  LocalizedText,
  TemperatureClass,
} from "@/lib/types";

/**
 * Calcul des montants du panier.
 *
 * Volontairement pur : aucune entrée-sortie ici, donc entièrement testable.
 * Les prix arrivent déjà relus depuis la base — jamais depuis le navigateur.
 *
 * Les taxes sont reportées (voir les décisions de cadrage) : les champs
 * existent et restent à zéro.
 */

export interface CartLine {
  itemId: string;
  variantId: string;
  productSlug: string;
  productName: LocalizedText;
  variantLabel: LocalizedText;
  temperatureClass: TemperatureClass;
  imageUrl?: string | null;
  /** Le prix réellement facturé : de gros si le compte y donne droit. */
  unitPriceCents: number;
  /** Le prix public, conservé pour montrer l'écart au professionnel. */
  retailPriceCents: number;
  compareAtPriceCents: number | null;
  quantity: number;
  netWeightG: number | null;
  /** Disponible en stock au moment du calcul, pour signaler un dépassement. */
  availableQuantity: number;
  priceIsProvisional: boolean;
}

/**
 * Le prix facturé pour un format, selon le compte qui achète.
 *
 * ⚠️ **Cette règle est écrite deux fois** : ici, pour l'affichage, et dans
 * `place_order` (migration `20260815120000_wholesale_pricing.sql`), pour le
 * montant réellement facturé. C'est la seconde qui fait foi — l'application
 * peut afficher ce qu'elle veut, la base établit le montant. Les deux doivent
 * dire la même chose, sans quoi le client verrait un prix au panier et en
 * paierait un autre.
 *
 * Deux règles, toutes deux protectrices du client :
 *
 * 1. Un format sans tarif de gros se vend au prix de détail. Un oubli de
 *    saisie ne doit ni retirer un produit de la vente ni bloquer une commande.
 * 2. Le professionnel ne paie jamais plus qu'un client de détail. Si une
 *    promotion descend le prix public sous le tarif négocié, c'est le prix
 *    public qui s'applique.
 */
export function effectiveUnitPrice(
  retailCents: number,
  wholesaleCents: number | null,
  isWholesale: boolean,
): number {
  if (!isWholesale || wholesaleCents == null) return retailCents;
  return Math.min(wholesaleCents, retailCents);
}

export interface CartTotals {
  lineCount: number;
  itemCount: number;
  subtotalCents: number;
  savingsCents: number;
  /** Écart entre le prix public et le tarif de gros, sur tout le panier. */
  wholesaleSavingsCents: number;
  totalWeightG: number;
  taxGstCents: number;
  taxQstCents: number;
  hasProvisionalPrices: boolean;
}

export function lineTotal(line: CartLine): number {
  return line.unitPriceCents * line.quantity;
}

export function computeTotals(lines: CartLine[]): CartTotals {
  let subtotalCents = 0;
  let savingsCents = 0;
  let wholesaleSavingsCents = 0;
  let itemCount = 0;
  let totalWeightG = 0;
  let hasProvisionalPrices = false;

  for (const line of lines) {
    subtotalCents += lineTotal(line);
    itemCount += line.quantity;
    if (line.netWeightG) totalWeightG += line.netWeightG * line.quantity;
    if (line.compareAtPriceCents && line.compareAtPriceCents > line.unitPriceCents) {
      savingsCents += (line.compareAtPriceCents - line.unitPriceCents) * line.quantity;
    }
    if (line.retailPriceCents > line.unitPriceCents) {
      wholesaleSavingsCents +=
        (line.retailPriceCents - line.unitPriceCents) * line.quantity;
    }
    if (line.priceIsProvisional) hasProvisionalPrices = true;
  }

  return {
    lineCount: lines.length,
    itemCount,
    subtotalCents,
    savingsCents,
    wholesaleSavingsCents,
    totalWeightG,
    // Reportées : l'entreprise n'est pas encore inscrite aux fichiers de la
    // TPS et de la TVQ. Les champs restent pour ne pas avoir à retoucher la
    // structure le jour venu.
    taxGstCents: 0,
    taxQstCents: 0,
    hasProvisionalPrices,
  };
}

/* -------------------------------------------------------------------------- */
/* Compatibilité logistique                                                    */
/* -------------------------------------------------------------------------- */

export interface FulfillmentAvailability {
  method: FulfillmentMethod;
  available: boolean;
  /** Classe de température responsable du refus, le cas échéant. */
  blockedBy: TemperatureClass | null;
}

/**
 * Ce qu'un panier autorise comme mode de réception, et pourquoi il en refuse
 * d'autres. On renvoie la cause du refus plutôt qu'un simple booléen : le
 * client doit lire « votre panier contient du surgelé », pas se heurter à un
 * bouton grisé sans explication.
 */
export function fulfillmentOptions(lines: CartLine[]): FulfillmentAvailability[] {
  const temperatures = [...new Set(lines.map((line) => line.temperatureClass))];
  const allowed = availableMethods(temperatures);

  return (["pickup", "local_delivery", "shipping"] as FulfillmentMethod[]).map(
    (method) => ({
      method,
      available: allowed.includes(method),
      blockedBy: allowed.includes(method)
        ? null
        : blockingTemperature(temperatures, method),
    }),
  );
}

/** Lignes dont la quantité demandée dépasse le stock disponible. */
export function overstockedLines(lines: CartLine[]): CartLine[] {
  return lines.filter((line) => line.quantity > line.availableQuantity);
}
