import { afterEach, describe, expect, it, vi } from "vitest";
import { applyGeoipNoStoreHeaders } from "@/lib/geoipCachePolicy";
import { getApproxGeoByIp } from "@/lib/utils/geo";

class MockResponse {
  headers = new Map<string, string>();

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
    return this;
  }
}

function expectPrivateNoStore(response: MockResponse) {
  expect(response.headers.get("Cache-Control")).toContain("private");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("Cache-Control")).not.toMatch(/s-maxage|stale-while-revalidate/);
  expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Pragma")).toBe("no-cache");
  expect(response.headers.get("Expires")).toBe("0");
}

describe("IP geolocation cache headers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("prevents browser and CDN caching", () => {
    const response = new MockResponse();

    applyGeoipNoStoreHeaders(response);

    expectPrivateNoStore(response);
  });

  it("requests the configured geolocation endpoint without using the browser HTTP cache", async () => {
    vi.stubGlobal("window", {
      __CARAMELO_PUBLIC_ENV__: { VITE_GEOIP_ENDPOINT: "https://geo.example.test/lookup" },
      localStorage: { getItem: vi.fn(() => null), setItem: vi.fn() },
      location: { origin: "https://www.caramelinho.com" },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ lat: 45.5, lng: -73.6 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getApproxGeoByIp({ forceRefresh: true });

    expect(result?.source).toBe("ip");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect((fetchMock.mock.calls[0][0] as Request).cache).toBe("no-store");
  });

  it("uses the current site origin instead of a configured Vercel preview API", async () => {
    vi.stubGlobal("window", {
      __CARAMELO_PUBLIC_ENV__: {
        VITE_GEOIP_ENDPOINT:
          "https://caramelocodex-d0drxegnn-contato-2501s-projects.vercel.app/api/geoip",
      },
      localStorage: { getItem: vi.fn(() => null), setItem: vi.fn() },
      location: { origin: "https://www.caramelinho.com" },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ lat: 45.5, lng: -73.6 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getApproxGeoByIp({ forceRefresh: true });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect((fetchMock.mock.calls[0][0] as Request).url).toBe(
      "https://www.caramelinho.com/api/geoip",
    );
  });
});
