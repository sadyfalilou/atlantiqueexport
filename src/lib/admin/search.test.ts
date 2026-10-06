import { describe, expect, it } from "vitest";
import { matches, normalize } from "@/lib/admin/search";

describe("normalize", () => {
  it("retire les accents et la casse", () => {
    expect(normalize("Thiéré")).toBe("thiere");
    expect(normalize("Café Touba")).toBe("cafe touba");
  });

  it("réduit les espaces", () => {
    expect(normalize("  pulpe   de  madd ")).toBe("pulpe de madd");
  });
});

describe("matches", () => {
  it("ne filtre rien quand la requête est vide", () => {
    expect(matches("", "n'importe quoi")).toBe(true);
    expect(matches("   ", "n'importe quoi")).toBe(true);
  });

  it("trouve sans accent ce qui en porte", () => {
    expect(matches("thiere", "Thiéré")).toBe(true);
    expect(matches("THIÉRÉ", "thiere")).toBe(true);
  });

  it("cherche dans tous les champs donnés", () => {
    expect(matches("PMA-1KG", "Pulpe de madd", "Sachet 1 kg", "AE-AEX-PMA-1KG")).toBe(true);
  });

  it("exige chaque mot, dans n'importe quel ordre", () => {
    expect(matches("madd sachet", "Pulpe de madd", "Sachet 1 kg")).toBe(true);
    expect(matches("madd boite", "Pulpe de madd", "Sachet 1 kg")).toBe(false);
  });

  it("ignore les champs absents", () => {
    expect(matches("madd", "Pulpe de madd", null, undefined)).toBe(true);
  });

  it("accepte les nombres", () => {
    expect(matches("00042", "AE-2026-00042", 42)).toBe(true);
  });
});
