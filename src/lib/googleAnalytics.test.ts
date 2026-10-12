import { describe, expect, it } from "vitest";
import { buildGoogleAnalyticsPageViewPayload, getGoogleAnalyticsMeasurementId } from "@/lib/googleAnalytics";

describe("Google Analytics helpers", () => {
  it("accepts one GA4 measurement ID from a pasted snippet", () => {
    expect(getGoogleAnalyticsMeasurementId('<script src="gtag.js?id=G-ABC123XYZ"></script>')).toBe("G-ABC123XYZ");
  });

  it("rejects a snippet with multiple measurement IDs", () => {
    expect(getGoogleAnalyticsMeasurementId("G-ABC123 G-DEF456")).toBe("");
  });

  it("builds page-view metadata without hashes or sensitive query parameters", () => {
    const payload = buildGoogleAnalyticsPageViewPayload(
      "/redefinir-senha?token=secret&origem=perfil#access_token=private",
      "https://www.caramelinho.com",
      "Redefinir senha",
      "https://mail.example/reset?email=person@example.com",
    );

    expect(payload).toEqual({
      page_title: "Redefinir senha",
      page_location: "https://www.caramelinho.com/redefinir-senha?origem=perfil",
      page_referrer: "https://mail.example/reset",
    });
    expect(JSON.stringify(payload)).not.toContain("secret");
    expect(JSON.stringify(payload)).not.toContain("person@example.com");
  });
});
