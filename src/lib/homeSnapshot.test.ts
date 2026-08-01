import { describe, expect, it } from "vitest";
import { buildHomePublicSnapshot } from "@/lib/homeSnapshot";
import type { BusinessFrontend } from "@/types/database";

function business(id: string, categoryId: string, city: string): BusinessFrontend {
  return {
    id,
    ownerId: "owner",
    ownerName: "Owner",
    name: id,
    slug: id,
    categoryId,
    category: categoryId,
    description: "",
    heroImage: "",
    logoUrl: "",
    address: { street: "", city, state: "Quebec", country: "Canadá", countryCode: "ca", stateCode: "qc", postalCode: "", lat: 0, lng: 0 },
    attendanceType: "presencial",
    services: [], serviceItems: [], keywords: [], menu: [], isBrazilianOwned: false, servesPortuguese: false,
    isVeganFriendly: false, isVegetarianFriendly: false, isGlutenFreeFriendly: false, photos: [], phone: "", email: "", website: "",
    reviews: [], averageRating: 0, ownerVerified: false, moderationStatus: "approved", openingHours: [], promotions: [], events: [], createdAt: "", updatedAt: "",
  };
}

describe("home public snapshot", () => {
  it("keeps only aggregate data needed for the home", () => {
    const snapshot = buildHomePublicSnapshot([
      business("one", "food", "Montreal"),
      business("two", "food", "Montreal"),
      business("three", "health_beauty", "Quebec"),
    ]);

    expect(snapshot.businessCount).toBe(3);
    expect(snapshot.cityCount).toBe(2);
    expect(snapshot.countryCount).toBe(1);
    expect(snapshot.categoryCounts).toEqual({ food: 2, health_beauty: 1 });
    expect(snapshot.popularCities[0]).toMatchObject({ displayName: "Montreal", count: 2, href: "/negocios/ca/qc/montreal" });
  });
});