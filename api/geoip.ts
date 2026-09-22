type GeoResponse = {
  lat: number;
  lng: number;
  city?: string;
  stateCode?: string;
  countryCode?: string;
};

const GEOIP_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
} as const;

function readOptionalHeader(request: Request, name: string): string | undefined {
  const value = request.headers.get(name)?.trim();
  if (!value) return undefined;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getGeoFromVercelHeaders(request: Request): GeoResponse | null {
  const rawLatitude = request.headers.get("x-vercel-ip-latitude");
  const rawLongitude = request.headers.get("x-vercel-ip-longitude");
  if (!rawLatitude || !rawLongitude) return null;

  const lat = Number(rawLatitude);
  const lng = Number(rawLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  const city = readOptionalHeader(request, "x-vercel-ip-city");
  const stateCode = readOptionalHeader(request, "x-vercel-ip-country-region");
  const countryCode = readOptionalHeader(request, "x-vercel-ip-country");

  return {
    lat,
    lng,
    ...(city ? { city } : {}),
    ...(stateCode ? { stateCode: stateCode.toLowerCase() } : {}),
    ...(countryCode ? { countryCode: countryCode.toLowerCase() } : {}),
  };
}

function jsonResponse(payload: GeoResponse): Response {
  const headers = new Headers(GEOIP_NO_STORE_HEADERS);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status: 200, headers });
}

function emptyResponse(status = 204, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(GEOIP_NO_STORE_HEADERS);
  if (extraHeaders) new Headers(extraHeaders).forEach((value, name) => headers.set(name, value));
  return new Response(null, { status, headers });
}

export default {
  fetch(request: Request): Response {
    if (request.method !== "GET") {
      return emptyResponse(405, { Allow: "GET" });
    }

    try {
      const geo = getGeoFromVercelHeaders(request);
      return geo ? jsonResponse(geo) : emptyResponse();
    } catch (error) {
      console.error("[api/geoip] Failed to read Vercel geolocation headers", error);
      return emptyResponse();
    }
  },
};
