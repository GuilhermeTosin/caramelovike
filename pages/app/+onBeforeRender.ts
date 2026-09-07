import type { PageContextServer } from "vike/types";
import { redirect, render } from "vike/abort";
import {
  getBusinessesByPublicSearchRpc,
  getPublicBusinessDirectoryIndex,
  getSimilarBusinessesForBusiness,
  getAvailableLocations,
  buildBusinessUrl,
  getBusinessByCountryAndSlug,
  getBusinessByHistoricalPath,
  getBusinessByShortSlug,
  getBusinessBySlug,
  getSearchSuggestions,
  resolveCanonicalLocationSlug,
  slugify,
} from "@/services/businesses";
import { getFeaturedBusinessesForRegion } from "@/services/featured";
import type { BusinessFrontend, CommunityEvent } from "@/types/database";
import { getCommunityEventById } from "@/services/events";
import {
  DIRECTORY_CATEGORY_MINIMUM_BUSINESSES,
  DIRECTORY_PAGE_SIZE,
  getDirectoryBusinessCitySlug,
  getDirectoryCategoryBySlug,
  getDirectoryCategoryBusinesses,
} from "@/lib/directoryCategories";
import { buildHomePublicSnapshot, type HomePublicSnapshot } from "@/lib/homeSnapshot";
import { buildPublicSearchPageRequest, isPublicBusinessSearch, type PublicSearchPageSnapshot } from "@/lib/search/publicSearchPage";
import { buildDirectoryPagePath, buildDirectoryPageSnapshot, parseDirectoryRoute, type DirectoryPageSnapshot } from "@/lib/directorySnapshot";
import { DEFAULT_CATEGORY_SYNONYMS, getGlobalCategorySynonymsConfig } from "@/services/searchPreferences";
import { getMarketplaceCategories, getMarketplaceListingByPath, getMarketplacePage } from "@/services/marketplace";
import { buildMarketplaceSnapshot } from "@/lib/marketplaceSnapshot";

type AvailableLocation = {
  countryCode: string;
  countryName: string;
  states: Array<{ code: string; name: string; cities: string[] }>;
};

type PublicSearchMetadata = {
  availableLocations: AvailableLocation[];
  searchSuggestions: string[];
  searchSynonyms: Record<string, string[]>;
};

type TimedCache<T> = {
  value: T;
  expiresAt: number;
};

// Vercel keeps a warm function instance for multiple public requests. Reusing
// these small, read-only snapshots avoids fetching the same directory on every
// SSR render while keeping newly published businesses visible shortly after.
const PUBLIC_DIRECTORY_CACHE_TTL_MS = 10 * 60 * 1000;
const PUBLIC_SEARCH_METADATA_CACHE_TTL_MS = 15 * 60 * 1000;
let publicDirectoryCache: TimedCache<BusinessFrontend[]> | null = null;
let publicDirectoryRequest: Promise<BusinessFrontend[]> | null = null;
let publicSearchMetadataCache: TimedCache<PublicSearchMetadata> | null = null;
let publicSearchMetadataRequest: Promise<PublicSearchMetadata> | null = null;

type PageContext = PageContextServer & {
  urlOriginal?: string;
  initialBusiness?: BusinessFrontend | null;
  initialSimilarBusinesses?: BusinessFrontend[];
  initialBusinesses?: BusinessFrontend[];
  initialBusinessesAreSearchReady?: boolean;
  initialFeaturedBusinesses?: BusinessFrontend[];
  initialRecentBusinesses?: BusinessFrontend[];
  initialAvailableLocations?: AvailableLocation[];
  initialSearchSuggestions?: string[];
  initialSearchSynonyms?: Record<string, string[]>;
  initialSearchSnapshot?: PublicSearchPageSnapshot;
  initialHomeSnapshot?: HomePublicSnapshot;
  initialDirectorySnapshot?: DirectoryPageSnapshot;
  initialEvent?: CommunityEvent | null;
  initialMarketplaceSnapshot?: import("@/lib/marketplaceSnapshot").MarketplaceSnapshot;
  initialMarketplaceListing?: import("@/types/database").MarketplaceListing | null;
  isBusinessPage?: boolean;
  isEventPage?: boolean;
  isPrerendering?: boolean;
};

function parseBusinessPath(pathname: string) {
  const pathParts = pathname.split("/").filter(Boolean);
  const parts = pathParts;

  if (parts.length === 4) {
    const [countryCode, stateCode, city, businessName] = parts;
    return { kind: "full" as const, countryCode, stateCode, city, businessName };
  }
  if (parts.length === 2) {
    const [countryCode, businessName] = parts;
    return { kind: "country" as const, countryCode, businessName };
  }
  return null;
}

function parseShortLinkPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || parts[0] !== "go") return null;
  return parts[1];
}

function normalizeCode(value?: string) {
  return (value || "").trim().toLowerCase();
}

function isKnownAppPath(pathname: string) {
  const exactPaths = new Set([
    "/",
    "/index2",
    "/buscar",
    "/negocios",
    "/cadastro",
    "/entrar",
    "/redefinir-senha",
    "/perfil",
    "/negocio-verificado",
    "/sobre",
    "/contato",
    "/privacidade",
    "/termos",
    "/eventos",
    "/achadinhos",
    "/marketplace",
    "/marketplace/novo",
    "/negocio/wizard",
  ]);

  if (exactPaths.has(pathname)) return true;
  if (pathname.startsWith("/negocios/")) return true;
  if (pathname.startsWith("/eventos/")) return true;
  if (pathname.startsWith("/marketplace/")) {
    const parts = pathname.split("/").filter(Boolean);
    return (parts[1] === "novo" && parts.length === 2) || (parts[1] === "editar" && parts.length === 3) || parts.length === 5;
  }
  if (pathname.startsWith("/preview/negocio/")) return true;
  if (pathname.startsWith("/go/")) return true;
  return !!parseBusinessPath(pathname);
}

function parseMarketplacePath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 1 && parts[0] === "marketplace") return { kind: "index" as const };
  if (parts.length === 2 && parts[0] === "marketplace" && parts[1] === "novo") return { kind: "new" as const };
  if (parts.length === 5 && parts[0] === "marketplace") return { kind: "listing" as const, countryCode: parts[1], stateCode: parts[2], city: parts[3], slug: parts[4] };
  return null;
}

async function fetchPublicBusinessesForSsr(): Promise<BusinessFrontend[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await getPublicBusinessDirectoryIndex();
    } catch (error) {
      lastError = error;
      console.error("[onBeforeRender] public directory index failed:", error);
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to load public businesses for SSR.");
}

// The server may inspect the compact index to build a route-specific snapshot,
// but it never passes the complete directory to the browser.
async function getPublicBusinessesForSsr(): Promise<BusinessFrontend[]> {
  if (publicDirectoryCache && publicDirectoryCache.expiresAt > Date.now()) {
    return publicDirectoryCache.value;
  }

  if (!publicDirectoryRequest) {
    publicDirectoryRequest = fetchPublicBusinessesForSsr()
      .then((businesses) => {
        publicDirectoryCache = {
          value: businesses,
          expiresAt: Date.now() + PUBLIC_DIRECTORY_CACHE_TTL_MS,
        };
        return businesses;
      })
      .finally(() => {
        publicDirectoryRequest = null;
      });
  }

  return publicDirectoryRequest;
}

async function getPublicSearchMetadata(): Promise<PublicSearchMetadata> {
  if (publicSearchMetadataCache && publicSearchMetadataCache.expiresAt > Date.now()) {
    return publicSearchMetadataCache.value;
  }

  if (!publicSearchMetadataRequest) {
    publicSearchMetadataRequest = Promise.all([
      getAvailableLocations().catch(() => [] as AvailableLocation[]),
      getSearchSuggestions().catch(() => [] as string[]),
      getGlobalCategorySynonymsConfig().catch(() => DEFAULT_CATEGORY_SYNONYMS),
    ])
      .then(([availableLocations, searchSuggestions, searchSynonyms]) => {
        const metadata = { availableLocations, searchSuggestions, searchSynonyms };
        publicSearchMetadataCache = {
          value: metadata,
          expiresAt: Date.now() + PUBLIC_SEARCH_METADATA_CACHE_TTL_MS,
        };
        return metadata;
      })
      .finally(() => {
        publicSearchMetadataRequest = null;
      });
  }

  return publicSearchMetadataRequest;
}

async function getPublicSearchData(urlOriginal?: string) {
  const params = new URL(urlOriginal || "/buscar", "https://www.caramelinho.com").searchParams;
  const { availableLocations, searchSuggestions, searchSynonyms } = await getPublicSearchMetadata();

  if (!isPublicBusinessSearch(params)) {
    return {
      initialAvailableLocations: availableLocations,
      initialSearchSuggestions: searchSuggestions,
      initialSearchSynonyms: searchSynonyms,
    };
  }

  const request = buildPublicSearchPageRequest(params, undefined, searchSynonyms);
  try {
    const page = await getBusinessesByPublicSearchRpc(request);
    return {
      initialSearchSnapshot: {
        requestKey: request.key,
        page: request.page,
        totalCount: page.totalCount,
        businesses: page.items,
      },
      initialAvailableLocations: availableLocations,
      initialSearchSuggestions: searchSuggestions,
      initialSearchSynonyms: searchSynonyms,
    };
  } catch (error) {
    // Do not fall back to the complete catalog here. A failed paginated RPC must
    // remain a failed search rather than transferring every public business.
    console.error("[onBeforeRender] public search RPC unavailable:", error);
    return {
      initialAvailableLocations: availableLocations,
      initialSearchSuggestions: searchSuggestions,
      initialSearchSynonyms: searchSynonyms,
    };
  }
}

async function getPublicHomeData() {
  const [businesses, marketplacePage] = await Promise.all([
    getPublicBusinessesForSsr(),
    getMarketplacePage({ page: 1, pageSize: 3 }).catch(() => ({ items: [], totalCount: 0 })),
  ]);
  const [featuredBusinesses, searchMetadata] = await Promise.all([
    getFeaturedBusinessesForRegion(null, 6).catch(() => [] as BusinessFrontend[]),
    getPublicSearchMetadata(),
  ]);

  return {
    initialHomeSnapshot: buildHomePublicSnapshot(businesses),
    initialFeaturedBusinesses: featuredBusinesses,
    initialRecentBusinesses: businesses.slice(0, 5),
    initialAvailableLocations: searchMetadata.availableLocations,
    initialSearchSuggestions: searchMetadata.searchSuggestions,
    initialSearchSynonyms: searchMetadata.searchSynonyms,
    initialMarketplaceSnapshot: buildMarketplaceSnapshot(marketplacePage, []),
  };
}
export async function onBeforeRender(pageContext: PageContext) {
  const isPrerendering = !!pageContext.isPrerendering;
  const pathname = (() => {
    try {
      return new URL(pageContext.urlOriginal || "/", "http://localhost").pathname;
    } catch {
      return "/";
    }
  })();

  if (!isKnownAppPath(pathname)) {
    if (isPrerendering) {
      return {
        pageContext: {
          initialBusiness: null,
          isBusinessPage: false,
        },
      };
    }
    throw render(404);
  }

  if (pathname.startsWith("/eventos/")) {
    const eventId = pathname.split("/").filter(Boolean).at(-1) || "";
    const event = eventId ? await getCommunityEventById(eventId).catch(() => null) : null;

    if (!event) {
      if (isPrerendering) {
        return { pageContext: { initialEvent: null, isBusinessPage: false, isEventPage: true } };
      }
      throw render(404);
    }

    return {
      pageContext: {
        initialEvent: event,
        initialBusiness: null,
        isBusinessPage: false,
        isEventPage: true,
      },
    };
  }

  const marketplaceRoute = parseMarketplacePath(pathname);
  if (marketplaceRoute?.kind === "index") {
    if (pageContext.isClientSideNavigation) return { pageContext: { isBusinessPage: false } };
    try {
      const [page, categories] = await Promise.all([getMarketplacePage({ page: 1, pageSize: 12 }), getMarketplaceCategories()]);
      return { pageContext: { initialMarketplaceSnapshot: buildMarketplaceSnapshot(page, categories), isBusinessPage: false } };
    } catch (error) {
      console.error("[onBeforeRender] marketplace index failed:", error);
      return { pageContext: { initialMarketplaceSnapshot: buildMarketplaceSnapshot({ items: [], totalCount: 0 }, []), isBusinessPage: false } };
    }
  }

  if (marketplaceRoute?.kind === "listing") {
    let listing: import("@/types/database").MarketplaceListing | null;
    try {
      listing = await getMarketplaceListingByPath(
        marketplaceRoute.countryCode,
        marketplaceRoute.stateCode,
        decodeURIComponent(marketplaceRoute.city),
        marketplaceRoute.slug,
      );
    } catch (error) {
      console.error("[onBeforeRender] marketplace listing lookup failed:", error);
      if (isPrerendering) throw error;
      throw render(503);
    }

    if (!listing && !isPrerendering) throw render(404);
    return { pageContext: { initialMarketplaceListing: listing, isBusinessPage: false } };
  }

  if (marketplaceRoute?.kind === "new" || pathname.startsWith("/marketplace/editar/")) {
    return { pageContext: { isBusinessPage: false } };
  }

  if (pathname === "/index2") {
    throw redirect("/", 301);
  }

  if (pathname === "/") {
    return {
      pageContext: {
        ...(await getPublicHomeData()),
        initialBusiness: null,
        isBusinessPage: false,
      },
    };
  }

  if (pathname === "/achadinhos") {
    throw redirect("/marketplace", 301);
  }

  if (pathname === "/buscar") {
    const searchUrl = new URL(pageContext.urlOriginal || "/buscar", "http://localhost");
    if (searchUrl.searchParams.get("achadinhos") === "1" || searchUrl.searchParams.has("achadinho")) {
      throw redirect("/marketplace", 301);
    }
    if (pageContext.isClientSideNavigation) {
      return {
        pageContext: {
          initialBusiness: null,
          initialBusinesses: [],
          initialAvailableLocations: [],
          initialSearchSuggestions: [],
          isBusinessPage: false,
        },
      };
    }

    return {
      pageContext: {
        ...(await getPublicSearchData(pageContext.urlOriginal)),
        initialBusiness: null,
        isBusinessPage: false,
      },
    };
  }

  if (pathname === "/negocios" || pathname.startsWith("/negocios/")) {
    const directoryRoute = parseDirectoryRoute(pathname);
    if (!directoryRoute) throw render(404);

    const businesses = await getPublicBusinessesForSsr();
    const countryCode = normalizeCode(directoryRoute.countryCode);
    const stateCode = normalizeCode(directoryRoute.stateCode);
    const citySlug = slugify(directoryRoute.citySlug || "");

    const countryBusinesses = countryCode
      ? businesses.filter((business) => normalizeCode(business.address.countryCode) === countryCode)
      : businesses;
    if (countryCode && countryBusinesses.length === 0) throw render(404);

    const stateBusinesses = stateCode
      ? countryBusinesses.filter((business) => normalizeCode(business.address.stateCode) === stateCode)
      : countryBusinesses;
    if (stateCode && stateBusinesses.length === 0) throw render(404);

    if (citySlug) {
      const canonicalCitySlug = await resolveCanonicalLocationSlug(countryCode, stateCode, citySlug).catch(() => null);
      if (canonicalCitySlug && canonicalCitySlug !== citySlug) {
        throw redirect(buildDirectoryPagePath({ ...directoryRoute, citySlug: canonicalCitySlug }), 301);
      }

      const cityBusinesses = stateBusinesses.filter(
        (business) => getDirectoryBusinessCitySlug(business) === citySlug,
      );
      if (cityBusinesses.length === 0) throw render(404);

      const category = directoryRoute.categorySlug
        ? getDirectoryCategoryBySlug(directoryRoute.categorySlug)
        : null;
      const currentBusinesses = directoryRoute.categorySlug
        ? category
          ? getDirectoryCategoryBusinesses(businesses, countryCode, stateCode, citySlug, category)
          : []
        : cityBusinesses;

      if (directoryRoute.categorySlug && (!category || currentBusinesses.length < DIRECTORY_CATEGORY_MINIMUM_BUSINESSES)) {
        throw render(404);
      }

      const totalPages = Math.max(1, Math.ceil(currentBusinesses.length / DIRECTORY_PAGE_SIZE));
      if (directoryRoute.page < 1 || directoryRoute.page > totalPages) throw render(404);
    }

    return {
      pageContext: {
        initialDirectorySnapshot: buildDirectoryPageSnapshot(pathname, businesses) || undefined,
        initialBusiness: null,
        isBusinessPage: false,
      },
    };
  }

  const shortLinkSlug = parseShortLinkPath(pathname);
  if (shortLinkSlug) {
    let business: BusinessFrontend | null = null;
    try {
      business = await getBusinessByShortSlug(shortLinkSlug);
    } catch (error) {
      console.error("[onBeforeRender] short link lookup failed:", error);
    }

    if (!business) {
      if (isPrerendering) {
        return {
          pageContext: {
            initialBusiness: null,
            isBusinessPage: false,
          },
        };
      }
      throw render(404);
    }

    const canonicalPath = buildBusinessUrl(business);
    const search = new URL(pageContext.urlOriginal || "/", "http://localhost").search;
    if (canonicalPath !== pathname) {
      throw redirect(`${canonicalPath}${search}`, 301);
    }
  }

  const businessRoute = parseBusinessPath(pathname);
  if (!businessRoute) {
    return {
      pageContext: {
        initialBusiness: null,
        isBusinessPage: false,
      },
    };
  }

  let business: BusinessFrontend | null = null;
  try {
    if (businessRoute.kind === "full") {
      business = await getBusinessBySlug(
        businessRoute.countryCode,
        businessRoute.stateCode,
        businessRoute.city,
        businessRoute.businessName,
      );
    } else if (businessRoute.kind === "country") {
      business = await getBusinessByCountryAndSlug(businessRoute.countryCode, businessRoute.businessName);
    }
  } catch (error) {
    console.error("[onBeforeRender] business lookup failed:", error);
    business = null;
  }

  if (!business && businessRoute.kind === "full") {
    try {
      business = await getBusinessByHistoricalPath(
        businessRoute.countryCode,
        businessRoute.stateCode,
        businessRoute.city,
        businessRoute.businessName,
      );
    } catch (error) {
      console.error("[onBeforeRender] business history lookup failed:", error);
    }
  }

  if (!business) {
    if (isPrerendering) {
      return {
        pageContext: {
          initialBusiness: null,
          isBusinessPage: true,
        },
      };
    }
    throw render(404);
  }

  const canonicalPath = buildBusinessUrl(business);
  if (canonicalPath !== pathname) {
    const search = new URL(pageContext.urlOriginal || "/", "http://localhost").search;
    throw redirect(`${canonicalPath}${search}`, 301);
  }

  let similarBusinesses: BusinessFrontend[] = [];
  try {
    similarBusinesses = await getSimilarBusinessesForBusiness(business);
  } catch (error) {
    console.error("[onBeforeRender] similar businesses lookup failed:", error);
  }

  return {
    pageContext: {
      initialBusiness: business,
      initialSimilarBusinesses: similarBusinesses,
      isBusinessPage: !!businessRoute,
    },
  };
}
