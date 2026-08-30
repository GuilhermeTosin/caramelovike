import { describe, expect, it } from "vitest";
import type { BusinessFrontend } from "@/types/database";
import { buildBusinessUrlForLocale, getBusinessDescriptionForLocale, hasEnglishBusinessTranslation } from "@/lib/businessEnglish";

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

  it("uses the English description in English cards and keeps Portuguese as fallback", () => {
    const translated = { ...business, description: "Descrição em português.", descriptionEn: "English business description." };
    expect(getBusinessDescriptionForLocale(translated, "en")).toBe("English business description.");
    expect(getBusinessDescriptionForLocale(translated, "pt-BR")).toBe("Descrição em português.");
    expect(getBusinessDescriptionForLocale(business, "en")).toBe(business.description || "");
  });
});
