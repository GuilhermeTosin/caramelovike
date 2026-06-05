import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  BUSINESS_SITEMAP_CHUNK_SIZE,
  buildBusinessSitemapXml,
  getBaseUrl,
  getSitemapBusinessCount,
  getSitemapBusinessPage,
} from "./_sitemap";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const baseUrl = getBaseUrl(req);
    const page = Math.max(1, Number(req.query.page || "1"));
    const businessCount = await getSitemapBusinessCount();
    const chunks = Math.max(1, Math.ceil(businessCount / BUSINESS_SITEMAP_CHUNK_SIZE));
    if (page > chunks) return res.status(404).send("Sitemap chunk nao encontrado.");

    const rows = await getSitemapBusinessPage(page);
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
