import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const OUTPUTS = [
  "public/sitemap.xml",
  "public/sitemaps/static.xml",
];

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

async function ensureDirForFile(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function main() {
  const baseUrl = getBaseUrl();
  const staticXml = buildStaticSitemapXml(baseUrl);
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${baseUrl}/sitemaps/static.xml</loc><lastmod>${new Date().toISOString()}</lastmod></sitemap>\n  <sitemap><loc>${baseUrl}/sitemaps/businesses.xml</loc><lastmod>${new Date().toISOString()}</lastmod></sitemap>\n</sitemapindex>\n`;

  const files = [
    { path: OUTPUTS[0], content: indexXml },
    { path: OUTPUTS[1], content: staticXml },
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
