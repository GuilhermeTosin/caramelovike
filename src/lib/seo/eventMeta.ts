import type { CommunityEvent } from "@/types/database";

const SITE_URL = "https://www.caramelinho.com";
const DEFAULT_EVENT_IMAGE = "https://www.caramelinho.com/og-image.jpg";

function compactText(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function buildEventCanonicalUrl(eventId: string) {
  return SITE_URL + "/eventos/" + encodeURIComponent(eventId);
}

export function buildEventSeoTitle(event: CommunityEvent) {
  return compactText(event.title) + " | Evento | Caramelinho.com";
}

export function buildEventSeoDescription(event: CommunityEvent) {
  const title = compactText(event.title);
  const location = compactText(event.location);
  const description = compactText(event.description);
  const fallback = title + (location ? " em " + location : "") + ". Veja data, detalhes e informações do evento.";
  const value = description || fallback;
  return value.length > 160 ? value.slice(0, 157).trimEnd() + "..." : value;
}

export function buildEventStructuredData(event: CommunityEvent, canonicalUrl = buildEventCanonicalUrl(event.id)) {
  const image = event.flyer_url || DEFAULT_EVENT_IMAGE;
  const location = compactText(event.location);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": canonicalUrl + "#event",
    name: compactText(event.title),
    description: buildEventSeoDescription(event),
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

export function buildEventBreadcrumbStructuredData(event: CommunityEvent, canonicalUrl = buildEventCanonicalUrl(event.id)) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Eventos", item: SITE_URL + "/buscar?eventos=1" },
      { "@type": "ListItem", position: 3, name: compactText(event.title), item: canonicalUrl },
    ],
  };
}
