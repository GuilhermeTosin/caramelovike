import { DIRECTORY_CATEGORIES as SHARED_DIRECTORY_CATEGORIES, DIRECTORY_CATEGORY_MINIMUM_BUSINESSES as SHARED_MINIMUM } from "../../shared/directoryCategories.js";
import type { BusinessFrontend } from "@/types/database";
import { getCanonicalCitySlug } from "@/lib/locationDisplay";
import { slugify } from "@/services/businesses";

export type DirectoryCategoryDefinition = {
  categoryId: string;
  slug: string;
  label: string;
};

export const DIRECTORY_CATEGORIES = SHARED_DIRECTORY_CATEGORIES as readonly DirectoryCategoryDefinition[];
export const DIRECTORY_CATEGORY_MINIMUM_BUSINESSES = SHARED_MINIMUM as number;

export function getDirectoryCategoryBySlug(slug?: string | null): DirectoryCategoryDefinition | null {
  const normalized = slugify(slug || "");
  return DIRECTORY_CATEGORIES.find((category) => category.slug === normalized) || null;
}

function getBusinessCitySlug(business: BusinessFrontend): string {
  return getCanonicalCitySlug(business.address.city, business.address.countryCode) || slugify(business.address.citySlug || "");
}

export function getDirectoryCategoryBusinesses(
  businesses: BusinessFrontend[],
  countryCode: string,
  stateCode: string,
  citySlug: string,
  category: DirectoryCategoryDefinition,
): BusinessFrontend[] {
  const normalizedCountry = countryCode.trim().toLowerCase();
  const normalizedState = stateCode.trim().toLowerCase();
  const normalizedCity = slugify(citySlug);

  return businesses.filter((business) =>
    business.primaryActivity === category.categoryId &&
    (business.address.countryCode || "").trim().toLowerCase() === normalizedCountry &&
    (business.address.stateCode || "").trim().toLowerCase() === normalizedState &&
    getBusinessCitySlug(business) === normalizedCity
  );
}

export function getEligibleDirectoryCategories(
  businesses: BusinessFrontend[],
  countryCode: string,
  stateCode: string,
  citySlug: string,
): Array<DirectoryCategoryDefinition & { count: number }> {
  return DIRECTORY_CATEGORIES
    .map((category) => ({
      ...category,
      count: getDirectoryCategoryBusinesses(businesses, countryCode, stateCode, citySlug, category).length,
    }))
    .filter((category) => category.count >= DIRECTORY_CATEGORY_MINIMUM_BUSINESSES);
}
