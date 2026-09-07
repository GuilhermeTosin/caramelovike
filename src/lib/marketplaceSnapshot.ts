import type { MarketplaceCategory, MarketplaceListing } from "@/types/database";
import type { MarketplacePage } from "@/services/marketplace";
import { slugifyMarketplace } from "@/lib/marketplaceCategories";

export type MarketplaceSnapshot = MarketplacePage & {
  categories: MarketplaceCategory[];
  requestKey: string;
};

export function buildMarketplaceRequestKey(search = "", category = "", listingType = "", page = 1, city = "", minPrice = "", maxPrice = "", condition = "", countryCode = "", stateCode = "", radiusKm = "", originLat = "", originLng = "") {
  return new URLSearchParams({ search, category, listingType, page: String(page), city, minPrice, maxPrice, condition, countryCode, stateCode, radiusKm, originLat, originLng }).toString();
}

export function buildMarketplaceSnapshot(page: MarketplacePage, categories: MarketplaceCategory[], search = "", requestKey?: string): MarketplaceSnapshot {
  return { ...page, categories, requestKey: requestKey || buildMarketplaceRequestKey(search) };
}

export function marketplaceListingPath(listing: Pick<MarketplaceListing, "country_code" | "state_code" | "city" | "slug">) {
  const city = slugifyMarketplace(listing.city);
  return `/marketplace/${listing.country_code.toLowerCase()}/${listing.state_code.toLowerCase()}/${city}/${listing.slug}`;
}
