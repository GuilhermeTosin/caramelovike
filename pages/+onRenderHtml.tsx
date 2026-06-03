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

  return escapeInject`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <link rel="icon" type="image/png" href="/logo.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <meta name="googlebot" content="index,follow,max-image-preview:large" />
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
    <meta property="og:image:alt" content="Logo do Caramelinho.com" />
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
  </head>
  <body>
    <div id="root">${dangerouslySkipEscape(pageHtml)}</div>
  </body>
</html>`;
}
