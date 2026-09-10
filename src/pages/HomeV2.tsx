import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Building2, CalendarDays, Car, ChevronRight, GraduationCap, Hammer, HeartHandshake, HeartPulse, Landmark, Lock, MapPin, MapPinned, Megaphone, MoreHorizontal, Music, PawPrint, Plane, Scale, ShoppingBag, SprayCan, Star, Store, Truck, User, UsersRound, Utensils } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MarketplaceListingCard from "@/components/MarketplaceListingCard";
import SiteFooter from "@/components/SiteFooter";
import { buildBusinessCategorySearchPath, buildMarketplaceSearchPath, useSearchLocation, type SearchLocation } from "@/contexts/SearchLocationContext";
import { getHomeContent } from "@/data/homeContent";
import { getCityDisplayName } from "@/lib/locationDisplay";
import { getOptimizedImageSrcSet, getOptimizedImageUrl } from "@/lib/images";
import { getCountryDisplayName } from "@/lib/locales";
import { type MarketplaceSnapshot } from "@/lib/marketplaceSnapshot";
import { setSeoMeta } from "@/lib/seo";
import { stripRichTextHtml } from "@/lib/richText";
import { calculateDistance, DEFAULT_GEO_FALLBACK, getApproxGeoByIp } from "@/lib/utils/geo";
import { buildBusinessUrl, getRecentBusinessesForRegion } from "@/services/businesses";
import type { BusinessFrontend } from "@/types/database";

type HomeV2Props = {
  initialFeaturedBusinesses?: BusinessFrontend[];
  initialRecentBusinesses?: BusinessFrontend[];
  initialAvailableLocations?: Array<{
    countryCode: string;
    countryName: string;
    states: Array<{ code: string; name: string; cities: string[] }>;
  }>;
  initialHomeSnapshot?: {
    businessCount: number;
    cityCount: number;
    countryCount: number;
    categoryCount: number;
    categoryCounts: Record<string, number>;
    popularCities: Array<{ displayName: string; countryCode: string; stateCode: string; count: number; href: string }>;
  };
  initialSearchSuggestions?: string[];
  initialMarketplaceSnapshot?: MarketplaceSnapshot;
};

const HOME_CATEGORY_ICONS: Record<string, typeof Utensils> = {
  food: Utensils,
  health_beauty: HeartPulse,
  auto: Car,
  construction: Hammer,
  legal_consulting: Scale,
  education: GraduationCap,
  accounting_finance: Landmark,
  retail: ShoppingBag,
  transport_moving: Truck,
  real_estate: Building2,
  tourism: Plane,
  artists: Music,
  pets: PawPrint,
  child_elder_care: User,
  cleaning: SprayCan,
  other: MoreHorizontal,
};

const HERO_BENEFITS = [
  {
    title: "Comunidade brasileira",
    description: "Conexões úteis para a vida de brasileiros fora do país.",
    icon: UsersRound,
    iconClassName: "bg-[#eaf3ed] text-[#167348]",
  },
  {
    title: "Anuncie gratuitamente",
    description: "Publique seu negócio ou produto sem pagar para anunciar.",
    icon: Megaphone,
    iconClassName: "bg-[#f8edd0] text-[#b1770d]",
  },
  {
    title: "Perto de você",
    description: "Encontre serviços, pessoas e oportunidades na sua região.",
    icon: MapPinned,
    iconClassName: "bg-[#e8eef5] text-[#235d91]",
  },
  {
    title: "De imigrante para imigrante",
    description: "Feito por quem conhece os desafios e as conquistas dessa jornada.",
    icon: HeartHandshake,
    iconClassName: "bg-[#f7e9df] text-[#c85f1a]",
  },
] as const;

const HOME_EYEBROW_CLASS = "text-sm font-semibold uppercase leading-tight tracking-[0.1em] antialiased";

function formatCount(count: number) {
  return new Intl.NumberFormat("pt-BR").format(count);
}

function countryCodeToFlag(countryCode: string) {
  const normalized = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "🌎";
  const regionalIndicatorA = 0x1f1e6;
  return String.fromCodePoint(...normalized.split("").map((letter) => regionalIndicatorA + letter.charCodeAt(0) - 65));
}

function mergeRecentBusinesses(current: BusinessFrontend[], additions: BusinessFrontend[]) {
  const seen = new Set<string>();
  return [...current, ...additions].filter((business) => {
    if (seen.has(business.id)) return false;
    seen.add(business.id);
    return true;
  });
}

export default function HomeV2({
  initialFeaturedBusinesses = [],
  initialRecentBusinesses = [],
  initialHomeSnapshot,
  initialMarketplaceSnapshot,
}: HomeV2Props = {}) {
  const navigate = useNavigate();
  const { searchLocation, setSearchLocation } = useSearchLocation();
  const homeText = getHomeContent();
  const snapshot = initialHomeSnapshot || {
    businessCount: 0,
    cityCount: 0,
    countryCount: 0,
    categoryCount: 0,
    categoryCounts: {},
    popularCities: [],
  };
  const categories = homeText.categories
    .map((category) => ({
      ...category,
      count: snapshot.categoryCounts[category.id] || 0,
      icon: HOME_CATEGORY_ICONS[category.id] || MoreHorizontal,
    }));
  const recentListings = initialMarketplaceSnapshot?.items.slice(0, 3) || [];
  const [recentBusinesses, setRecentBusinesses] = useState(initialRecentBusinesses);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const featuredBusinesses = initialFeaturedBusinesses.slice(0, 3);
  const [recentBusinessIndex, setRecentBusinessIndex] = useState(0);
  const activeRecentBusiness = recentBusinesses.length > 0
    ? recentBusinesses[recentBusinessIndex % recentBusinesses.length]
    : null;
  const marketplaceHref = buildMarketplaceSearchPath(searchLocation);

  useEffect(() => {
    let cancelled = false;

    const loadRegionalBusinesses = async () => {
      try {
        const geo = await getApproxGeoByIp({
          timeoutMs: 3000,
          maxAgeMs: 24 * 60 * 60 * 1000,
          fallback: DEFAULT_GEO_FALLBACK,
        });
        if (!geo || cancelled) {
          return;
        }

        setUserCoords({ lat: geo.lat, lng: geo.lng });
        setSearchLocation({
          city: geo.city || "",
          countryCode: geo.countryCode?.toLowerCase(),
          stateCode: geo.stateCode?.toLowerCase(),
          lat: geo.lat,
          lng: geo.lng,
        });

        const regionalBusinesses = await getRecentBusinessesForRegion({
          city: geo.city,
          countryCode: geo.countryCode,
          stateCode: geo.stateCode,
          originLat: geo.lat,
          originLng: geo.lng,
          limit: 5,
        });
        if (!cancelled) {
          setRecentBusinesses((current) => mergeRecentBusinesses(current, regionalBusinesses));
        }
      } catch {
        // Keep the immediately visible SSR list when regional data is unavailable.
      }
    };

    void loadRegionalBusinesses();
    return () => {
      cancelled = true;
    };
  }, [initialRecentBusinesses, setSearchLocation]);

  const handleCategoryClick = async (event: React.MouseEvent<HTMLAnchorElement>, categoryId: string) => {
    if (searchLocation?.city.trim()) return;

    event.preventDefault();
    const geo = await getApproxGeoByIp({
      timeoutMs: 3000,
      maxAgeMs: 24 * 60 * 60 * 1000,
      fallback: DEFAULT_GEO_FALLBACK,
    });
    const location: SearchLocation | null = geo?.city
      ? {
          city: geo.city,
          countryCode: geo.countryCode?.toLowerCase(),
          stateCode: geo.stateCode?.toLowerCase(),
          lat: geo.lat,
          lng: geo.lng,
        }
      : null;
    if (location) setSearchLocation(location);
    navigate(buildBusinessCategorySearchPath(categoryId, location));
  };

  useEffect(() => {
    setSeoMeta("Caramelinho | Nova experiência", "Encontre negócios brasileiros, produtos e serviços no exterior em uma nova experiência do Caramelinho.");
  }, []);

  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#203940] antialiased">
      <main>
        <section className="relative overflow-hidden border-b border-[#203940]/10 bg-[#f8f5eb]">
          <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-[#167348]/[0.06] blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#e4b53d]/[0.09] blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
              <div className="min-w-0">
                <h1 className="w-full max-w-[35rem] break-words pr-4 text-[2.65rem] font-black leading-[1.08] tracking-[-0.055em] text-[#203940] sm:text-6xl lg:text-[3.75rem]">
                  Encontre <span className="hero-gradient-phrase">negócios e produtos brasileiros</span> no mundo todo
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-[#203940]/70 sm:text-lg">
                  Descubra profissionais, serviços, eventos e produtos da comunidade brasileira, reunidos em um só lugar.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link to="/negocios" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#167348] px-5 text-sm font-bold text-white transition-shadow hover:shadow-[0_8px_20px_rgba(22,115,72,0.22)]">
                    Explorar negócios <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to={marketplaceHref} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#203940]/15 bg-white px-5 text-sm font-bold text-[#203940] transition-shadow hover:shadow-[0_8px_20px_rgba(32,57,64,0.12)]">
                    Ver produtos <ShoppingBag className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#203940]/60">
                  <span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-[#167348]" aria-hidden="true" />Negócios brasileiros</span>
                  <span className="inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-[#e4b53d]" aria-hidden="true" />Produtos da comunidade</span>
                  <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#235d91]" aria-hidden="true" />Eventos locais</span>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-xl lg:mx-0">
                <div className="absolute -left-4 -top-4 h-20 w-20 rounded-2xl bg-[#e4b53d]/30" aria-hidden="true" />
                <div className="absolute -bottom-4 -right-4 h-28 w-28 rounded-full bg-[#235d91]/10" aria-hidden="true" />
                <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-[#173f35] p-3 shadow-[0_26px_70px_rgba(32,57,64,0.18)]">
                  <div className="relative min-h-[320px] overflow-hidden rounded-xl bg-[#f1ead7] p-6 sm:min-h-[360px] sm:p-8">
                    <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#167348_0%,#167348_33%,#e4b53d_33%,#e4b53d_66%,#235d91_66%,#235d91_100%)]" />
                    <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border-[18px] border-[#e4b53d]/35" aria-hidden="true" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="max-w-none">
                        <p className={`${HOME_EYEBROW_CLASS} text-[#167348]`}>Recém-chegados à comunidade</p>
                        {activeRecentBusiness ? (
                          <div className="mt-4 rounded-xl border border-[#203940]/10 bg-white/80 p-4 shadow-sm sm:p-5">
                            <Link to={buildBusinessUrl(activeRecentBusiness)} className="group flex min-w-0 items-start gap-4 sm:gap-5">
                              <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-xl bg-[#edf0ec] sm:h-48 sm:w-48">
                                <img
                                  src={getOptimizedImageUrl(activeRecentBusiness.logoUrl || activeRecentBusiness.heroImage || "/cachorro-caramelo.webp", { width: 384, quality: 78, format: "webp" })}
                                  alt={activeRecentBusiness.name}
                                  width="384"
                                  height="384"
                                  loading="eager"
                                  decoding="async"
                                  className={`h-full w-full ${activeRecentBusiness.logoUrl || !activeRecentBusiness.heroImage ? "object-contain p-2" : "object-cover"}`}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-xl font-bold leading-tight text-[#203940] sm:text-2xl">{activeRecentBusiness.name}</p>
                                <p className="mt-2 truncate text-sm font-semibold text-[#167348]">{homeText.categories.find((category) => category.id === activeRecentBusiness.categoryId)?.name || activeRecentBusiness.category}</p>
                                <p className="mt-0.5 truncate text-sm text-[#203940]/55">{getCityDisplayName(activeRecentBusiness.address.cityDisplayName || activeRecentBusiness.address.city, activeRecentBusiness.address.countryCode)}, {getCountryDisplayName(activeRecentBusiness.address.countryCode, activeRecentBusiness.address.country)}</p>
                              </div>
                            </Link>
                            {recentBusinesses.length > 1 ? (
                              <div className="mt-4 flex items-center justify-between border-t border-[#203940]/10 pt-3">
                                <span className="text-xs font-semibold text-[#203940]/45" aria-live="polite">{(recentBusinessIndex % recentBusinesses.length) + 1} de {recentBusinesses.length}</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    aria-label="Negócio recém-publicado anterior"
                                    title="Anterior"
                                    onClick={() => setRecentBusinessIndex((current) => (current - 1 + recentBusinesses.length) % recentBusinesses.length)}
                                    className="grid h-9 w-9 place-items-center rounded-lg border border-[#203940]/10 text-[#203940]/60 transition-shadow hover:shadow-[0_4px_12px_rgba(22,115,72,0.16)]"
                                  >
                                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Próximo negócio recém-publicado"
                                    title="Próximo"
                                    onClick={() => setRecentBusinessIndex((current) => (current + 1) % recentBusinesses.length)}
                                    className="grid h-9 w-9 place-items-center rounded-lg border border-[#203940]/10 text-[#203940]/60 transition-shadow hover:shadow-[0_4px_12px_rgba(22,115,72,0.16)]"
                                  >
                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-[#203940]/10 bg-white/80 p-4 text-sm text-[#203940]/65">
                            Novos negócios brasileiros aparecem aqui assim que forem publicados.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <Link to="/negocios" className="group flex min-h-[150px] min-w-0 flex-col justify-between rounded-xl border border-[#167348]/15 bg-white p-4 text-[#203940] transition-shadow hover:shadow-[0_8px_20px_rgba(22,115,72,0.14)]">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`${HOME_EYEBROW_CLASS} text-xs text-[#167348]`}>Diretório</span>
                        <Store className="h-5 w-5 text-[#167348]" aria-hidden="true" />
                      </div>
                      <div>
                        <span className="flex items-center gap-1.5 text-[0.95rem] font-bold leading-snug tracking-[-0.01em] antialiased">Negócios e serviços brasileiros perto de você <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" /></span>
                        <span className="mt-1 block text-xs text-[#203940]/65">Encontre ajuda e conexões na sua região</span>
                      </div>
                    </Link>
                    <Link to={marketplaceHref} className="group flex min-h-[150px] min-w-0 flex-col justify-between rounded-xl border border-[#235d91]/15 bg-[#e7f0fb] p-4 text-[#153e68] transition-shadow hover:shadow-[0_8px_20px_rgba(0,92,169,0.16)]">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`${HOME_EYEBROW_CLASS} text-xs text-[#005ca9]`}>Marketplace</span>
                        <ShoppingBag className="h-5 w-5 text-[#005ca9]" aria-hidden="true" />
                      </div>
                      <div>
                        <span className="flex items-center gap-1.5 text-[0.95rem] font-bold leading-snug tracking-[-0.01em] antialiased">Explorar produtos <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" /></span>
                        <span className="mt-1 block text-xs text-[#153e68]/65">Compre, venda ou desapegue</span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-2 divide-x divide-y divide-[#203940]/10 overflow-hidden rounded-xl border border-[#203940]/10 bg-white sm:grid-cols-4 sm:divide-y-0">
              {[
                { value: snapshot.businessCount, label: "negócios", color: "text-[#167348]" },
                { value: snapshot.cityCount, label: "cidades", color: "text-[#c88a13]" },
                { value: snapshot.countryCount, label: "países", color: "text-[#235d91]" },
                { value: snapshot.categoryCount, label: "categorias", color: "text-[#c85f1a]" },
              ].map((stat) => (
                <div key={stat.label} className="px-5 py-4 text-center sm:py-5">
                  <p className={`text-2xl font-black ${stat.color}`}>{formatCount(stat.value)}</p>
                  <p className="mt-1 text-xs font-semibold text-[#203940]/55">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {recentListings.length > 0 ? (
          <section className="bg-[#fbfaf6] py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className={`${HOME_EYEBROW_CLASS} text-[#c85f1a]`}>Marketplace da comunidade</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#203940] sm:text-4xl">Produtos recém-publicados</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#203940]/60 sm:text-base">Compre, venda ou doe diretamente para brasileiros perto de você.</p>
                </div>
                <Link to={marketplaceHref} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#167348] hover:text-[#105a38]">Ver todos os produtos <ArrowUpRight className="h-4 w-4" /></Link>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {recentListings.map((listing) => (
                  <MarketplaceListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="border-y border-[#203940]/8 bg-[#f1f5f1] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className={`${HOME_EYEBROW_CLASS} text-[#167348]`}>Explore por categoria</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#203940] sm:text-4xl">Encontre o que precisa</h2>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {categories.map((category, index) => {
                const CategoryIcon = category.icon;
                return (
                  <Link
                    key={category.id}
                    to={buildBusinessCategorySearchPath(category.id, searchLocation)}
                    onClick={(event) => { void handleCategoryClick(event, category.id); }}
                    className="group rounded-xl border border-[#203940]/10 bg-white p-4 transition-shadow hover:shadow-[0_12px_32px_rgba(32,57,64,0.08)] sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`grid h-11 w-11 place-items-center rounded-full border bg-white ${index % 3 === 0 ? "border-[#167348]/25 text-[#167348]" : index % 3 === 1 ? "border-[#b1770d]/30 text-[#a36d08]" : "border-[#235d91]/25 text-[#235d91]"}`}>
                        <CategoryIcon className="h-5 w-5 stroke-[1.7]" />
                      </span>
                      <ChevronRight className="h-4 w-4 text-[#203940]/30" />
                    </div>
                    <h3 className="mt-7 text-sm font-bold leading-tight text-[#203940] sm:text-base">{category.name}</h3>
                    <p className="mt-2 text-xs text-[#203940]/50">{formatCount(category.count)} negócios no mundo</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {featuredBusinesses.length > 0 ? (
          <section className="bg-white py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className={`${HOME_EYEBROW_CLASS} text-[#235d91]`}>Descubra novos lugares</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#203940] sm:text-4xl">{homeText.featuredHeading}</h2>
                </div>
                <Link to="/negocios" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#167348] hover:text-[#105a38]">Ver diretório completo <ArrowUpRight className="h-4 w-4" /></Link>
              </div>
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {featuredBusinesses.map((business) => {
                  const heroImage = business.heroImage || "/cachorro-caramelo.webp";
                  return (
                    <Link key={business.id} to={buildBusinessUrl(business)} className="group">
                      <Card className="h-full overflow-hidden rounded-xl border border-[#203940]/10 bg-white p-0 shadow-none transition-shadow duration-300 hover:shadow-[0_16px_45px_rgba(32,57,64,0.10)]">
                        <div className="relative aspect-[16/10] overflow-hidden bg-[#edf0ec]">
                          <img
                            src={getOptimizedImageUrl(heroImage, { width: 768, quality: 78, format: "webp" })}
                            srcSet={getOptimizedImageSrcSet(heroImage, [480, 768], 78) || undefined}
                            sizes="(max-width: 768px) 92vw, 31vw"
                            alt={business.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute left-3 top-3 max-w-[48%] truncate rounded-md bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#203940] shadow-sm backdrop-blur-sm">
                            {homeText.categories.find((category) => category.id === business.categoryId)?.name || business.category}
                          </span>
                          {business.averageRating > 0 ? (
                            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                              {business.averageRating.toFixed(1)}
                            </span>
                          ) : null}
                          {userCoords && business.attendanceType !== "online" && Number.isFinite(business.address.lat) && Number.isFinite(business.address.lng) ? (
                            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-md bg-black/65 px-2.5 py-1 text-[10px] font-medium text-white shadow-sm backdrop-blur-sm">
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              {calculateDistance(userCoords.lat, userCoords.lng, business.address.lat, business.address.lng).toFixed(1)} km
                            </span>
                          ) : null}
                          {business.ownerVerified ? (
                            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-emerald-600/95 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              {homeText.verifiedLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="p-5">
                          <h3 className="text-lg font-bold text-[#203940]">{business.name}</h3>
                          <p className="mt-2 truncate text-xs text-[#203940]/55"><MapPin className="mr-1 inline h-3 w-3" />{getCityDisplayName(business.address.cityDisplayName || business.address.city, business.address.countryCode)}, {getCountryDisplayName(business.address.countryCode, business.address.country)}</p>
                          <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#203940]/65">{stripRichTextHtml(business.description || "Conheça este negócio brasileiro no exterior.")}</p>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {snapshot.popularCities.length > 0 ? (
          <section className="border-y border-[#203940]/10 bg-[#eef2f5] py-14 sm:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={`${HOME_EYEBROW_CLASS} text-[#235d91]`}>Pelo mundo</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#203940]">Cidades populares</h2>
                </div>
                <Link to="/negocios" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#235d91] hover:text-[#193f63]">Explorar todas as cidades <ArrowUpRight className="h-4 w-4" /></Link>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {snapshot.popularCities.map((city) => (
                  <Link key={city.href} to={city.href} className="group rounded-xl border border-[#203940]/10 bg-white p-4 transition-shadow hover:shadow-[0_10px_28px_rgba(32,57,64,0.08)]">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={`https://flagcdn.com/w40/${city.countryCode.toLowerCase()}.png`}
                        alt={`Bandeira de ${city.countryCode.toUpperCase()}`}
                        loading="lazy"
                        className="h-5 w-7 object-cover shadow-sm"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = "inline";
                        }}
                      />
                      <span className="hidden text-lg" aria-hidden="true">{countryCodeToFlag(city.countryCode)}</span>
                      <p className="truncate text-sm font-bold text-[#203940]">{city.displayName}</p>
                    </div>
                    <p className="mt-3 text-xs text-[#203940]/50">{formatCount(city.count)} negócios</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-[#fbfaf6] py-10 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl border border-[#203940]/10 bg-white shadow-[0_14px_40px_rgba(32,57,64,0.07)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#167348_0%,#167348_33%,#e4b53d_33%,#e4b53d_66%,#235d91_66%,#235d91_100%)]" aria-hidden="true" />
              <div className="grid gap-6 px-5 py-7 sm:px-8 sm:py-8 lg:grid-cols-[minmax(12rem,0.7fr)_minmax(0,2.3fr)] lg:items-center lg:gap-8">
                <div>
                  <p className={`${HOME_EYEBROW_CLASS} text-[#167348]`}>Feito para a nossa jornada</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#203940]">Conexões que fazem a vida longe do Brasil ficar mais leve.</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[#203940]/10">
                  {HERO_BENEFITS.map((benefit) => {
                    const BenefitIcon = benefit.icon;
                    return (
                      <div key={benefit.title} className="flex gap-3 border-t border-[#203940]/10 pt-3 first:border-t-0 sm:border-t-0 sm:pt-0 lg:px-4 lg:first:pl-0 lg:last:pr-0">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${benefit.iconClassName}`}>
                          <BenefitIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-tight text-[#203940]">{benefit.title}</p>
                          <p className="mt-1.5 text-xs leading-5 text-[#203940]/60">{benefit.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#fbfaf6] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl bg-[#173f35] px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14">
              <div className="absolute right-0 top-0 h-full w-2 bg-[linear-gradient(180deg,#167348_0%,#e4b53d_50%,#235d91_100%)]" />
              <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-5 sm:text-left">
                  <picture className="mt-1 h-40 w-40 shrink-0 sm:h-48 sm:w-48 lg:h-56 lg:w-56">
                    <source
                      type="image/webp"
                      srcSet="/brazil-map-pin-256.webp 256w, /brazil-map-pin-512.webp 512w"
                      sizes="(min-width: 1024px) 224px, (min-width: 640px) 192px, 160px"
                    />
                    <img
                      src="/brazil-map-pin.png"
                      alt=""
                      width="512"
                      height="512"
                      loading="lazy"
                      decoding="async"
                      aria-hidden="true"
                      className="h-full w-full object-contain"
                    />
                  </picture>
                  <div>
                    <p className={`${HOME_EYEBROW_CLASS} text-[#e8c867]`}>Faça parte da rede</p>
                    <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">Seu negócio também pode ser encontrado pela comunidade.</h2>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">Crie um perfil gratuito, apresente seus serviços e conecte-se com brasileiros no exterior.</p>
                  </div>
                </div>
                <Button asChild className="h-12 rounded-lg bg-[#c85f1a] px-6 font-bold text-white hover:shadow-[0_8px_20px_rgba(200,95,26,0.24)]">
                  <Link to="/cadastro">Cadastrar negócio <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
