import { describe, expect, it } from "vitest";
import { buildDirectoryPageSnapshot } from "@/lib/directorySnapshot";
import type { BusinessFrontend } from "@/types/database";

function business(index: number): BusinessFrontend {
  return {
    id: `business-${index}`,
    ownerId: "owner",
    ownerName: "Owner",
    name: `Business ${String(index).padStart(2, "0")}`,
    slug: `business-${index}`,
    categoryId: "food",
    category: "Restaurantes e Alimentação",
    primaryActivity: "restaurant",
    description: "Long description that must not be serialized in directory cards.",
    heroImage: "https://example.com/hero.webp",
    logoUrl: "https://example.com/logo.webp",
    address: { street: "Street", city: "Montreal", state: "Quebec", country: "Canadá", countryCode: "ca", stateCode: "qc", postalCode: "", lat: 0, lng: 0 },
    attendanceType: "presencial",
    services: ["Service"], serviceItems: [], keywords: ["keyword"], menu: [], isBrazilianOwned: true, servesPortuguese: true,
    isVeganFriendly: false, isVegetarianFriendly: false, isGlutenFreeFriendly: false, photos: ["https://example.com/photo.webp"], phone: "1", email: "mail@example.com", website: "https://example.com",
    reviews: [], averageRating: 0, ownerVerified: false, moderationStatus: "approved", openingHours: [], promotions: [], events: [], createdAt: `2026-01-${String(index).padStart(2, "0")}`, updatedAt: "2026-01-01",
  };
}

describe("directory page snapshot", () => {
  it("serializes only the requested page of a city directory", () => {
    const snapshot = buildDirectoryPageSnapshot(
      "/negocios/ca/qc/montreal/pagina/2",
      Array.from({ length: 12 }, (_, index) => business(index + 1)),
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot?.totalBusinesses).toBe(12);
    expect(snapshot?.totalPages).toBe(2);
    expect(snapshot?.route.page).toBe(2);
    expect(snapshot?.pageBusinesses).toHaveLength(2);
    expect(snapshot?.pageBusinesses.map((item) => item.name)).toEqual(["Business 11", "Business 12"]);
    expect(snapshot?.pageBusinesses[0]?.description).toBe("");
    expect(snapshot?.pageBusinesses[0]?.photos).toEqual([]);
  });
});