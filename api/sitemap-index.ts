import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildSitemapIndexXml, getBaseUrl } from "./_sitemap";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const baseUrl = getBaseUrl(req);
    const xml = buildSitemapIndexXml(baseUrl);

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate");
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao gerar sitemap index.",
    });
  }
}
