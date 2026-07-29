const baseUrl = normalizeBaseUrl(process.env.SEO_BASE_URL || process.argv[2] || "http://127.0.0.1:3000");
const isLocalTarget = new URL(baseUrl).hostname === "localhost" || new URL(baseUrl).hostname === "127.0.0.1";
const requireSitemap = process.env.SEO_REQUIRE_SITEMAP === "1" || !isLocalTarget;
let passed = 0;
let skipped = 0;

function normalizeBaseUrl(value) {
  const url = new URL(value);
  return url.origin.replace(/\/$/, "");
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function decodeHtml(value) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
}

function attribute(tag, name) {
  const match = tag.match(new RegExp("\\b" + name + "=\"([^\"]*)\"", "i"));
  return match ? decodeHtml(match[1]) : "";
}

function findMeta(html, attributeName, attributeValue) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if (attribute(tag, attributeName).toLowerCase() === attributeValue.toLowerCase()) {
      return attribute(tag, "content");
    }
  }
  return "";
}

function findCanonical(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (attribute(tag, "rel").toLowerCase() === "canonical") return attribute(tag, "href");
  }
  return "";
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getH1(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? stripTags(match[1]) : "";
}

function extractLinks(html) {
  const links = new Set();
  for (const match of html.matchAll(/<a\b[^>]*\bhref=\"([^\"]+)\"[^>]*>/gi)) {
    const href = decodeHtml(match[1]);
    if (href.startsWith("/")) links.add(href);
  }
  return [...links];
}

function pathFromUrl(url) {
  const parsed = new URL(url, baseUrl);
  return parsed.pathname + parsed.search;
}

function findLink(links, predicate, label) {
  const link = links.find(predicate);
  assert(link, "Could not discover " + label + " from SSR links.");
  return link;
}

async function request(path, expectedStatus = 200) {
  let response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      headers: { Accept: "text/html,application/xhtml+xml" },
      redirect: "manual",
    });
  } catch (error) {
    fail("Could not request " + baseUrl + path + ". Start the site or set SEO_BASE_URL. " + (error instanceof Error ? error.message : ""));
  }

  const body = await response.text();
  assert(response.status === expectedStatus, path + " returned HTTP " + response.status + ", expected " + expectedStatus + ".");
  return body;
}

async function assertRedirect(path, expectedPath) {
  const response = await fetch(new URL(path, baseUrl), { redirect: "manual" });
  const location = response.headers.get("location");
  assert(response.status === 301, path + " returned HTTP " + response.status + ", expected 301.");
  assert(location, path + " is missing a redirect location.");
  assert(new URL(location, baseUrl).pathname === expectedPath, path + " redirects to " + location + ", expected " + expectedPath + ".");
  passed += 1;
  process.stdout.write("PASS " + path + " - permanent redirect to " + expectedPath + "\n");
}
function assertIndexablePage(path, html) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
  const description = findMeta(html, "name", "description");
  const robots = findMeta(html, "name", "robots");
  const canonical = findCanonical(html);
  const h1 = getH1(html);

  assert(title.length > 0, path + " is missing a title.");
  assert(description.length > 0, path + " is missing a meta description.");
  assert(robots.includes("index,follow") && !robots.includes("noindex"), path + " has incorrect indexable robots metadata: " + robots);
  assert(canonical.startsWith("https://"), path + " must have an absolute canonical URL.");
  assert(new URL(canonical).pathname === new URL(path, baseUrl).pathname, path + " canonical points to a different pathname: " + canonical);
  assert(h1.length > 0, path + " is missing an H1 in the initial HTML.");
  assert(html.includes('id="root"'), path + " is missing SSR root content.");
  assert(/<script[^>]+type="application\/ld\+json"/i.test(html), path + " is missing JSON-LD.");
  passed += 1;
  process.stdout.write("PASS " + path + " - " + h1 + "\n");
}

function assertDirectoryContent(path, html) {
  assert(!html.includes("Diretório público organizado por país, estado e cidade"), path + " still renders the repeated generic directory introduction.");
  assert(html.includes("Panorama do diretório"), path + " is missing the data-backed directory summary.");
  assert(html.includes("Tipos de neg\u00f3cio"), path + " is missing directory activity content.");
}
function assertSearchPage(path, html) {
  const robots = findMeta(html, "name", "robots");
  const canonical = findCanonical(html);
  assert(robots.includes("noindex,follow"), path + " must be noindex,follow, received: " + robots);
  assert(canonical === "https://www.caramelinho.com/buscar", path + " must canonicalize to /buscar, received: " + canonical);
  passed += 1;
  process.stdout.write("PASS " + path + " - internal search is noindex.\n");
}

async function requestSitemap(path) {
  const response = await fetch(new URL(path, baseUrl), { redirect: "manual" });
  if (!response.ok) {
    if (requireSitemap) fail(path + " returned HTTP " + response.status + ".");
    skipped += 1;
    process.stdout.write("SKIP " + path + " - sitemap endpoint is unavailable on this host.\n");
    return null;
  }
  const xml = await response.text();
  assert(xml.includes("<urlset") || xml.includes("<sitemapindex"), path + " did not return sitemap XML.");
  return xml;
}

function extractSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeHtml(match[1]));
}

async function run() {
  const home = await request("/");
  assertIndexablePage("/", home);

  for (const staticPath of ["/sobre", "/contato", "/privacidade", "/termos", "/negocio-verificado"]) {
    const staticPage = await request(staticPath);
    assertIndexablePage(staticPath, staticPage);
  }

  const directoryRoot = await request("/negocios");
  assertIndexablePage("/negocios", directoryRoot);
  const countryPath = findLink(extractLinks(directoryRoot), (href) => /^\/negocios\/[a-z]{2}$/.test(href), "a country directory page");

  const country = await request(countryPath);
  assertIndexablePage(countryPath, country);
  const statePath = findLink(extractLinks(country), (href) => new RegExp("^" + countryPath + "/[^/]+$").test(href), "a state directory page");

  const state = await request(statePath);
  assertIndexablePage(statePath, state);
  const cityPath = findLink(extractLinks(state), (href) => new RegExp("^" + statePath + "/[^/]+$").test(href), "a city directory page");

  const city = await request(cityPath);
  assertIndexablePage(cityPath, city);
  assertDirectoryContent(cityPath, city);
  const cityLinks = extractLinks(city);
  const businessPath = findLink(cityLinks, (href) => /^\/[a-z]{2}\/[^/]+\/[^/]+\/[^/]+$/.test(href), "a business page");

  const business = await request(businessPath);
  assertIndexablePage(businessPath, business);

  await assertRedirect("/ca/qc/montreal/tapi-go-montreal", "/ca/qc/montreal/tapi-go");
  await assertRedirect("/ca/qc/mirabel/chez-luma-hotel-para-caes", "/ca/qc/mirabel/chez-luma");

  const notFound = await request(cityPath + "/pagina/999999", 404);
  const notFoundRobots = findMeta(notFound, "name", "robots");
  assert(notFoundRobots.includes("noindex"), "Invalid directory pages must be noindex.");
  passed += 1;
  process.stdout.write("PASS " + cityPath + "/pagina/999999 - real 404.\n");

  const emptyDirectory = await request("/negocios/zz", 404);
  assert(findMeta(emptyDirectory, "name", "robots").includes("noindex"), "Empty or invalid directory pages must be noindex.");
  passed += 1;
  process.stdout.write("PASS /negocios/zz - empty directory is a real 404.\n");

  const search = await request("/buscar?categoria=food");
  assertSearchPage("/buscar?categoria=food", search);

  const sitemapIndex = await requestSitemap("/sitemap.xml");
  if (sitemapIndex) {
    const sitemapIndexUrls = extractSitemapUrls(sitemapIndex);
    assert(sitemapIndexUrls.some((url) => new URL(url).pathname === "/sitemaps/static.xml"), "The sitemap index must include the static sitemap.");
    assert(sitemapIndexUrls.some((url) => new URL(url).pathname === "/sitemaps/businesses.xml"), "The sitemap index must include the business sitemap.");
    passed += 1;
    process.stdout.write("PASS /sitemap.xml - references both sitemap sections.\n");
  }

  const staticSitemap = await requestSitemap("/sitemaps/static.xml");
  if (staticSitemap) {
    const staticUrls = extractSitemapUrls(staticSitemap);
    assert(!staticUrls.some((url) => new URL(url).pathname === "/buscar"), "The static sitemap must not include /buscar.");
    assert(staticUrls.some((url) => new URL(url).pathname === "/negocios"), "The static sitemap must include /negocios.");
    passed += 1;
    process.stdout.write("PASS /sitemaps/static.xml - only indexable static routes.\n");
  }

  const businessSitemap = await requestSitemap("/sitemaps/businesses.xml");
  if (businessSitemap) {
    const sitemapUrls = extractSitemapUrls(businessSitemap);
    const retiredBusinessPaths = new Set([
      "/ca/qc/montreal/tapi-go-montreal",
      "/ca/qc/mirabel/chez-luma-hotel-para-caes",
    ]);
    assert(!sitemapUrls.some((url) => retiredBusinessPaths.has(new URL(url).pathname)), "The business sitemap must not include retired business URLs.");
    const expectedCityPath = new URL(cityPath, baseUrl).pathname;
    assert(sitemapUrls.some((url) => new URL(url).pathname === expectedCityPath), "The business sitemap must include the discovered city directory page.");
    const categoryUrl = sitemapUrls.find((url) => {
      const parts = new URL(url).pathname.split("/").filter(Boolean);
      return parts.length === 5 && parts[0] === "negocios";
    });
    if (categoryUrl) {
      const categoryPath = pathFromUrl(categoryUrl);
      const category = await request(categoryPath);
      assertIndexablePage(categoryPath, category);
    } else {
      skipped += 1;
      process.stdout.write("SKIP category route - no city has enough businesses for an indexable category page.\n");
    }
    passed += 1;
    process.stdout.write("PASS /sitemaps/businesses.xml - contains canonical directory hubs.\n");
  }

  process.stdout.write("\nSEO SSR audit passed: " + passed + " checks" + (skipped ? ", " + skipped + " skipped" : "") + ".\n");
}

run().catch((error) => {
  process.stderr.write("SEO SSR audit failed: " + (error instanceof Error ? error.message : String(error)) + "\n");
  process.exitCode = 1;
});
