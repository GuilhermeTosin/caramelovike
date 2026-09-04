import { describe, expect, it } from "vitest";
import type { BusinessFrontend } from "@/types/database";
import { getDirectoryInsights } from "@/lib/directoryInsights";

function createBusiness(overrides: Partial<BusinessFrontend> = {}): BusinessFrontend {
  return {
    id: "business-1",
    ownerId: "owner-1",
    ownerName: "Owner",
    name: "Neg\u00f3cio",
    slug: "negocio",
    categoryId: "restaurant",
    primaryActivity: "restaurant",
    category: "Restaurantes e Alimenta\u00e7\u00e3o",
    description: "",
    heroImage: "",
    logoUrl: "",
    address: {
      street: "",
      city: "Montreal",
      citySlug: "montreal",
      state: "Quebec",
      country: "Canad\u00e1",
      countryCode: "ca",
      stateCode: "qc",
      postalCode: "",
      lat: 0,
      lng: 0,
    },
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

describe("getDirectoryInsights", () => {
  const scope = { countryCode: "ca", stateCode: "qc", citySlug: "montreal" };

  it("handles an empty location without inventing content", () => {
    const insights = getDirectoryInsights([], scope);
    expect(insights.totalBusinesses).toBe(0);
    expect(insights.categories).toEqual([]);
    expect(insights.latestCreatedAt).toBeUndefined();
  });

  it("summarizes a location with one business", () => {
    const insights = getDirectoryInsights([createBusiness()], scope);
    expect(insights.totalBusinesses).toBe(1);
    expect(insights.totalActivities).toBe(1);
    expect(insights.categories[0]).toMatchObject({ label: "Restaurantes brasileiros", count: 1, isIndexable: false });
  });

  it("keeps a category non-indexable below the minimum threshold", () => {
    const businesses = [
      createBusiness({ id: "one" }),
      createBusiness({ id: "two", slug: "two", name: "Dois" }),
    ];
    const insights = getDirectoryInsights(businesses, scope);
    expect(insights.totalBusinesses).toBe(2);
    expect(insights.categories[0].isIndexable).toBe(false);
  });

  it("creates an indexable category and keeps factual summary data for a richer location", () => {
    const businesses = [
      createBusiness({ id: "one", ownerVerified: true, createdAt: "2026-01-01T00:00:00.000Z" }),
      createBusiness({ id: "two", slug: "two", name: "Dois", createdAt: "2026-02-01T00:00:00.000Z" }),
      createBusiness({ id: "three", slug: "three", name: "Tr\u00eas", createdAt: "2026-03-01T00:00:00.000Z" }),
    ];
    const insights = getDirectoryInsights(businesses, scope);
    expect(insights.categories[0]).toMatchObject({ count: 3, isIndexable: true });
    expect(insights.verifiedBusinesses).toBe(1);
    expect(insights.latestCreatedAt).toBe("2026-03-01T00:00:00.000Z");
  });
});