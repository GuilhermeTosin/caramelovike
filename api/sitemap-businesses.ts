import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  buildEmptyBusinessSitemapXml,
  getBaseUrl,
  getBusinessSitemapSnapshotXml,
} from "./_sitemap";

async function fetchFallbackXml(baseUrl: string): Promise<string | null> {
  try {
    const response = await fetch(`${baseUrl}/sitemaps/businesses-fallback.xml`, {
      headers: {
        Accept: "application/xml, text/xml;q=0.9, */*;q=0.1",
      },
    });

    if (!response.ok) return null;
    const text = await response.text();
    const xml = text.trim();
    return xml || null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const baseUrl = getBaseUrl(req);
    const snapshotXml = await getBusinessSitemapSnapshotXml();
    const fallbackXml = await fetchFallbackXml(baseUrl);
    const xml = snapshotXml || fallbackXml || buildEmptyBusinessSitemapXml();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=0, must-revalidate");
    return res.status(200).send(xml);
  } catch (error) {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=0, must-revalidate");
    return res.status(200).send(buildEmptyBusinessSitemapXml());
  }
}
