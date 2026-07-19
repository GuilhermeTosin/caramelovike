import type { PageContextServer } from "vike/types";
import { redirect, render } from "vike/abort";
import {
  getAllBusinesses,
  getAvailableLocations,
  buildBusinessUrl,
  getBusinessByCountryAndSlug,
  getBusinessBySlug,
  getSearchSuggestions,
  resolveCanonicalLocationSlug,
} from "@/services/businesses";
import { getFeaturedBusinessesForRegion } from "@/services/featured";
import type { BusinessFrontend } from "@/types/database";
import { getSimilarBusinesses } from "@/lib/businessSimilar";

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
  initialFeaturedBusinesses?: BusinessFrontend[];
  initialAvailableLocations?: AvailableLocation[];
  initialSearchSuggestions?: string[];
  isBusinessPage?: boolean;
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

function parseDirectoryCityPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "negocios") return null;
  if (parts.length === 4) {
    const [, countryCode, stateCode, citySlug] = parts;
    return { countryCode, stateCode, citySlug, page: null as number | null };
  }
  if (parts.length === 6 && parts[4] === "pagina" && /^\d+$/.test(parts[5])) {
    const [, countryCode, stateCode, citySlug, , page] = parts;
    return { countryCode, stateCode, citySlug, page: Number(page) };
  }
  return null;
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

async function getPublicDirectoryData(includeFeatured: boolean) {
  const [businesses, featuredBusinesses, availableLocations, searchSuggestions] = await Promise.all([
    getAllBusinesses().catch(() => [] as BusinessFrontend[]),
    includeFeatured
      ? getFeaturedBusinessesForRegion(null, 6).catch(() => [] as BusinessFrontend[])
      : Promise.resolve([] as BusinessFrontend[]),
    getAvailableLocations().catch(() => [] as AvailableLocation[]),
    getSearchSuggestions().catch(() => [] as string[]),
  ]);

  return {
    initialBusinesses: businesses,
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

  if (pathname === "/") {
    return {
      pageContext: {
        ...(await getPublicDirectoryData(true)),
        initialBusiness: null,
        isBusinessPage: false,
      },
    };
  }

  if (pathname === "/buscar" || pathname === "/negocios" || pathname.startsWith("/negocios/")) {
    const directoryRoute = parseDirectoryCityPath(pathname);
    if (directoryRoute) {
      const canonicalCitySlug = await resolveCanonicalLocationSlug(
        directoryRoute.countryCode,
        directoryRoute.stateCode,
        directoryRoute.citySlug,
      ).catch(() => null);
      if (canonicalCitySlug && canonicalCitySlug !== directoryRoute.citySlug) {
        const pageSegment = directoryRoute.page && directoryRoute.page > 1 ? `/pagina/${directoryRoute.page}` : "";
        throw redirect(`/negocios/${directoryRoute.countryCode}/${directoryRoute.stateCode}/${canonicalCitySlug}${pageSegment}`, 301);
      }
    }
    return {
      pageContext: {
        ...(await getPublicDirectoryData(false)),
        initialBusiness: null,
        isBusinessPage: false,
      },
    };
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

  if (businessRoute.kind === "full") {
    const canonicalPath = buildBusinessUrl(business);
    if (canonicalPath !== pathname) {
      const search = new URL(pageContext.urlOriginal || "/", "http://localhost").search;
      throw redirect(`${canonicalPath}${search}`, 301);
    }
  }

  let similarBusinesses: BusinessFrontend[] = [];
  try {
    similarBusinesses = getSimilarBusinesses(business, await getAllBusinesses());
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
