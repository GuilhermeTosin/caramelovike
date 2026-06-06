import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapPin, Star, Store, Briefcase, PawPrint, User, Utensils, HeartPulse, Car, Hammer, Scale, GraduationCap, Landmark, ShoppingBag, Truck, Building2, Music, SprayCan, MoreHorizontal, Lock, Leaf, WheatOff, CalendarDays, BadgePercent, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { siteContent, MASCOT_PHRASES } from "@/data/siteContent";
import { getAllBusinesses, buildBusinessUrl, getAvailableLocations, getSearchSuggestions } from "@/services/businesses";
import { getFeaturedBusinessesForRegion, type FeaturedRegion } from "@/services/featured";
import type { BusinessFrontend } from "@/types/database";
import SiteHeaderAuthActions from "@/components/SiteHeaderAuthActions";
import { calculateDistance, getApproxGeoByIp, getCurrentPositionRobust } from "@/lib/utils/geo";
import {
  geocodeLocationWithCountryFallback,
  inferNearestCityFromBusinesses,
  resolveLocationContextFromBusinesses,
} from "@/lib/search/locationResolver";
import SearchInputWithSuggestions from "@/components/SearchInputWithSuggestions";
import SiteFooter from "@/components/SiteFooter";
import { setSeoMeta } from "@/lib/seo";
import { getOptimizedImageSrcSet, getOptimizedImageUrl } from "@/lib/images";
import { preloadBusinessPageChunk } from "@/pages/BusinessPagePrefetch";

type SearchMode = "businesses" | "events" | "achadinhos";

const HOME_SEARCH_MODES: Record<
  SearchMode,
  {
    label: string;
    description: string;
    placeholder: string;
    ctaLabel: string;
    modeParam?: "eventos" | "achadinhos";
    quickTags: string[];
    icon: typeof Store;
    accentClass: string;
  }
> = {
  businesses: {
    label: "Negócios",
    description: "Procure negócios brasileiros, serviços, lojas e profissionais perto de você.",
    placeholder: "Buscar por produto ou serviço (Ex: coxinha)",
    ctaLabel: "Farejar negócios",
    quickTags: ["Padaria", "Mecânico", "Dentista", "Advogado", "Restaurante", "Cabeleireiro"],
    icon: Store,
    accentClass: "bg-emerald-600 text-white shadow-md",
  },
  events: {
    label: "Eventos",
    description: "Encontre festas, feiras, encontros e inaugurações da comunidade brasileira.",
    placeholder: "Buscar por festa, feira ou encontro",
    ctaLabel: "Farejar eventos",
    modeParam: "eventos",
    quickTags: ["Festa", "Show", "Feira", "Inauguração", "Encontro", "Samba"],
    icon: CalendarDays,
    accentClass: "bg-amber-500 text-white shadow-md",
  },
  achadinhos: {
    label: "Achadinhos",
    description: "Descubra promoções, ofertas e novidades compartilhadas pela comunidade.",
    placeholder: "Buscar por promoção, desconto ou novidade",
    ctaLabel: "Farejar achadinhos",
    modeParam: "achadinhos",
    quickTags: ["Promoção", "Desconto", "Oferta", "Outlet", "Novidade", "Cupom"],
    icon: BadgePercent,
    accentClass: "bg-sky-600 text-white shadow-md",
  },
};

const HOME_SEARCH_MODE_ORDER: SearchMode[] = ["businesses", "events", "achadinhos"];

const HOME_CATEGORIES = [
  { id: "food", name: "Alimentação", icon: Utensils },
  { id: "health_beauty", name: "Saúde & Beleza", icon: HeartPulse },
  { id: "auto", name: "Automotivo", icon: Car },
  { id: "construction", name: "Construção", icon: Hammer },
  { id: "legal_consulting", name: "Advocacia & Traduções", icon: Scale },
  { id: "education", name: "Educação", icon: GraduationCap },
  { id: "accounting_finance", name: "Contabilidade", icon: Landmark },
  { id: "retail", name: "Comércio", icon: ShoppingBag },
  { id: "transport_moving", name: "Transporte & Mudança", icon: Truck },
  { id: "real_estate", name: "Imobiliária", icon: Building2 },
  { id: "artists", name: "Artistas", icon: Music },
  { id: "pets", name: "Serviços para Pets", icon: PawPrint },
  { id: "child_elder_care", name: "Cuidados Infantis e de Idosos", icon: User },
  { id: "cleaning", name: "Diaristas", icon: SprayCan },
  { id: "other", name: "Outros", icon: MoreHorizontal },
];
const CURRENT_LOCATION_LABEL = "Minha localização";
const DEFAULT_GEO_FALLBACK = {
  lat: 45.5017,
  lng: -73.5673,
  city: "Montreal",
  stateCode: "qc",
  countryCode: "ca",
} as const;
const DEFAULT_SEARCH_RADIUS_KM = "50";

const countryCodeToFlag = (countryCode: string) => {
  const normalized = (countryCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return String.fromCodePoint(0x1F30E);

  const A = 65;
  const REGIONAL_INDICATOR_A = 0x1F1E6;
  return String.fromCodePoint(...normalized.split("").map((char) => REGIONAL_INDICATOR_A + char.charCodeAt(0) - A));
};

function extractCities(
  locations: { states: { cities: string[] }[] }[]
): string[] {
  const cities = new Set<string>();
  locations.forEach((location) => {
    location.states.forEach((state) => {
      state.cities.forEach((city) => cities.add(city));
    });
  });
  return Array.from(cities);
}

type HomeProps = {
  initialBusinesses?: BusinessFrontend[];
  initialFeaturedBusinesses?: BusinessFrontend[];
  initialAvailableLocations?: { countryCode: string; countryName: string; states: { code: string; name: string; cities: string[] }[] }[];
  initialSearchSuggestions?: string[];
};

export default function Home({
  initialBusinesses = [],
  initialFeaturedBusinesses = [],
  initialAvailableLocations = [],
  initialSearchSuggestions = [],
}: HomeProps = {}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("businesses");
  const [allBusinesses, setAllBusinesses] = useState<BusinessFrontend[]>(initialBusinesses);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<BusinessFrontend[]>(initialFeaturedBusinesses);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>(initialSearchSuggestions);
  const [citySuggestions, setCitySuggestions] = useState<string[]>(() => extractCities(initialAvailableLocations));
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [approxCountryCode, setApproxCountryCode] = useState("");
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  const [isResolvingLocationInput, setIsResolvingLocationInput] = useState(false);
  const [secretActive, setSecretActive] = useState(false);
  const [locationNoticeOpen, setLocationNoticeOpen] = useState(false);
  const [locationNoticeMessage, setLocationNoticeMessage] = useState("");
  const suppressSubmitUntilRef = useRef(0);
  const progressRef = useRef(0);
  const previousSearchRef = useRef({ query: "", location: "" });

  useEffect(() => {
    setSeoMeta(
      "Caramelinho.com | Encontre negócios brasileiros no exterior",
      "Encontre negócios brasileiros no mundo todo: alimentação, saúde, advocacia, educação e muito mais perto de você."
    );
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const combo = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "b", "a"];

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable)
      ) {
        return;
      }

      const pressedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const expectedKey = combo[progressRef.current];

      if (pressedKey === expectedKey) {
        progressRef.current += 1;
        if (progressRef.current === combo.length) {
          progressRef.current = 0;
          previousSearchRef.current = { query: searchQuery, location: locationQuery };
          setSearchQuery("Castlevania");
          setLocationQuery("Valáquia");
          setSecretActive(true);
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setSearchQuery(previousSearchRef.current.query);
            setLocationQuery(previousSearchRef.current.location);
            setSecretActive(false);
          }, 800);
          const audio = new Audio("/thecode.mp3");
          audio.volume = 0.85;
          void audio.play().catch(() => {});
        }
      } else {
        progressRef.current = pressedKey === combo[0] ? 1 : 0;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const businesses = initialBusinesses.length > 0 ? initialBusinesses : await getAllBusinesses();
      const approxGeo = await getApproxGeoByIp({
        timeoutMs: 3000,
        maxAgeMs: 24 * 60 * 60 * 1000,
        fallback: DEFAULT_GEO_FALLBACK,
      });
      const coords = approxGeo ? { lat: approxGeo.lat, lng: approxGeo.lng } : null;
      if (approxGeo?.countryCode) setApproxCountryCode(approxGeo.countryCode);
      if (approxGeo?.city) {
        setLocationQuery((prev) => (prev.trim() ? prev : approxGeo.city!));
      }
      let regionalBusinesses = [...businesses];
      let region: FeaturedRegion | null = null;
      
      if (coords) {
        setUserCoords(coords);
        // Ordenar por distância
        regionalBusinesses = [...businesses].sort((a, b) => {
          const distA = calculateDistance(coords.lat, coords.lng, a.address.lat, a.address.lng);
          const distB = calculateDistance(coords.lat, coords.lng, b.address.lat, b.address.lng);
          return distA - distB;
        });
        const nearest = regionalBusinesses[0];
        if (nearest) {
          region = {
            countryCode: nearest.address.countryCode,
            stateCode: nearest.address.stateCode,
            city: nearest.address.city,
          };
        }
      }

      const regionalFeatured = initialFeaturedBusinesses.length > 0
        ? initialFeaturedBusinesses
        : await getFeaturedBusinessesForRegion(region, 6);
      
      setAllBusinesses(regionalBusinesses);
      setFeaturedBusinesses(regionalFeatured);
    };

    loadData();
    if (initialAvailableLocations.length === 0) {
      getAvailableLocations().then((locations) => setCitySuggestions(extractCities(locations)));
    }
    if (initialSearchSuggestions.length === 0) getSearchSuggestions().then(setSearchSuggestions);
  }, [initialAvailableLocations, initialBusinesses, initialFeaturedBusinesses, initialSearchSuggestions]);

  const handleUseCurrentLocationInput = async () => {
    setIsResolvingLocationInput(true);
    suppressSubmitUntilRef.current = Date.now() + 700;
    try {
      const { coords } = await getCurrentPositionRobust();
      if (!coords) {
        setLocationNoticeMessage("Para usar esta funcionalidade, habilite a localização no navegador/dispositivo.");
        setLocationNoticeOpen(true);
        return;
      }
      setUserCoords(coords);
      const inferredCity = inferNearestCityFromBusinesses(allBusinesses, coords) || CURRENT_LOCATION_LABEL;
      setLocationQuery("");
      window.setTimeout(() => setLocationQuery(inferredCity), 0);
    } finally {
      setIsResolvingLocationInput(false);
    }
  };

  const appendLocationContext = async (params: URLSearchParams, rawLocationText: string) => {
    const locationText = rawLocationText.trim();
    const isCurrentLocationText =
      normalizeText(locationText) === normalizeText(CURRENT_LOCATION_LABEL);
    const hasExplicitCity = !!locationText && !isCurrentLocationText;

    if (hasExplicitCity) {
      params.set("cidade", locationText);
      params.set("local", locationText);
      params.set("raio", DEFAULT_SEARCH_RADIUS_KM);
      const resolved = resolveLocationContextFromBusinesses(allBusinesses, locationText);
      const coords =
        resolved.coords ||
        (await geocodeLocationWithCountryFallback(
          locationText,
          resolved.countryCode || approxCountryCode || DEFAULT_GEO_FALLBACK.countryCode
        ));
      if (coords) {
        params.set("origem_lat", String(coords.lat));
        params.set("origem_lng", String(coords.lng));
        params.set("origem_local", locationText);
        params.set("origem_source", "city");
        if (resolved.countryCode) params.set("origem_pais", resolved.countryCode);
      }
      return true;
    }

    const approx = await getApproxGeoByIp({
      timeoutMs: 3000,
      maxAgeMs: 24 * 60 * 60 * 1000,
      fallback: DEFAULT_GEO_FALLBACK,
    });
    const coords = userCoords || (approx ? { lat: approx.lat, lng: approx.lng } : null);
    if (coords) {
      setUserCoords(coords);
      if (approx?.city) {
        setLocationQuery((prev) => (prev.trim() ? prev : approx.city!));
      }
      params.set("raio", DEFAULT_SEARCH_RADIUS_KM);
      params.set("auto_raio", "1");
      params.set("origem_lat", String(coords.lat));
      params.set("origem_lng", String(coords.lng));
      params.set("origem_source", approx?.source === "cache" ? "ip_cache" : "ip");
      if (approx?.countryCode) params.set("origem_pais", approx.countryCode.toLowerCase());
      else params.delete("origem_pais");
    }

    return !!coords;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < suppressSubmitUntilRef.current) return;
    if (secretActive) return;
    setIsSubmittingSearch(true);
    const params = new URLSearchParams();
    const hasQuery = !!searchQuery.trim();
    const modeParam = HOME_SEARCH_MODES[searchMode].modeParam;
    if (modeParam) params.set(modeParam, "1");
    if (hasQuery) params.set("q", searchQuery.trim());
    const hasLocationContext = await appendLocationContext(params, locationQuery);
    if (searchMode === "businesses" && !hasQuery && !hasLocationContext) {
      setLocationNoticeMessage("Digite o que procura ou informe sua cidade para iniciar a busca.");
      setLocationNoticeOpen(true);
      setIsSubmittingSearch(false);
      return;
    }

    navigate(`/buscar?${params.toString()}`);
    setIsSubmittingSearch(false);
  };

  const handleQuickTagSearch = async (tag: string) => {
    setIsSubmittingSearch(true);
    const params = new URLSearchParams();
    const modeParam = HOME_SEARCH_MODES[searchMode].modeParam;
    if (modeParam) params.set(modeParam, "1");
    params.set("q", tag.trim());
    await appendLocationContext(params, locationQuery);
    navigate(`/buscar?${params.toString()}`);
    setIsSubmittingSearch(false);
  };

  const handleCategorySearch = async (category: string) => {
    setIsSubmittingSearch(true);
    const params = new URLSearchParams();
    params.set("categoria", category);
    await appendLocationContext(params, locationQuery);
    navigate(`/buscar?${params.toString()}`);
    setIsSubmittingSearch(false);
  };

  const [mascotPhrase, setMascotPhrase] = useState(() => MASCOT_PHRASES[0]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMascotPhrase(MASCOT_PHRASES[Math.floor(Math.random() * MASCOT_PHRASES.length)]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const categories = useMemo(() => {
    return HOME_CATEGORIES.map((cat) => ({
      ...cat,
      count: allBusinesses.filter((biz) => biz.categoryId === cat.id).length,
    }));
  }, [allBusinesses]);

  const activeSearchMode = HOME_SEARCH_MODES[searchMode];

  const popularCities = useMemo(() => {
    const cityCounts = new Map<string, { name: string; countryCode: string; count: number }>();

    allBusinesses.forEach((biz) => {
      const city = biz.address.city?.trim();
      if (!city) return;

      const countryCode = biz.address.countryCode?.toLowerCase() || "";
      const key = `${normalizeText(city)}-${countryCode}`;
      const current = cityCounts.get(key);

      cityCounts.set(key, {
        name: current?.name || city,
        countryCode,
        count: (current?.count || 0) + 1,
      });
    });

    return Array.from(cityCounts.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 6)
      .map((city) => ({
        ...city,
        flag: countryCodeToFlag(city.countryCode),
      }));
  }, [allBusinesses]);

  return (
    <div className="min-h-screen">
      {/* Header/Nav */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-24">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center">
                <img
                  src="/logo.webp"
                  alt="Caramelinho logo"
                  width={112}
                  height={112}
                  decoding="async"
                  fetchpriority="high"
                  className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
                />
              </div>
              <div className="leading-tight min-w-0">
                <div className="font-extrabold text-lg sm:text-2xl tracking-tight caramelo-text-gradient truncate">Caramelinho</div>
                <div className="text-[10px] sm:text-sm font-semibold text-foreground/75 whitespace-nowrap overflow-hidden text-ellipsis">{"O SEU FARO FORA DO BRASIL"}</div>
              </div>
            </Link>
            
            <SiteHeaderAuthActions className="flex items-center gap-1.5 sm:gap-4" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 caramelo-gradient opacity-5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-200/20 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16 sm:py-24 lg:py-28 relative">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
                <PawPrint className="w-4 h-4 mr-1.5 inline-block text-amber-600" />
                {mascotPhrase}
              </Badge>
            <h1
              className={`text-[1.8rem] sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-foreground transition-all duration-500 ${
                secretActive ? "scale-[1.01]" : ""
              }`}
            >
              <span>Encontre </span>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #15803d 0%, #eab308 50%, #1d4ed8 100%)" }}
              >
                negócios brasileiros
              </span>
              <span> no mundo todo</span>
            </h1>
            <p className="mt-5 text-[1rem] sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
              {siteContent.heroSubtitle}
            </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mt-8 sm:mt-10 w-full">
              <div className="mb-3 sm:mb-4 rounded-2xl bg-white/92 px-2.5 py-2.5 sm:px-3 shadow-sm backdrop-blur-sm">
                <div className="flex flex-wrap justify-center gap-2">
                  {HOME_SEARCH_MODE_ORDER.map((mode) => {
                    const modeConfig = HOME_SEARCH_MODES[mode];
                    const ModeIcon = modeConfig.icon;
                    const isActive = searchMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSearchMode(mode)}
                        aria-pressed={isActive}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all ${
                          isActive
                            ? `${modeConfig.accentClass} border-transparent`
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <ModeIcon className="w-4 h-4" />
                        {modeConfig.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-center text-xs sm:text-sm leading-relaxed text-slate-600">
                  {activeSearchMode.description}
                </p>
              </div>
              <div className="relative w-full overflow-visible rounded-2xl sm:rounded-3xl bg-white shadow-xl focus-within:ring-2 ring-primary/20 transition-all p-2 sm:p-2 min-h-[112px] sm:min-h-[88px]">
                <div className="flex flex-col sm:flex-row gap-0 sm:pr-[262px] pt-[5px]">
                  <SearchInputWithSuggestions
                    className="sm:flex-[1.7] rounded-xl sm:rounded-none"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    suggestions={searchSuggestions}
                    disableLocalSuggestions
                    placeholder={activeSearchMode.placeholder}
                    icon="search"
                    inputClassName="h-12 sm:h-16 text-base sm:text-xl placeholder:text-[11px] sm:placeholder:text-sm"
                  />
                  <div className="hidden sm:block w-px h-10 bg-border/50 self-center" />
                  <SearchInputWithSuggestions
                    className="sm:flex-[0.9] rounded-xl sm:rounded-none"
                    value={locationQuery}
                    onChange={setLocationQuery}
                    suggestions={citySuggestions}
                    onUseCurrentLocation={handleUseCurrentLocationInput}
                    isLoading={isResolvingLocationInput}
                    placeholder="Em qual cidade?"
                    icon="location"
                    inputClassName="h-12 sm:h-16 text-base sm:text-xl placeholder:text-[11px] sm:placeholder:text-sm"
                  />
                </div>
                <div className="mt-2 sm:mt-0 sm:absolute sm:right-2 sm:top-2 sm:bottom-2 sm:w-[250px]">
                  <Button
                    type="submit"
                    disabled={isSubmittingSearch}
                    className="w-full h-12 sm:h-full px-6 sm:px-8 caramelo-gradient hover:opacity-90 text-white border-0 font-bold text-sm sm:text-base py-0 leading-none inline-flex items-center justify-center gap-2"
                    style={{ borderRadius: "12px" }}
                  >
                    <PawPrint className="w-4 h-4 shrink-0" />
                    {isSubmittingSearch ? "Farejando..." : activeSearchMode.ctaLabel}
                  </Button>
                </div>
              </div>
            </form>

            {/* Quick tags */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {activeSearchMode.quickTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSearchQuery(tag);
                    void handleQuickTagSearch(tag);
                  }}
                  className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors ${
                    searchMode === "businesses"
                      ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : searchMode === "events"
                        ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "bg-sky-50 text-sky-800 hover:bg-sky-100"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-secondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: "Negócios Cadastrados", value: "350+", icon: Store },
              { label: "Cidades Atendidas", value: "120+", icon: MapPin },
              { label: "Países", value: "15+", icon: Briefcase },
              { label: "Avaliações", value: "2.5K+", icon: Star },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <stat.icon className="w-5 h-5 text-amber-600" />
                <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground">Categorias</h2>
          <p className="mt-3 text-muted-foreground">Navegue por categoria para encontrar o que precisa</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/buscar?categoria=${encodeURIComponent(cat.id)}`}
              onClick={(event) => {
                event.preventDefault();
                void handleCategorySearch(cat.id);
              }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border card-hover"
            >
              <cat.icon className="w-7 h-7 text-primary" />
              <span className="font-medium text-sm">{cat.name}</span>
              <span className="text-xs text-muted-foreground">{formatBusinessCount(cat.count)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Businesses */}
      {featuredBusinesses.length > 0 && (
      <section className="bg-secondary/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Negócios em Destaque</h2>
              <p className="mt-2 text-muted-foreground">Recomendados pelo Caramelinho</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredBusinesses.slice(0, 6).map((biz) => (
              <Link
                key={biz.id}
                to={buildBusinessUrl(biz)}
                state={{ preloadedBusiness: biz }}
                onMouseEnter={preloadBusinessPageChunk}
                onFocus={preloadBusinessPageChunk}
                className="group"
              >
                <Card className="overflow-hidden border-border h-full">
                  <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                    <img
                      src={getOptimizedImageUrl(
                        biz.heroImage || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
                        { width: 768, quality: 80, format: "webp" }
                      )}
                      srcSet={
                        getOptimizedImageSrcSet(
                          biz.heroImage || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
                          [480, 768, 1024],
                          80
                        ) || undefined
                      }
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
                      alt={biz.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300 ease-out"
                      loading="lazy"
                      decoding="async"
                    />
                    <Badge className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground border-0">
                      {biz.category.split("(")[0].trim()}
                    </Badge>
                    {biz.averageRating > 0 && (
                      <Badge className="absolute top-3 right-3 bg-amber-500 text-white border-0 gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        {biz.averageRating.toFixed(1)}
                      </Badge>
                    )}
                    {userCoords && biz.attendanceType !== "online" && (
                      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {calculateDistance(userCoords.lat, userCoords.lng, biz.address.lat, biz.address.lng).toFixed(1)} km
                      </div>
                    )}
                    {biz.ownerVerified ? (
                      <div className="absolute bottom-3 right-3 bg-emerald-600/95 text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        Verificado
                      </div>
                    ) : null}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      {biz.logoUrl && (
                        <img src={biz.logoUrl} alt="" loading="lazy" className="w-10 h-10 rounded-full object-cover ring-2 ring-border" />
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-amber-600 transition-colors">
                          <span className="truncate">{biz.name}</span>
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {`${biz.address.city}, ${biz.address.country}`}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {biz.description}
                    </p>
                    {biz.categoryId === "food" && (biz.isVeganFriendly || biz.isVegetarianFriendly || biz.isGlutenFreeFriendly) ? (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {biz.isVeganFriendly ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Leaf className="w-3 h-3" />
                            Vegano
                          </span>
                        ) : null}
                        {biz.isVegetarianFriendly ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-lime-100 text-lime-800">
                            <Leaf className="w-3 h-3" />
                            Vegetariano
                          </span>
                        ) : null}
                        {biz.isGlutenFreeFriendly ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            <WheatOff className="w-3 h-3" />
                            Sem Glúten
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {biz.services.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {biz.services.slice(0, 3).map((svc) => (
                          <span key={svc} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {svc}
                          </span>
                        ))}
                        {biz.services.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{biz.services.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {featuredBusinesses.length === 0 && (
            <div className="text-center py-12">
              <PawPrint className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum negócio encontrado ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">Seja o primeiro a cadastrar!</p>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Cities Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground">Cidades Populares</h2>
          <p className="mt-3 text-muted-foreground">Descubra negócios brasileiros pelo mundo</p>
        </div>
        <div className="w-full flex flex-wrap justify-center gap-4">
          {popularCities.map((city) => (
            <Link
              key={`${city.countryCode}-${city.name}`}
              to={`/buscar?cidade=${encodeURIComponent(city.name)}`}
              className="w-[160px] sm:w-[170px] lg:w-[180px] min-h-[128px] flex flex-col items-center justify-center gap-2 p-5 rounded-xl bg-card border border-border card-hover"
            >
              <img
                src={`https://flagcdn.com/w40/${city.countryCode.toLowerCase()}.png`}
                alt={`Bandeira de ${city.countryCode.toUpperCase()}`}
                className="h-5 w-7 object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "inline";
                }}
              />
              <span className="text-2xl hidden">{city.flag}</span>
              <span className="font-medium text-sm">{city.name}</span>
              <span className="text-xs text-muted-foreground">{formatBusinessCount(city.count)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted text-foreground py-20 border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mx-auto mb-6">
            <img
              src="/brazil-map-pin.webp"
              alt="Ícone de localização com bandeira do Brasil"
              width={112}
              height={112}
              loading="lazy"
              decoding="async"
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
            />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            <span className="text-foreground">Tem um </span>
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #15803d 0%, #eab308 50%, #1d4ed8 100%)" }}
            >
              negócio brasileiro
            </span>
            <span className="text-foreground"> no exterior?</span>
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Cadastre seu negócio no Caramelinho e seja encontrado por milhares de brasileiros espalhados pelo mundo!
          </p>
          <div className="flex justify-center">
            <Button asChild size="lg" className="caramelo-gradient text-white border-0 font-bold">
              <Link to="/cadastro">Criar Conta Gratuita</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />

      <Dialog open={locationNoticeOpen} onOpenChange={setLocationNoticeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Localização indisponível</DialogTitle>
            <DialogDescription>{locationNoticeMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button type="button" onClick={() => setLocationNoticeOpen(false)}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function normalizeText(value?: string | null): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatBusinessCount(count: number): string {
  return `${count} ${count === 1 ? "negócio" : "negócios"}`;
}
