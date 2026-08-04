import React from "react";
import { renderToString } from "react-dom/server";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { BusinessFrontend, CommunityEvent } from "@/types/database";
import type { RendererPageContext } from "@/renderer/pageContext";
import { getSiteContent } from "@/data/siteContent";
import { getOptimizedImageSrcSet, getOptimizedImageUrl } from "@/lib/images";
import { buildBusinessSeoDescription, buildBusinessSeoTitle } from "@/lib/seo/businessMeta";
import { getDirectoryPageMeta, type DirectoryPageMeta } from "@/lib/seo/directoryMeta";
import { buildDirectoryPagePath, parseDirectoryRoute, type DirectoryPageSnapshot } from "@/lib/directorySnapshot";
import { getDirectoryCategoryBySlug } from "@/lib/directoryCategories";
import { getLocalizedDirectoryMeta } from "@/lib/directoryLocale";
import { getCountryDisplayName, getLocaleHtmlLang, getLocaleOgCode, getPortuguesePath, getSiteLocale, localizePath, type SiteLocale } from "@/lib/locales";
import { getCanonicalCitySlug, getCityDisplayName } from "@/lib/locationDisplay";
import { buildBusinessUrl, getCountryName, getStateDisplayName, slugify } from "@/services/businesses";
import { buildEnglishBusinessUrl, getEnglishBusinessContent, hasEnglishBusinessTranslation } from "@/lib/businessEnglish";
import { getInternalSearchCanonicalPath, getInternalSearchRobots } from "@/lib/seo/searchIndexing";
import { getMeaningfulUpdatedAt } from "@/lib/dates";
import {
  buildEventBreadcrumbStructuredData,
  buildEventCanonicalUrl,
  buildEventSeoDescription,
  buildEventSeoTitle,
  buildEventStructuredData,
} from "@/lib/seo/eventMeta";
import { stripRichTextHtml } from "@/lib/richText";
import {
  buildBusinessOfferCatalog,
  buildOpeningHoursSpecification,
  buildReviewStructuredData,
  getBusinessMenuUrl,
  getBusinessStructuredDataType,
} from "@/lib/seo/businessStructuredData";

type PageContext = RendererPageContext & {
  Page: React.ComponentType<{ pageContext: RendererPageContext }>;
  initialEvent?: CommunityEvent | null;
  isEventPage?: boolean;
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

function buildEnglishBusinessTitle(business: BusinessFrontend) {
  const location = [
    business.address.city,
    business.address.state,
    getCountryDisplayName(business.address.countryCode, business.address.country, "en"),
  ].filter(Boolean).join(", ");
  return `${business.name} | Brazilian business${location ? ` in ${location}` : " abroad"} | Caramelinho.com`;
}

function buildEnglishBusinessDescription(business: BusinessFrontend) {
  const description = stripRichTextHtml(business.description).trim().replace(/\s+/g, " ");
  if (description) return description.length > 160 ? `${description.slice(0, 157).trimEnd()}...` : description;
  const location = [business.address.city, getCountryDisplayName(business.address.countryCode, business.address.country, "en")].filter(Boolean).join(", ");
  return `Find contact details, services and reviews for ${business.name}${location ? ` in ${location}` : ""}.`;
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

function getPublicPageMeta(urlOriginal?: string, businesses: BusinessFrontend[] = [], directoryMeta?: DirectoryPageMeta) {
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
    "/negocio-verificado": {
      title: "Verifica\u00e7\u00e3o de neg\u00f3cio | Caramelinho.com",
      description: "Entenda como solicitar a verifica\u00e7\u00e3o do seu neg\u00f3cio no Caramelinho e exiba um selo de confian\u00e7a para seus clientes.",
    },
  } as const;

  if (pathname in staticPageMeta) return staticPageMeta[pathname as keyof typeof staticPageMeta];

  if (pathname === "/negocios" || pathname.startsWith("/negocios/")) {
    return directoryMeta || getDirectoryPageMeta(urlOriginal, businesses) || {
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

function jsonLdScript(data: unknown, id: string) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script id="jsonld-${id}" type="application/ld+json">${json}</script>`;
}

function buildWebsiteJsonLd(locale: SiteLocale = "pt-BR") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Caramelinho.com",
    url: locale === "en" ? "https://www.caramelinho.com/en" : "https://www.caramelinho.com/",
    inLanguage: getLocaleHtmlLang(locale),
    potentialAction: {
      "@type": "SearchAction",
      target: locale === "en" ? "https://www.caramelinho.com/en/search?q={search_term_string}" : "https://www.caramelinho.com/buscar?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };
}

function buildBusinessJsonLd(business: BusinessFrontend, canonicalUrl: string, pageImage: string) {
  const address = business.address || {};
  const latitude = Number(address.lat);
  const longitude = Number(address.lng);
  const meaningfulUpdatedAt = getMeaningfulUpdatedAt(business.updatedAt, business.createdAt);
  const structuredReviews = buildReviewStructuredData(business.reviews);
  const openingHoursSpecification = buildOpeningHoursSpecification(business.openingHours);
  return {
    "@context": "https://schema.org",
    "@type": getBusinessStructuredDataType(business),
    "@id": canonicalUrl + "#business",
    name: business.name,
    description: stripRichTextHtml(business.description) || buildBusinessDescription(business),
    url: canonicalUrl,
    image: [pageImage, business.logoUrl, ...(business.photos || []).slice(0, 8)].filter(Boolean),
    menu: getBusinessMenuUrl(business.menuPdfUrl),
    hasOfferCatalog: buildBusinessOfferCatalog(business),
    datePublished: business.createdAt || undefined,
    dateModified: meaningfulUpdatedAt,
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
    review: structuredReviews.length ? structuredReviews : undefined,
    openingHoursSpecification: openingHoursSpecification.length ? openingHoursSpecification : undefined,
  };
}

function buildBusinessBreadcrumbJsonLd(business: BusinessFrontend, canonicalUrl: string, locale: SiteLocale = "pt-BR") {
  const address = business.address || {};
  const countryCode = String(address.countryCode || "").toLowerCase();
  const stateCode = String(address.stateCode || "").toLowerCase();
  const citySlug = getCanonicalCitySlug(address.city, countryCode) || slugify(address.citySlug || address.city || "");
  const items = [
    { name: locale === "en" ? "Home" : "In\u00edcio", item: "https://www.caramelinho.com" + (locale === "en" ? "/en" : "/") },
    { name: locale === "en" ? "Businesses" : "Neg\u00f3cios", item: "https://www.caramelinho.com" + (locale === "en" ? "/en/businesses" : "/negocios") },
  ];

  if (countryCode) {
    items.push({
      name: getCountryDisplayName(countryCode, getCountryName(countryCode) || countryCode.toUpperCase(), locale),
      item: "https://www.caramelinho.com" + (locale === "en" ? "/en/businesses/" : "/negocios/") + countryCode,
    });
  }

  if (countryCode && stateCode) {
    items.push({
      name: getStateDisplayName(countryCode, stateCode, address.state) || stateCode.toUpperCase(),
      item: "https://www.caramelinho.com" + (locale === "en" ? "/en/businesses/" : "/negocios/") + countryCode + "/" + stateCode,
    });
  }

  if (countryCode && stateCode && citySlug) {
    items.push({
      name: getCityDisplayName(address.city, countryCode) || address.city,
      item: "https://www.caramelinho.com" + (locale === "en" ? "/en/businesses/" : "/negocios/") + countryCode + "/" + stateCode + "/" + citySlug,
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

function buildDirectoryBreadcrumbJsonLd(
  urlOriginal: string | undefined,
  businesses: BusinessFrontend[],
  canonicalUrl: string,
  snapshot?: DirectoryPageSnapshot,
  locale: SiteLocale = "pt-BR",
) {
  const pathname = new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname;
  const route = snapshot?.route || parseDirectoryRoute(pathname);
  if (!route) return null;

  const countryCode = route.countryCode;
  const stateCode = route.stateCode;
  const citySlug = route.citySlug;
  const category = snapshot?.category || getDirectoryCategoryBySlug(route.categorySlug);
  const cityBusiness = businesses.find((business) => {
    const businessCity = getCanonicalCitySlug(business.address.city, business.address.countryCode) || slugify(business.address.citySlug || "");
    return businessCity === citySlug && (business.address.countryCode || "").toLowerCase() === countryCode && (business.address.stateCode || "").toLowerCase() === stateCode;
  });
  const cityName = snapshot?.labels.city || (cityBusiness ? getCityDisplayName(cityBusiness.address.city, countryCode) : citySlug.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "));
  const rootPath = localizePath("/negocios", locale);
  const items = [{ name: locale === "en" ? "Businesses" : "Negócios", item: "https://www.caramelinho.com" + rootPath }];

  if (countryCode) {
    items.push({
      name: getCountryDisplayName(countryCode, getCountryName(countryCode) || countryCode.toUpperCase(), locale),
      item: "https://www.caramelinho.com" + buildDirectoryPagePath({ ...route, stateCode: "", citySlug: "", categorySlug: "", page: 1 }),
    });
  }
  if (stateCode) {
    items.push({
      name: snapshot?.labels.state || getStateDisplayName(countryCode, stateCode, cityBusiness?.address.state) || stateCode.toUpperCase(),
      item: "https://www.caramelinho.com" + buildDirectoryPagePath({ ...route, citySlug: "", categorySlug: "", page: 1 }),
    });
  }
  if (citySlug) {
    items.push({
      name: cityName || citySlug,
      item: "https://www.caramelinho.com" + buildDirectoryPagePath({ ...route, categorySlug: "", page: 1 }),
    });
  }
  if (category) items.push({ name: category.label, item: canonicalUrl });
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: item.item })) };
}

function getEnglishPublicPageMeta(pathname: string) {
  const pages: Record<string, { title: string; description: string }> = {
    "/en/about": { title: "About Caramelinho | Caramelinho.com", description: "Learn about Caramelinho, the platform that connects people abroad with Brazilian businesses and services." },
    "/en/contact": { title: "Contact | Caramelinho.com", description: "Contact Caramelinho for support, questions and partnership opportunities." },
    "/en/privacy": { title: "Privacy Policy | Caramelinho.com", description: "Learn how Caramelinho collects, uses and protects personal information." },
    "/en/terms": { title: "Terms and Conditions | Caramelinho.com", description: "Read the terms and conditions for using the Caramelinho platform." },
    "/en/search": { title: "Search Brazilian businesses | Caramelinho.com", description: "Search for Brazilian businesses, services and professionals abroad." },
  };
  return pages[pathname] || null;
}
function getEnglishHomeMeta() {
  return {
    title: "Find Brazilian businesses abroad | Caramelinho.com",
    description: "Find Brazilian businesses, services and professionals around the world with Caramelinho.",
  };
}

function getLocaleAlternateLinks(pathname: string, business?: BusinessFrontend | null) {
  if (business && hasEnglishBusinessTranslation(business)) {
    const portuguesePath = buildBusinessUrl(business);
    const englishPath = buildEnglishBusinessUrl(business);
    return [
      `<link rel="alternate" hreflang="pt-BR" href="https://www.caramelinho.com${portuguesePath}" />`,
      `<link rel="alternate" hreflang="en" href="https://www.caramelinho.com${englishPath}" />`,
      `<link rel="alternate" hreflang="x-default" href="https://www.caramelinho.com${portuguesePath}" />`,
    ].join("\n");
  }

  const directoryRoute = parseDirectoryRoute(pathname);
  const supportsAlternates = pathname === "/" || pathname === "/en" || ["/sobre", "/contato", "/privacidade", "/termos", "/en/about", "/en/contact", "/en/privacy", "/en/terms"].includes(pathname) || (!!directoryRoute && !directoryRoute.categorySlug);
  if (!supportsAlternates) return "";

  const portuguesePath = getPortuguesePath(pathname);
  const englishPath = localizePath(portuguesePath, "en");
  return [
    `<link rel="alternate" hreflang="pt-BR" href="https://www.caramelinho.com${portuguesePath}" />`,
    `<link rel="alternate" hreflang="en" href="https://www.caramelinho.com${englishPath}" />`,
    `<link rel="alternate" hreflang="x-default" href="https://www.caramelinho.com${portuguesePath}" />`,
  ].join("\n");
}
export function onRenderHtml(pageContext: PageContext) {
  const { Page } = pageContext;
  const pageHtml = renderToString(<Page pageContext={pageContext} />);
  const business = pageContext.initialBusiness || null;
  const event = pageContext.initialEvent || null;
  const { pathname } = getPageUrlParts(pageContext.urlOriginal);
  const locale = getSiteLocale(pathname);
  const isBusinessPage = !!pageContext.isBusinessPage;
  const isEventPage = !!pageContext.isEventPage;
  const isDirectoryPage = !!parseDirectoryRoute(pathname);
  const canonicalUrl = isEventPage && event
    ? buildEventCanonicalUrl(event.id)
    : getCanonicalUrl(pageContext.urlOriginal, isBusinessPage);
  const isErrorPage = !!pageContext.is404;
  const businessHasData = !!business;
  const localizedBusiness = business && locale === "en" ? getEnglishBusinessContent(business) : business;
  const englishPublicMeta = locale === "en" ? getEnglishPublicPageMeta(pathname) : null;
  const staticMeta = isErrorPage
    ? getErrorPageMeta()
    : locale === "en" && pageContext.initialDirectorySnapshot
      ? getLocalizedDirectoryMeta(pageContext.initialDirectorySnapshot, locale)
      : englishPublicMeta
        ? englishPublicMeta
        : locale === "en" && pathname === "/en"
          ? getEnglishHomeMeta()
          : getPublicPageMeta(pageContext.urlOriginal, pageContext.initialBusinesses || [], pageContext.initialDirectorySnapshot?.pageMeta);
  const fallbackBusinessMeta = buildFallbackBusinessMeta(pageContext.urlOriginal);
  const eventMeta = event
    ? { title: buildEventSeoTitle(event), description: buildEventSeoDescription(event) }
    : { title: "Evento | Caramelinho.com", description: "Detalhes de evento da comunidade." };
  const businessHeroAssets =
    isBusinessPage && businessHasData
      ? buildBusinessHeroImageAssets(business.heroImage || business.logoUrl || "https://www.caramelinho.com/og-image.jpg")
      : null;
  const pageTitle = isErrorPage
    ? staticMeta.title
    : isBusinessPage
      ? (businessHasData ? (locale === "en" ? buildEnglishBusinessTitle(localizedBusiness!) : buildBusinessTitle(localizedBusiness!)) : fallbackBusinessMeta.title)
      : isEventPage
        ? eventMeta.title
        : staticMeta.title;
  const pageDescription = isErrorPage
    ? staticMeta.description
    : isBusinessPage
      ? (businessHasData ? (locale === "en" ? buildEnglishBusinessDescription(localizedBusiness!) : buildBusinessDescription(localizedBusiness!)) : fallbackBusinessMeta.description)
      : isEventPage
        ? eventMeta.description
        : staticMeta.description;
  const pageImage =
    isBusinessPage && businessHasData
      ? businessHeroAssets?.optimizedImageUrl || business.heroImage || business.logoUrl || "https://www.caramelinho.com/og-image.jpg"
      : isEventPage && event
      ? event.flyer_url || "https://www.caramelinho.com/og-image.jpg"
      : "https://www.caramelinho.com/og-image.jpg";
  const robotsContent = getRobotsContentForPage(pageContext.urlOriginal, pageContext.is404);
  const jsonLd = isBusinessPage && businessHasData
    ? [
        { id: "website", data: buildWebsiteJsonLd(locale) },
        { id: "business-local", data: buildBusinessJsonLd(localizedBusiness!, canonicalUrl, pageImage) },
        { id: "business-breadcrumb", data: buildBusinessBreadcrumbJsonLd(localizedBusiness!, canonicalUrl, locale) },
      ]
    : isEventPage && event
      ? [
          { id: "website", data: buildWebsiteJsonLd(locale) },
          { id: "event", data: buildEventStructuredData(event, canonicalUrl) },
          { id: "event-breadcrumb", data: buildEventBreadcrumbStructuredData(event, canonicalUrl) },
        ]
      : isDirectoryPage
        ? [
            { id: "website", data: buildWebsiteJsonLd(locale) },
            { id: "directory-breadcrumb", data: buildDirectoryBreadcrumbJsonLd(pageContext.urlOriginal, pageContext.initialBusinesses || [], canonicalUrl, pageContext.initialDirectorySnapshot, locale) },
          ]
        : [{ id: "website", data: buildWebsiteJsonLd(locale) }];
  const jsonLdHtml = jsonLd.map((item) => jsonLdScript(item.data, item.id)).join("\n");

  return escapeInject`<!doctype html>
<html lang="${getLocaleHtmlLang(locale)}">
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
    <meta property="og:locale" content="${getLocaleOgCode(locale)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${pageTitle}" />
    <meta property="og:description" content="${pageDescription}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <link rel="canonical" href="${canonicalUrl}" />
    ${dangerouslySkipEscape(getLocaleAlternateLinks(pathname, business))}
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
