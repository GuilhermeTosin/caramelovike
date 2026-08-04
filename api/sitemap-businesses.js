import { getBrazilianPortugueseCityName, slugifyCity } from "../shared/locationDisplay.js";
import { DIRECTORY_CATEGORIES, DIRECTORY_CATEGORY_MINIMUM_BUSINESSES } from "../shared/directoryCategories.js";

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

function getApiKeyHeaders(key) {
  const headers = { apikey: key };
  if (!key.startsWith("sb_")) headers.Authorization = "Bearer " + key;
  return headers;
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

function getCanonicalCitySlug(row) {
  const city = getBrazilianPortugueseCityName(row.city, row.country_code) || row.city || row.city_slug;
  return slugifyCity(city);
}

export function buildBusinessUrl(baseUrl, row) {
  const slug = normalizePart(row.slug);
  const country = normalizePart(row.country_code);
  const state = normalizePart(row.state_code);
  const city = normalizePart(getCanonicalCitySlug(row));

  if (!slug) return null;
  if (country && state && city) {
    return `${baseUrl}/${country}/${state}/${city}/${slug}`;
  }
  if (country) return `${baseUrl}/${country}/${slug}`;
  return `${baseUrl}/go/${slug}`;
}

function buildEnglishBusinessUrl(baseUrl, row) {
  const slug = normalizePart(row.slug);
  const country = normalizePart(row.country_code);
  const state = normalizePart(row.state_code);
  const city = normalizePart(getCanonicalCitySlug(row));
  const description = String(row.description_en || "").replace(/<[^>]*>/g, "").trim();
  if (!description || !slug || !country || !state || !city) return null;
  return `${baseUrl}/en/${country}/${state}/${city}/${slug}`;
}

function buildDirectoryCategoryUrls(baseUrl, rows) {
  const counts = new Map();
  for (const row of rows) {
    const country = normalizePart(row.country_code);
    const state = normalizePart(row.state_code);
    const city = normalizePart(getCanonicalCitySlug(row));
    const category = DIRECTORY_CATEGORIES.find((item) => item.categoryId === row.primary_activity);
    if (!country || !state || !city || !category) continue;
    const key = country + "/" + state + "/" + city + "/" + category.slug;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= DIRECTORY_CATEGORY_MINIMUM_BUSINESSES)
    .map(([path]) => baseUrl + "/negocios/" + path);
}

function buildDirectoryUrls(baseUrl, rows) {
  const urls = new Set();
  for (const row of rows) {
    const country = normalizePart(row.country_code);
    const state = normalizePart(row.state_code);
    const city = normalizePart(getCanonicalCitySlug(row));
    if (!country) continue;

    urls.add(baseUrl + "/negocios/" + country);
    if (!state) continue;

    urls.add(baseUrl + "/negocios/" + country + "/" + state);
    if (city) urls.add(baseUrl + "/negocios/" + country + "/" + state + "/" + city);
  }
  return Array.from(urls).sort();
}

function buildXml(baseUrl, rows) {
  const businessBody = rows
    .flatMap((row) => {
      const parsedDate = row.created_at ? new Date(row.created_at) : null;
      const lastmod =
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toISOString()
          : new Date().toISOString();

      return [buildBusinessUrl(baseUrl, row), buildEnglishBusinessUrl(baseUrl, row)]
        .filter(Boolean)
        .map((url) => `<url><loc>${escapeXml(url)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq></url>`);
    })
    .join("\n");
  const directoryUrls = [
    ...buildDirectoryUrls(baseUrl, rows),
    ...buildDirectoryCategoryUrls(baseUrl, rows),
  ];
  const directoryBody = Array.from(new Set(directoryUrls))
    .sort()
    .map((loc) => "<url><loc>" + escapeXml(loc) + "</loc><changefreq>weekly</changefreq></url>")
    .join("\n");
  const body = [businessBody, directoryBody].filter(Boolean).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

async function fetchPage(config, offset) {
  const params = new URLSearchParams({
    select: "slug,country_code,state_code,city,city_slug,created_at,primary_activity,description_en",
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
          ...getApiKeyHeaders(config.key),
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
    const urls = rows.flatMap((row) => [buildBusinessUrl(baseUrl, row), buildEnglishBusinessUrl(baseUrl, row)].filter(Boolean));
    const directoryUrls = [
      ...buildDirectoryUrls(baseUrl, rows),
      ...buildDirectoryCategoryUrls(baseUrl, rows),
    ];
    return {
      xml: buildXml(baseUrl, rows),
      source: "supabase",
      urlCount: urls.length + new Set(directoryUrls).size,
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
    "no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate"
  );
  res.setHeader("CDN-Cache-Control", "no-store");
  if (data.urlCount !== null) {
    res.setHeader("X-Sitemap-Url-Count", String(data.urlCount));
  }

  return res.status(200).send(data.xml);
}
