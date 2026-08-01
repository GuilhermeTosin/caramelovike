import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getGoogleAnalyticsMeasurementId } from "../src/lib/googleAnalytics";

const ADMIN_EMAIL = "contact@guilhermetosin.com";
const SETTINGS_PATH = "/rest/v1/site_analytics_settings?id=eq.true&select=google_analytics_measurement_id&limit=1";
const FALLBACK_SETTINGS_KEY = "google_analytics_measurement_id";
const FALLBACK_SETTINGS_PATH =
  "/rest/v1/search_settings?key=eq." + FALLBACK_SETTINGS_KEY + "&select=value&limit=1";

type ServerConfig = {
  url: string;
  key: string;
};

function getConfig(): ServerConfig | null {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return url && key ? { url, key } : null;
}

function serverHeaders(key: string, accessToken?: string): Record<string, string> {
  return {
    apikey: key,
    ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    Accept: "application/json",
  };
}

function getBearerToken(req: VercelRequest) {
  return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

async function isAuthorizedAdmin(req: VercelRequest, config: ServerConfig) {
  const accessToken = getBearerToken(req);
  if (!accessToken) return false;

  const userResponse = await fetch(config.url + "/auth/v1/user", {
    headers: serverHeaders(config.key, accessToken),
  });
  if (!userResponse.ok) return false;
  const user = (await userResponse.json()) as { id?: string; email?: string };
  if (String(user.email || "").trim().toLowerCase() !== ADMIN_EMAIL || !user.id) return false;

  const profileResponse = await fetch(
    config.url + "/rest/v1/profiles?select=role&id=eq." + encodeURIComponent(user.id) + "&limit=1",
    { headers: serverHeaders(config.key) },
  );
  if (!profileResponse.ok) return false;
  const profiles = (await profileResponse.json()) as Array<{ role?: string }>;
  return String(profiles[0]?.role || "").toLowerCase() === "admin";
}

async function getMeasurementId(config: ServerConfig) {
  const response = await fetch(config.url + SETTINGS_PATH, { headers: serverHeaders(config.key) });
  if (response.ok) {
    const rows = (await response.json()) as Array<{ google_analytics_measurement_id?: unknown }>;
    const measurementId = getGoogleAnalyticsMeasurementId(rows[0]?.google_analytics_measurement_id);
    if (measurementId) return measurementId;
  }

  const fallbackResponse = await fetch(config.url + FALLBACK_SETTINGS_PATH, {
    headers: serverHeaders(config.key),
  });
  if (fallbackResponse.ok) {
    const rows = (await fallbackResponse.json()) as Array<{ value?: unknown }>;
    return getGoogleAnalyticsMeasurementId(rows[0]?.value);
  }

  const [primaryDetails, fallbackDetails] = await Promise.all([
    response.ok ? Promise.resolve("") : response.text(),
    fallbackResponse.text(),
  ]);
  throw new Error(
    `Supabase analytics settings unavailable. primary=${response.status}:${primaryDetails.slice(0, 120)} ` +
      `fallback=${fallbackResponse.status}:${fallbackDetails.slice(0, 120)}`,
  );
}

async function saveMeasurementId(config: ServerConfig, measurementId: string) {
  const commonHeaders = {
    ...serverHeaders(config.key),
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };
  const [primaryResponse, fallbackResponse] = await Promise.all([
    fetch(config.url + "/rest/v1/site_analytics_settings?on_conflict=id", {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({ id: true, google_analytics_measurement_id: measurementId }),
    }),
    fetch(config.url + "/rest/v1/search_settings?on_conflict=key", {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({ key: FALLBACK_SETTINGS_KEY, value: measurementId }),
    }),
  ]);

  if (primaryResponse.ok || fallbackResponse.ok) return;

  const [primaryDetails, fallbackDetails] = await Promise.all([
    primaryResponse.text(),
    fallbackResponse.text(),
  ]);
  throw new Error(
    `Supabase analytics settings save failed. primary=${primaryResponse.status}:${primaryDetails.slice(0, 120)} ` +
      `fallback=${fallbackResponse.status}:${fallbackDetails.slice(0, 120)}`,
  );
}

function readBody(req: VercelRequest): Record<string, unknown> {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (req.body || {}) as Record<string, unknown>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const config = getConfig();
  if (!config) return res.status(503).json({ error: "Configura\u00e7\u00e3o de servidor indispon\u00edvel." });

  try {
    if (req.method === "GET") {
      // GA4 measurement IDs are public by design. Cache this tiny response briefly to avoid an extra database read per page view.
      const measurementId = await getMeasurementId(config);
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=60");
      return res.status(200).json({ measurementId });
    }

    if (req.method !== "PUT" && req.method !== "DELETE") {
      res.setHeader("Allow", "GET, PUT, DELETE");
      return res.status(405).json({ error: "M\u00e9todo n\u00e3o permitido." });
    }
    if (!(await isAuthorizedAdmin(req, config))) return res.status(403).json({ error: "Acesso restrito." });

    const measurementId = req.method === "DELETE" ? "" : getGoogleAnalyticsMeasurementId(readBody(req).snippet);
    if (req.method === "PUT" && !measurementId) {
      return res.status(400).json({ error: "O c\u00f3digo deve conter um \u00fanico ID GA4 no formato G-XXXXXXXXXX." });
    }

    await saveMeasurementId(config, measurementId);
    return res.status(200).json({ measurementId });
  } catch (error) {
    console.error("[google-analytics]", error);
    res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
    const action = req.method === "GET" ? "carregar" : "salvar";
    return res.status(500).json({
      error: `N\u00e3o foi poss\u00edvel ${action} a configura\u00e7\u00e3o do Google Analytics.`,
    });
  }
}
