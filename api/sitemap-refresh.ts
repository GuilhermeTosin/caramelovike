import type { VercelRequest, VercelResponse } from "@vercel/node";
import { BUSINESS_SITEMAP_CHUNK_SIZE, getBusinessSitemapChunksCount, getSitemapRows } from "./_sitemap";

type JwtPayload = {
  sub?: string;
  exp?: number;
};

const FALLBACK_ADMIN_USER_IDS = new Set([
  "41dca940-cf92-4158-8e44-ad84c48449f8",
]);

function getEnv(name: string): string {
  return (process.env[name] || "").trim();
}

function getSupabaseUrl(): string {
  return getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
}

function getServiceRoleKey(): string {
  return getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SECRET_KEY");
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payloadJson) as JwtPayload;
  } catch {
    return null;
  }
}

async function isAdmin(accessToken: string): Promise<{ ok: boolean; reason?: string; role?: string }> {
  const url = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();
  if (!url || !serviceRoleKey) return { ok: false, reason: "missing_env" };
  if (!accessToken) return { ok: false, reason: "missing_token" };

  const jwtPayload = decodeJwtPayload(accessToken);
  const userId = jwtPayload?.sub || "";
  const now = Math.floor(Date.now() / 1000);
  if (!userId) return { ok: false, reason: "invalid_token_sub" };
  if (jwtPayload?.exp && jwtPayload.exp < now) return { ok: false, reason: "expired_token" };
  if (FALLBACK_ADMIN_USER_IDS.has(userId)) return { ok: true, role: "admin_fallback" };

  const roleResp = await fetch(
    `${url}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json; charset=utf-8",
      },
    }
  );
  if (!roleResp.ok) return { ok: false, reason: `profiles_query_failed_${roleResp.status}` };

  const rows = (await roleResp.json()) as Array<{ role?: string }>;
  const role = (rows[0]?.role || "").toLowerCase();
  if (role !== "admin") return { ok: false, reason: "role_not_admin", role };
  return { ok: true, role };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const admin = await isAdmin(token);
    if (!admin.ok) {
      return res.status(403).json({ error: "Acesso negado.", reason: admin.reason, role: admin.role || null });
    }

    const rows = await getSitemapRows(true);
    const sitemapChunks = getBusinessSitemapChunksCount(rows);

    return res.status(200).json({
      ok: true,
      businessUrls: rows.length,
      chunkSize: BUSINESS_SITEMAP_CHUNK_SIZE,
      sitemapChunks,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao atualizar sitemap.",
      code: "SITEMAP_REFRESH_FAILED",
    });
  }
}
