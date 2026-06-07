import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  assertIsAdmin,
  buildBusinessSitemapXml,
  clearSitemapCache,
  getBaseUrl,
  getSitemapRows,
  saveBusinessSitemapSnapshotXml,
} from "./_sitemap";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const authHeader = String(req.headers.authorization || "").trim();
    const accessToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!accessToken || !(await assertIsAdmin(accessToken))) {
      return res.status(403).json({
        error: "Acesso negado.",
        code: "SITEMAP_REFRESH_FORBIDDEN",
      });
    }

    clearSitemapCache();
    const rows = await getSitemapRows(true).catch(() => []);
    const baseUrl = getBaseUrl(req);
    const xml = buildBusinessSitemapXml(baseUrl, rows);
    const saved = await saveBusinessSitemapSnapshotXml(xml);

    return res.status(200).json({
      ok: true,
      saved,
      businessCount: rows.length,
      refreshedAt: new Date().toISOString(),
      note: saved
        ? "Sitemap de negócios atualizado com snapshot persistido."
        : "Sitemap de negócios gerado, mas não foi possível persistir o snapshot.",
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao atualizar sitemap.",
      code: "SITEMAP_REFRESH_FAILED",
    });
  }
}
