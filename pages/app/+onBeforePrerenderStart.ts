import {
  buildBusinessUrl,
  getAllBusinesses,
  slugify,
} from "@/services/businesses";
import { getPublishedCommunityEvents } from "@/services/events";
import type { BusinessFrontend, CommunityEvent } from "@/types/database";

const STATIC_PUBLIC_URLS = [
  "/",
  "/negocios",
  "/buscar",
  "/sobre",
  "/contato",
  "/privacidade",
  "/termos",
  "/negocio-verificado",
];

const DIRECTORY_PAGE_SIZE = 100;

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

function buildDirectoryUrls(businesses: BusinessFrontend[]) {
  const urls = new Set<string>(["/negocios"]);
  const cityCounts = new Map<string, number>();

  businesses.forEach((business) => {
    const countryCode = (business.address.countryCode || "").toLowerCase().trim();
    const stateCode = (business.address.stateCode || "").toLowerCase().trim();
    const citySlug = slugify(business.address.city || "");
    if (!countryCode) return;

    urls.add(`/negocios/${countryCode}`);
    if (!stateCode) return;

    urls.add(`/negocios/${countryCode}/${stateCode}`);
    if (!citySlug) return;

    const cityPath = `/negocios/${countryCode}/${stateCode}/${citySlug}`;
    urls.add(cityPath);
    cityCounts.set(cityPath, (cityCounts.get(cityPath) || 0) + 1);
  });

  cityCounts.forEach((count, cityPath) => {
    const pages = Math.ceil(count / DIRECTORY_PAGE_SIZE);
    for (let page = 2; page <= pages; page += 1) {
      urls.add(`${cityPath}/pagina/${page}`);
    }
  });

  return Array.from(urls);
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
    ...buildDirectoryUrls(businesses),
    ...businessUrls,
    ...eventUrls,
  ]);
}
