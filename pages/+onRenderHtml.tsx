import React from "react";
import { renderToString } from "react-dom/server";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { BusinessFrontend } from "@/types/database";

type PageContext = {
  Page: React.ComponentType<{ pageContext: PageContext }>;
  urlOriginal?: string;
  initialBusiness?: BusinessFrontend | null;
  isBusinessPage?: boolean;
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
  const isBusinessPage = !!pageContext.isBusinessPage && !!business;
  const pageTitle = isBusinessPage ? buildBusinessTitle(business) : SITE_TITLE;
  const pageDescription = isBusinessPage ? buildBusinessDescription(business) : SITE_DESCRIPTION;
  const pageImage = isBusinessPage
    ? business.heroImage || business.logoUrl || "https://www.caramelinho.com/og-image.jpg"
    : "https://www.caramelinho.com/og-image.jpg";
  const robotsContent = getRobotsContent(pageContext.urlOriginal);
  const jsonLd = isBusinessPage
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
    <meta property="og:image:alt" content="${isBusinessPage ? business.name : "Logo do Caramelinho.com"}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${pageTitle}" />
    <meta name="twitter:description" content="${pageDescription}" />
    <meta name="twitter:image" content="${pageImage}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
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
