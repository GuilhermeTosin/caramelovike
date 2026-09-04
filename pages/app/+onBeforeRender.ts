import type { PageContextServer } from "vike/types";
import { redirect, render } from "vike/abort";
import {
  getPublicBusinessSearchIndex,
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

type AvailableLocation = {
  countryCode: string;
  countryName: string;
  states: Array<{ code: string; name: string; cities: string[] }>;
};

type PageContext = PageContextServer & {
  urlOriginal?: string;
  initialBusiness?: BusinessFrontend | null;
  initialSimilarBusinesses?: BusinessFrontend[];
  initialBusinesses?: BusinessFrontend[];
  initialBusinessesAreSearchReady?: boolean;
  initialFeaturedBusinesses?: BusinessFrontend[];
  initialAvailableLocations?: AvailableLocation[];
  initialSearchSuggestions?: string[];
  initialSearchSnapshot?: PublicSearchPageSnapshot;
  initialHomeSnapshot?: HomePublicSnapshot;
  initialDirectorySnapshot?: DirectoryPageSnapshot;
  initialEvent?: CommunityEvent | null;
  isBusinessPage?: boolean;
  isEventPage?: boolean;
  isPrerendering?: boolean;
};

function parseBusinessPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
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
    "/negocio/wizard",
  ]);

  if (exactPaths.has(pathname)) return true;
  if (pathname.startsWith("/negocios/")) return true;
  if (pathname.startsWith("/eventos/")) return true;
  if (pathname.startsWith("/preview/negocio/")) return true;
  if (pathname.startsWith("/go/")) return true;
  return !!parseBusinessPath(pathname);
}

// The server may inspect the compact index to build a route-specific snapshot,
// but it never passes the complete directory to the browser.
async function getPublicBusinessesForSsr(): Promise<BusinessFrontend[]> {
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
async function getPublicSearchData(urlOriginal?: string) {
  const params = new URL(urlOriginal || "/buscar", "https://www.caramelinho.com").searchParams;
  const [availableLocations, searchSuggestions] = await Promise.all([
    getAvailableLocations().catch(() => [] as AvailableLocation[]),
    getSearchSuggestions().catch(() => [] as string[]),
  ]);

  if (!isPublicBusinessSearch(params)) {
    return { initialAvailableLocations: availableLocations, initialSearchSuggestions: searchSuggestions };
  }

  const request = buildPublicSearchPageRequest(params);
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
    };
  } catch (error) {
    // The full index fallback prevents an outage while a newly deployed RPC is
    // being applied in Supabase. It is removed from the rendered payload as soon
    // as migration 00038 is available.
    console.error("[onBeforeRender] public search RPC unavailable:", error);
    return {
      initialBusinesses: await getPublicBusinessSearchIndex().catch(() => getPublicBusinessesForSsr()),
      initialBusinessesAreSearchReady: true,
      initialAvailableLocations: availableLocations,
      initialSearchSuggestions: searchSuggestions,
    };
  }
}

async function getPublicHomeData() {
  const businesses = await getPublicBusinessesForSsr();
  const [featuredBusinesses, availableLocations, searchSuggestions] = await Promise.all([
    getFeaturedBusinessesForRegion(null, 6).catch(() => [] as BusinessFrontend[]),
    getAvailableLocations().catch(() => [] as AvailableLocation[]),
    getSearchSuggestions().catch(() => [] as string[]),
  ]);

  return {
    initialHomeSnapshot: buildHomePublicSnapshot(businesses),
    initialFeaturedBusinesses: featuredBusinesses,
    initialAvailableLocations: availableLocations,
    initialSearchSuggestions: searchSuggestions,
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
    const eventId = pathname.split("/").filter(Boolean)[1] || "";
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

  if (pathname === "/") {
    return {
      pageContext: {
        ...(await getPublicHomeData()),
        initialBusiness: null,
        isBusinessPage: false,
      },
    };
  }

  if (pathname === "/buscar") {
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
