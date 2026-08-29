import type { CommunityEvent } from "@/types/database";
import type { SiteLocale } from "@/lib/locales";

const SITE_URL = "https://www.caramelinho.com";
const DEFAULT_EVENT_IMAGE = "https://www.caramelinho.com/og-image.jpg";

function compactText(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function buildEventCanonicalUrl(eventId: string, locale: SiteLocale = "pt-BR") {
  return SITE_URL + (locale === "en" ? "/en/events/" : "/eventos/") + encodeURIComponent(eventId);
}

export function buildEventSeoTitle(event: CommunityEvent, locale: SiteLocale = "pt-BR") {
  return compactText(event.title) + (locale === "en" ? " | Event | Caramelinho.com" : " | Evento | Caramelinho.com");
}

export function buildEventSeoDescription(event: CommunityEvent, locale: SiteLocale = "pt-BR") {
  const title = compactText(event.title);
  const location = compactText(event.location);
  const description = compactText(event.description);
  const fallback = locale === "en"
    ? title + (location ? " in " + location : "") + ". See the date, details and event information."
    : title + (location ? " em " + location : "") + ". Veja data, detalhes e informações do evento.";
  const value = description || fallback;
  return value.length > 160 ? value.slice(0, 157).trimEnd() + "..." : value;
}

export function buildEventStructuredData(event: CommunityEvent, canonicalUrl = buildEventCanonicalUrl(event.id), locale: SiteLocale = "pt-BR") {
  const image = event.flyer_url || DEFAULT_EVENT_IMAGE;
  const location = compactText(event.location);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": canonicalUrl + "#event",
    name: compactText(event.title),
    description: buildEventSeoDescription(event, locale),
    startDate: event.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    isAccessibleForFree: event.is_free,
    image: [image],
    url: canonicalUrl,
    location: location
      ? {
          "@type": "Place",
          name: location,
          address: location,
        }
      : undefined,
  };
}

export function buildEventBreadcrumbStructuredData(event: CommunityEvent, canonicalUrl = buildEventCanonicalUrl(event.id), locale: SiteLocale = "pt-BR") {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: locale === "en" ? "Home" : "Início", item: SITE_URL + (locale === "en" ? "/en" : "/") },
      { "@type": "ListItem", position: 2, name: locale === "en" ? "Events" : "Eventos", item: SITE_URL + (locale === "en" ? "/en/search?eventos=1" : "/buscar?eventos=1") },
      { "@type": "ListItem", position: 3, name: compactText(event.title), item: canonicalUrl },
    ],
  };
}
