import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    return res.status(200).json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      note: "Sitemaps are generated at build time.",
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao atualizar sitemap.",
      code: "SITEMAP_REFRESH_FAILED",
    });
  }
}
