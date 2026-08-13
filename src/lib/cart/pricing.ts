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
  unitPriceCents: number;
  compareAtPriceCents: number | null;
  quantity: number;
  netWeightG: number | null;
  /** Disponible en stock au moment du calcul, pour signaler un dépassement. */
  availableQuantity: number;
  priceIsProvisional: boolean;
}

export interface CartTotals {
  lineCount: number;
  itemCount: number;
  subtotalCents: number;
  savingsCents: number;
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
    if (line.priceIsProvisional) hasProvisionalPrices = true;
  }

  return {
    lineCount: lines.length,
    itemCount,
    subtotalCents,
    savingsCents,
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
