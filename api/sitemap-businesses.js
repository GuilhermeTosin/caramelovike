const EMPTY_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

const FETCH_TIMEOUT_MS = 8000;
const PAGE_SIZE = 1000;

function getBaseUrl(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "https");
  const host = String(
    req.headers["x-forwarded-host"] ||
      req.headers.host ||
      "www.caramelinho.com"
  );
  return `${proto}://${host}`;
}

function getSupabaseConfig() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "";
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "";

  return url && key ? { url, key } : null;
}

function normalizePart(value) {
  return encodeURIComponent(
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildBusinessUrl(baseUrl, row) {
  const slug = normalizePart(row.slug);
  const country = normalizePart(row.country_code);
  const state = normalizePart(row.state_code);
  const city = normalizePart(row.city);

  if (!slug) return null;
  if (country && state && city) {
    return `${baseUrl}/${country}/${state}/${city}/${slug}`;
  }
  if (country) return `${baseUrl}/${country}/${slug}`;
  return `${baseUrl}/go/${slug}`;
}

function buildXml(baseUrl, rows) {
  const body = rows
    .map((row) => {
      const url = buildBusinessUrl(baseUrl, row);
      if (!url) return "";

      const parsedDate = row.updated_at ? new Date(row.updated_at) : null;
      const lastmod =
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toISOString()
          : new Date().toISOString();

      return `<url><loc>${escapeXml(url)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq></url>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

async function fetchPage(config, offset) {
  const params = new URLSearchParams({
    select: "slug,country_code,state_code,city,updated_at",
    or: "(moderation_status.eq.approved,moderation_status.is.null)",
    slug: "not.is.null",
    order: "created_at.desc",
    offset: String(offset),
    limit: String(PAGE_SIZE),
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${config.url}/rest/v1/businesses?${params.toString()}`,
      {
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase returned ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBusinesses(config) {
  const rows = [];

  for (let offset = 0; offset < 50000; offset += PAGE_SIZE) {
    const page = await fetchPage(config, offset);
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function readFallback(baseUrl) {
  try {
    const response = await fetch(
      `${baseUrl}/sitemaps/businesses-fallback.xml`
    );
    if (!response.ok) return EMPTY_SITEMAP;
    return await response.text();
  } catch {
    return EMPTY_SITEMAP;
  }
}

export async function getBusinessSitemapData(req) {
  const baseUrl = getBaseUrl(req);
  const config = getSupabaseConfig();

  if (!config) {
    return {
      xml: await readFallback(baseUrl),
      source: "fallback",
      urlCount: null,
      reason: "supabase-config-missing",
    };
  }

  try {
    const rows = await fetchBusinesses(config);
    const urls = rows.filter((row) => buildBusinessUrl(baseUrl, row));
    return {
      xml: buildXml(baseUrl, rows),
      source: "supabase",
      urlCount: urls.length,
      reason: null,
    };
  } catch (error) {
    console.error("[sitemap-businesses]", error);
    return {
      xml: await readFallback(baseUrl),
      source: "fallback",
      urlCount: null,
      reason: "supabase-fetch-failed",
    };
  }
}

export default async function handler(req, res) {
  const data = await getBusinessSitemapData(req);

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=0, must-revalidate"
  );
  res.setHeader("X-Sitemap-Source", data.source);
  if (data.urlCount !== null) {
    res.setHeader("X-Sitemap-Url-Count", String(data.urlCount));
  }

  return res.status(200).send(data.xml);
}
