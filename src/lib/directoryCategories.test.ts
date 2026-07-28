import { describe, expect, it } from "vitest";
import type { BusinessFrontend } from "@/types/database";
import { getDirectoryCategoryBusinesses, getDirectoryCategoryBySlug } from "./directoryCategories";

function business(id: string, countryCode: string, stateCode: string, city: string, primaryActivity: string) {
  return {
    id,
    primaryActivity,
    address: { countryCode, stateCode, city },
  } as BusinessFrontend;
}

describe("directory category filtering", () => {
  const bakery = getDirectoryCategoryBySlug("padarias-brasileiras");

  it("keeps Montreal, Quebec isolated from homonymous cities", () => {
    expect(bakery).not.toBeNull();
    const businesses = [
      business("montreal-qc-bakery", "ca", "qc", "Montr?al", "bakery"),
      business("montreal-fr-bakery", "fr", "ara", "Montr?al", "bakery"),
      business("montreal-qc-dentist", "ca", "qc", "Montr?al", "dentist"),
    ];

    expect(getDirectoryCategoryBusinesses(businesses, "ca", "qc", "montreal", bakery!).map((item) => item.id)).toEqual([
      "montreal-qc-bakery",
    ]);
  });

  it("returns only businesses from the requested landing-page category", () => {
    expect(bakery).not.toBeNull();
    const businesses = [
      business("bakery", "ca", "qc", "Montr?al", "bakery"),
      business("dentist", "ca", "qc", "Montr?al", "dentist"),
    ];

    expect(getDirectoryCategoryBusinesses(businesses, "ca", "qc", "montreal", bakery!).map((item) => item.id)).toEqual([
      "bakery",
    ]);
  });
});
