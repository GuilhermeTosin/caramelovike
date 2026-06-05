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

const CACHE_TTL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 7000;
const PAGE_SIZE = 1000;

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

function buildBusinessesUrl(offset: number): { url: string; headers: Record<string, string> } {
  const { url, key } = getSitemapSourceConfig();
  const params = new URLSearchParams();
  params.set("select", "slug,country_code,state_code,city,updated_at");
  params.set("or", "(moderation_status.eq.approved,moderation_status.is.null)");
  params.set("slug", "not.is.null");
  params.set("order", "created_at.desc");
  params.set("offset", String(offset));
  params.set("limit", String(PAGE_SIZE));

  return {
    url: `${url}/rest/v1/businesses?${params.toString()}`,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json; charset=utf-8",
    },
  };
}

async function fetchAllBusinessRows(): Promise<SitemapBusinessRow[]> {
  const rows: SitemapBusinessRow[] = [];

  for (let page = 0; page < 200; page += 1) {
    const request = buildBusinessesUrl(page * PAGE_SIZE);
    const response = await fetchWithTimeout(request.url, { headers: request.headers });
    if (!response.ok) break;

    const pageRows = ((await response.json()) || []) as SitemapBusinessRow[];
    const validRows = pageRows.filter((row) => !!row.slug);
    rows.push(...validRows);

    if (validRows.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

export async function getSitemapRows(forceRefresh = false): Promise<SitemapBusinessRow[]> {
  if (!forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rows;
  }

  try {
    const rows = await fetchAllBusinessRows();
    cache = { fetchedAt: Date.now(), rows };
    return rows;
  } catch {
    return cache?.rows || [];
  }
}

export function buildSitemapIndexXml(baseUrl: string): string {
  const now = new Date().toISOString();
  const urls = [`${baseUrl}/sitemaps/static.xml`, `${baseUrl}/sitemaps/businesses.xml`];
  const body = urls.map((loc) => `<sitemap><loc>${loc}</loc><lastmod>${now}</lastmod></sitemap>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${body}
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

export function buildBusinessSitemapXml(baseUrl: string, rows: SitemapBusinessRow[]): string {
  const body = rows
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
