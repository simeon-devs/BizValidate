import { describe, it, expect } from "vitest";
import { countryForRegion } from "./countries";

describe("countryForRegion", () => {
  it("resolves a plain nation name, case- and accent-insensitively", () => {
    expect(countryForRegion("Uganda")).toBe("uganda");
    expect(countryForRegion("  CAMEROON ")).toBe("cameroon");
    expect(countryForRegion("Côte d'Ivoire")).toBe("ivory coast");
  });

  it("resolves aliases and 'City, Country' forms to the country", () => {
    expect(countryForRegion("DRC")).toBe("democratic republic of the congo");
    expect(countryForRegion("USA")).toBe("united states");
    expect(countryForRegion("Kigali, Rwanda")).toBe("rwanda");
    expect(countryForRegion("Lagos / Nigeria")).toBe("nigeria");
  });

  it("returns null for regions that are not one nation — never a wrong boost", () => {
    expect(countryForRegion("West Africa")).toBeNull();
    expect(countryForRegion("Central Africa")).toBeNull();
    expect(countryForRegion("Europe")).toBeNull();
    expect(countryForRegion("not stated")).toBeNull();
    expect(countryForRegion("")).toBeNull();
    expect(countryForRegion(undefined)).toBeNull();
  });
});
