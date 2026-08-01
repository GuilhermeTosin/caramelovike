import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getGoogleAnalyticsMeasurementId } from "../src/lib/googleAnalytics";

const ADMIN_EMAIL = "contact@guilhermetosin.com";
const SETTINGS_PATH = "/rest/v1/site_analytics_settings?id=eq.true&select=google_analytics_measurement_id&limit=1";

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
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase ${response.status}: ${details.slice(0, 240)}`);
  }
  const rows = (await response.json()) as Array<{ google_analytics_measurement_id?: unknown }>;
  return getGoogleAnalyticsMeasurementId(rows[0]?.google_analytics_measurement_id);
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

    const response = await fetch(config.url + "/rest/v1/site_analytics_settings?on_conflict=id", {
      method: "POST",
      headers: {
        ...serverHeaders(config.key),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({ id: true, google_analytics_measurement_id: measurementId }),
    });
    if (!response.ok) throw new Error(await response.text());
    return res.status(200).json({ measurementId });
  } catch (error) {
    console.error("[google-analytics]", error);
    res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
    return res.status(500).json({ error: "N\u00e3o foi poss\u00edvel salvar a configura\u00e7\u00e3o do Google Analytics." });
  }
}
