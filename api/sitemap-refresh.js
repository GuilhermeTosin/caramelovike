import { getBusinessSitemapData } from "./sitemap-businesses.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const data = await getBusinessSitemapData(req);
  res.setHeader("Cache-Control", "no-store");

  if (data.source !== "supabase") {
    return res.status(503).json({
      ok: false,
      error: "O sitemap nao foi atualizado a partir do Supabase.",
      reason: data.reason,
    });
  }

  return res.status(200).json({
    ok: true,
    refreshedAt: new Date().toISOString(),
    source: data.source,
    urlCount: data.urlCount,
    note: "O sitemap foi validado consultando a base atual.",
  });
}
