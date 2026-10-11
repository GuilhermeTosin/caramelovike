const GEOIP_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export function applyGeoipNoStoreHeaders(response: {
  setHeader(name: string, value: string): unknown;
}): void {
  for (const [name, value] of Object.entries(GEOIP_NO_STORE_HEADERS)) {
    response.setHeader(name, value);
  }
}
