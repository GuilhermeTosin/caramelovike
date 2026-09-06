import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Search, ShoppingBag, Store } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MobileHeaderMenu from "@/components/MobileHeaderMenu";
import SearchInputWithSuggestions, { type LocationSuggestionMeta } from "@/components/SearchInputWithSuggestions";
import SiteHeaderAuthActions from "@/components/SiteHeaderAuthActions";
import { getHomeContent } from "@/data/homeContent";
import { geocodeAddress } from "@/lib/google-maps";
import {
  DEFAULT_GEO_FALLBACK,
  DEFAULT_SEARCH_RADIUS_KM,
  getApproxGeoByIp,
  getCurrentPositionRobust,
} from "@/lib/utils/geo";

type AvailableLocation = {
  countryCode: string;
  countryName: string;
  states: Array<{ code: string; name: string; cities: string[] }>;
};

type SearchMode = "businesses" | "events" | "products";

const SEARCH_MODES: SearchMode[] = ["businesses", "events", "products"];

type HeaderSearchModeText = {
  label: string;
  placeholder: string;
  ctaLabel: string;
};

const SEARCH_MODE_FALLBACKS: Record<SearchMode, HeaderSearchModeText> = {
  businesses: {
    label: "Negócios",
    placeholder: "Buscar por produto ou serviço (Ex: coxinha)",
    ctaLabel: "Farejar negócios",
  },
  events: {
    label: "Eventos",
    placeholder: "Buscar por festa, feira ou encontro",
    ctaLabel: "Farejar eventos",
  },
  products: {
    label: "Produtos",
    placeholder: "Buscar por produto",
    ctaLabel: "Buscar produtos",
  },
};

function getSearchModeText(
  homeText: ReturnType<typeof getHomeContent>,
  mode: SearchMode,
): HeaderSearchModeText {
  const configuredModes = homeText.searchModes as Partial<Record<SearchMode, Partial<HeaderSearchModeText>>> | undefined;
  return {
    ...SEARCH_MODE_FALLBACKS[mode],
    ...configuredModes?.[mode],
  };
}

function getCitySuggestions(locations: AvailableLocation[]) {
  return Array.from(new Set(locations.flatMap((location) => location.states.flatMap((state) => state.cities))));
}

function getSearchContext(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  const mode: SearchMode = (pathname === "/marketplace" || pathname.startsWith("/marketplace/"))
    ? "products"
    : params.get("eventos") === "1"
      ? "events"
      : "businesses";

  return {
    mode,
    query: params.get("q") || "",
    location: params.get("local") || params.get("cidade") || "",
  };
}

type SiteHeaderProps = {
  initialAvailableLocations?: AvailableLocation[];
  initialSearchSuggestions?: string[];
};

export default function SiteHeader({
  initialAvailableLocations = [],
  initialSearchSuggestions = [],
}: SiteHeaderProps) {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const homeText = getHomeContent();
  const initialContext = getSearchContext(routerLocation.pathname, routerLocation.search);
  const [query, setQuery] = useState(initialContext.query);
  const [location, setLocation] = useState(initialContext.location);
  const [searchMode, setSearchMode] = useState<SearchMode>(initialContext.mode);
  const [locationSelection, setLocationSelection] = useState<LocationSuggestionMeta | null>(null);
  const [locating, setLocating] = useState(false);
  const citySuggestions = useMemo(() => getCitySuggestions(initialAvailableLocations), [initialAvailableLocations]);
  const activeSearchMode = getSearchModeText(homeText, searchMode);

  useEffect(() => {
    const nextContext = getSearchContext(routerLocation.pathname, routerLocation.search);
    setQuery(nextContext.query);
    setLocation(nextContext.location);
    setSearchMode(nextContext.mode);
    setLocationSelection(null);
  }, [routerLocation.pathname, routerLocation.search]);

  const navigateWithParams = useCallback((pathname: string, params: URLSearchParams) => {
    const queryString = params.toString();
    navigate(queryString ? `${pathname}?${queryString}` : pathname);
  }, [navigate]);

  const executeSearch = useCallback(async (
    nextQuery: string,
    nextLocation: string,
    meta?: LocationSuggestionMeta,
  ) => {
    const targetPath = searchMode === "products" ? "/marketplace" : "/buscar";
    const params = routerLocation.pathname === targetPath
      ? new URLSearchParams(routerLocation.search)
      : new URLSearchParams();
    const trimmedQuery = nextQuery.trim();
    const trimmedLocation = nextLocation.trim();

    params.delete("pagina");
    params.delete("q_label");
    params.delete("auto_raio");

    if (trimmedQuery) params.set("q", trimmedQuery);
    else params.delete("q");

    if (searchMode === "products") {
      if (trimmedLocation) params.set("cidade", meta?.city || trimmedLocation);
      else params.delete("cidade");
      navigateWithParams(targetPath, params);
      return;
    }

    if (searchMode === "events") params.set("eventos", "1");
    else params.delete("eventos");
    params.delete("achadinhos");

    if (trimmedLocation) {
      params.set("local", trimmedLocation);
      params.set("cidade", meta?.city || trimmedLocation);
      params.delete("pais");
      params.delete("estado");
      if (!params.get("raio")) params.set("raio", DEFAULT_SEARCH_RADIUS_KM);

      let coords = typeof meta?.lat === "number" && typeof meta?.lng === "number"
        ? { lat: meta.lat, lng: meta.lng }
        : null;
      if (!coords && trimmedLocation.length >= 3) {
        coords = await geocodeAddress(trimmedLocation);
      }

      if (coords) {
        params.set("origem_lat", String(coords.lat));
        params.set("origem_lng", String(coords.lng));
        params.set("origem_local", trimmedLocation);
        params.set("origem_source", "city");
        if (meta?.countryCode) params.set("origem_pais", meta.countryCode.toLowerCase());
        else params.delete("origem_pais");
      } else {
        params.delete("origem_lat");
        params.delete("origem_lng");
        params.delete("origem_local");
        params.delete("origem_source");
        params.delete("origem_pais");
      }
    } else {
      params.delete("local");
      params.delete("cidade");
      if ((params.get("origem_source") || "").toLowerCase() === "city") {
        params.delete("origem_lat");
        params.delete("origem_lng");
        params.delete("origem_local");
        params.delete("origem_source");
        params.delete("origem_pais");
      } else {
        params.delete("origem_local");
      }
    }

    const hasOrigin = !!(params.get("origem_lat") && params.get("origem_lng"));
    if (trimmedQuery && !trimmedLocation && !hasOrigin) {
      const approxGeo = await getApproxGeoByIp({
        timeoutMs: 3000,
        maxAgeMs: 24 * 60 * 60 * 1000,
        fallback: DEFAULT_GEO_FALLBACK,
      });
      if (approxGeo) {
        params.set("origem_lat", String(approxGeo.lat));
        params.set("origem_lng", String(approxGeo.lng));
        params.set("origem_source", approxGeo.source === "cache" ? "ip_cache" : "ip");
        if (approxGeo.countryCode) params.set("origem_pais", approxGeo.countryCode.toLowerCase());
        params.set("raio", params.get("raio") || DEFAULT_SEARCH_RADIUS_KM);
        params.set("auto_raio", "1");
      }
    }

    navigateWithParams(targetPath, params);
  }, [navigateWithParams, routerLocation.pathname, routerLocation.search, searchMode]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    void executeSearch(query, location, locationSelection || undefined);
  };

  const handleLocationChange = useCallback((value: string) => {
    setLocation(value);
    setLocationSelection(null);
  }, []);

  const handleLocationSubmit = useCallback((value?: string, meta?: LocationSuggestionMeta) => {
    const nextLocation = value ?? location;
    setLocation(nextLocation);
    setLocationSelection(meta || null);
    void executeSearch(query, nextLocation, meta);
  }, [executeSearch, location, query]);

  const handleUseCurrentLocation = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    try {
      const precise = await getCurrentPositionRobust();
      const geo = precise.coords
        ? { ...precise.coords, source: "gps" as const }
        : await getApproxGeoByIp({ fallback: DEFAULT_GEO_FALLBACK });
      if (!geo) return;

      if (searchMode === "products") {
        setLocation(geo.city || "");
        const params = routerLocation.pathname === "/marketplace"
          ? new URLSearchParams(routerLocation.search)
          : new URLSearchParams();
        params.delete("pagina");
        params.delete("q_label");
        if (query.trim()) params.set("q", query.trim());
        if (geo.city) params.set("cidade", geo.city);
        navigateWithParams("/marketplace", params);
        return;
      }

      setLocation("");
      setLocationSelection(null);
      const params = routerLocation.pathname === "/buscar"
        ? new URLSearchParams(routerLocation.search)
        : new URLSearchParams();
      params.delete("pagina");
      params.delete("local");
      params.delete("cidade");
      params.delete("origem_local");
      params.set("origem_lat", String(geo.lat));
      params.set("origem_lng", String(geo.lng));
      params.set("origem_source", geo.source === "gps" ? "gps" : "ip");
      if (geo.countryCode) params.set("origem_pais", geo.countryCode.toLowerCase());
      else params.delete("origem_pais");
      params.set("raio", DEFAULT_SEARCH_RADIUS_KM);
      params.set("auto_raio", "1");
      if (searchMode === "events") params.set("eventos", "1");
      else params.delete("eventos");
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      navigateWithParams("/buscar", params);
    } finally {
      setLocating(false);
    }
  }, [locating, navigateWithParams, query, routerLocation.pathname, routerLocation.search, searchMode]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#203940]/10 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="absolute inset-x-0 bottom-0 h-1 bg-[linear-gradient(90deg,#167348_0%,#167348_33%,#e4b53d_33%,#e4b53d_66%,#235d91_66%,#235d91_100%)]" aria-hidden="true" />
      <div className="mx-auto grid h-20 max-w-[90rem] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img
            src="/logo-64.webp"
            srcSet="/logo-64.webp 64w, /logo-112.webp 112w"
            sizes="(min-width: 640px) 56px, 48px"
            alt="Caramelinho logo"
            width="64"
            height="64"
            decoding="async"
            className="h-12 w-12 object-contain sm:h-14 sm:w-14"
          />
          <span className="min-w-0 leading-none">
            <span className="block truncate text-xl font-black tracking-[-0.04em] sm:text-2xl">
              Caramelinho<span className="text-[#c85f1a]">.</span>
            </span>
            <span className="mt-1 block truncate text-[9px] font-semibold tracking-[0.08em] text-[#203940]/60 sm:text-[10px]">
              O SEU FARO FORA DO BRASIL
            </span>
          </span>
        </Link>

        <form onSubmit={handleSearch} className="hidden min-w-0 lg:block">
          <div className="flex h-12 min-w-0 overflow-hidden rounded-xl border border-[#203940]/12 bg-[#fbfcfa] shadow-sm">
            <div className="flex shrink-0 items-center border-r border-[#203940]/10 px-1">
              {SEARCH_MODES.map((mode) => {
                const ModeIcon = mode === "businesses" ? Store : mode === "events" ? CalendarDays : ShoppingBag;
                const isActive = searchMode === mode;
                const modeText = getSearchModeText(homeText, mode);
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-label={`Pesquisar ${modeText.label.toLowerCase()}`}
                    title={modeText.label}
                    aria-pressed={isActive}
                    onClick={() => setSearchMode(mode)}
                    className={`grid h-9 w-9 place-items-center rounded-lg transition-shadow ${isActive ? "bg-[#eaf3ed] text-[#12633d]" : "text-[#203940]/45 hover:shadow-[0_4px_12px_rgba(32,57,64,0.12)]"}`}
                  >
                    <ModeIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <SearchInputWithSuggestions
              className="min-w-0 flex-1"
              value={query}
              onChange={setQuery}
              suggestions={searchMode === "products" ? [] : initialSearchSuggestions}
              maxSuggestions={3}
              disableLocalSuggestions
              placeholder={activeSearchMode.placeholder}
              icon="search"
              inputClassName="h-11 border-0 bg-transparent text-sm text-[#203940] shadow-none focus-visible:ring-0"
            />
            <SearchInputWithSuggestions
              className="w-[150px] shrink-0 border-l border-[#203940]/10"
              value={location}
              onChange={handleLocationChange}
              suggestions={citySuggestions}
              maxSuggestions={3}
              placeholder="Cidade"
              icon="location"
              useGooglePlaces
              portalSuggestions
              onUseCurrentLocation={handleUseCurrentLocation}
              isLoading={locating}
              currentLocationLabel="Usar minha localização"
              onSubmit={handleLocationSubmit}
              inputClassName="h-11 border-0 bg-transparent text-sm text-[#203940] shadow-none focus-visible:ring-0"
            />
            <Button type="submit" aria-label={activeSearchMode.ctaLabel} title={activeSearchMode.ctaLabel} className="m-1 h-10 w-10 shrink-0 rounded-lg caramelo-gradient p-0 text-white hover:shadow-[0_6px_16px_rgba(32,57,64,0.2)]">
              <Search className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </form>

        <div className="hidden items-center justify-end gap-4 lg:flex">
          <SiteHeaderAuthActions className="flex min-w-[12rem] items-center justify-end gap-2" compact />
        </div>
        <div className="lg:hidden">
          <MobileHeaderMenu />
        </div>
      </div>

      <form onSubmit={handleSearch} className="border-t border-[#203940]/10 px-4 py-2.5 lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-[auto_1fr_auto] gap-1 rounded-xl border border-[#203940]/12 bg-[#fbfcfa] p-1 shadow-sm">
          <div className="flex items-center border-r border-[#203940]/10 pr-1">
            {SEARCH_MODES.map((mode) => {
              const ModeIcon = mode === "businesses" ? Store : mode === "events" ? CalendarDays : ShoppingBag;
              const isActive = searchMode === mode;
              const modeText = getSearchModeText(homeText, mode);
              return (
                <button
                  key={mode}
                  type="button"
                  aria-label={`Pesquisar ${modeText.label.toLowerCase()}`}
                  title={modeText.label}
                  aria-pressed={isActive}
                  onClick={() => setSearchMode(mode)}
                  className={`grid h-10 w-10 place-items-center rounded-lg transition-shadow ${isActive ? "bg-[#eaf3ed] text-[#12633d]" : "text-[#203940]/45 hover:shadow-[0_4px_12px_rgba(32,57,64,0.12)]"}`}
                >
                  <ModeIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <SearchInputWithSuggestions
            className="min-w-0"
            value={query}
            onChange={setQuery}
            suggestions={searchMode === "products" ? [] : initialSearchSuggestions}
            maxSuggestions={3}
            disableLocalSuggestions
            placeholder={activeSearchMode.placeholder}
            icon="search"
            inputClassName="h-10 border-0 bg-transparent text-sm text-[#203940] shadow-none focus-visible:ring-0"
          />
          <Button type="submit" aria-label={activeSearchMode.ctaLabel} title={activeSearchMode.ctaLabel} className="h-10 w-10 rounded-lg caramelo-gradient p-0 text-white hover:shadow-[0_6px_16px_rgba(32,57,64,0.2)]">
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <SearchInputWithSuggestions
          className="mx-auto mt-2 max-w-lg rounded-xl border border-[#203940]/12 bg-[#fbfcfa] shadow-sm"
          value={location}
          onChange={handleLocationChange}
          suggestions={citySuggestions}
          maxSuggestions={3}
          placeholder="Em qual cidade?"
          icon="location"
          useGooglePlaces
          portalSuggestions
          onUseCurrentLocation={handleUseCurrentLocation}
          isLoading={locating}
          currentLocationLabel="Usar minha localização"
          onSubmit={handleLocationSubmit}
          inputClassName="h-10 border-0 bg-transparent text-sm text-[#203940] shadow-none focus-visible:ring-0"
        />
      </form>
      </header>
      <div aria-hidden="true" className="h-[var(--site-header-height)]" />
    </>
  );
}
