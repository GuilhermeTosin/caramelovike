import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const OUTPUTS = [
  "public/sitemap.xml",
  "public/sitemaps/static.xml",
  "public/sitemaps/businesses.xml",
];

const PAGE_SIZE = 1000;
const FETCH_TIMEOUT_MS = 7000;
const MAX_PAGES = 200;

function getEnv(name) {
  return String(process.env[name] || "").trim();
}

function getBaseUrl() {
  return (
    getEnv("SITE_URL") ||
    getEnv("PUBLIC_SITE_URL") ||
    "https://www.caramelinho.com"
  );
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

function getSitemapSourceConfig() {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    getEnv("SUPABASE_SECRET_KEY") ||
    getEnv("SUPABASE_ANON_KEY") ||
    getEnv("VITE_SUPABASE_ANON_KEY");
  return { url, key };
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function buildStaticSitemapXml(baseUrl) {
  const now = new Date().toISOString();
  const urls = [
    "/",
    "/negocios",
    "/buscar",
    "/sobre",
    "/contato",
    "/privacidade",
    "/termos",
    "/negocio-verificado",
  ];
  const body = urls
    .map((path) => `<url><loc>${baseUrl}${path}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq></url>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${body}\n</urlset>\n`;
}

function buildBusinessUrl(baseUrl, row) {
  const slug = normalizePart(row.slug);
  const country = normalizePart(row.country_code);
  const state = normalizePart(row.state_code);
  const city = normalizePart(row.city);

  if (!slug) return null;
  if (country && state && city) return `${baseUrl}/${country}/${state}/${city}/${slug}`;
  if (country) return `${baseUrl}/${country}/${slug}`;
  return `${baseUrl}/go/${slug}`;
}

async function fetchBusinessRows() {
  const { url, key } = getSitemapSourceConfig();
  if (!url || !key) return [];

  const rows = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams();
    params.set("select", "slug,country_code,state_code,city,updated_at");
    params.set("or", "(moderation_status.eq.approved,moderation_status.is.null)");
    params.set("slug", "not.is.null");
    params.set("order", "created_at.desc");
    params.set("offset", String(page * PAGE_SIZE));
    params.set("limit", String(PAGE_SIZE));

    const response = await fetchWithTimeout(`${url}/rest/v1/businesses?${params.toString()}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json; charset=utf-8",
      },
    });

    if (!response.ok) break;

    const pageRows = await response.json();
    const validRows = Array.isArray(pageRows) ? pageRows.filter((row) => row && row.slug) : [];
    rows.push(...validRows);
    if (validRows.length < PAGE_SIZE) break;
  }

  return rows;
}

function buildBusinessSitemapXml(baseUrl, rows) {
  const body = rows
    .map((row) => {
      const loc = buildBusinessUrl(baseUrl, row);
      if (!loc) return "";
      const lastmod = row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString();
      return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq></url>`;
    })
    .filter(Boolean)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${body}\n</urlset>\n`;
}

async function ensureDirForFile(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function main() {
  const baseUrl = getBaseUrl();
  const staticXml = buildStaticSitemapXml(baseUrl);
  const businesses = await fetchBusinessRows().catch(() => []);
  const businessXml = buildBusinessSitemapXml(baseUrl, businesses);
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${baseUrl}/sitemaps/static.xml</loc><lastmod>${new Date().toISOString()}</lastmod></sitemap>\n  <sitemap><loc>${baseUrl}/sitemaps/businesses.xml</loc><lastmod>${new Date().toISOString()}</lastmod></sitemap>\n</sitemapindex>\n`;

  const files = [
    { path: OUTPUTS[0], content: indexXml },
    { path: OUTPUTS[1], content: staticXml },
    { path: OUTPUTS[2], content: businessXml },
  ];

  for (const file of files) {
    await ensureDirForFile(file.path);
    await writeFile(file.path, file.content, "utf8");
  }
}

main().catch((error) => {
  console.error("[generate-sitemaps] failed:", error);
  process.exitCode = 1;
});
