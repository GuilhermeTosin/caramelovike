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
import { getCountryDisplayName, getLocaleHtmlLang, getLocaleOgCode, localizePath } from "@/lib/locales";
import { getCanonicalCitySlug, getCityDisplayName } from "@/lib/locationDisplay";
import { getCountryName, getStateDisplayName, slugify } from "@/services/businesses";
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
import type { MarketplaceListing } from "@/types/database";
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
  initialMarketplaceListing?: MarketplaceListing | null;
  initialMarketplaceBusinessSeller?: import("@/services/marketplace").MarketplaceBusinessSellerPage | null;
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
  if (pathname === "/index2") return "https://www.caramelinho.com/";
  const isMarketplacePath = pathname === "/marketplace" || pathname.startsWith("/marketplace/");
  const canonicalPath = isBusinessPage || isMarketplacePath ? pathname : getInternalSearchCanonicalPath(pathname);
  const isInternalSearch = !!getInternalSearchRobots(pathname);
  return "https://www.caramelinho.com" + canonicalPath + (isBusinessPage || isMarketplacePath || isInternalSearch ? "" : search);
}

function getRobotsContent(urlOriginal?: string) {
  const url = new URL(urlOriginal || "/", "https://www.caramelinho.com");
  const pathname = url.pathname;

  if (pathname === "/index2") return "noindex,follow";

  const privatePaths = new Set([
    "/cadastro", "/entrar", "/redefinir-senha", "/perfil", "/negocio/wizard",
  ]);
  if (privatePaths.has(pathname) || pathname === "/marketplace/novo" || pathname.startsWith("/marketplace/editar/")) return "noindex,nofollow,noarchive";
  if (pathname === "/marketplace" && url.search) return "noindex,follow";
  const searchRobots = getInternalSearchRobots(pathname);
  if (searchRobots) return searchRobots;
  return "index,follow,max-image-preview:large";
}

function marketplaceListingJsonLd(listing: MarketplaceListing, canonicalUrl: string) {
  const title = listing.title.trim();
  const description = stripRichTextHtml(listing.description).trim();
  const isJobListing = listing.category?.slug === "vagas-de-emprego";

  // Do not describe a job as a product. Emit JobPosting only when the
  // minimum factual fields required by the schema are available.
  if (isJobListing) {
    const employerName = listing.owner_name?.trim();
    const city = listing.city.trim();
    const countryCode = listing.country_code.trim();
    if (!title || !description || !employerName || !listing.created_at || !city || !countryCode) return null;

    return {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      "@id": canonicalUrl + "#job",
      title,
      description,
      datePosted: listing.created_at,
      hiringOrganization: {
        "@type": "Organization",
        name: employerName,
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: city,
          addressRegion: listing.state_code.trim().toUpperCase() || undefined,
          addressCountry: countryCode.toUpperCase(),
        },
      },
      url: canonicalUrl,
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": canonicalUrl + "#product",
    name: title,
    description,
    image: (listing.images || []).map((image) => image.image_url),
    category: listing.category?.name,
    url: canonicalUrl,
    offers: listing.price !== null ? {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: listing.currency,
      availability: listing.status === "active" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: canonicalUrl,
    } : undefined,
  };
}

function marketplaceSellerJsonLd(seller: NonNullable<PageContext["initialMarketplaceSeller"]>, canonicalUrl: string) {
  const name = seller.profile.name?.trim() || "Vendedor do Marketplace";
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": canonicalUrl + "#profile",
    url: canonicalUrl,
    mainEntity: {
      "@type": "Person",
      "@id": canonicalUrl + "#person",
      name,
      image: seller.profile.avatar || undefined,
      url: canonicalUrl,
    },
  };
}

function marketplaceBusinessSellerJsonLd(seller: NonNullable<PageContext["initialMarketplaceBusinessSeller"]>, canonicalUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": canonicalUrl + "#profile",
    url: canonicalUrl,
    mainEntity: {
      "@type": "Organization",
      "@id": canonicalUrl + "#organization",
      name: seller.business.name,
      logo: seller.business.logo_url || undefined,
      url: canonicalUrl,
    },
  };
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

  if (pathname === "/index2") {
    return {
      title: "Caramelinho | Nova experiência",
      description: "Encontre negócios brasileiros, produtos e serviços no exterior em uma nova experiência do Caramelinho.",
    };
  }

  const content = getSiteContent();
  return { title: content.seo.homeTitle, description: content.seo.homeDescription };
}

function jsonLdScript(data: unknown, id: string) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script id="jsonld-${id}" type="application/ld+json">${json}</script>`;
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
  const address: BusinessFrontend["address"] = business.address;
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

function buildBusinessBreadcrumbJsonLd(business: BusinessFrontend, canonicalUrl: string) {
  const address: BusinessFrontend["address"] = business.address;
  const countryCode = String(address.countryCode || "").toLowerCase();
  const stateCode = String(address.stateCode || "").toLowerCase();
  const citySlug = getCanonicalCitySlug(address.city, countryCode) || slugify(address.citySlug || address.city || "");
  const items = [
    { name: "In\u00edcio", item: "https://www.caramelinho.com/" },
    { name: "Neg\u00f3cios", item: "https://www.caramelinho.com/negocios" },
  ];

  if (countryCode) {
    items.push({
      name: getCountryDisplayName(countryCode, getCountryName(countryCode) || countryCode.toUpperCase()),
      item: "https://www.caramelinho.com/negocios/" + countryCode,
    });
  }

  if (countryCode && stateCode) {
    items.push({
      name: getStateDisplayName(countryCode, stateCode, address.state) || stateCode.toUpperCase(),
      item: "https://www.caramelinho.com/negocios/" + countryCode + "/" + stateCode,
    });
  }

  if (countryCode && stateCode && citySlug) {
    items.push({
      name: getCityDisplayName(address.city, countryCode) || address.city,
      item: "https://www.caramelinho.com/negocios/" + countryCode + "/" + stateCode + "/" + citySlug,
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
  const rootPath = localizePath("/negocios");
  const items = [{ name: "Negócios", item: "https://www.caramelinho.com" + rootPath }];

  if (countryCode) {
    items.push({
      name: getCountryDisplayName(countryCode, getCountryName(countryCode) || countryCode.toUpperCase()),
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

export function onRenderHtml(pageContext: PageContext) {
  const { Page } = pageContext;
  const pageHtml = renderToString(<Page pageContext={pageContext} />);
  const business = pageContext.initialBusiness || null;
  const event = pageContext.initialEvent || null;
  const { pathname } = getPageUrlParts(pageContext.urlOriginal);
  const isBusinessPage = !!pageContext.isBusinessPage;
  const isEventPage = !!pageContext.isEventPage;
  const isDirectoryPage = !!parseDirectoryRoute(pathname);
  const isMarketplaceIndex = pathname === "/marketplace";
  const isMarketplaceSeller = pathname.startsWith("/marketplace/vendedor/") && !!pageContext.initialMarketplaceSeller;
  const isMarketplaceBusinessSeller = pathname.startsWith("/marketplace/negocio/") && !!pageContext.initialMarketplaceBusinessSeller;
  const isMarketplaceDetail = pathname.startsWith("/marketplace/") && !!pageContext.initialMarketplaceListing;
  const canonicalUrl = isEventPage && event
    ? buildEventCanonicalUrl(event.id)
    : (isMarketplaceIndex || isMarketplaceSeller || isMarketplaceBusinessSeller || isMarketplaceDetail)
      ? `https://www.caramelinho.com${pathname}`
    : getCanonicalUrl(pageContext.urlOriginal, isBusinessPage);
  const isErrorPage = !!pageContext.is404 || pageContext.abortStatusCode === 404 || pageContext.abortReason === "not-found";
  const businessHasData = !!business;
  const localizedBusiness = business;
  const staticMeta = isErrorPage
    ? getErrorPageMeta()
    : isMarketplaceIndex
      ? { title: "Marketplace | Caramelinho", description: "Compre, venda e encontre produtos perto de você no Marketplace do Caramelinho." }
      : isMarketplaceSeller && pageContext.initialMarketplaceSeller
        ? { title: `${pageContext.initialMarketplaceSeller.profile.name?.trim() || "Vendedor"} | Marketplace | Caramelinho`, description: `Veja os anúncios ativos e as avaliações dos negócios de ${pageContext.initialMarketplaceSeller.profile.name?.trim() || "vendedor"} no Marketplace do Caramelinho.` }
      : isMarketplaceBusinessSeller && pageContext.initialMarketplaceBusinessSeller
        ? { title: `${pageContext.initialMarketplaceBusinessSeller.business.name} | Marketplace | Caramelinho`, description: `Veja os anúncios ativos e as avaliações de ${pageContext.initialMarketplaceBusinessSeller.business.name} no Marketplace do Caramelinho.` }
      : isMarketplaceDetail && pageContext.initialMarketplaceListing
        ? { title: `${pageContext.initialMarketplaceListing.title} | Marketplace | Caramelinho`, description: `${pageContext.initialMarketplaceListing.title} em ${pageContext.initialMarketplaceListing.city}. Veja preço, condição e entre em contato com o vendedor.` }
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
      ? (businessHasData ? buildBusinessTitle(localizedBusiness!) : fallbackBusinessMeta.title)
      : isEventPage
        ? eventMeta.title
        : staticMeta.title;
  const pageDescription = isErrorPage
    ? staticMeta.description
    : isBusinessPage
      ? (businessHasData ? buildBusinessDescription(localizedBusiness!) : fallbackBusinessMeta.description)
      : isEventPage
        ? eventMeta.description
        : staticMeta.description;
  const pageImage =
    isBusinessPage && businessHasData
      ? businessHeroAssets?.optimizedImageUrl || business.heroImage || business.logoUrl || "https://www.caramelinho.com/og-image.jpg"
      : isEventPage && event
      ? event.flyer_url || "https://www.caramelinho.com/og-image.jpg"
      : isMarketplaceSeller && pageContext.initialMarketplaceSeller?.profile.avatar
      ? pageContext.initialMarketplaceSeller.profile.avatar
      : isMarketplaceBusinessSeller && pageContext.initialMarketplaceBusinessSeller?.business.logo_url
      ? pageContext.initialMarketplaceBusinessSeller.business.logo_url
      : "https://www.caramelinho.com/og-image.jpg";
  const robotsContent = getRobotsContentForPage(pageContext.urlOriginal, isErrorPage);
  const marketplaceListingStructuredData = isMarketplaceDetail && pageContext.initialMarketplaceListing
    ? marketplaceListingJsonLd(pageContext.initialMarketplaceListing, canonicalUrl)
    : null;
  const jsonLd = isMarketplaceBusinessSeller && pageContext.initialMarketplaceBusinessSeller
    ? [
        { id: "website", data: buildWebsiteJsonLd() },
        { id: "marketplace-business-seller", data: marketplaceBusinessSellerJsonLd(pageContext.initialMarketplaceBusinessSeller, canonicalUrl) },
      ]
    : isMarketplaceSeller && pageContext.initialMarketplaceSeller
    ? [
        { id: "website", data: buildWebsiteJsonLd() },
        { id: "marketplace-seller", data: marketplaceSellerJsonLd(pageContext.initialMarketplaceSeller, canonicalUrl) },
      ]
    : isMarketplaceDetail && pageContext.initialMarketplaceListing
    ? [
        { id: "website", data: buildWebsiteJsonLd() },
        ...(marketplaceListingStructuredData ? [{ id: "marketplace-listing", data: marketplaceListingStructuredData }] : []),
      ]
    : isBusinessPage && businessHasData
    ? [
        { id: "website", data: buildWebsiteJsonLd() },
        { id: "business-local", data: buildBusinessJsonLd(localizedBusiness!, canonicalUrl, pageImage) },
        { id: "business-breadcrumb", data: buildBusinessBreadcrumbJsonLd(localizedBusiness!, canonicalUrl) },
      ]
    : isEventPage && event
      ? [
          { id: "website", data: buildWebsiteJsonLd() },
          { id: "event", data: buildEventStructuredData(event, canonicalUrl) },
          { id: "event-breadcrumb", data: buildEventBreadcrumbStructuredData(event, canonicalUrl) },
        ]
      : isDirectoryPage
        ? [
            { id: "website", data: buildWebsiteJsonLd() },
            { id: "directory-breadcrumb", data: buildDirectoryBreadcrumbJsonLd(pageContext.urlOriginal, pageContext.initialBusinesses || [], canonicalUrl, pageContext.initialDirectorySnapshot) },
          ]
        : [{ id: "website", data: buildWebsiteJsonLd() }];
  const jsonLdHtml = jsonLd.map((item) => jsonLdScript(item.data, item.id)).join("\n");

  return escapeInject`<!doctype html>
<html lang="${getLocaleHtmlLang()}">
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
    <meta property="og:locale" content="${getLocaleOgCode()}" />
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
