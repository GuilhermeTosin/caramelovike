import type { BusinessFrontend } from "@/types/database";
import {
  DIRECTORY_CATEGORIES,
  DIRECTORY_CATEGORY_MINIMUM_BUSINESSES,
  getDirectoryBusinessCitySlug,
} from "@/lib/directoryCategories";

export type DirectoryScope = {
  countryCode?: string;
  stateCode?: string;
  citySlug?: string;
};

export type DirectoryCategoryInsight = {
  key: string;
  label: string;
  slug?: string;
  count: number;
  isIndexable: boolean;
};

export type DirectoryInsights = {
  totalBusinesses: number;
  totalActivities: number;
  verifiedBusinesses: number;
  latestCreatedAt?: string;
  categories: DirectoryCategoryInsight[];
};

function normalizeCode(value?: string) {
  return (value || "").trim().toLowerCase();
}

function isValidDate(value?: string) {
  return Boolean(value && Number.isFinite(new Date(value).getTime()));
}

function getBusinessTime(value?: string) {
  return isValidDate(value) ? new Date(value as string).getTime() : 0;
}

function sortByRecent(a: BusinessFrontend, b: BusinessFrontend) {
  const dateDifference = getBusinessTime(b.createdAt) - getBusinessTime(a.createdAt);
  return dateDifference || a.name.localeCompare(b.name, "pt-BR");
}

export function getBusinessesInDirectoryScope(
  businesses: BusinessFrontend[],
  scope: DirectoryScope = {},
): BusinessFrontend[] {
  const countryCode = normalizeCode(scope.countryCode);
  const stateCode = normalizeCode(scope.stateCode);
  const citySlug = normalizeCode(scope.citySlug);

  return businesses.filter((business) => {
    if (countryCode && normalizeCode(business.address.countryCode) !== countryCode) return false;
    if (stateCode && normalizeCode(business.address.stateCode) !== stateCode) return false;
    if (citySlug && getDirectoryBusinessCitySlug(business) !== citySlug) return false;
    return true;
  });
}

export function getDirectoryInsights(
  businesses: BusinessFrontend[],
  scope: DirectoryScope = {},
): DirectoryInsights {
  const scopedBusinesses = getBusinessesInDirectoryScope(businesses, scope);
  const categoryDefinitions = new Map(DIRECTORY_CATEGORIES.map((category) => [category.categoryId, category]));
  const categories = new Map<string, DirectoryCategoryInsight>();

  for (const business of scopedBusinesses) {
    const activity = (business.primaryActivity || business.categoryId || business.category || "other").trim();
    const definition = categoryDefinitions.get(activity);
    const current = categories.get(activity);
    categories.set(activity, {
      key: activity,
      label: definition?.label || business.category || "Outros servi\u00e7os",
      slug: definition?.slug,
      count: (current?.count || 0) + 1,
      isIndexable: false,
    });
  }

  const isCityScope = Boolean(scope.countryCode && scope.stateCode && scope.citySlug);
  const categoryList = Array.from(categories.values())
    .map((category) => ({
      ...category,
      isIndexable: Boolean(isCityScope && category.slug && category.count >= DIRECTORY_CATEGORY_MINIMUM_BUSINESSES),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
  const recent = [...scopedBusinesses].filter((business) => isValidDate(business.createdAt)).sort(sortByRecent);

  return {
    totalBusinesses: scopedBusinesses.length,
    totalActivities: categoryList.length,
    verifiedBusinesses: scopedBusinesses.filter((business) => business.ownerVerified).length,
    latestCreatedAt: recent[0]?.createdAt,
    categories: categoryList,

  };
}