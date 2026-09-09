import { describe, expect, it } from "vitest";
import { buildMarketplaceRequestKey, marketplaceListingPath, marketplaceSellerPath } from "@/lib/marketplaceSnapshot";

describe("marketplaceSnapshot", () => {
  it("normalizes accented city names in public URLs", () => {
    expect(marketplaceListingPath({ country_code: "CA", state_code: "QC", city: "Montréal", slug: "bicicleta-abc" }))
      .toBe("/marketplace/ca/qc/montreal/bicicleta-abc");
  });

  it("keeps all list filters in the request key", () => {
    const key = buildMarketplaceRequestKey("bicicleta", "esportes-e-lazer", "selling", 2, "Laval", "10", "100", "good", "ca", "qc");
    expect(key).toContain("page=2");
    expect(key).toContain("city=Laval");
    expect(key).toContain("condition=good");
    expect(key).toContain("countryCode=ca");
    expect(key).toContain("stateCode=qc");
  });

  it("builds a stable public seller profile path", () => {
    expect(marketplaceSellerPath("550e8400-e29b-41d4-a716-446655440000"))
      .toBe("/marketplace/vendedor/550e8400-e29b-41d4-a716-446655440000");
  });
});
