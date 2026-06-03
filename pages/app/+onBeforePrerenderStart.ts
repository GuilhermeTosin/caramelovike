import {
  buildBusinessUrl,
  getAllBusinesses,
} from "@/services/businesses";
import { getPublishedCommunityEvents } from "@/services/events";
import type { BusinessFrontend, CommunityEvent } from "@/types/database";

const STATIC_PUBLIC_URLS = [
  "/",
  "/buscar",
  "/sobre",
  "/contato",
  "/privacidade",
  "/termos",
  "/negocio-verificado",
];

function uniqueUrls(urls: string[]) {
  return Array.from(
    new Set(
      urls
        .map((url) => url.trim())
        .filter(Boolean)
        .filter((url) => url.startsWith("/"))
    )
  );
}

export async function onBeforePrerenderStart() {
  const [businesses, events] = await Promise.all([
    getAllBusinesses().catch(() => [] as BusinessFrontend[]),
    getPublishedCommunityEvents().catch(() => [] as CommunityEvent[]),
  ]);

  const businessUrls = businesses
    .map((business) => buildBusinessUrl(business))
    .filter((url) => !url.startsWith("/go/"));
  const eventUrls = events.map((event) => `/eventos/${event.id}`);

  return uniqueUrls([
    ...STATIC_PUBLIC_URLS,
    ...businessUrls,
    ...eventUrls,
  ]);
}
