import {
  getAllBusinesses,
  buildBusinessUrl,
} from "@/services/businesses";
import { getPublishedCommunityEvents } from "@/services/events";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BusinessFrontend, CommunityEvent } from "@/types/database";

const STATIC_PUBLIC_URLS = [
  "/",
  "/buscar",
  "/sobre",
  "/contato",
  "/privacidade",
  "/termos",
  "/negocio-verificado",
];

function buildBusinessUrls(businesses: BusinessFrontend[]) {
  return businesses
    .map((business) => buildBusinessUrl(business))
    .filter((url): url is string => !!url);
}

function buildStaticSitemapXml(baseUrl: string) {
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

function buildBusinessSitemapXml(baseUrl: string, businessUrls: string[]) {
  const now = new Date().toISOString();
  const body = businessUrls
    .map((loc) => `<url><loc>${baseUrl}${loc}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq></url>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${body}\n</urlset>\n`;
}

async function writeGeneratedSitemapFiles(baseUrl: string) {
  const publicDir = join(process.cwd(), "public");
  const distClientDir = join(process.cwd(), "dist", "client");
  const sitemapDir = join(publicDir, "sitemaps");
  const distSitemapDir = join(distClientDir, "sitemaps");
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${baseUrl}/sitemaps/static.xml</loc><lastmod>${new Date().toISOString()}</lastmod></sitemap>\n  <sitemap><loc>${baseUrl}/sitemaps/businesses.xml</loc><lastmod>${new Date().toISOString()}</lastmod></sitemap>\n</sitemapindex>\n`;

  await mkdir(sitemapDir, { recursive: true });
  await mkdir(distSitemapDir, { recursive: true });
  await writeFile(join(publicDir, "sitemap.xml"), indexXml, "utf8");
  await writeFile(join(distClientDir, "sitemap.xml"), indexXml, "utf8");
  await writeFile(join(sitemapDir, "static.xml"), buildStaticSitemapXml(baseUrl), "utf8");
  await writeFile(join(distSitemapDir, "static.xml"), buildStaticSitemapXml(baseUrl), "utf8");
}

export async function onBeforePrerenderStart() {
  const [businesses, events] = await Promise.all([
    getAllBusinesses().catch(() => [] as BusinessFrontend[]),
    getPublishedCommunityEvents().catch(() => [] as CommunityEvent[]),
  ]);

  const eventUrls = events.map((event) => `/eventos/${event.id}`);
  const businessUrls = buildBusinessUrls(businesses);

  const baseUrl = "https://www.caramelinho.com";
  await writeGeneratedSitemapFiles(baseUrl).catch(() => {});
  const businessFallbackXml = buildBusinessSitemapXml(baseUrl, businessUrls);
  const publicDir = join(process.cwd(), "public");
  const distClientDir = join(process.cwd(), "dist", "client");
  const sitemapDir = join(publicDir, "sitemaps");
  const distSitemapDir = join(distClientDir, "sitemaps");
  await mkdir(sitemapDir, { recursive: true });
  await mkdir(distSitemapDir, { recursive: true });
  await writeFile(join(sitemapDir, "businesses-fallback.xml"), businessFallbackXml, "utf8");
  await writeFile(join(distSitemapDir, "businesses-fallback.xml"), businessFallbackXml, "utf8");

  return [
    ...STATIC_PUBLIC_URLS,
    ...eventUrls,
  ];
}
