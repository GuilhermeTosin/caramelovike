import type { PageContextServer } from "vike/types";
import { redirect, render } from "vike/abort";
import {
  getPublicBusinessSearchIndex,
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

type DirectoryRoute = {
  countryCode?: string;
  stateCode?: string;
  citySlug?: string;
  categorySlug?: string;
  page: number;
};

function parseDirectoryPath(pathname: string): DirectoryRoute | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "negocios") return null;
  if (parts.length === 1) return { page: 1 };
  if (parts.length === 2) return { countryCode: parts[1], page: 1 };
  if (parts.length === 3) return { countryCode: parts[1], stateCode: parts[2], page: 1 };
  if (parts.length === 4) return { countryCode: parts[1], stateCode: parts[2], citySlug: parts[3], page: 1 };
  if (parts.length === 5) return { countryCode: parts[1], stateCode: parts[2], citySlug: parts[3], categorySlug: parts[4], page: 1 };
  if (parts.length === 6 && parts[4] === "pagina" && /^\d+$/.test(parts[5])) {
    return { countryCode: parts[1], stateCode: parts[2], citySlug: parts[3], page: Number(parts[5]) };
  }
  if (parts.length === 7 && parts[5] === "pagina" && /^\d+$/.test(parts[6])) {
    return { countryCode: parts[1], stateCode: parts[2], citySlug: parts[3], categorySlug: parts[4], page: Number(parts[6]) };
  }
  return null;
}

function normalizeCode(value?: string) {
  return (value || "").trim().toLowerCase();
}

function buildDirectoryPath(route: DirectoryRoute, citySlug = route.citySlug) {
  const parts = ["negocios", route.countryCode, route.stateCode, citySlug, route.categorySlug].filter(Boolean);
  const base = "/" + parts.join("/");
  return route.page > 1 ? base + "/pagina/" + route.page : base;
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

// Public directory pages only need this compact index during hydration. It avoids
// serializing descriptions, galleries, reviews and contact data for every business.
function toDirectorySsrBusiness(business: BusinessFrontend): BusinessFrontend {
  return {
    id: business.id,
    ownerId: "",
    ownerName: "",
    name: business.name,
    slug: business.slug,
    categoryId: business.categoryId,
    category: business.category,
    primaryActivity: business.primaryActivity,
    primaryActivityCustom: business.primaryActivityCustom,
    description: "",
    heroImage: "",
    logoUrl: business.logoUrl,
    address: {
      street: business.address.street,
      city: business.address.city,
      citySlug: business.address.citySlug,
      cityDisplayName: business.address.cityDisplayName,
      state: business.address.state,
      country: business.address.country,
      countryCode: business.address.countryCode,
      stateCode: business.address.stateCode,
      postalCode: "",
      lat: business.address.lat,
      lng: business.address.lng,
    },
    attendanceType: business.attendanceType,
    services: [],
    serviceItems: [],
    keywords: [],
    menu: [],
    isBrazilianOwned: false,
    servesPortuguese: false,
    isVeganFriendly: false,
    isVegetarianFriendly: false,
    isGlutenFreeFriendly: false,
    photos: [],
    phone: "",
    email: "",
    website: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
    reviews: [],
    averageRating: business.averageRating,
    ownerVerified: business.ownerVerified,
    ownerVerifiedUntil: business.ownerVerifiedUntil,
    moderationStatus: business.moderationStatus,
    moderationReviewedAt: business.moderationReviewedAt,
    moderationReviewedBy: business.moderationReviewedBy,
    openingHours: [],
    promotions: [],
    events: [],
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
  };
}

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

async function getPublicDirectoryData(includeFeatured: boolean) {
  const businesses = await getPublicBusinessesForSsr();
  const [featuredBusinesses, availableLocations, searchSuggestions] = await Promise.all([
    includeFeatured
      ? getFeaturedBusinessesForRegion(null, 6).catch(() => [] as BusinessFrontend[])
      : Promise.resolve([] as BusinessFrontend[]),
    getAvailableLocations().catch(() => [] as AvailableLocation[]),
    getSearchSuggestions().catch(() => [] as string[]),
  ]);

  return {
    initialBusinesses: businesses.map(toDirectorySsrBusiness),
    initialFeaturedBusinesses: featuredBusinesses,
    initialAvailableLocations: availableLocations,
    initialSearchSuggestions: searchSuggestions,
  };
}

async function getPublicSearchData(includeFeatured: boolean) {
  const [businesses, featuredBusinesses, availableLocations, searchSuggestions] = await Promise.all([
    getPublicBusinessSearchIndex(),
    includeFeatured
      ? getFeaturedBusinessesForRegion(null, 6).catch(() => [] as BusinessFrontend[])
      : Promise.resolve([] as BusinessFrontend[]),
    getAvailableLocations().catch(() => [] as AvailableLocation[]),
    getSearchSuggestions().catch(() => [] as string[]),
  ]);

  return {
    initialBusinesses: businesses,
    initialBusinessesAreSearchReady: true,
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
        ...(await getPublicSearchData(true)),
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
        ...(await getPublicSearchData(false)),
        initialBusiness: null,
        isBusinessPage: false,
      },
    };
  }

  if (pathname === "/negocios" || pathname.startsWith("/negocios/")) {
    const directoryRoute = parseDirectoryPath(pathname);
    if (!directoryRoute) throw render(404);

    const publicDirectoryData = await getPublicDirectoryData(false);
    const businesses = publicDirectoryData.initialBusinesses || [];
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
        throw redirect(buildDirectoryPath(directoryRoute, canonicalCitySlug), 301);
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
        ...publicDirectoryData,
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
