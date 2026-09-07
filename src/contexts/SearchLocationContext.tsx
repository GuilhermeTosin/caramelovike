import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type SearchLocation = {
  city: string;
  countryCode?: string;
  stateCode?: string;
  lat?: number;
  lng?: number;
};

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
