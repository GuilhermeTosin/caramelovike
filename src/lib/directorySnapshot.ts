import type { BusinessFrontend } from "@/types/database";
import type { SiteLocale } from "@/lib/locales";
import { getCountryName, getStateDisplayName, slugify } from "@/services/businesses";
import { getCityDisplayName } from "@/lib/locationDisplay";
import { getDirectoryInsights, type DirectoryInsights } from "@/lib/directoryInsights";
import { getDirectoryPageMeta, type DirectoryPageMeta } from "@/lib/seo/directoryMeta";
import {
  DIRECTORY_PAGE_SIZE,
  getDirectoryBusinessCitySlug,
  getDirectoryCategoryBusinesses,
  getDirectoryCategoryBySlug,
  type DirectoryCategoryDefinition,
} from "@/lib/directoryCategories";

export type DirectoryLevel = "countries" | "states" | "cities" | "businesses" | "categoryBusinesses";

export type DirectoryNavigationItem = {
  label: string;
  href: string;
  count: number;
};

export type DirectoryRoute = {
  locale?: SiteLocale;
  countryCode: string;
  stateCode: string;
  citySlug: string;
  categorySlug: string;
  page: number;
};

export type DirectoryPageSnapshot = {
  pathname: string;
  level: DirectoryLevel;
  route: DirectoryRoute;
  category: Pick<DirectoryCategoryDefinition, "slug" | "label"> | null;
  labels: { country: string; state: string; city: string };
  pageMeta: DirectoryPageMeta;
  insights: DirectoryInsights | null;
  gridItems: DirectoryNavigationItem[];
  relatedCities: DirectoryNavigationItem[];
  totalBusinesses: number;
  totalPages: number;
  pageBusinesses: BusinessFrontend[];
};

function normalizeCode(value?: string) {
  return (value || "").trim().toLowerCase();
}

function isCodeLikeStateLabel(value: string, stateCode: string) {
  const label = (value || "").trim();
  const code = (stateCode || "").trim();
  return !!label && !!code && label.toLowerCase() === code.toLowerCase();
}

function preferStateLabel(current: string, candidate: string, stateCode: string) {
  const currentLabel = (current || "").trim();
  const candidateLabel = (candidate || "").trim();
  if (!candidateLabel) return currentLabel;
  if (!currentLabel) return candidateLabel;

  const currentCodeLike = isCodeLikeStateLabel(currentLabel, stateCode);
  const candidateCodeLike = isCodeLikeStateLabel(candidateLabel, stateCode);
  if (currentCodeLike && !candidateCodeLike) return candidateLabel;
  if (!currentCodeLike && candidateCodeLike) return currentLabel;
  return candidateLabel.length > currentLabel.length && !candidateCodeLike ? candidateLabel : currentLabel;
}

function sortBusinesses(a: BusinessFrontend, b: BusinessFrontend) {
  const countryCompare = (a.address.country || a.address.countryCode || "").localeCompare(
    b.address.country || b.address.countryCode || "",
    "pt-BR",
  );
  if (countryCompare !== 0) return countryCompare;

  const stateCompare = (a.address.state || a.address.stateCode || "").localeCompare(
    b.address.state || b.address.stateCode || "",
    "pt-BR",
  );
  if (stateCompare !== 0) return stateCompare;

  const cityCompare = (a.address.city || "").localeCompare(b.address.city || "", "pt-BR");
  return cityCompare || a.name.localeCompare(b.name, "pt-BR");
}

function countBy(values: string[]) {
  return values.reduce((acc, value) => {
    acc.set(value, (acc.get(value) || 0) + 1);
    return acc;
  }, new Map<string, number>());
}

export function parseDirectoryRoute(pathname: string): DirectoryRoute | null {
  const parts = pathname.split("/").filter(Boolean);
  const locale: SiteLocale = parts[0] === "en" && parts[1] === "businesses" ? "en" : "pt-BR";
  const routeParts = locale === "en" ? parts.slice(2) : parts.slice(1);

  if (locale === "pt-BR" && parts[0] !== "negocios") return null;
  if (locale === "en" && (parts[0] !== "en" || parts[1] !== "businesses")) return null;

  const route: DirectoryRoute = {
    locale,
    countryCode: normalizeCode(routeParts[0]),
    stateCode: normalizeCode(routeParts[1]),
    citySlug: slugify(routeParts[2] || ""),
    categorySlug: "",
    page: 1,
  };

  if (routeParts.length <= 3) return route;
  if (routeParts.length === 4) {
    route.categorySlug = slugify(routeParts[3]);
    return route;
  }
  if (routeParts.length === 5 && routeParts[3] === "pagina" && /^\d+$/.test(routeParts[4])) {
    route.page = Number(routeParts[4]);
    return route;
  }
  if (routeParts.length === 6 && routeParts[4] === "pagina" && /^\d+$/.test(routeParts[5])) {
    route.categorySlug = slugify(routeParts[3]);
    route.page = Number(routeParts[5]);
    return route;
  }
  return null;
}

export function buildDirectoryPagePath(route: DirectoryRoute, page = route.page) {
  const prefix = route.locale === "en" ? ["en", "businesses"] : ["negocios"];
  const parts = [...prefix, route.countryCode, route.stateCode, route.citySlug, route.categorySlug].filter(Boolean);
  const base = `/${parts.join("/")}`;
  return page <= 1 ? base : `${base}/pagina/${page}`;
}

function compactDirectoryBusiness(business: BusinessFrontend): BusinessFrontend {
  return {
    ...business,
    ownerId: "",
    ownerName: "",
    description: "",
    // The paginated directory passes this item into the business route on click.
    // Keep the cover URL so the public page never flashes the generic fallback.
    heroImage: business.heroImage,
    services: [],
    serviceItems: [],
    keywords: [],
    menu: [],
    photos: [],
    phone: "",
    email: "",
    website: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
    reviews: [],
    openingHours: [],
    promotions: [],
    events: [],
  };
}

export function buildDirectoryPageSnapshot(
  pathname: string,
  businesses: BusinessFrontend[],
): DirectoryPageSnapshot | null {
  const route = parseDirectoryRoute(pathname);
  if (!route) return null;

  const sortedBusinesses = [...businesses].sort(sortBusinesses);
  const countryBusinesses = route.countryCode
    ? sortedBusinesses.filter((business) => normalizeCode(business.address.countryCode) === route.countryCode)
    : sortedBusinesses;
  const stateBusinesses = route.stateCode
    ? countryBusinesses.filter((business) => normalizeCode(business.address.stateCode) === route.stateCode)
    : countryBusinesses;
  const cityBusinesses = route.citySlug
    ? stateBusinesses.filter((business) => getDirectoryBusinessCitySlug(business) === route.citySlug)
    : stateBusinesses;
  const category = route.categorySlug ? getDirectoryCategoryBySlug(route.categorySlug) : null;
  const level: DirectoryLevel = route.categorySlug
    ? "categoryBusinesses"
    : !route.countryCode
      ? "countries"
      : !route.stateCode
        ? "states"
        : !route.citySlug
          ? "cities"
          : "businesses";
  const currentBusinesses = level === "categoryBusinesses" && category
    ? getDirectoryCategoryBusinesses(sortedBusinesses, route.countryCode, route.stateCode, route.citySlug, category)
    : level === "businesses"
      ? cityBusinesses
      : [];
  const totalPages = Math.max(1, Math.ceil(currentBusinesses.length / DIRECTORY_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, route.page), totalPages);

  const stateNameByCode = new Map<string, string>();
  countryBusinesses.forEach((business) => {
    const code = normalizeCode(business.address.stateCode);
    if (!code) return;
    const candidate = getStateDisplayName(route.countryCode, code, business.address.state);
    stateNameByCode.set(code, preferStateLabel(stateNameByCode.get(code) || "", candidate, code));
  });
  const cityNameBySlug = new Map<string, string>();
  stateBusinesses.forEach((business) => {
    const slug = getDirectoryBusinessCitySlug(business);
    if (!slug || cityNameBySlug.has(slug)) return;
    cityNameBySlug.set(
      slug,
      getCityDisplayName(
        business.address.cityDisplayName || business.address.city,
        business.address.countryCode || business.address.country,
      ) || "Cidade",
    );
  });

  const countryCounts = countBy(sortedBusinesses.map((business) => normalizeCode(business.address.countryCode)).filter(Boolean));
  const stateCounts = countBy(countryBusinesses.map((business) => normalizeCode(business.address.stateCode)).filter(Boolean));
  const cityCounts = countBy(stateBusinesses.map(getDirectoryBusinessCitySlug).filter(Boolean));
  const gridItems: DirectoryNavigationItem[] = level === "countries"
    ? Array.from(countryCounts.entries()).map(([code, count]) => ({
      label: getCountryName(code) || code.toUpperCase(), href: buildDirectoryPagePath({ ...route, countryCode: code, stateCode: "", citySlug: "", categorySlug: "", page: 1 }), count,
    }))
    : level === "states"
      ? Array.from(stateCounts.entries()).map(([code, count]) => ({
        label: stateNameByCode.get(code) || getStateDisplayName(route.countryCode, code) || code.toUpperCase(),
        href: buildDirectoryPagePath({ ...route, stateCode: code, citySlug: "", categorySlug: "", page: 1 }),
        count,
      }))
      : level === "cities"
        ? Array.from(cityCounts.entries()).map(([slug, count]) => ({
          label: cityNameBySlug.get(slug) || slug,
          href: buildDirectoryPagePath({ ...route, citySlug: slug, categorySlug: "", page: 1 }),
          count,
        }))
        : [];

  const relatedCities = level === "businesses"
    ? Array.from(cityCounts.entries())
      .filter(([slug]) => slug !== route.citySlug)
      .map(([slug, count]) => ({
        label: cityNameBySlug.get(slug) || slug,
        href: buildDirectoryPagePath({ ...route, citySlug: slug, categorySlug: "", page: 1 }),
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
      .slice(0, 6)
    : [];

  const labels = {
    country: getCountryName(route.countryCode) || route.countryCode.toUpperCase(),
    state: stateNameByCode.get(route.stateCode) || getStateDisplayName(route.countryCode, route.stateCode) || route.stateCode.toUpperCase(),
    city: cityNameBySlug.get(route.citySlug) || route.citySlug,
  };
  const pageMeta = getDirectoryPageMeta(pathname, sortedBusinesses) || {
    heading: "Negócios brasileiros no exterior por país",
    title: "Negócios brasileiros no exterior por país | Caramelinho.com",
    description: "Encontre negócios brasileiros no exterior por país, estado e cidade.",
  };

  return {
    pathname,
    level,
    route: { ...route, page: safePage },
    category: category ? { slug: category.slug, label: category.label } : null,
    labels,
    pageMeta,
    insights: level === "categoryBusinesses" ? null : getDirectoryInsights(sortedBusinesses, route),
    gridItems,
    relatedCities,
    totalBusinesses: currentBusinesses.length,
    totalPages,
    pageBusinesses: currentBusinesses
      .slice((safePage - 1) * DIRECTORY_PAGE_SIZE, safePage * DIRECTORY_PAGE_SIZE)
      .map(compactDirectoryBusiness),
  };
}