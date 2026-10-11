import type { VercelRequest, VercelResponse } from "@vercel/node";

function getBaseUrl(req: VercelRequest): string {
  const proto = String(req.headers["x-forwarded-proto"] || "https");
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "www.caramelinho.com");
  return `${proto}://${host}`;
}

export function buildSitemapIndexXml(baseUrl: string): string {
  const sitemapUrls = [`${baseUrl}/sitemaps/static.xml`, `${baseUrl}/sitemaps/businesses.xml`, `${baseUrl}/sitemaps/marketplace.xml`];
  const body = sitemapUrls.map((url) => `<sitemap><loc>${url}</loc></sitemap>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${body}
</sitemapindex>`;
}

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
