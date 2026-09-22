import { afterEach, describe, expect, it, vi } from "vitest";
import geoipHandler from "../../api/geoip";

describe("Vercel GeoIP function", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns Vercel's approximate location with private no-store headers", async () => {
    const request = new Request("https://dev.caramelinho.com/api/geoip", {
      headers: {
        "x-vercel-ip-latitude": "45.5",
        "x-vercel-ip-longitude": "-73.6",
        "x-vercel-ip-city": "Saint-J%C3%A9r%C3%B4me",
        "x-vercel-ip-country-region": "QC",
        "x-vercel-ip-country": "CA",
      },
    });

    const response = await geoipHandler.fetch(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      lat: 45.5,
      lng: -73.6,
      city: "Saint-Jérôme",
      stateCode: "qc",
      countryCode: "ca",
    });
    expect(response.headers.get("Cache-Control")).toContain("private, no-store");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
  });

  it("returns 204 without making an external GeoIP request when headers are missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await geoipHandler.fetch(new Request("https://dev.caramelinho.com/api/geoip"));

    expect(response.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects out-of-range coordinates", async () => {
    const response = await geoipHandler.fetch(
      new Request("https://dev.caramelinho.com/api/geoip", {
        headers: {
          "x-vercel-ip-latitude": "95",
          "x-vercel-ip-longitude": "-73.6",
        },
      }),
    );

    expect(response.status).toBe(204);
  });

  it("only allows GET", async () => {
    const response = await geoipHandler.fetch(
      new Request("https://dev.caramelinho.com/api/geoip", { method: "POST" }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });
});
