import type { BusinessFrontend } from "@/types/database";
import { getCanonicalCitySlug, getCityDisplayName } from "@/lib/locationDisplay";

export type HomeCitySummary = {
  displayName: string;
  countryCode: string;
  stateCode: string;
  count: number;
  href: string;
};

export type HomePublicSnapshot = {
  businessCount: number;
  cityCount: number;
  countryCount: number;
  categoryCount: number;
  categoryCounts: Record<string, number>;
  popularCities: HomeCitySummary[];
};

// The home only needs aggregates and a few city links for its first render.
// Keep the complete business index out of Vike's serialized page context.
export function buildHomePublicSnapshot(businesses: BusinessFrontend[]): HomePublicSnapshot {
  const cities = new Set<string>();
  const countries = new Set<string>();
  const activeCategories = new Set<string>();
  const categoryCounts: Record<string, number> = {};
  const cityCounts = new Map<string, HomeCitySummary>();

  businesses.forEach((business) => {
    const categoryId = business.categoryId?.trim();
    if (categoryId) {
      activeCategories.add(categoryId);
      categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
    }

    const address = business.address;
    const countryCode = address?.countryCode?.trim().toLowerCase();
    const stateCode = address?.stateCode?.trim().toLowerCase();
    const city = address?.city?.trim();
    if (!countryCode || !stateCode || !city) return;

    const citySlug = getCanonicalCitySlug(city, countryCode);
    if (!citySlug) return;

    countries.add(countryCode);
    const key = `${countryCode}-${stateCode}-${citySlug}`;
    cities.add(key);
    const current = cityCounts.get(key);
    cityCounts.set(key, {
      displayName:
        current?.displayName ||
        getCityDisplayName(address.cityDisplayName || city, countryCode) ||
        city,
      countryCode,
      stateCode,
      count: (current?.count || 0) + 1,
      href: `/negocios/${countryCode}/${stateCode}/${citySlug}`,
    });
  });

  return {
    businessCount: businesses.length,
    cityCount: cities.size,
    countryCount: countries.size,
    categoryCount: activeCategories.size,
    categoryCounts,
    popularCities: Array.from(cityCounts.values())
      .sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName, "pt-BR"))
      .slice(0, 6),
  };
}