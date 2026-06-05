import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildBusinessSitemapXml, getBaseUrl, getSitemapRows } from "./_sitemap";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const baseUrl = getBaseUrl(req);
    const rows = await getSitemapRows().catch(() => []);
    const xml = buildBusinessSitemapXml(baseUrl, rows);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao gerar sitemap de negocios.",
    });
  }
}
