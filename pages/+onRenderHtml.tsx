import React from "react";
import { renderToString } from "react-dom/server";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { BusinessFrontend } from "@/types/database";
import type { RendererPageContext } from "@/renderer/pageContext";
import { getSiteContent } from "@/data/siteContent";
import { getLocaleFromPathname, getLocalizedUrl } from "@/i18n/routing";
import type { Locale } from "@/i18n/types";
import { getOptimizedImageSrcSet, getOptimizedImageUrl } from "@/lib/images";
import { buildBusinessSeoDescription, buildBusinessSeoTitle } from "@/lib/seo/businessMeta";
import { getDirectoryPageMeta } from "@/lib/seo/directoryMeta";

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
  return getLocalizedUrl(
    "https://www.caramelinho.com",
    pathname,
    isBusinessPage ? "" : search,
    "",
    "pt-BR",
  );
}

function isIndexableSearchUrl(urlOriginal?: string) {
  const url = new URL(urlOriginal || "/", "https://www.caramelinho.com");
  if (url.pathname !== "/buscar") return true;
  if (!url.search) return true;
  return ["categoria", "cidade", "local", "q"].some((key) => (url.searchParams.get(key) || "").trim().length > 0);
}

function getRobotsContent(urlOriginal?: string) {
  const pathname = new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname;
  const privatePaths = new Set(["/cadastro", "/entrar", "/redefinir-senha", "/perfil", "/negocio/wizard"]);
  if (privatePaths.has(pathname)) return "noindex,nofollow,noarchive";
  if (!isIndexableSearchUrl(urlOriginal)) return "noindex,follow,max-image-preview:large";
  return "index,follow,max-image-preview:large";
}

function getRobotsContentForPage(urlOriginal?: string, is404?: boolean) {
  if (is404) return "noindex,nofollow,noarchive";
  return getRobotsContent(urlOriginal);
}

function getErrorPageMeta(locale: Locale) {
  const content = getSiteContent(locale);
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

function buildBusinessTitle(business: BusinessFrontend, locale: Locale) {
  return buildBusinessSeoTitle(business, locale);
}

function buildBusinessDescription(business: BusinessFrontend, locale: Locale) {
  return buildBusinessSeoDescription(business, locale);
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

function buildFallbackBusinessMeta(urlOriginal: string | undefined, locale: Locale) {
  const pathname = new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname;
  const parts = pathname.split("/").filter(Boolean);
  const citySlug = parts[2] || "";
  const cityName = titleCasePathSegment(citySlug);

  if (parts.length === 4 && cityName) {
    return {
      title:
        locale === "en"
          ? `Brazilian business in ${cityName} | Caramelinho.com`
          : `Negócio brasileiro em ${cityName} | Caramelinho.com`,
      description:
        locale === "en"
          ? `Find contact information, reviews, and details about Brazilian businesses in ${cityName}.`
          : `Encontre informações de contato, avaliações e detalhes sobre negócios brasileiros em ${cityName}.`,
    };
  }

  return {
    title: locale === "en" ? "Brazilian business | Caramelinho.com" : "Negócio brasileiro | Caramelinho.com",
    description:
      locale === "en"
        ? "Find contact information, reviews, and details about Brazilian businesses abroad."
        : "Encontre informações de contato, avaliações e detalhes sobre negócios brasileiros no exterior.",
  };
}

function getPublicPageMeta(urlOriginal?: string, businesses: BusinessFrontend[] = [], locale: Locale = "pt-BR") {
  const pathname = new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname;
  if (pathname === "/negocios" || pathname.startsWith("/negocios/")) {
    return getDirectoryPageMeta(urlOriginal, businesses, locale) || {
      title:
        locale === "en" ? "Brazilian businesses by country | Caramelinho.com" : "Negócios brasileiros por país | Caramelinho.com",
      description:
        locale === "en"
          ? "Browse Brazilian businesses abroad by country, state, and city."
          : "Explore o diretório de negócios brasileiros no exterior por país, estado e cidade.",
    };
  }
  if (pathname === "/buscar") {
    return {
      title: locale === "en" ? "Search Brazilian businesses | Caramelinho.com" : "Buscar negócios brasileiros | Caramelinho.com",
      description:
        locale === "en"
          ? "Search Brazilian businesses, services, products, and events near you abroad."
          : "Busque negócios, serviços, produtos e eventos brasileiros perto de você no exterior.",
    };
  }
  const content = getSiteContent(locale);
  return {
    title: content.seo.homeTitle,
    description: content.seo.homeDescription,
  };
}

function jsonLdScript(data: unknown) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

function buildWebsiteJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Caramelinho.com",
    url: getLocalizedUrl("https://www.caramelinho.com", "/", "", "", locale),
    inLanguage: locale === "en" ? "en" : "pt-BR",
    potentialAction: {
      "@type": "SearchAction",
      target: `${getLocalizedUrl("https://www.caramelinho.com", "/buscar", "", "", locale)}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

function buildBusinessJsonLd(business: BusinessFrontend, canonicalUrl: string, pageImage: string, locale: Locale) {
  const address = business.address || {};
  const latitude = Number(address.lat);
  const longitude = Number(address.lng);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${canonicalUrl}#business`,
    name: business.name,
    description: business.description || buildBusinessDescription(business, locale),
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
    geo:
      Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude !== 0 || longitude !== 0)
        ? {
            "@type": "GeoCoordinates",
            latitude,
            longitude,
          }
        : undefined,
    aggregateRating:
      business.averageRating && business.reviews?.length
        ? {
            "@type": "AggregateRating",
            ratingValue: business.averageRating,
            reviewCount: business.reviews.length,
          }
        : undefined,
    priceRange: "$$",
  };
}

function buildBusinessBreadcrumbJsonLd(business: BusinessFrontend, canonicalUrl: string, locale: Locale) {
  const address = business.address || {};
  const items = [
    {
      name: locale === "en" ? "Home" : "Início",
      item: getLocalizedUrl("https://www.caramelinho.com", "/", "", "", locale),
    },
    {
      name: locale === "en" ? "Search" : "Busca",
      item: getLocalizedUrl("https://www.caramelinho.com", "/buscar", "", "", locale),
    },
  ];

  if (address.city) {
    items.push({
      name: address.city,
      item: `${getLocalizedUrl("https://www.caramelinho.com", "/buscar", "", "", locale)}?cidade=${encodeURIComponent(address.city)}`,
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

export function onRenderHtml(pageContext: PageContext) {
  const { Page } = pageContext;
  const pageHtml = renderToString(<Page pageContext={pageContext} />);
  const currentUrl = new URL(pageContext.urlOriginal || "/", "https://www.caramelinho.com");
  const locale = pageContext.locale || getLocaleFromPathname(currentUrl.pathname);
  const business = pageContext.initialBusiness || null;
  const isBusinessPage = !!pageContext.isBusinessPage;
  const canonicalUrl = getCanonicalUrl(pageContext.urlOriginal, isBusinessPage);
  const isErrorPage = !!pageContext.is404;
  const businessHasData = !!business;
  const staticMeta = isErrorPage
    ? getErrorPageMeta(locale)
    : getPublicPageMeta(pageContext.urlOriginal, pageContext.initialBusinesses || [], locale);
  const fallbackBusinessMeta = buildFallbackBusinessMeta(pageContext.urlOriginal, locale);
  const businessHeroAssets =
    isBusinessPage && businessHasData
      ? buildBusinessHeroImageAssets(business.heroImage || business.logoUrl || "https://www.caramelinho.com/og-image.jpg")
      : null;
  const pageTitle = isErrorPage
    ? staticMeta.title
    : isBusinessPage
      ? (businessHasData ? buildBusinessTitle(business, locale) : fallbackBusinessMeta.title)
      : staticMeta.title;
  const pageDescription = isErrorPage
    ? staticMeta.description
    : isBusinessPage
      ? (businessHasData ? buildBusinessDescription(business, locale) : fallbackBusinessMeta.description)
      : staticMeta.description;
  const pageImage =
    isBusinessPage && businessHasData
      ? businessHeroAssets?.optimizedImageUrl || business.heroImage || business.logoUrl || "https://www.caramelinho.com/og-image.jpg"
      : "https://www.caramelinho.com/og-image.jpg";
  const robotsContent = getRobotsContentForPage(pageContext.urlOriginal, pageContext.is404);
  const jsonLd = isBusinessPage && businessHasData
    ? [
        buildWebsiteJsonLd(locale),
        buildBusinessJsonLd(business, canonicalUrl, pageImage, locale),
        buildBusinessBreadcrumbJsonLd(business, canonicalUrl, locale),
      ]
    : [buildWebsiteJsonLd(locale)];
  const jsonLdHtml = jsonLd.map(jsonLdScript).join("\n");

  return escapeInject`<!doctype html>
<html lang="${locale === "en" ? "en" : "pt-BR"}">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <link rel="icon" type="image/png" href="/logo.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="${robotsContent}" />
    <meta name="googlebot" content="${robotsContent}" />
    <title>${pageTitle}</title>
    <meta name="description" content="${pageDescription}" />
    <meta property="og:site_name" content="Caramelinho.com" />
    <meta property="og:locale" content="${locale === "en" ? "en_US" : "pt_BR"}" />
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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    ${dangerouslySkipEscape(buildPublicRuntimeEnvScript())}
    ${businessHeroAssets ? dangerouslySkipEscape(businessHeroAssets.preloadHtml) : ""}
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
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
