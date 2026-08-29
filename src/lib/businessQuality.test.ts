import { describe, expect, it } from "vitest";
import { getBusinessQualityAudit, hasLegacyOpeningHours, SHORT_DESCRIPTION_MIN_LENGTH } from "@/lib/businessQuality";
import type { BusinessFrontend } from "@/types/database";

function createBusiness(overrides: Partial<BusinessFrontend> = {}): BusinessFrontend {
  return {
    id: "business-1",
    ownerId: "owner-1",
    ownerName: "Owner",
    name: "Negócio teste",
    slug: "negocio-teste",
    categoryId: "food",
    category: "Restaurantes e Alimentação",
    description: "Esta descrição apresenta detalhes suficientes sobre o negócio, seu atendimento, seus serviços e as informações que ajudam clientes a decidir com confiança.",
    heroImage: "",
    logoUrl: "",
    address: { street: "", city: "Toronto", state: "Ontario", country: "Canadá", countryCode: "ca", stateCode: "on", postalCode: "", lat: 0, lng: 0 },
    attendanceType: "presencial",
    services: [],
    serviceItems: [],
    keywords: [],
    menu: [],
    isBrazilianOwned: true,
    servesPortuguese: true,
    isVeganFriendly: false,
    isVegetarianFriendly: false,
    isGlutenFreeFriendly: false,
    photos: [],
    phone: "",
    email: "",
    website: "",
    reviews: [],
    averageRating: 0,
    ownerVerified: false,
    moderationStatus: "approved",
    openingHours: [],
    promotions: [],
    events: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("business quality audit", () => {
  it("identifies short rich-text descriptions", () => {
    const audit = getBusinessQualityAudit([createBusiness({ description: "<p>Texto curto</p>" })]);
    expect(audit.shortDescriptions).toHaveLength(1);
    expect(audit.shortDescriptions[0].descriptionLength).toBeLessThan(SHORT_DESCRIPTION_MIN_LENGTH);
  });

  it("does not flag a complete description", () => {
    const audit = getBusinessQualityAudit([createBusiness()]);
    expect(audit.shortDescriptions).toHaveLength(0);
  });

  it("identifies the legacy default hours without flagging missing hours", () => {
    const legacyHours = [
      "Segunda: 09:00 - 18:00",
      "Terça: 09:00 - 18:00",
      "Quarta: 09:00 - 18:00",
      "Quinta: 09:00 - 18:00",
      "Sexta: 09:00 - 18:00",
      "Sábado: 10:00 - 14:00",
      "Domingo: fechado",
    ];

    expect(hasLegacyOpeningHours(legacyHours)).toBe(true);
    expect(hasLegacyOpeningHours([])).toBe(false);

    const audit = getBusinessQualityAudit([createBusiness({ openingHours: legacyHours })]);
    expect(audit.legacyHours).toHaveLength(1);
    expect(audit.legacyHours[0].business.id).toBe("business-1");
  });
});
