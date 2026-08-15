import { describe, expect, it } from "vitest";
import { findShippingZone, type ShippingZone } from "./shipping";

const canada: ShippingZone = {
  id: "ca",
  name: "Canada",
  countryCode: "CA",
  regionCodes: [],
  feeCents: 1500,
  freeThresholdCents: null,
};

const nord: ShippingZone = {
  id: "nord",
  name: "Nord canadien",
  countryCode: "CA",
  regionCodes: ["YT", "NT", "NU"],
  feeCents: 4000,
  freeThresholdCents: null,
};

const usa: ShippingZone = {
  id: "us",
  name: "États-Unis",
  countryCode: "US",
  regionCodes: [],
  feeCents: 2500,
  freeThresholdCents: null,
};

describe("findShippingZone", () => {
  it("retient la zone nationale pour une province ordinaire", () => {
    expect(findShippingZone([canada, nord], "CA", "QC")?.id).toBe("ca");
  });

  it("fait primer la zone régionale sur la nationale", () => {
    // Sans cette priorité, le Yukon serait facturé au tarif du reste du pays,
    // et la zone créée pour lui ne servirait à rien.
    expect(findShippingZone([canada, nord], "CA", "YT")?.id).toBe("nord");
  });

  it("ne mélange pas les pays malgré des codes identiques", () => {
    // « CA » est à la fois le Canada et la Californie : la comparaison porte
    // sur le pays d'abord, sans quoi une adresse californienne tomberait sur
    // le tarif canadien.
    expect(findShippingZone([canada, usa], "US", "CA")?.id).toBe("us");
  });

  it("ne rend rien pour une destination non desservie", () => {
    expect(findShippingZone([canada], "US", "NY")).toBeNull();
  });

  it("ignore la casse et les espaces", () => {
    expect(findShippingZone([canada, nord], " ca ", " yt ")?.id).toBe("nord");
  });
});
