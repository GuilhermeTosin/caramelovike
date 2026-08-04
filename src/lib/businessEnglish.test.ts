import { describe, expect, it } from "vitest";
import type { BusinessFrontend } from "@/types/database";
import { buildBusinessUrlForLocale, hasEnglishBusinessTranslation } from "@/lib/businessEnglish";

const business = {
  slug: "example-business",
  descriptionEn: "",
  address: {
    city: "Montreal",
    citySlug: "montreal",
    countryCode: "ca",
    stateCode: "qc",
  },
} as BusinessFrontend;

describe("business English publishing", () => {
  it("keeps an untranslated business on the Portuguese URL", () => {
    expect(hasEnglishBusinessTranslation(business)).toBe(false);
    expect(buildBusinessUrlForLocale(business, "en")).toBe("/ca/qc/montreal/example-business");
  });

  it("publishes an English URL only with English content", () => {
    const translated = { ...business, descriptionEn: "A Brazilian business in Montreal." };
    expect(hasEnglishBusinessTranslation(translated)).toBe(true);
    expect(buildBusinessUrlForLocale(translated, "en")).toBe("/en/ca/qc/montreal/example-business");
  });
});