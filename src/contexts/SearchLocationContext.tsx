import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_MARKETPLACE_DISTANCE_KM } from "@/lib/marketplaceCategories";
import { DEFAULT_SEARCH_RADIUS_KM } from "@/lib/utils/geo";

export type SearchLocation = {
  city: string;
  countryCode?: string;
  stateCode?: string;
  lat?: number;
  lng?: number;
};

export function buildMarketplaceSearchPath(location: SearchLocation | null) {
  if (!location?.city.trim()) return "/marketplace";

  const params = new URLSearchParams({ cidade: location.city.trim() });
  if (location.countryCode) params.set("pais", location.countryCode.toLowerCase());
  if (location.stateCode) params.set("estado", location.stateCode.toLowerCase());
  if (Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
    params.set("origem_lat", String(location.lat));
    params.set("origem_lng", String(location.lng));
    params.set("raio", String(DEFAULT_MARKETPLACE_DISTANCE_KM));
  }
  return `/marketplace?${params.toString()}`;
}

export function buildBusinessCategorySearchPath(categoryId: string, location: SearchLocation | null) {
  const params = new URLSearchParams({ categoria: categoryId });
  const selectedLocation = location;
  const city = selectedLocation?.city.trim();
  if (!selectedLocation || !city) return `/buscar?${params.toString()}`;

  params.set("cidade", city);
  params.set("local", city);
  if (selectedLocation.countryCode) params.set("origem_pais", selectedLocation.countryCode.toLowerCase());

  if (selectedLocation.stateCode) params.set("estado", selectedLocation.stateCode.toLowerCase());
  if (Number.isFinite(selectedLocation.lat) && Number.isFinite(selectedLocation.lng)) {
    params.set("raio", DEFAULT_SEARCH_RADIUS_KM);
    params.set("origem_lat", String(selectedLocation.lat));
    params.set("origem_lng", String(selectedLocation.lng));
    params.set("origem_local", city);
    params.set("origem_source", "city");
  }

  return `/buscar?${params.toString()}`;
}

type SearchLocationContextValue = {
  searchLocation: SearchLocation | null;
  setSearchLocation: (location: SearchLocation | null) => void;
};

const SearchLocationContext = createContext<SearchLocationContextValue | null>(null);

export function SearchLocationProvider({ children }: { children: ReactNode }) {
  const [searchLocation, setSearchLocation] = useState<SearchLocation | null>(null);
  const value = useMemo(() => ({ searchLocation, setSearchLocation }), [searchLocation]);

  return <SearchLocationContext.Provider value={value}>{children}</SearchLocationContext.Provider>;
}

export function useSearchLocation() {
  const context = useContext(SearchLocationContext);
  if (!context) throw new Error("useSearchLocation must be used inside SearchLocationProvider");
  return context;
}
