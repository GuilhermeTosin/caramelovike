import { describe, expect, it } from "vitest";
import {
  buildPublicSearchPageRequest,
  isPublicBusinessSearch,
  PUBLIC_SEARCH_PAGE_SIZE,
} from "@/lib/search/publicSearchPage";

describe("public search page request", () => {
  it("keeps pagination and public filters in a stable request key", () => {
    const request = buildPublicSearchPageRequest(new URLSearchParams(
      "q=churrascaria&cidade=Montr%C3%A9al&categoria=Restaurantes%20e%20Alimenta%C3%A7%C3%A3o&pagina=3"
    ));

    expect(request.page).toBe(3);
    expect(request.limit).toBe(PUBLIC_SEARCH_PAGE_SIZE);
    expect(request.categoryId).toBe("food");
    expect(request.cityAliases).toContain("Montréal");
    expect(request.key).toContain('"page":3');
  });

  it("uses the radius only when both origin coordinates are available", () => {
    const incomplete = buildPublicSearchPageRequest(new URLSearchParams("raio=50&origem_lat=45.5"));
    const complete = buildPublicSearchPageRequest(new URLSearchParams("raio=50&origem_lat=45.5&origem_lng=-73.5"));

    expect(incomplete.radiusKm).toBeNull();
    expect(complete.radiusKm).toBe(50);
    expect(complete.originLng).toBe(-73.5);
  });

  it("recognizes every canonical category identifier used by the home cards", () => {
    const categoryIds = [
      "food",
      "health_beauty",
      "auto",
      "construction",
      "legal_consulting",
      "education",
      "accounting_finance",
      "retail",
      "transport_moving",
      "real_estate",
      "tourism",
      "artists",
      "pets",
      "child_elder_care",
      "cleaning",
      "other",
    ];

    for (const categoryId of categoryIds) {
      const request = buildPublicSearchPageRequest(new URLSearchParams({ categoria: categoryId }));
      expect(request.categoryId).toBe(categoryId);
    }
  });
  it("keeps events and community finds outside the business-page RPC", () => {
    expect(isPublicBusinessSearch(new URLSearchParams("eventos=1"))).toBe(false);
    expect(isPublicBusinessSearch(new URLSearchParams("achadinhos=1"))).toBe(false);
    expect(isPublicBusinessSearch(new URLSearchParams("cidade=Montreal"))).toBe(true);
  });
});