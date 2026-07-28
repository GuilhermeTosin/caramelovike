import React from "react";
import { renderToString } from "react-dom/server";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { BusinessFrontend } from "@/types/database";
import type { RendererPageContext } from "@/renderer/pageContext";
import { getSiteContent } from "@/data/siteContent";
import { getOptimizedImageSrcSet, getOptimizedImageUrl } from "@/lib/images";
import { buildBusinessSeoDescription, buildBusinessSeoTitle } from "@/lib/seo/businessMeta";
import { getDirectoryPageMeta } from "@/lib/seo/directoryMeta";
import { getDirectoryCategoryBySlug } from "@/lib/directoryCategories";
import { getCanonicalCitySlug, getCityDisplayName } from "@/lib/locationDisplay";
import { getCountryName, getStateDisplayName, slugify } from "@/services/businesses";
import { getInternalSearchCanonicalPath, getInternalSearchRobots } from "@/lib/seo/searchIndexing";

type PageContext = RendererPageContext & {
  Page: React.ComponentType<{ pageContext: RendererPageContext }>;
};

function getPageUrlParts(urlOriginal?: string) {
  const url = new URL(urlOriginal || "/", "https://www.caramelinho.com");
  return {
    pathname: url.pathname,
    search: url.search,
  };
}

function getCanonicalUrl(urlOriginal: string | undefined, isBusinessPage: boolean) {
  const { pathname, search } = getPageUrlParts(urlOriginal);
  const canonicalPath = isBusinessPage ? pathname : getInternalSearchCanonicalPath(pathname);
  const isInternalSearch = !!getInternalSearchRobots(pathname);
  return "https://www.caramelinho.com" + canonicalPath + (isBusinessPage || isInternalSearch ? "" : search);
}

function getRobotsContent(urlOriginal?: string) {
  const pathname = new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname;

  const privatePaths = new Set(["/cadastro", "/entrar", "/redefinir-senha", "/perfil", "/negocio/wizard"]);
  if (privatePaths.has(pathname)) return "noindex,nofollow,noarchive";
  const searchRobots = getInternalSearchRobots(pathname);
  if (searchRobots) return searchRobots;
  return "index,follow,max-image-preview:large";
}

function getRobotsContentForPage(urlOriginal?: string, is404?: boolean) {
  if (is404) return "noindex,nofollow,noarchive";
  return getRobotsContent(urlOriginal);
}

function getErrorPageMeta() {
  const content = getSiteContent();
  return {
    title: content.seo.notFoundTitle,
    description: content.seo.notFoundDescription,
  };
}

function buildPublicRuntimeEnvScript() {
  const env = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
    // Only the public Supabase key may cross the SSR-to-browser boundary.
    VITE_SUPABASE_ANON_KEY: getPublicSupabaseAnonKey(),
    VITE_GEOIP_ENDPOINT: process.env.VITE_GEOIP_ENDPOINT || "",
    VITE_GOOGLE_MAPS_API_KEY: process.env.VITE_GOOGLE_MAPS_API_KEY || "",
  };

  const payload = JSON.stringify(env).replace(/</g, "\\u003c");
  return `<script>window.__CARAMELO_PUBLIC_ENV__=${payload};</script>`;
}

function buildSupabaseResourceHints() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";

  if (!supabaseUrl) {
    return "";
  }

  try {
    const origin = new URL(supabaseUrl).origin;
    return [
      `<link rel="preconnect" href="${origin}" crossorigin />`,
      `<link rel="dns-prefetch" href="${origin}" />`,
    ].join("\n");
  } catch {
    return "";
  }
}
function buildBusinessTitle(business: BusinessFrontend) {
  return buildBusinessSeoTitle(business);
}

function buildBusinessDescription(business: BusinessFrontend) {
  return buildBusinessSeoDescription(business);
}

function buildBusinessHeroImageAssets(imageUrl: string) {
  const optimizedImageUrl = getOptimizedImageUrl(imageUrl, { width: 960, quality: 72, format: "webp" });
  const srcSet = getOptimizedImageSrcSet(imageUrl, [480, 640, 800, 960], 72);

  let preloadHtml = `<link rel="preload" as="image" href="${optimizedImageUrl}" fetchpriority="high" />`;
  try {
    const origin = new URL(optimizedImageUrl).origin;
    if (origin && origin !== "https://www.caramelinho.com") {
      preloadHtml = [
        `<link rel="preconnect" href="${origin}" />`,
        `<link rel="dns-prefetch" href="${origin}" />`,
        preloadHtml,
      ].join("\n");
    }
  } catch {
    // Keep the preload tag even if URL parsing fails.
  }

  if (srcSet) {
    preloadHtml = preloadHtml.replace(
      'fetchpriority="high" />',
      `imagesrcset="${srcSet}" imagesizes="100vw" fetchpriority="high" />`
    );
  }

  return {
    optimizedImageUrl,
    preloadHtml,
  };
}

function titleCasePathSegment(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildFallbackBusinessMeta(urlOriginal: string | undefined) {
  const pathname = new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname;
  const parts = pathname.split("/").filter(Boolean);
  const cityName = titleCasePathSegment(parts[2] || "");

  if (parts.length === 4 && cityName) {
    return {
      title: "Neg\u00f3cio brasileiro em " + cityName,
      description: "Encontre informa\u00e7\u00f5es de contato, avalia\u00e7\u00f5es e detalhes sobre neg\u00f3cios brasileiros em " + cityName + ".",
    };
  }

  return {
    title: "Neg\u00f3cio brasileiro",
    description: "Encontre informa\u00e7\u00f5es de contato, avalia\u00e7\u00f5es e detalhes sobre neg\u00f3cios brasileiros no exterior.",
  };
}

function getPublicPageMeta(urlOriginal?: string, businesses: BusinessFrontend[] = []) {
  const pathname = new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname;
  const staticPageMeta = {
    "/sobre": {
      title: "Sobre N\u00f3s | Caramelinho.com",
      description: "Conhe\u00e7a o Caramelinho, a plataforma que conecta brasileiros no exterior a neg\u00f3cios e servi\u00e7os da comunidade.",
    },
    "/contato": {
      title: "Contato | Caramelinho.com",
      description: "Fale com o Caramelinho para tirar d\u00favidas, obter suporte ou conversar sobre parcerias.",
    },
    "/privacidade": {
      title: "Pol\u00edtica de Privacidade | Caramelinho.com",
      description: "Entenda como o Caramelinho coleta, utiliza e protege seus dados pessoais.",
    },
    "/termos": {
      title: "Termos e Condi\u00e7\u00f5es | Caramelinho.com",
      description: "Leia os termos e condi\u00e7\u00f5es de uso da plataforma Caramelinho.",
    },
  } as const;

  if (pathname in staticPageMeta) return staticPageMeta[pathname as keyof typeof staticPageMeta];

  if (pathname === "/negocios" || pathname.startsWith("/negocios/")) {
    return getDirectoryPageMeta(urlOriginal, businesses) || {
      title: "Neg\u00f3cios brasileiros por pa\u00eds | Caramelinho.com",
      description: "Explore o diret\u00f3rio de neg\u00f3cios brasileiros no exterior por pa\u00eds, estado e cidade.",
    };
  }

  if (pathname === "/buscar") {
    return {
      title: "Buscar neg\u00f3cios brasileiros | Caramelinho.com",
      description: "Busque neg\u00f3cios, servi\u00e7os, produtos e eventos brasileiros perto de voc\u00ea no exterior.",
    };
  }

  const content = getSiteContent();
  return { title: content.seo.homeTitle, description: content.seo.homeDescription };
}

function jsonLdScript(data: unknown) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Caramelinho.com",
    url: "https://www.caramelinho.com/",
    inLanguage: "pt-BR",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.caramelinho.com/buscar?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };
}

function buildBusinessJsonLd(business: BusinessFrontend, canonicalUrl: string, pageImage: string) {
  const address = business.address || {};
  const latitude = Number(address.lat);
  const longitude = Number(address.lng);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": canonicalUrl + "#business",
    name: business.name,
    description: business.description || buildBusinessDescription(business),
    url: canonicalUrl,
    image: pageImage,
    telephone: business.phone || undefined,
    email: business.email || undefined,
    sameAs: [business.website, business.instagram, business.facebook].filter(Boolean),
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street || undefined,
      addressLocality: address.city || undefined,
      addressRegion: address.state || address.stateCode || undefined,
      postalCode: address.postalCode || undefined,
      addressCountry: address.countryCode || address.country || undefined,
    },
    geo: Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude !== 0 || longitude !== 0)
      ? { "@type": "GeoCoordinates", latitude, longitude }
      : undefined,
    aggregateRating: business.averageRating && business.reviews?.length
      ? { "@type": "AggregateRating", ratingValue: business.averageRating, reviewCount: business.reviews.length }
      : undefined,
    priceRange: "$$",
  };
}

function buildBusinessBreadcrumbJsonLd(business: BusinessFrontend, canonicalUrl: string) {
  const address = business.address || {};
  const items = [
    { name: "In\u00edcio", item: "https://www.caramelinho.com/" },
    { name: "Busca", item: "https://www.caramelinho.com/buscar" },
  ];

  if (address.city) {
    items.push({
      name: address.city,
      item: "https://www.caramelinho.com/buscar?cidade=" + encodeURIComponent(address.city),
    });
  }

  items.push({ name: business.name, item: canonicalUrl });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

function buildDirectoryBreadcrumbJsonLd(urlOriginal: string | undefined, businesses: BusinessFrontend[], canonicalUrl: string) {
  const pathname = new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname;
  const parts = pathname.split("/").filter(Boolean);
  const countryCode = (parts[1] || "").toLowerCase();
  const stateCode = (parts[2] || "").toLowerCase();
  const citySlug = slugify(parts[3] || "");
  const category = getDirectoryCategoryBySlug(parts[4]);
  const cityBusiness = businesses.find((business) => {
    const businessCity = getCanonicalCitySlug(business.address.city, business.address.countryCode) || slugify(business.address.citySlug || "");
    return businessCity === citySlug && (business.address.countryCode || "").toLowerCase() === countryCode && (business.address.stateCode || "").toLowerCase() === stateCode;
  });
  const cityName = cityBusiness ? getCityDisplayName(cityBusiness.address.city, countryCode) : citySlug.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  const items = [{ name: "Neg\u00f3cios", item: "https://www.caramelinho.com/negocios" }];
  if (countryCode) items.push({ name: getCountryName(countryCode) || countryCode.toUpperCase(), item: "https://www.caramelinho.com/negocios/" + countryCode });
  if (stateCode) items.push({ name: getStateDisplayName(countryCode, stateCode, cityBusiness?.address.state) || stateCode.toUpperCase(), item: "https://www.caramelinho.com/negocios/" + countryCode + "/" + stateCode });
  if (citySlug) items.push({ name: cityName || citySlug, item: "https://www.caramelinho.com/negocios/" + countryCode + "/" + stateCode + "/" + citySlug });
  if (category) items.push({ name: category.label, item: canonicalUrl });
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: item.item })) };
}

export function onRenderHtml(pageContext: PageContext) {
  const { Page } = pageContext;
  const pageHtml = renderToString(<Page pageContext={pageContext} />);
  const business = pageContext.initialBusiness || null;
  const isBusinessPage = !!pageContext.isBusinessPage;
  const isDirectoryPage = pageContext.urlOriginal ? new URL(pageContext.urlOriginal, "https://www.caramelinho.com").pathname === "/negocios" || new URL(pageContext.urlOriginal, "https://www.caramelinho.com").pathname.startsWith("/negocios/") : false;
  const canonicalUrl = getCanonicalUrl(pageContext.urlOriginal, isBusinessPage);
  const isErrorPage = !!pageContext.is404;
  const businessHasData = !!business;
  const staticMeta = isErrorPage
    ? getErrorPageMeta()
    : getPublicPageMeta(pageContext.urlOriginal, pageContext.initialBusinesses || []);
  const fallbackBusinessMeta = buildFallbackBusinessMeta(pageContext.urlOriginal);
  const businessHeroAssets =
    isBusinessPage && businessHasData
      ? buildBusinessHeroImageAssets(business.heroImage || business.logoUrl || "https://www.caramelinho.com/og-image.jpg")
      : null;
  const pageTitle = isErrorPage
    ? staticMeta.title
    : isBusinessPage
      ? (businessHasData ? buildBusinessTitle(business) : fallbackBusinessMeta.title)
      : staticMeta.title;
  const pageDescription = isErrorPage
    ? staticMeta.description
    : isBusinessPage
      ? (businessHasData ? buildBusinessDescription(business) : fallbackBusinessMeta.description)
      : staticMeta.description;
  const pageImage =
    isBusinessPage && businessHasData
      ? businessHeroAssets?.optimizedImageUrl || business.heroImage || business.logoUrl || "https://www.caramelinho.com/og-image.jpg"
      : "https://www.caramelinho.com/og-image.jpg";
  const robotsContent = getRobotsContentForPage(pageContext.urlOriginal, pageContext.is404);
  const jsonLd = isBusinessPage && businessHasData
    ? [
        buildWebsiteJsonLd(),
        buildBusinessJsonLd(business, canonicalUrl, pageImage),
        buildBusinessBreadcrumbJsonLd(business, canonicalUrl),
      ]
    : isDirectoryPage
      ? [buildWebsiteJsonLd(), buildDirectoryBreadcrumbJsonLd(pageContext.urlOriginal, pageContext.initialBusinesses || [], canonicalUrl)]
      : [buildWebsiteJsonLd()];
  const jsonLdHtml = jsonLd.map(jsonLdScript).join("\n");

  return escapeInject`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <link rel="icon" type="image/png" href="/favicon-96.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="${robotsContent}" />
    <meta name="googlebot" content="${robotsContent}" />
    <title>${pageTitle}</title>
    <meta name="description" content="${pageDescription}" />
    <meta property="og:site_name" content="Caramelinho.com" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${pageTitle}" />
    <meta property="og:description" content="${pageDescription}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:image" content="${pageImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${isBusinessPage && businessHasData ? business.name : "Logo do Caramelinho.com"}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${pageTitle}" />
    <meta name="twitter:description" content="${pageDescription}" />
    <meta name="twitter:image" content="${pageImage}" />
    ${dangerouslySkipEscape(buildSupabaseResourceHints())}
    ${dangerouslySkipEscape(buildPublicRuntimeEnvScript())}
    ${businessHeroAssets ? dangerouslySkipEscape(businessHeroAssets.preloadHtml) : ""}
    ${dangerouslySkipEscape(jsonLdHtml)}
  </head>
  <body>
    <div id="root">${dangerouslySkipEscape(pageHtml)}</div>
  </body>
</html>`;
}

function getPublicSupabaseAnonKey() {
  const candidates = [
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
  ];

  return candidates
    .map((candidate) => String(candidate || "").trim())
    .find((candidate) => isPublicSupabaseKey(candidate)) || "";
}

function isPublicSupabaseKey(value: string) {
  if (!value || value.startsWith("sb_secret_")) return false;
  if (value.startsWith("sb_publishable_")) return true;

  const [, encodedPayload] = value.split(".");
  if (!encodedPayload) return false;

  try {
    const normalizedPayload = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    const payload = JSON.parse(Buffer.from(paddedPayload, "base64").toString("utf8")) as { role?: string };
    return payload.role === "anon";
  } catch {
    return false;
  }
}
