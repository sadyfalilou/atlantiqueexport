import { describe, expect, it } from "vitest";
import { availableMethods, blockingTemperature } from "./fulfillment";

describe("availableMethods", () => {
  it("autorise les trois modes pour un panier entièrement sec", () => {
    expect(availableMethods(["ambient"])).toEqual([
      "pickup",
      "local_delivery",
      "shipping",
    ]);
  });

  it("retire l'expédition postale dès qu'un produit surgelé est présent", () => {
    expect(availableMethods(["ambient", "frozen"])).toEqual([
      "pickup",
      "local_delivery",
    ]);
  });

  it("applique la contrainte la plus stricte sur un panier mixte", () => {
    expect(availableMethods(["ambient", "fresh", "refrigerated", "frozen"])).toEqual([
      "pickup",
      "local_delivery",
    ]);
  });

  it("n'impose aucune contrainte sur un panier vide", () => {
    expect(availableMethods([])).toEqual([
      "pickup",
      "local_delivery",
      "shipping",
    ]);
  });

  it("laisse le ramassage possible quelle que soit la température", () => {
    for (const temperature of [
      "ambient",
      "fresh",
      "refrigerated",
      "frozen",
    ] as const) {
      expect(availableMethods([temperature])).toContain("pickup");
    }
  });
});

describe("blockingTemperature", () => {
  it("désigne le surgelé comme cause du blocage de l'expédition", () => {
    expect(blockingTemperature(["ambient", "frozen"], "shipping")).toBe("frozen");
  });

  it("cite la contrainte la plus forte quand plusieurs s'appliquent", () => {
    expect(blockingTemperature(["fresh", "frozen"], "shipping")).toBe("frozen");
  });

  it("ne signale rien lorsque le mode est disponible", () => {
    expect(blockingTemperature(["ambient"], "shipping")).toBeNull();
    expect(blockingTemperature(["frozen"], "pickup")).toBeNull();
  });
});
