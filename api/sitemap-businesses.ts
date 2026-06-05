import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  buildBusinessSitemapXml,
  getBaseUrl,
  getSitemapBusinessPage,
} from "./_sitemap";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const baseUrl = getBaseUrl(req);
    const page = Math.max(1, Number(req.query.page || "1"));
    const rows = await getSitemapBusinessPage(page).catch(() => []);
    if (rows.length === 0) return res.status(404).send("Sitemap chunk nao encontrado.");
    const xml = buildBusinessSitemapXml(baseUrl, rows, page);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao gerar sitemap de negocios.",
    });
  }
}
