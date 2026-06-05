import type { VercelRequest } from "@vercel/node";

type SitemapBusinessRow = {
  slug: string | null;
  country_code: string | null;
  state_code: string | null;
  city: string | null;
  updated_at: string | null;
};

type CachedSitemapData = {
  fetchedAt: number;
  rows: SitemapBusinessRow[];
};

export const BUSINESS_SITEMAP_CHUNK_SIZE = 1000;
const SUPABASE_PAGE_SIZE = 1000;
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_SITEMAP_PAGES = 200;
const FETCH_TIMEOUT_MS = 7000;
let cache: CachedSitemapData | null = null;

export function clearSitemapCache(): void {
  cache = null;
}

function normalizePart(value: string): string {
  return encodeURIComponent(
    value
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

export function getBaseUrl(req: VercelRequest): string {
  const proto = String(req.headers["x-forwarded-proto"] || "https");
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "www.caramelinho.com");
  return `${proto}://${host}`;
}

function buildBusinessUrl(baseUrl: string, row: SitemapBusinessRow): string | null {
  const slug = normalizePart(String(row.slug || ""));
  const country = normalizePart(String(row.country_code || ""));
  const state = normalizePart(String(row.state_code || ""));
  const city = normalizePart(String(row.city || ""));

  if (!slug) return null;
  if (country && state && city) return `${baseUrl}/${country}/${state}/${city}/${slug}`;
  if (country) return `${baseUrl}/${country}/${slug}`;
  return `${baseUrl}/go/${slug}`;
}

function getSitemapSourceConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) {
    throw new Error("SUPABASE_URL e uma chave do Supabase sao obrigatorios.");
  }

  return { url, key };
}

function buildBusinessesUrl(options: { offset: number; limit: number; count?: boolean }): {
  url: string;
  headers: Record<string, string>;
} {
  const { url, key } = getSitemapSourceConfig();
  const params = new URLSearchParams();
  params.set("select", "slug,country_code,state_code,city,updated_at");
  params.set("or", "(moderation_status.eq.approved,moderation_status.is.null)");
  params.set("slug", "not.is.null");
  params.set("order", "created_at.desc");
  params.set("offset", String(options.offset));
  params.set("limit", String(options.limit));
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json; charset=utf-8",
  };
  if (options.count) headers.Prefer = "count=exact";
  return {
    url: `${url}/rest/v1/businesses?${params.toString()}`,
    headers,
  };
}

function parseContentRangeTotal(contentRange: string): number {
  const match = /\/(\d+|\*)\s*$/.exec(contentRange || "");
  if (!match || match[1] === "*") return 0;
  const total = Number(match[1]);
  return Number.isFinite(total) && total >= 0 ? total : 0;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBusinessesForSitemap(): Promise<SitemapBusinessRow[]> {
  const rows: SitemapBusinessRow[] = [];

  for (let page = 0; page < MAX_SITEMAP_PAGES; page += 1) {
    const offset = page * SUPABASE_PAGE_SIZE;
    const request = buildBusinessesUrl({ offset, limit: SUPABASE_PAGE_SIZE });
    const response = await fetchWithTimeout(request.url, { headers: request.headers });

    if (!response.ok) {
      return rows;
    }

    const pageRows = ((await response.json()) || []) as SitemapBusinessRow[];
    rows.push(...pageRows.filter((r) => !!r.slug));
    if (pageRows.length < SUPABASE_PAGE_SIZE) break;
  }

  return rows;
}

export async function getSitemapRows(forceRefresh = false): Promise<SitemapBusinessRow[]> {
  if (!forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rows;
  }
  const rows = await fetchBusinessesForSitemap();
  cache = { fetchedAt: Date.now(), rows };
  return rows;
}

export async function getSitemapBusinessCount(): Promise<number> {
  const request = buildBusinessesUrl({ offset: 0, limit: 1, count: true });
  try {
    const response = await fetchWithTimeout(request.url, { headers: request.headers });
    if (!response.ok) return 0;
    return parseContentRangeTotal(response.headers.get("content-range") || "");
  } catch {
    return 0;
  }
}

export async function getSitemapBusinessPage(page: number): Promise<SitemapBusinessRow[]> {
  const safePage = Math.max(1, Math.floor(page || 1));
  const offset = (safePage - 1) * SUPABASE_PAGE_SIZE;
  const request = buildBusinessesUrl({ offset, limit: SUPABASE_PAGE_SIZE });
  try {
    const response = await fetchWithTimeout(request.url, { headers: request.headers });
    if (!response.ok) return [];
    const rows = ((await response.json()) || []) as SitemapBusinessRow[];
    return rows.filter((r) => !!r.slug);
  } catch {
    return [];
  }
}

export function getBusinessSitemapChunksCount(rows: SitemapBusinessRow[]): number {
  return Math.max(1, Math.ceil(rows.length / BUSINESS_SITEMAP_CHUNK_SIZE));
}

export function buildSitemapIndexXml(baseUrl: string, businessCount: number): string {
  const now = new Date().toISOString();
  const chunks = Math.max(1, Math.ceil(Math.max(0, businessCount) / BUSINESS_SITEMAP_CHUNK_SIZE));
  const staticSitemapLoc = `${baseUrl}/sitemaps/static.xml`;
  const directoriesSitemapLoc = `${baseUrl}/sitemaps/directories.xml`;
  const businesses = Array.from({ length: chunks }, (_, i) => {
    const page = i + 1;
    return `<sitemap><loc>${baseUrl}/sitemaps/businesses-${page}.xml</loc><lastmod>${now}</lastmod></sitemap>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${staticSitemapLoc}</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${directoriesSitemapLoc}</loc><lastmod>${now}</lastmod></sitemap>
  ${businesses}
</sitemapindex>`;
}

export function buildStaticSitemapXml(baseUrl: string): string {
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
  const now = new Date().toISOString();
  const body = urls
    .map((path) => `<url><loc>${baseUrl}${path}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq></url>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${body}
</urlset>`;
}

export function buildBusinessSitemapXml(baseUrl: string, rows: SitemapBusinessRow[], page: number): string {
  const start = (page - 1) * BUSINESS_SITEMAP_CHUNK_SIZE;
  const pageRows = rows.slice(start, start + BUSINESS_SITEMAP_CHUNK_SIZE);
  const body = pageRows
    .map((row) => {
      const loc = buildBusinessUrl(baseUrl, row);
      if (!loc) return "";
      const lastmod = row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString();
      return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq></url>`;
    })
    .filter(Boolean)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${body}
</urlset>`;
}

export function buildDirectorySitemapXml(baseUrl: string, rows: SitemapBusinessRow[]): string {
  const now = new Date().toISOString();
  const urls = new Set<string>([`${baseUrl}/negocios`]);
  const cityCounts = new Map<string, number>();

  rows.forEach((row) => {
    const country = normalizePart(String(row.country_code || ""));
    const state = normalizePart(String(row.state_code || ""));
    const city = normalizePart(String(row.city || ""));
    if (!country) return;

    urls.add(`${baseUrl}/negocios/${country}`);
    if (!state) return;

    urls.add(`${baseUrl}/negocios/${country}/${state}`);
    if (!city) return;

    const cityUrl = `${baseUrl}/negocios/${country}/${state}/${city}`;
    urls.add(cityUrl);
    cityCounts.set(cityUrl, (cityCounts.get(cityUrl) || 0) + 1);
  });

  cityCounts.forEach((count, cityUrl) => {
    const pages = Math.ceil(count / 100);
    for (let page = 2; page <= pages; page += 1) {
      urls.add(`${cityUrl}/pagina/${page}`);
    }
  });

  const body = Array.from(urls)
    .map((loc) => `<url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq></url>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${body}
</urlset>`;
}

export async function assertIsAdmin(accessToken: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !serviceRoleKey || !accessToken) return false;

  try {
    const userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey || serviceRoleKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!userResponse.ok) return false;
    const userData = (await userResponse.json()) as { id?: string };
    const userId = userData?.id;
    if (!userId) return false;

    const roleResponse = await fetch(`${url}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json; charset=utf-8",
      },
    });
    if (!roleResponse.ok) return false;
    const rows = (await roleResponse.json()) as Array<{ role?: string }>;
    return (rows[0]?.role || "").toLowerCase() === "admin";
  } catch {
    return false;
  }
}
