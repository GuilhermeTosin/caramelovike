import React from "react";
import { renderToString } from "react-dom/server";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { BusinessFrontend } from "@/types/database";
import type { RendererPageContext } from "@/renderer/pageContext";
import { getOptimizedImageSrcSet, getOptimizedImageUrl } from "@/lib/images";

type PageContext = RendererPageContext & {
  Page: React.ComponentType<{ pageContext: RendererPageContext }>;
};

const SITE_TITLE = "Caramelinho.com - Encontre negócios brasileiros no mundo";
const SITE_DESCRIPTION =
  "Encontre empresas, serviços e negócios brasileiros perto de você no exterior. Descubra restaurantes, profissionais e eventos da comunidade em um só lugar.";

function getCanonicalUrl(urlOriginal?: string) {
  const path = urlOriginal || "/";
  return `https://www.caramelinho.com${path.startsWith("/") ? path : `/${path}`}`;
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
  if (is404) {
    return "noindex,nofollow,noarchive";
  }
  return getRobotsContent(urlOriginal);
}

function getErrorPageMeta() {
  return {
    title: "Página não encontrada | Caramelinho.com",
    description: "A página solicitada não foi encontrada. Use a busca ou volte para a inicial do Caramelinho.",
  };
}


function buildBusinessTitle(business: BusinessFrontend) {
  const categoryLabel = (business.category || "Negócio brasileiro").split("(")[0].trim();
  const locationLabel = business.address.city ? `em ${business.address.city}` : "perto de você";
  return `${business.name} ${locationLabel} | ${categoryLabel} | Caramelinho.com`;
}

function buildBusinessDescription(business: BusinessFrontend) {
  const categoryLabel = (business.category || "negócio brasileiro").split("(")[0].trim().toLowerCase();
  const place = business.address.city
    ? `${business.address.city}${business.address.state ? `, ${business.address.state}` : ""}`
    : "sua região";
  const services = (business.services || []).filter(Boolean).slice(0, 3).join(", ");
  const details = services ? ` Especialidades: ${services}.` : "";
  return `${business.name} em ${place}. Encontre informações de contato, avaliações e detalhes sobre esse ${categoryLabel}.${details}`.trim();
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

function buildFallbackBusinessMeta(urlOriginal?: string) {
  const pathname = new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname;
  const parts = pathname.split("/").filter(Boolean);
  const citySlug = parts[2] || "";
  const cityName = titleCaseFromSlug(citySlug);

  if (parts.length === 4 && cityName) {
    return {
      title: `Negócio brasileiro em ${cityName} | Caramelinho.com`,
      description: `Encontre informações de contato, avaliações e detalhes sobre negócios brasileiros em ${cityName}.`,
    };
  }

  return {
    title: "Negócio brasileiro | Caramelinho.com",
    description: "Encontre informações de contato, avaliações e detalhes sobre negócios brasileiros no exterior.",
  };
}

function slugifyMetaPart(value: string) {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function titleCaseFromSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findDirectoryLabels(
  businesses: BusinessFrontend[],
  countryCode: string,
  stateCode: string,
  citySlug: string
) {
  const matchingCountry = businesses.find(
    (business) => (business.address.countryCode || "").toLowerCase() === countryCode
  );
  const matchingState = businesses.find(
    (business) =>
      (business.address.countryCode || "").toLowerCase() === countryCode &&
      (business.address.stateCode || "").toLowerCase() === stateCode
  );
  const matchingCity = businesses.find(
    (business) =>
      (business.address.countryCode || "").toLowerCase() === countryCode &&
      (business.address.stateCode || "").toLowerCase() === stateCode &&
      slugifyMetaPart(business.address.city || "") === citySlug
  );

  return {
    country: matchingCountry?.address.country || countryCode.toUpperCase(),
    state: matchingState?.address.state || stateCode.toUpperCase(),
    city: matchingCity?.address.city || titleCaseFromSlug(citySlug),
  };
}

function getDirectoryPageMeta(urlOriginal: string | undefined, businesses: BusinessFrontend[]) {
  const pathname = new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname;
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "negocios") return null;

  const countryCode = (parts[1] || "").toLowerCase();
  const stateCode = (parts[2] || "").toLowerCase();
  const citySlug = slugifyMetaPart(parts[3] || "");
  const pageNumber = parts[4] === "pagina" ? Math.max(1, Number(parts[5] || "1")) : 1;
  const pageSuffix = pageNumber > 1 ? ` - Página ${pageNumber}` : "";

  if (!countryCode) {
    return {
      title: `Negócios brasileiros por país${pageSuffix} | Caramelinho.com`,
      description:
        "Explore o diretório de negócios brasileiros no exterior por país, estado e cidade. Encontre empresas, serviços e produtos da comunidade brasileira.",
    };
  }

  const labels = findDirectoryLabels(businesses, countryCode, stateCode, citySlug);

  if (!stateCode) {
    return {
      title: `Negócios brasileiros no ${labels.country}${pageSuffix} | Caramelinho.com`,
      description: `Encontre negócios brasileiros no ${labels.country}. Navegue por estados, regiões e cidades com empresas e serviços da comunidade brasileira.`,
    };
  }

  if (!citySlug) {
    return {
      title: `Negócios brasileiros em ${labels.state}, ${labels.country}${pageSuffix} | Caramelinho.com`,
      description: `Veja cidades com negócios brasileiros em ${labels.state}, ${labels.country}. Descubra restaurantes, serviços, profissionais e lojas da comunidade brasileira.`,
    };
  }

  return {
    title: `Negócios brasileiros em ${labels.city}${pageSuffix} | Caramelinho.com`,
    description: `Encontre negócios brasileiros em ${labels.city}, ${labels.state}. Veja empresas, serviços, produtos, contatos e páginas de negócios da comunidade brasileira na região.`,
  };
}

function getPublicPageMeta(urlOriginal?: string, businesses: BusinessFrontend[] = []) {
  const pathname = new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname;
  if (pathname === "/negocios" || pathname.startsWith("/negocios/")) {
    return getDirectoryPageMeta(urlOriginal, businesses) || {
      title: "Negócios brasileiros por país | Caramelinho.com",
      description: "Explore o diretório de negócios brasileiros no exterior por país, estado e cidade.",
    };
  }
  if (pathname === "/buscar") {
    return {
      title: "Buscar negocios brasileiros | Caramelinho.com",
      description: "Busque negocios, servicos, produtos e eventos brasileiros perto de voce no exterior.",
    };
  }
  return {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  };
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
    "@id": `${canonicalUrl}#business`,
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

function buildBusinessBreadcrumbJsonLd(business: BusinessFrontend, canonicalUrl: string) {
  const address = business.address || {};
  const items = [
    { name: "Inicio", item: "https://www.caramelinho.com/" },
    { name: "Busca", item: "https://www.caramelinho.com/buscar" },
  ];

  if (address.city) {
    items.push({
      name: address.city,
      item: `https://www.caramelinho.com/buscar?cidade=${encodeURIComponent(address.city)}`,
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
  const canonicalUrl = getCanonicalUrl(pageContext.urlOriginal);
  const business = pageContext.initialBusiness || null;
  const isBusinessPage = !!pageContext.isBusinessPage;
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
  const pageImage = isBusinessPage && businessHasData
    ? businessHeroAssets?.optimizedImageUrl || business.heroImage || business.logoUrl || "https://www.caramelinho.com/og-image.jpg"
    : "https://www.caramelinho.com/og-image.jpg";
  const robotsContent = getRobotsContentForPage(pageContext.urlOriginal, pageContext.is404);
  const jsonLd = isBusinessPage && businessHasData
    ? [
        buildWebsiteJsonLd(),
        buildBusinessJsonLd(business, canonicalUrl, pageImage),
        buildBusinessBreadcrumbJsonLd(business, canonicalUrl),
      ]
    : [buildWebsiteJsonLd()];
  const jsonLdHtml = jsonLd.map(jsonLdScript).join("\n");

  return escapeInject`<!doctype html>
<html lang="pt-BR">
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
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:type" content="${isBusinessPage ? "business.business" : "website"}" />
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
