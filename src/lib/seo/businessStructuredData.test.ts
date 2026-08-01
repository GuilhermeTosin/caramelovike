import { describe, expect, it } from "vitest";
import {
  buildBusinessOfferCatalog,
  buildOpeningHoursSpecification,
  buildReviewStructuredData,
  getBusinessMenuUrl,
  getBusinessStructuredDataType,
} from "./businessStructuredData";

describe("business structured data", () => {
  it("uses the most specific schema type available", () => {
    expect(getBusinessStructuredDataType({ categoryId: "food", primaryActivity: "bakery" })).toBe("Bakery");
    expect(getBusinessStructuredDataType({ categoryId: "pets", primaryActivity: "" })).toBe("ProfessionalService");
  });

  it("parses business hours without splitting the time values", () => {
    expect(buildOpeningHoursSpecification([
      "Segunda: 09:00 - 18:00",
      "Domingo: Fechado",
    ])).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "https://schema.org/Monday",
        opens: "09:00",
        closes: "18:00",
      },
    ]);
  });

  it("builds visible services as an offer catalog", () => {
    expect(buildBusinessOfferCatalog({
      categoryId: "pets",
      name: "Pet Feliz",
      services: [],
      serviceItems: [{ name: "Banho e tosa", description: "Atendimento com hora marcada", price: "" }],
      menu: [],
    })).toMatchObject({
      "@type": "OfferCatalog",
      itemListElement: [{
        itemOffered: {
          "@type": "Service",
          name: "Banho e tosa",
        },
      }],
    });
  });

  it("uses menu items for food businesses and accepts only absolute menu URLs", () => {
    expect(buildBusinessOfferCatalog({
      categoryId: "food",
      name: "Padaria Brasil",
      services: ["Cafe"],
      serviceItems: [],
      menu: [{ name: "Pao de queijo", description: "Assado na hora", price: "" }],
    })).toMatchObject({
      itemListElement: [{ itemOffered: { "@type": "MenuItem", name: "Pao de queijo" } }],
    });
    expect(getBusinessMenuUrl("https://example.com/cardapio.pdf")).toBe("https://example.com/cardapio.pdf");
    expect(getBusinessMenuUrl("/cardapio.pdf")).toBeUndefined();
  });

  it("keeps only valid reviews and limits JSON-LD to ten entries", () => {
    const reviews = Array.from({ length: 11 }, (_, index) => ({
      id: String(index),
      business_id: "business",
      user_id: null,
      user_name: "Pessoa",
      rating: 5 as const,
      comment: "Otimo atendimento",
      created_at: "2026-07-31",
    }));

    expect(buildReviewStructuredData(reviews)).toHaveLength(10);
  });
});
