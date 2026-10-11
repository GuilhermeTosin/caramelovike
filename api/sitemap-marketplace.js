const EMPTY_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;

function baseUrl(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "https");
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "www.caramelinho.com");
  return `${proto}://${host}`;
}

function config() {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
  return url && key ? { url, key } : null;
}

function headers(key) {
  const value = { apikey: key, Accept: "application/json" };
  if (!key.startsWith("sb_")) value.Authorization = `Bearer ${key}`;
  return value;
}

function citySlug(city) {
  return String(city || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function escapeXml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export default async function handler(req, res) {
  const site = baseUrl(req);
  const empty = () => res.status(200).setHeader("Content-Type", "application/xml; charset=utf-8").send(EMPTY_SITEMAP);
  const supabase = config();
  if (!supabase) return empty();
  try {
    const query = new URLSearchParams({ select: "country_code,state_code,city,slug,updated_at,created_at", status: "in.(active,sold)", order: "created_at.desc", limit: "50000" });
    const response = await fetch(`${supabase.url}/rest/v1/marketplace_listings?${query}`, { headers: headers(supabase.key) });
    if (!response.ok) return empty();
    const rows = await response.json();
    const body = rows.map((row) => {
      const loc = `${site}/marketplace/${row.country_code}/${row.state_code}/${citySlug(row.city)}/${row.slug}`;
      const date = row.updated_at || row.created_at;
      return `<url><loc>${escapeXml(loc)}</loc>${date ? `<lastmod>${new Date(date).toISOString()}</lastmod>` : ""}</url>`;
    }).join("\n");
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`);
  } catch {
    return empty();
  }
}
