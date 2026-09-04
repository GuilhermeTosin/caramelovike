import type { BusinessFrontend } from "@/types/database";
import { calculateDistance } from "@/lib/utils/geo";

function normalizeLocationPart(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getSimilarBusinesses(
  business: BusinessFrontend,
  businesses: BusinessFrontend[],
  limit = 3,
): BusinessFrontend[] {
  const sourceCategoryId = business.categoryId;
  const sourceCountryCode = normalizeLocationPart(business.address.countryCode);
  const sourceStateCode = normalizeLocationPart(business.address.stateCode || business.address.state);
  const sourceCity = normalizeLocationPart(business.address.city);
  const hasSourceCoords = Number.isFinite(business.address.lat) && Number.isFinite(business.address.lng);

  const basePool = businesses
    .filter((item) => item.id !== business.id)
    .filter((item) => item.categoryId === sourceCategoryId)
    .filter((item) => normalizeLocationPart(item.address.countryCode) === sourceCountryCode);

  const sameCityMatches = basePool.filter((item) => {
    const itemCity = normalizeLocationPart(item.address.city);
    return !!sourceCity && !!itemCity && itemCity === sourceCity;
  });

  const fallbackRadiusMatches =
    sameCityMatches.length > 0 || !hasSourceCoords
      ? []
      : basePool
          .filter((item) => {
            const hasItemCoords = Number.isFinite(item.address.lat) && Number.isFinite(item.address.lng);
            if (!hasItemCoords) return false;
            return calculateDistance(
              business.address.lat,
              business.address.lng,
              item.address.lat,
              item.address.lng,
            ) <= 50;
          })
          .sort((a, b) => {
            const distanceA = calculateDistance(business.address.lat, business.address.lng, a.address.lat, a.address.lng);
            const distanceB = calculateDistance(business.address.lat, business.address.lng, b.address.lat, b.address.lng);
            return distanceA - distanceB;
          });

  const sameRegionMatches =
    sameCityMatches.length > 0 || fallbackRadiusMatches.length > 0
      ? []
      : basePool.filter((item) => {
          const itemStateCode = normalizeLocationPart(item.address.stateCode || item.address.state);
          return !!sourceStateCode && !!itemStateCode && itemStateCode === sourceStateCode;
        });

  const prioritized =
    sameCityMatches.length > 0
      ? sameCityMatches
      : fallbackRadiusMatches.length > 0
        ? fallbackRadiusMatches
        : sameRegionMatches;

  return prioritized.slice(0, limit);
}