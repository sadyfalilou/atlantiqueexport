import { describe, expect, it } from "vitest";
import {
  computeTotals,
  fulfillmentOptions,
  lineTotal,
  overstockedLines,
  type CartLine,
} from "./pricing";
import type { TemperatureClass } from "@/lib/types";

function line(
  overrides: Partial<CartLine> & { unitPriceCents: number; quantity: number },
): CartLine {
  return {
    itemId: "item",
    variantId: "variant",
    productSlug: "produit",
    productName: { fr: "Produit", en: "Product" },
    variantLabel: { fr: "Sachet", en: "Bag" },
    temperatureClass: "ambient",
    compareAtPriceCents: null,
    netWeightG: 500,
    availableQuantity: 99,
    priceIsProvisional: false,
    ...overrides,
  };
}

describe("computeTotals", () => {
  it("additionne les lignes en cents entiers", () => {
    const totals = computeTotals([
      line({ unitPriceCents: 1499, quantity: 2 }),
      line({ unitPriceCents: 899, quantity: 1 }),
    ]);
    expect(totals.subtotalCents).toBe(3897);
    expect(totals.itemCount).toBe(3);
    expect(totals.lineCount).toBe(2);
  });

  it("calcule l'économie à partir du prix barré", () => {
    const totals = computeTotals([
      line({ unitPriceCents: 999, compareAtPriceCents: 1299, quantity: 3 }),
    ]);
    expect(totals.savingsCents).toBe(900);
  });

  it("ignore un prix barré inférieur au prix de vente", () => {
    const totals = computeTotals([
      line({ unitPriceCents: 999, compareAtPriceCents: 500, quantity: 1 }),
    ]);
    expect(totals.savingsCents).toBe(0);
  });

  it("cumule le poids des articles", () => {
    const totals = computeTotals([
      line({ unitPriceCents: 100, quantity: 2, netWeightG: 500 }),
      line({ unitPriceCents: 100, quantity: 1, netWeightG: 1000 }),
    ]);
    expect(totals.totalWeightG).toBe(2000);
  });

  it("laisse les taxes à zéro tant qu'elles sont reportées", () => {
    const totals = computeTotals([line({ unitPriceCents: 1000, quantity: 1 })]);
    expect(totals.taxGstCents).toBe(0);
    expect(totals.taxQstCents).toBe(0);
  });

  it("signale la présence d'un prix de démonstration", () => {
    expect(
      computeTotals([line({ unitPriceCents: 100, quantity: 1, priceIsProvisional: true })])
        .hasProvisionalPrices,
    ).toBe(true);
  });

  it("renvoie un total nul sur un panier vide", () => {
    const totals = computeTotals([]);
    expect(totals.subtotalCents).toBe(0);
    expect(totals.itemCount).toBe(0);
  });
});

describe("lineTotal", () => {
  it("multiplie sans jamais passer par un flottant", () => {
    expect(lineTotal(line({ unitPriceCents: 349, quantity: 7 }))).toBe(2443);
  });
});

describe("fulfillmentOptions", () => {
  const at = (t: TemperatureClass) => line({ unitPriceCents: 100, quantity: 1, temperatureClass: t });

  it("autorise les trois modes pour un panier entièrement sec", () => {
    const options = fulfillmentOptions([at("ambient")]);
    expect(options.every((o) => o.available)).toBe(true);
  });

  it("refuse l'expédition dès qu'un surgelé est présent, et le dit", () => {
    const options = fulfillmentOptions([at("ambient"), at("frozen")]);
    const shipping = options.find((o) => o.method === "shipping");
    expect(shipping?.available).toBe(false);
    expect(shipping?.blockedBy).toBe("frozen");
  });

  it("laisse le ramassage toujours possible", () => {
    const options = fulfillmentOptions([at("frozen"), at("fresh")]);
    expect(options.find((o) => o.method === "pickup")?.available).toBe(true);
  });

  it("n'impose aucune contrainte sur un panier vide", () => {
    expect(fulfillmentOptions([]).every((o) => o.available)).toBe(true);
  });
});

describe("overstockedLines", () => {
  it("repère les lignes qui dépassent le stock", () => {
    const ok = line({ unitPriceCents: 100, quantity: 2, availableQuantity: 5 });
    const tooMany = line({ unitPriceCents: 100, quantity: 6, availableQuantity: 5 });
    expect(overstockedLines([ok, tooMany])).toEqual([tooMany]);
  });

  it("considère une ligne à la limite exacte comme acceptable", () => {
    const exact = line({ unitPriceCents: 100, quantity: 5, availableQuantity: 5 });
    expect(overstockedLines([exact])).toEqual([]);
  });
});
