import { describe, expect, it } from "vitest";
import { formatDate, formatPrice, formatUnitPrice } from "./utils";

describe("formatPrice", () => {
  it("convertit les cents en dollars canadiens", () => {
    expect(formatPrice(1299, "fr")).toContain("12,99");
    expect(formatPrice(1299, "en")).toContain("12.99");
  });

  it("gère le zéro sans arrondi surprenant", () => {
    expect(formatPrice(0, "fr")).toContain("0,00");
  });
});

describe("formatUnitPrice", () => {
  it("ramène le prix au kilo", () => {
    // 12,99 $ pour 200 g → 64,95 $/kg
    expect(formatUnitPrice(1299, 200, "fr")).toContain("64,95");
  });

  it("ne calcule rien sans poids exploitable", () => {
    expect(formatUnitPrice(1299, null, "fr")).toBeNull();
    expect(formatUnitPrice(1299, 0, "fr")).toBeNull();
  });
});

describe("formatDate", () => {
  it("n'avance ni ne recule une date sans heure selon le fuseau", () => {
    // Régression : « 2026-09-18 » s'affichait le 17 septembre à Montréal,
    // la chaîne étant interprétée comme minuit UTC.
    expect(formatDate("2026-09-18", "fr")).toBe("18 septembre 2026");
    expect(formatDate("2026-01-01", "fr")).toBe("1 janvier 2026");
  });

  it("traduit le mois en anglais", () => {
    expect(formatDate("2026-09-18", "en")).toBe("September 18, 2026");
  });
});
