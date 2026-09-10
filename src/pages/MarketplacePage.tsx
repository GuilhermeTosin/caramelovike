import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Baby, BookOpen, Briefcase, CalendarDays, CarFront, ChevronLeft, ChevronRight, CircleDollarSign, Dumbbell, FileText, GripVertical, Guitar, Heart, Images, MapPin, MapPinned, MessageCircle, Package, PackagePlus, Search, Share2, ShieldAlert, Shirt, ShoppingBasket, Smartphone, Sofa, Sparkles, Star, Tag, Upload, User, Wrench, X, Youtube, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import AddressAutocomplete, { type AddressResult } from "@/components/AddressAutocomplete";
import SiteFooter from "@/components/SiteFooter";
import { useAuth } from "@/contexts/AuthContext";
import { setSeoMeta } from "@/lib/seo";
import { DEFAULT_MARKETPLACE_DISTANCE_KM, MARKETPLACE_CATEGORIES, MARKETPLACE_DISTANCE_OPTIONS, normalizeMarketplaceDistance, normalizeMarketplaceKeywords } from "@/lib/marketplaceCategories";
import { buildMarketplaceRequestKey, marketplaceBusinessSellerPath, marketplaceListingPath, marketplaceSellerPath, type MarketplaceSnapshot } from "@/lib/marketplaceSnapshot";
import { contactMarketplaceSeller, createMarketplaceListing, getMarketplaceCategories, getMarketplaceListingByOwner, getMarketplaceListingByPath, getMarketplacePage, getMarketplaceBusinessSellerPage, getMarketplaceSellerBusinesses, getMarketplaceSellerPage, getSimilarMarketplaceListings, reportMarketplaceListing, toggleMarketplaceFavorite, updateMarketplaceListing, type MarketplaceBusinessSellerPage, type MarketplaceFilters, type MarketplaceSellerBusinessOption, type MarketplaceSellerPage } from "@/services/marketplace";
import { generateImagePath, removePublicImageUrls, uploadImage } from "@/services/storage";
import { getCurrencyCodeForCountry } from "@/lib/currency";
import { geocodeAddress } from "@/lib/google-maps";
import { DEFAULT_GEO_FALLBACK, getApproxGeoByIp } from "@/lib/utils/geo";
import MarketplaceListingCard from "@/components/MarketplaceListingCard";
import type { MarketplaceCategory, MarketplaceCondition, MarketplaceListing, MarketplaceListingType, MarketplaceReport } from "@/types/database";

type SharedProps = { initialSnapshot?: MarketplaceSnapshot; initialListing?: MarketplaceListing | null; initialSeller?: MarketplaceSellerPage | null; initialBusinessSeller?: MarketplaceBusinessSellerPage | null };

const TYPE_LABELS: Record<MarketplaceListingType, string> = { selling: "Vendendo", wanted: "Procurando", giving_away: "Doando" };
const CONDITION_LABELS: Record<MarketplaceCondition, string> = { new: "Novo", like_new: "Como novo", good: "Bom estado", used: "Usado", parts: "Para peças" };
const MARKETPLACE_PAGE_SIZE = 12;

function Header() {
  return null;
}

const MARKETPLACE_CATEGORY_ICONS: Record<string, LucideIcon> = {
  eletronicos: Smartphone,
  "casa-e-moveis": Sofa,
  "instrumentos-musicais": Guitar,
  "roupas-e-acessorios": Shirt,
  "bebes-e-criancas": Baby,
  "esportes-e-lazer": Dumbbell,
  "automoveis-e-acessorios": CarFront,
  ferramentas: Wrench,
  livros: BookOpen,
  "produtos-brasileiros": ShoppingBasket,
  "beleza-e-cuidados-pessoais": Sparkles,
  "vagas-de-emprego": Briefcase,
  outros: Package,
};

function getMarketplaceCategoryIcon(slug: string) {
  return MARKETPLACE_CATEGORY_ICONS[slug] || Tag;
}

function MarketplaceDiscoveryHeader({
  categories,
  selectedCategory,
  search,
  city,
  radiusKm,
  radiusError,
  onSearchChange,
  onCityChange,
  onCitySelected,
  onRadiusChange,
  onSubmit,
  onCategorySelect,
}: {
  categories: MarketplaceCategory[];
  selectedCategory: string;
  search: string;
  city: string;
  radiusKm: string;
  radiusError?: string;
  onSearchChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onCitySelected: (place: AddressResult) => void;
  onRadiusChange: (value: string) => void | Promise<void>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCategorySelect: (slug: string) => void;
}) {
  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-[#203940]/10 bg-[linear-gradient(135deg,#f5fbf7_0%,#fffdf7_52%,#f5f8fc_100%)] p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge className="mb-3 bg-[#e6f2e9] text-[#12633d] hover:bg-[#e6f2e9]">Marketplace da comunidade</Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#203940] sm:text-5xl">Encontre produtos perto de você</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">Compre, venda ou encontre produtos brasileiros e usados na sua região.</p>
        </div>
        <Button asChild className="caramelo-gradient w-full text-white sm:w-auto">
          <Link to="/marketplace/novo">+ Publicar anúncio</Link>
        </Button>
      </div>

      <form onSubmit={onSubmit} className="mt-7 hidden flex-col gap-2 rounded-2xl border border-[#203940]/12 bg-white/90 p-2 shadow-sm xl:flex xl:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#12633d]" aria-hidden="true" />
          <Input value={search} onChange={(event) => onSearchChange(event.target.value)} className="h-12 border-0 bg-transparent pl-12 text-base shadow-none focus-visible:ring-0" placeholder="O que você está procurando?" aria-label="Buscar produtos no Marketplace" />
        </div>
        <div className="relative min-w-0 lg:w-56 lg:border-l lg:border-[#203940]/10 lg:pl-2">
          <AddressAutocomplete
            value={city}
            onChange={onCityChange}
            onPlaceSelected={onCitySelected}
            mode="city"
            placeholder="Em qual cidade?"
            className="h-12 border-0 bg-transparent pl-12 text-base shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="min-w-0 lg:w-40 lg:border-l lg:border-[#203940]/10 lg:pl-2">
          <label className="flex h-12 items-center gap-2 px-3 text-sm text-muted-foreground">
            <MapPinned className="h-5 w-5 shrink-0 text-[#12633d]" aria-hidden="true" />
            <span className="sr-only">Distância</span>
            <select value={radiusKm} onChange={(event) => onRadiusChange(event.target.value)} className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none focus:ring-0" aria-label="Distância da busca">
              <option value="">Sem limite</option>
              {MARKETPLACE_DISTANCE_OPTIONS.map((distance) => <option key={distance} value={String(distance)}>Até {distance} km</option>)}
            </select>
          </label>
        </div>
        <Button type="submit" className="h-12 rounded-xl px-7 text-base">
          Buscar
        </Button>
      </form>
      <form onSubmit={onSubmit} className="mt-5 grid gap-3 rounded-2xl border border-[#203940]/12 bg-white/80 p-3 shadow-sm xl:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#203940]">Filtros</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Ajuste a localização e a distância.</p>
          </div>
          <MapPinned className="h-5 w-5 shrink-0 text-[#12633d]" aria-hidden="true" />
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <AddressAutocomplete
              value={city}
              onChange={onCityChange}
              onPlaceSelected={onCitySelected}
              mode="city"
              placeholder="Em qual cidade?"
              className="h-11 border-[#203940]/10 bg-transparent pl-4 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
          <label className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-[#203940]/10 px-3 text-sm text-muted-foreground sm:w-40">
            <MapPinned className="h-4 w-4 shrink-0 text-[#12633d]" aria-hidden="true" />
            <span className="sr-only">Distância</span>
            <select value={radiusKm} onChange={(event) => onRadiusChange(event.target.value)} className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none focus:ring-0" aria-label="Distância da busca">
              <option value="">Sem limite</option>
              {MARKETPLACE_DISTANCE_OPTIONS.map((distance) => <option key={distance} value={String(distance)}>Até {distance} km</option>)}
            </select>
          </label>
        </div>
        <Button type="submit" className="h-11 rounded-xl">Aplicar filtros</Button>
      </form>
      {radiusError ? <p className="mt-2 text-sm text-amber-700">{radiusError}</p> : null}

      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#203940] sm:text-lg">Explore por categoria</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Encontre anúncios de um tipo específico.</p>
          </div>
          {selectedCategory ? (
            <button type="button" onClick={() => onCategorySelect("")} className="shrink-0 text-xs font-semibold text-primary hover:underline">
              Limpar categoria
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          <button type="button" aria-pressed={!selectedCategory} onClick={() => onCategorySelect("")} className={`flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center transition-shadow hover:shadow-md ${!selectedCategory ? "border-[#12633d]/30 bg-[#eaf3ed] text-[#12633d]" : "border-border bg-white/70 text-muted-foreground"}`}>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#12633d] shadow-sm"><Tag className="h-3.5 w-3.5" aria-hidden="true" /></span>
            <span className="text-[11px] font-semibold leading-tight">Todos</span>
          </button>
          {categories.map((item) => {
            const CategoryIcon = getMarketplaceCategoryIcon(item.slug);
            const isSelected = selectedCategory === item.slug;
            return (
              <button key={item.id} type="button" aria-pressed={isSelected} onClick={() => onCategorySelect(item.slug)} className={`flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center transition-shadow hover:shadow-md ${isSelected ? "border-[#12633d]/30 bg-[#eaf3ed] text-[#12633d]" : "border-border bg-white/70 text-[#203940]"}`}>
                <span className={`grid h-7 w-7 place-items-center rounded-full shadow-sm ${isSelected ? "bg-white text-[#12633d]" : "bg-[#f1f5f1] text-[#12633d]"}`}><CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                <span className="text-[11px] font-semibold leading-tight">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MarketplaceMobileCategories({
  categories,
  selectedCategory,
  onCategorySelect,
}: {
  categories: MarketplaceCategory[];
  selectedCategory: string;
  onCategorySelect: (slug: string) => void;
}) {
  return (
    <nav className="mb-4 lg:hidden" aria-label="Categorias do Marketplace">
      <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          <button
            type="button"
            aria-pressed={!selectedCategory}
            onClick={() => onCategorySelect("")}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors ${!selectedCategory ? "border-[#12633d]/30 bg-[#eaf3ed] text-[#12633d]" : "border-border bg-white text-muted-foreground"}`}
          >
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            Todos
          </button>
          {categories.map((item) => {
            const CategoryIcon = getMarketplaceCategoryIcon(item.slug);
            const isSelected = selectedCategory === item.slug;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onCategorySelect(item.slug)}
                className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors ${isSelected ? "border-[#12633d]/30 bg-[#eaf3ed] text-[#12633d]" : "border-border bg-white text-[#203940]"}`}
              >
                <CategoryIcon className="h-3.5 w-3.5 text-[#12633d]" aria-hidden="true" />
                {item.name}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function MarketplaceMobileRadiusFilter({
  city,
  radiusKm,
  radiusError,
  onRadiusChange,
}: {
  city: string;
  radiusKm: string;
  radiusError?: string;
  onRadiusChange: (value: string) => void | Promise<void>;
}) {
  const hasCity = Boolean(city.trim());

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <MapPinned className="h-4 w-4 shrink-0 text-[#12633d]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#203940]">Distância</p>
            <p className="truncate text-xs text-muted-foreground">{hasCity ? `Perto de ${city}` : "Escolha uma cidade no header"}</p>
          </div>
        </div>
        <label className={`inline-flex h-9 shrink-0 items-center rounded-full border border-[#203940]/12 bg-white px-2.5 shadow-sm ${hasCity ? "text-[#203940]" : "text-muted-foreground/70"}`}>
          <span className="sr-only">Raio da busca</span>
          <select
            value={radiusKm}
            onChange={(event) => onRadiusChange(event.target.value)}
            disabled={!hasCity}
            className="h-full max-w-[9rem] border-0 bg-transparent text-xs font-semibold outline-none focus:ring-0 disabled:cursor-not-allowed"
            aria-label="Raio da busca"
          >
            <option value="">Sem limite</option>
            {MARKETPLACE_DISTANCE_OPTIONS.map((distance) => <option key={distance} value={String(distance)}>Até {distance} km</option>)}
          </select>
        </label>
      </div>
      {radiusError ? <p className="mb-4 text-xs text-amber-700 lg:hidden">{radiusError}</p> : null}
    </>
  );
}

type MarketplaceFilterValues = {
  search?: string;
  category?: string;
  listingType?: string;
  city?: string;
  radiusKm?: string;
  noRadius?: boolean;
  originLat?: string;
  originLng?: string;
  countryCode?: string;
  stateCode?: string;
  minPrice?: string;
  maxPrice?: string;
  condition?: string;
};

function MarketplacePageView({
  categories,
  category,
  search,
  city,
  radiusKm,
  radiusError,
  snapshot,
  isLoading,
  page,
  totalPages,
  onSearchChange,
  onCityChange,
  onCitySelected,
  onRadiusChange,
  onSubmit,
  onCategorySelect,
  onPageChange,
}: {
  categories: MarketplaceCategory[];
  category: string;
  search: string;
  city: string;
  radiusKm: string;
  radiusError?: string;
  snapshot: MarketplaceSnapshot | null;
  isLoading: boolean;
  page: number;
  totalPages: number;
  onSearchChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onCitySelected: (place: AddressResult) => void;
  onRadiusChange: (value: string) => void | Promise<void>;
  onSubmit: () => void | Promise<void>;
  onCategorySelect: (slug: string) => void;
  onPageChange: (nextPage: number) => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-8 pt-3 sm:px-6 sm:py-12 lg:px-8">
        <MarketplaceMobileCategories
          categories={categories}
          selectedCategory={category}
          onCategorySelect={onCategorySelect}
        />
        <MarketplaceMobileRadiusFilter
          city={city}
          radiusKm={radiusKm}
          radiusError={radiusError}
          onRadiusChange={onRadiusChange}
        />

        <div className="hidden lg:block">
          <MarketplaceDiscoveryHeader
            categories={categories}
            selectedCategory={category}
            search={search}
            city={city}
            radiusKm={radiusKm}
            radiusError={radiusError}
            onSearchChange={onSearchChange}
            onCityChange={onCityChange}
            onCitySelected={onCitySelected}
            onRadiusChange={onRadiusChange}
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
            onCategorySelect={onCategorySelect}
          />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{isLoading ? "Carregando anúncios..." : String(snapshot?.totalCount || 0) + (snapshot?.totalCount === 1 ? " anúncio encontrado" : " anúncios encontrados")}</p>
          <div className="flex items-center gap-4">
            <Link to="/marketplace/novo" className="text-sm font-semibold text-primary hover:underline lg:hidden">+ Publicar anúncio</Link>
            <Link to="/perfil?tab=marketplace" className="text-sm font-semibold text-primary hover:underline">Meus anúncios</Link>
          </div>
        </div>

        {isLoading ? <Card className="p-12 text-center text-muted-foreground">Carregando anúncios...</Card> : snapshot?.items.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{snapshot.items.map((listing) => <MarketplaceListingCard key={listing.id} listing={listing} />)}</div> : <Card className="p-12 text-center"><Tag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><h2 className="text-lg font-semibold">Nenhum anúncio encontrado</h2><p className="mt-2 text-sm text-muted-foreground">Tente outra busca ou publique o primeiro anúncio.</p></Card>}

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" disabled={page <= 1 || isLoading} onClick={() => onPageChange(page - 1)} aria-label="Página anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="text-sm text-muted-foreground">Página {Math.min(page, totalPages)} de {totalPages}</span>
          <Button variant="outline" size="icon" disabled={page >= totalPages || isLoading} onClick={() => onPageChange(page + 1)} aria-label="Próxima página">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function formatPrice(listing: MarketplaceListing) {
  if (listing.listing_type !== "selling" && listing.price == null) return TYPE_LABELS[listing.listing_type];
  if (listing.price == null) return "Preço a combinar";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: listing.currency || "CAD" }).format(listing.price);
}

function listingLocation(listing: MarketplaceListing) {
  return listing.neighborhood ? `${listing.city}, ${listing.state_code.toUpperCase()} - ${listing.neighborhood}` : `${listing.city}, ${listing.state_code.toUpperCase()}`;
}

function accountAgeLabel(createdAt?: string | null) {
  if (!createdAt) return "Membro da comunidade";
  const years = Math.floor((Date.now() - new Date(createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return years > 0 ? `Membro há ${years} ano${years === 1 ? "" : "s"}` : "Membro há menos de 1 ano";
}

function MarketplaceFormSection({
  icon: Icon,
  title,
  description,
  tone,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "green" | "blue" | "amber" | "orange" | "slate";
  children: React.ReactNode;
}) {
  const tones = {
    green: "border-border border-l-2 border-l-emerald-200 bg-muted/10",
    blue: "border-border border-l-2 border-l-sky-200 bg-muted/10",
    amber: "border-border border-l-2 border-l-amber-200 bg-muted/10",
    orange: "border-border border-l-2 border-l-orange-200 bg-muted/10",
    slate: "border-border border-l-2 border-l-slate-200 bg-muted/10",
  } as const;
  return <section className={`rounded-2xl border p-4 sm:p-6 ${tones[tone]}`}><div className="mb-5 flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-primary shadow-sm"><Icon className="h-5 w-5" /></div><div><h2 className="text-base font-bold text-foreground sm:text-lg">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div>{children}</section>;
}

function getYouTubeEmbedUrl(value?: string | null) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId = "";
    if (host === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com") {
      videoId = url.pathname === "/watch"
        ? url.searchParams.get("v") || ""
        : url.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/)?.[1] || "";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

function MarketplaceKeywordsField({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const addKeywords = (raw: string) => {
    const next = normalizeMarketplaceKeywords([...value, ...raw.split(/[,\n]/)]);
    if (next.length !== value.length) onChange(next);
    setDraft("");
  };
  const handleChange = (nextValue: string) => {
    const parts = nextValue.split(/[,\n]/);
    if (parts.length > 1) {
      const committed = normalizeMarketplaceKeywords([...value, ...parts.slice(0, -1)]);
      if (committed.length !== value.length) onChange(committed);
      setDraft(parts.at(-1) || "");
      return;
    }
    setDraft(nextValue);
  };
  return <div className="space-y-2"><label className="block space-y-2 text-sm font-medium">Palavras-chave (opcional)<Input value={draft} onChange={(event) => handleChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addKeywords(draft); } }} onBlur={() => { if (draft.trim()) addKeywords(draft); }} placeholder="Ex.: bicicleta, infantil, Toronto" /></label><p className="text-xs text-muted-foreground">Use termos que descrevem o produto. Elas ajudam seu anúncio a ser encontrado quando alguém pesquisar por essas palavras. Separe por vírgula ou pressione Enter. Até 10 palavras-chave.</p>{value.length ? <div className="flex flex-wrap gap-2">{value.map((keyword) => <Badge key={keyword} variant="secondary" className="gap-1 pr-1">{keyword}<button type="button" aria-label={`Remover palavra-chave ${keyword}`} onClick={() => onChange(value.filter((item) => item !== keyword))} className="rounded-full p-0.5 hover:bg-background"><X className="h-3 w-3" /></button></Badge>)}</div> : null}</div>;
}

export default function MarketplacePage({ initialSnapshot }: SharedProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedSearch = searchParams.get("q") || "";
  const appliedCategory = searchParams.get("categoria") || "";
  const appliedListingType = (searchParams.get("tipo") as MarketplaceListingType) || "";
  const appliedCity = searchParams.get("cidade") || "";
  const appliedCountryCode = searchParams.get("pais") || "";
  const appliedStateCode = searchParams.get("estado") || "";
  const appliedMinPrice = searchParams.get("precoMin") || "";
  const appliedMaxPrice = searchParams.get("precoMax") || "";
  const appliedCondition = (searchParams.get("condicao") as MarketplaceCondition) || "";
  const appliedRadiusKm = normalizeMarketplaceDistance(searchParams.get("raio"));
  const appliedNoRadius = searchParams.get("sem_raio") === "1";
  const appliedOriginLat = searchParams.get("origem_lat") || "";
  const appliedOriginLng = searchParams.get("origem_lng") || "";
  const hasAppliedOrigin = appliedOriginLat !== "" && appliedOriginLng !== ""
    && Number.isFinite(Number(appliedOriginLat)) && Number.isFinite(Number(appliedOriginLng));
  const effectiveAppliedRadiusKm = appliedNoRadius
    ? null
    : !appliedRadiusKm && appliedCity && hasAppliedOrigin
      ? DEFAULT_MARKETPLACE_DISTANCE_KM
      : appliedRadiusKm;
  const parsedPage = Number(searchParams.get("pagina") || 1);
  const appliedPage = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const [searchDraft, setSearchDraft] = useState(appliedSearch);
  const [cityDraft, setCityDraft] = useState(appliedCity);
  const [draftCountryCode, setDraftCountryCode] = useState(appliedCountryCode);
  const [draftStateCode, setDraftStateCode] = useState(appliedStateCode);
  const [draftRadiusKm, setDraftRadiusKm] = useState(appliedNoRadius ? "" : effectiveAppliedRadiusKm ? String(effectiveAppliedRadiusKm) : "");
  const [draftNoRadius, setDraftNoRadius] = useState(appliedNoRadius);
  const [draftOriginLat, setDraftOriginLat] = useState(appliedOriginLat);
  const [draftOriginLng, setDraftOriginLng] = useState(appliedOriginLng);
  const [radiusError, setRadiusError] = useState("");
  const appliedRequestKey = buildMarketplaceRequestKey(appliedSearch, appliedCategory, appliedListingType, appliedPage, appliedCity, appliedMinPrice, appliedMaxPrice, appliedCondition, appliedCountryCode, appliedStateCode, appliedNoRadius ? "none" : effectiveAppliedRadiusKm ? String(effectiveAppliedRadiusKm) : "", appliedOriginLat, appliedOriginLng);
  const initialSnapshotForRequest = initialSnapshot?.requestKey === appliedRequestKey ? initialSnapshot : null;
  const [snapshot, setSnapshot] = useState<MarketplaceSnapshot | null>(initialSnapshotForRequest);

  useEffect(() => { setSeoMeta("Marketplace | Caramelinho", "Compre, venda e encontre produtos perto de você no Marketplace do Caramelinho."); }, []);
  useEffect(() => {
    const filters: MarketplaceFilters = {
      search: appliedSearch,
      category: appliedCategory,
      listingType: appliedListingType || undefined,
      city: appliedCity,
      countryCode: appliedCountryCode || undefined,
      stateCode: appliedStateCode || undefined,
      minPrice: appliedMinPrice ? Number(appliedMinPrice.replace(",", ".")) : undefined,
      maxPrice: appliedMaxPrice ? Number(appliedMaxPrice.replace(",", ".")) : undefined,
      condition: appliedCondition || undefined,
      radiusKm: effectiveAppliedRadiusKm || undefined,
      originLat: appliedOriginLat ? Number(appliedOriginLat) : undefined,
      originLng: appliedOriginLng ? Number(appliedOriginLng) : undefined,
      page: appliedPage,
      pageSize: MARKETPLACE_PAGE_SIZE,
    };
    const requestKey = appliedRequestKey;
    if (initialSnapshot?.requestKey === requestKey) return;

    let active = true;
    void getMarketplacePage(filters).then((result) => { if (active) setSnapshot({ ...result, categories: initialSnapshot?.categories || [], requestKey }); }).catch(() => { if (active) setSnapshot({ items: [], totalCount: 0, categories: [], requestKey }); });
    return () => { active = false; };
  }, [appliedCategory, appliedCity, appliedCondition, appliedCountryCode, appliedListingType, appliedMaxPrice, appliedMinPrice, appliedPage, effectiveAppliedRadiusKm, appliedOriginLat, appliedOriginLng, appliedRequestKey, appliedSearch, appliedStateCode, initialSnapshot]);

  useEffect(() => {
    const sync = window.setTimeout(() => {
      setSearchDraft(appliedSearch);
      setCityDraft(appliedCity);
      setDraftCountryCode(appliedCountryCode);
      setDraftStateCode(appliedStateCode);
      setDraftRadiusKm(effectiveAppliedRadiusKm ? String(effectiveAppliedRadiusKm) : "");
      setDraftNoRadius(appliedNoRadius);
      setDraftOriginLat(appliedOriginLat);
      setDraftOriginLng(appliedOriginLng);
      setRadiusError("");
    }, 0);
    return () => window.clearTimeout(sync);
  }, [appliedCity, appliedCountryCode, appliedNoRadius, appliedOriginLat, appliedOriginLng, effectiveAppliedRadiusKm, appliedSearch, appliedStateCode]);

  const requestKey = appliedRequestKey;
  const visibleSnapshot = initialSnapshot?.requestKey === requestKey ? initialSnapshot : snapshot;
  const isLoading = !visibleSnapshot || visibleSnapshot.requestKey !== requestKey;
  const totalPages = Math.max(1, Math.ceil((visibleSnapshot?.totalCount || 0) / MARKETPLACE_PAGE_SIZE));
  const fallbackCategories: MarketplaceCategory[] = MARKETPLACE_CATEGORIES.map((category, index) => ({ ...category, id: category.slug, sort_order: index, is_active: true }));
  const categories = visibleSnapshot?.categories?.length ? [...visibleSnapshot.categories] : fallbackCategories;
  const categorySlugs = new Set(categories.map((category) => category.slug));
  for (const category of fallbackCategories) {
    if (!categorySlugs.has(category.slug)) categories.push(category);
  }
  const updateFilters = (next: MarketplaceFilterValues) => {
    const params = new URLSearchParams();
    if (next.search?.trim()) params.set("q", next.search.trim());
    if (next.category) params.set("categoria", next.category);
    if (next.listingType) params.set("tipo", next.listingType);
    if (next.city?.trim()) params.set("cidade", next.city.trim());
    if (next.countryCode?.trim()) params.set("pais", next.countryCode.trim().toLowerCase());
    if (next.stateCode?.trim()) params.set("estado", next.stateCode.trim().toLowerCase());
    if (next.minPrice?.trim()) params.set("precoMin", next.minPrice.trim());
    if (next.maxPrice?.trim()) params.set("precoMax", next.maxPrice.trim());
    if (next.condition) params.set("condicao", next.condition);
    const normalizedRadius = normalizeMarketplaceDistance(next.radiusKm);
    const nextLat = Number(next.originLat);
    const nextLng = Number(next.originLng);
    if (normalizedRadius) params.set("raio", String(normalizedRadius));
    else params.delete("raio");
    if (normalizedRadius) params.delete("sem_raio");
    else if (next.noRadius) params.set("sem_raio", "1");
    else params.delete("sem_raio");
    if (Number.isFinite(nextLat) && Number.isFinite(nextLng)) {
      params.set("origem_lat", String(nextLat));
      params.set("origem_lng", String(nextLng));
    } else {
      params.delete("origem_lat");
      params.delete("origem_lng");
    }
    setSearchParams(params);
  };

  const resolveDraftOrigin = async (radiusValue: string) => {
    const normalizedRadius = normalizeMarketplaceDistance(radiusValue);
    if (!normalizedRadius) return { lat: "", lng: "" };

    const currentLat = Number(draftOriginLat);
    const currentLng = Number(draftOriginLng);
    if (Number.isFinite(currentLat) && Number.isFinite(currentLng)) {
      return { lat: String(currentLat), lng: String(currentLng) };
    }

    if (!cityDraft.trim()) {
      setRadiusError("Selecione uma cidade antes de escolher um raio de distância.");
      return null;
    }

    const coords = await geocodeAddress(cityDraft);
    if (!coords) {
      setRadiusError("Selecione uma sugestão do Google para usar o filtro por distância.");
      return null;
    }
    setDraftOriginLat(String(coords.lat));
    setDraftOriginLng(String(coords.lng));
    return { lat: String(coords.lat), lng: String(coords.lng) };
  };

  const commitCurrentFilters = async (category = appliedCategory) => {
    setRadiusError("");
    const origin = await resolveDraftOrigin(draftRadiusKm);
    if (draftRadiusKm && !origin) return;
    updateFilters({ search: searchDraft, category, listingType: appliedListingType, city: cityDraft, countryCode: draftCountryCode, stateCode: draftStateCode, radiusKm: draftRadiusKm, noRadius: draftNoRadius, originLat: origin?.lat || "", originLng: origin?.lng || "", minPrice: appliedMinPrice, maxPrice: appliedMaxPrice, condition: appliedCondition });
  };

  const handlePageChange = (nextPage: number) => {
    setSearchParams((params) => {
      const nextParams = new URLSearchParams(params);
      if (nextPage <= 1) nextParams.delete("pagina");
      else nextParams.set("pagina", String(nextPage));
      return nextParams;
    });
  };

  return (
    <MarketplacePageView
      categories={categories}
      category={appliedCategory}
      search={searchDraft}
      city={cityDraft}
      radiusKm={draftRadiusKm}
      radiusError={radiusError}
      snapshot={visibleSnapshot}
      isLoading={isLoading}
      page={appliedPage}
      totalPages={totalPages}
      onSearchChange={setSearchDraft}
      onCityChange={(value) => {
        setCityDraft(value);
        setDraftCountryCode("");
        setDraftStateCode("");
        setDraftOriginLat("");
        setDraftOriginLng("");
        setRadiusError("");
        if (value.trim() && !draftNoRadius && !draftRadiusKm) setDraftRadiusKm(String(DEFAULT_MARKETPLACE_DISTANCE_KM));
        if (!value.trim()) setDraftRadiusKm("");
      }}
      onCitySelected={(place) => {
        const selectedCity = place.city?.trim() || place.formattedAddress.split(",")[0]?.trim() || place.formattedAddress;
        setCityDraft(selectedCity);
        setDraftCountryCode(place.countryCode.trim().toLowerCase());
        setDraftStateCode(place.stateCode.trim().toLowerCase());
        setDraftOriginLat(String(place.lat));
        setDraftOriginLng(String(place.lng));
        setRadiusError("");
        if (!draftNoRadius && !draftRadiusKm) setDraftRadiusKm(String(DEFAULT_MARKETPLACE_DISTANCE_KM));
      }}
      onRadiusChange={async (value) => {
        const normalizedRadius = normalizeMarketplaceDistance(value);
        setDraftRadiusKm(normalizedRadius ? String(normalizedRadius) : "");
        setDraftNoRadius(!normalizedRadius);
        setRadiusError("");
        if (!normalizedRadius) {
          updateFilters({ search: searchDraft, category: appliedCategory, listingType: appliedListingType, city: cityDraft, countryCode: draftCountryCode, stateCode: draftStateCode, radiusKm: "", noRadius: true, originLat: "", originLng: "", minPrice: appliedMinPrice, maxPrice: appliedMaxPrice, condition: appliedCondition });
          return;
        }
        const origin = await resolveDraftOrigin(String(normalizedRadius));
        if (!origin) return;
        updateFilters({ search: searchDraft, category: appliedCategory, listingType: appliedListingType, city: cityDraft, countryCode: draftCountryCode, stateCode: draftStateCode, radiusKm: String(normalizedRadius), noRadius: false, originLat: origin.lat, originLng: origin.lng, minPrice: appliedMinPrice, maxPrice: appliedMaxPrice, condition: appliedCondition });
      }}
      onSubmit={() => commitCurrentFilters()}
      onCategorySelect={(nextCategory) => {
        void commitCurrentFilters(nextCategory);
      }}
      onPageChange={handlePageChange}
    />
  );
}

export function MarketplaceCreatePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [sellerBusinesses, setSellerBusinesses] = useState<MarketplaceSellerBusinessOption[]>([]);
  const [sellerBusinessId, setSellerBusinessId] = useState("");
  const [type, setType] = useState<MarketplaceListingType>("selling");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [condition, setCondition] = useState<MarketplaceCondition | "">("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [countryCode, setCountryCode] = useState("ca");
  const [stateCode, setStateCode] = useState("qc");
  const [city, setCity] = useState("Montréal");
  const [locationText, setLocationText] = useState("");
  const [locationTouched, setLocationTouched] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [neighborhood, setNeighborhood] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draggingFileIndex, setDraggingFileIndex] = useState<number | null>(null);
  const submitLockRef = useRef(false);
  useEffect(() => {
    let active = true;
    void getApproxGeoByIp({ timeoutMs: 3000, maxAgeMs: 24 * 60 * 60 * 1000, fallback: DEFAULT_GEO_FALLBACK }).then((geo) => {
      if (!active || !geo || locationTouched) return;
      const nextCountryCode = geo.countryCode?.toLowerCase() || "ca";
      const nextStateCode = geo.stateCode?.toLowerCase() || "qc";
      const nextCity = geo.city?.trim() || "Montréal";
      setCountryCode(nextCountryCode);
      setStateCode(nextStateCode);
      setCity(nextCity);
      setCurrency(getCurrencyCodeForCountry(nextCountryCode));
      setLatitude(geo.lat);
      setLongitude(geo.lng);
      setLocationText([nextCity, nextStateCode.toUpperCase(), nextCountryCode.toUpperCase()].filter(Boolean).join(", "));
    });
    return () => {
      active = false;
    };
  }, [locationTouched]);
  useEffect(() => {
    const previews = files.map((file) => URL.createObjectURL(file));
    setFilePreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [files]);
  useEffect(() => {
    let active = true;
    void getMarketplaceCategories()
      .then((items) => {
        if (!active) return;
        setCategories(items);
        setCategoryId((current) => current || items[0]?.id || "");
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar as categorias. Verifique se a migração do Marketplace foi executada no Supabase.");
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!session?.userId) return;
    let active = true;
    void getMarketplaceSellerBusinesses()
      .then((items) => {
        if (active) setSellerBusinesses(items);
      })
      .catch((sellerBusinessError) => {
        console.warn("[Marketplace] Não foi possível carregar os negócios para publicação:", sellerBusinessError);
      });
    return () => {
      active = false;
    };
  }, [session?.userId]);
  if (!session) return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">Entre para publicar um anúncio</h1><p className="mt-2 text-muted-foreground">Sua conta protege o contato e a propriedade do anúncio.</p><Button asChild className="mt-6"><Link to="/entrar">Entrar</Link></Button></main><SiteFooter /></div>;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitLockRef.current) return;
    setError("");
    if (categoriesLoading) {
      setError("Aguarde o carregamento das categorias.");
      return;
    }
    const missingFields: string[] = [];
    if (!categoryId) missingFields.push("categoria");
    if (!title.trim()) missingFields.push("título");
    if (title.trim().length > 0 && title.trim().length < 3) missingFields.push("título com pelo menos 3 caracteres");
    if (!description.trim()) missingFields.push("descrição");
    if (description.trim().length > 0 && description.trim().length < 10) missingFields.push("descrição com pelo menos 10 caracteres");
    if (!city.trim()) missingFields.push("cidade");
    const normalizedPrice = price.trim().replace(",", ".");
    const numericPrice = normalizedPrice ? Number(normalizedPrice) : null;
    if (type === "selling") {
      if (!normalizedPrice) missingFields.push("preço");
      else if (numericPrice === null || !Number.isFinite(numericPrice) || numericPrice < 0) missingFields.push("preço válido");
    }
    if (videoUrl.trim() && !getYouTubeEmbedUrl(videoUrl)) missingFields.push("link de vídeo do YouTube válido");
    if (missingFields.length) {
      setError(`Revise: ${missingFields.join(", ")}.`);
      return;
    }
    submitLockRef.current = true;
    setSaving(true);
    const listingId = crypto.randomUUID();
    let uploadedUrls: string[] = [];
    const cleanupUploadedImages = async () => {
      if (uploadedUrls.length === 0) return;
      const cleanup = await removePublicImageUrls("business-images", uploadedUrls);
      if (!cleanup.ok) console.warn("[Marketplace] Não foi possível limpar imagens temporárias:", cleanup.error);
    };
    try {
      const uploadResults = await Promise.all(files.slice(0, 8).map((file) => uploadImage("business-images", `marketplace/${session.userId}/${generateImagePath(listingId, "photo", file.name)}`, file)));
      uploadedUrls = uploadResults.filter((url): url is string => !!url);
      if (uploadedUrls.length !== uploadResults.length) {
        await cleanupUploadedImages();
        setError("Não foi possível enviar todas as fotos. Nenhum anúncio foi publicado.");
        return;
      }

      const result = await createMarketplaceListing({ listingType: type, categoryId, sellerBusinessId: sellerBusinessId || null, title, description, price: type === "selling" ? numericPrice : null, currency, condition: condition || null, countryCode, stateCode, city, neighborhood, lat: latitude, lng: longitude, keywords, videoUrl, id: listingId, images: uploadedUrls });
      if (!result.ok || !result.listing) {
        await cleanupUploadedImages();
        setError(result.error || "Não foi possível publicar o anúncio.");
        return;
      }
      navigate(marketplaceListingPath({ ...result.listing, city }));
    } catch (submitError) {
      await cleanupUploadedImages();
      setError(submitError instanceof Error ? submitError.message : "Não foi possível publicar o anúncio.");
    } finally {
      submitLockRef.current = false;
      setSaving(false);
    }
  };
  const addFiles = (selectedFiles: FileList | null) => {
    const incoming = Array.from(selectedFiles || []);
    if (incoming.length === 0) return;
    setFiles((current) => {
      const existingKeys = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      return [...current, ...incoming.filter((file) => !existingKeys.has(`${file.name}:${file.size}:${file.lastModified}`))].slice(0, 8);
    });
  };
  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };
  const moveFile = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setFiles((current) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= current.length || toIndex >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };
  return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12"><Link to="/marketplace" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar ao Marketplace</Link><Card className="overflow-hidden border-border shadow-sm"><div className="border-b border-border bg-muted/20 p-5 sm:p-8"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm"><PackagePlus className="h-5 w-5" /></div><div><h1 className="text-3xl font-extrabold tracking-tight">Publicar anúncio</h1><p className="mt-2 max-w-2xl text-muted-foreground">Compartilhe um produto com a comunidade. O endereço residencial não é necessário.</p></div></div></div><form onSubmit={submit} className="space-y-5 p-5 sm:p-8"><MarketplaceFormSection icon={PackagePlus} title="Sobre o anúncio" description="Defina o tipo e a categoria para ajudar as pessoas a encontrarem seu produto." tone="green"><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Tipo<select value={type} onChange={(event) => setType(event.target.value as MarketplaceListingType)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3">{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="space-y-2 text-sm font-medium">Categoria<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={categoriesLoading || categories.length === 0} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"><option value="">{categoriesLoading ? "Carregando categorias..." : "Selecione uma categoria"}</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="mt-4 rounded-lg border border-border/70 bg-background p-3"><label className="block space-y-2 text-sm font-medium">Publicar como<select value={sellerBusinessId} onChange={(event) => setSellerBusinessId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"><option value="">Meu perfil</option>{sellerBusinesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label><p className="mt-2 text-xs text-muted-foreground">Escolha um negócio seu ou que você gerencia. O anúncio continua protegido pela sua conta, mas será apresentado publicamente com o nome e a identidade do negócio.</p></div></MarketplaceFormSection><MarketplaceFormSection icon={FileText} title="Detalhes do produto" description="Um título claro e uma boa descrição ajudam a gerar confiança." tone="blue"><div className="space-y-4"><label className="block space-y-2 text-sm font-medium">Título<Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} placeholder="Ex.: Bicicleta infantil" /></label><label className="block space-y-2 text-sm font-medium">Descrição<Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={6} placeholder="Descreva o produto, estado e condições." /></label></div></MarketplaceFormSection><MarketplaceFormSection icon={CircleDollarSign} title="Preço e condição" description="Informe o valor e o estado do produto. O preço é opcional para pedidos e doações." tone="amber"><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">{type === "selling" ? "Preço" : "Preço (opcional)"}<Input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" disabled={type !== "selling"} placeholder="0,00" /></label><label className="space-y-2 text-sm font-medium">Moeda<Input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase().slice(0, 3))} maxLength={3} /></label><label className="space-y-2 text-sm font-medium">Condição<select value={condition} onChange={(event) => setCondition(event.target.value as MarketplaceCondition | "")} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"><option value="">Não informado</option>{Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></MarketplaceFormSection><MarketplaceFormSection icon={Youtube} title="Ajude as pessoas a encontrar seu anúncio" description="Palavras-chave e um vídeo ajudam a explicar melhor o produto." tone="blue"><div className="space-y-5"><MarketplaceKeywordsField value={keywords} onChange={setKeywords} /><label className="block space-y-2 text-sm font-medium">Link do vídeo no YouTube (opcional)<Input type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label><p className="text-xs text-muted-foreground">Um vídeo pode mostrar detalhes, funcionamento ou o estado real do produto e aumentar a confiança de quem está vendo o anúncio.</p></div></MarketplaceFormSection><MarketplaceFormSection icon={MapPinned} title="Localização" description="Selecione a cidade do anúncio para preencher os dados de localização." tone="orange"><div className="space-y-3"><label className="block space-y-2 text-sm font-medium">Cidade do anúncio<AddressAutocomplete value={locationText} onChange={(value) => { setLocationTouched(true); setLocationText(value); setCity(""); setStateCode(""); setCountryCode(""); setLatitude(null); setLongitude(null); }} onPlaceSelected={(place: AddressResult) => { setLocationTouched(true); setLocationText(place.formattedAddress || place.city); setCity(place.city); setStateCode(place.stateCode.toLowerCase()); setCountryCode(place.countryCode.toLowerCase()); setLatitude(place.lat); setLongitude(place.lng); setCurrency(getCurrencyCodeForCountry(place.countryCode)); }} mode="city" placeholder="Digite a cidade e selecione uma sugestão" /></label>{city || stateCode || countryCode ? <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">Localização selecionada: <span className="font-medium text-foreground">{[city, stateCode.toUpperCase(), countryCode.toUpperCase()].filter(Boolean).join(", ")}</span></p> : <p className="text-xs text-muted-foreground">Selecione uma cidade para continuar.</p>}<label className="block space-y-2 text-sm font-medium">Bairro/região (opcional)<Input value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} /></label></div></MarketplaceFormSection><MarketplaceFormSection icon={Images} title="Fotos do anúncio" description="Adicione até 8 fotos. A primeira será a foto principal e você pode alterar a ordem arrastando as miniaturas." tone="slate"><label className="block cursor-pointer rounded-xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/20"><Upload className="mx-auto mb-2 h-5 w-5 text-primary" />Adicionar fotos<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }} />{files.length ? <span className="mt-2 block font-medium text-foreground">{files.length}/8 foto(s) selecionada(s). Você pode adicionar mais.</span> : <span className="mt-1 block text-xs">JPG, PNG ou WebP</span>}</label>{filePreviews.length ? <div className="space-y-2"><p className="text-sm font-medium">Pré-visualização</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{filePreviews.map((preview, index) => <div key={preview} draggable onDragStart={() => setDraggingFileIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggingFileIndex !== null) moveFile(draggingFileIndex, index); setDraggingFileIndex(null); }} onDragEnd={() => setDraggingFileIndex(null)} className={`group relative overflow-hidden rounded-lg border bg-secondary ${draggingFileIndex === index ? "border-primary opacity-60" : "border-border"}`}><img src={preview} alt={`Pré-visualização ${index + 1}`} className="aspect-square w-full object-cover" /><div className="absolute left-1 top-1 rounded bg-black/65 p-1 text-white" title="Arraste para reordenar"><GripVertical className="h-4 w-4" /></div><button type="button" aria-label={`Excluir foto ${index + 1}`} onClick={() => removeFile(index)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-100 transition-opacity hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100"><X className="h-4 w-4" /></button>{index === 0 ? <span className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-center text-xs font-semibold text-white">Principal</span> : null}</div>)}</div></div> : null}</MarketplaceFormSection>{error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p> : null}<Button type="submit" disabled={saving || categoriesLoading || categories.length === 0} className="w-full caramelo-gradient text-white">{saving ? "Publicando..." : "Publicar anúncio"}</Button></form></Card></main><SiteFooter /></div>;
}

export function MarketplaceEditPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [sellerBusinesses, setSellerBusinesses] = useState<MarketplaceSellerBusinessOption[]>([]);
  const [sellerBusinessId, setSellerBusinessId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [condition, setCondition] = useState<MarketplaceCondition | "">("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!id || !session?.userId) return; void getMarketplaceListingByOwner(id, session.userId).then((item) => { setListing(item); if (item) { setTitle(item.title); setDescription(item.description); setPrice(item.price == null ? "" : String(item.price)); setCurrency(item.currency); setCondition(item.condition || ""); setKeywords(item.keywords || []); setVideoUrl(item.video_url || ""); setCity(item.city); setNeighborhood(item.neighborhood || ""); setSellerBusinessId(item.seller_business_id || ""); } }); }, [id, session?.userId]);
  useEffect(() => {
    if (!session?.userId) return;
    let active = true;
    void getMarketplaceSellerBusinesses()
      .then((items) => { if (active) setSellerBusinesses(items); })
      .catch((sellerBusinessError) => console.warn("[Marketplace] Não foi possível carregar os negócios para edição:", sellerBusinessError));
    return () => { active = false; };
  }, [session?.userId]);
  if (!session) return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">Entre para editar seu anúncio</h1><Button asChild className="mt-6"><Link to="/entrar">Entrar</Link></Button></main></div>;
  if (!listing) return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">Carregando anúncio...</h1><p className="mt-2 text-muted-foreground">Se o anúncio não existir ou não pertencer à sua conta, ele não poderá ser editado.</p></main></div>;
  const save = async (event: React.FormEvent) => { event.preventDefault(); setError(""); if (title.trim().length < 3 || description.trim().length < 10 || !city.trim()) { setError("Preencha título, descrição e cidade."); return; } const normalizedPrice = price.trim().replace(",", "."); const numericPrice = normalizedPrice ? Number(normalizedPrice) : null; if (listing.listing_type === "selling" && (!normalizedPrice || numericPrice === null || !Number.isFinite(numericPrice) || numericPrice < 0)) { setError("Informe um preço válido para um anúncio à venda."); return; } if (videoUrl.trim() && !getYouTubeEmbedUrl(videoUrl)) { setError("Informe um link válido de vídeo do YouTube."); return; } setSaving(true); const result = await updateMarketplaceListing(listing.id, session.userId, { sellerBusinessId: sellerBusinessId || null, title, description, price: listing.listing_type === "selling" ? numericPrice : null, currency, condition: condition || null, city, neighborhood, keywords, videoUrl }); setSaving(false); if (!result.ok) { setError(result.error || "Não foi possível salvar."); return; } navigate(marketplaceListingPath(result.listing || listing)); };
  return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12"><Link to="/perfil?tab=marketplace" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar aos meus anúncios</Link><Card className="p-5 sm:p-8"><h1 className="text-3xl font-extrabold">Editar anúncio</h1><form onSubmit={save} className="mt-8 space-y-5"><div className="rounded-lg border border-border/70 bg-muted/20 p-3"><label className="block space-y-2 text-sm font-medium">Publicar como<select value={sellerBusinessId} onChange={(event) => setSellerBusinessId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"><option value="">Meu perfil</option>{sellerBusinesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label><p className="mt-2 text-xs text-muted-foreground">O anúncio continua pertencendo à sua conta, mas pode ser apresentado com a identidade de um negócio autorizado.</p></div><label className="block space-y-2 text-sm font-medium">Título<Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} /></label><label className="block space-y-2 text-sm font-medium">Descrição<Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={7} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">{listing.listing_type === "selling" ? "Preço" : "Preço (opcional)"}<Input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" disabled={listing.listing_type !== "selling"} /></label><label className="space-y-2 text-sm font-medium">Moeda<Input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase().slice(0, 3))} maxLength={3} /></label><label className="space-y-2 text-sm font-medium">Condição<select value={condition} onChange={(event) => setCondition(event.target.value as MarketplaceCondition | "")} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"><option value="">Não informado</option>{Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="space-y-2 text-sm font-medium">Cidade<Input value={city} onChange={(event) => setCity(event.target.value)} /></label><label className="space-y-2 text-sm font-medium">Bairro/região<Input value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} /></label></div><MarketplaceFormSection icon={Youtube} title="Como as pessoas encontram seu anúncio" description="Palavras-chave e um vídeo ajudam a explicar melhor o produto." tone="blue"><div className="space-y-5"><MarketplaceKeywordsField value={keywords} onChange={setKeywords} /><label className="block space-y-2 text-sm font-medium">Link do vídeo no YouTube (opcional)<Input type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label><p className="text-xs text-muted-foreground">Um vídeo pode mostrar detalhes, funcionamento ou o estado real do produto e aumentar a confiança de quem está vendo o anúncio.</p></div></MarketplaceFormSection>{error ? <p className="text-sm text-destructive">{error}</p> : null}<Button type="submit" disabled={saving} className="w-full">{saving ? "Salvando..." : "Salvar alterações"}</Button></form></Card></main><SiteFooter /></div>;
}

export function MarketplaceListingPage({ initialListing }: SharedProps) {
  const params = useParams<{ countryCode: string; stateCode: string; city: string; slug: string }>();
  const { session } = useAuth();
  const [listing, setListing] = useState<MarketplaceListing | null>(initialListing || null);
  const [similar, setSimilar] = useState<MarketplaceListing[]>([]);
  const [message, setMessage] = useState("");
  const [reportReason, setReportReason] = useState<MarketplaceReport["reason"]>("other");
  const [reportDetails, setReportDetails] = useState("");
  const [notice, setNotice] = useState("");
  const [favorite, setFavorite] = useState(!!initialListing?.is_favorited);
  const [listingLoading, setListingLoading] = useState(!initialListing);
  useEffect(() => {
    if (initialListing) {
      setListingLoading(false);
      return;
    }
    if (!params.countryCode || !params.stateCode || !params.city || !params.slug) {
      setListingLoading(false);
      return;
    }
    let active = true;
    void getMarketplaceListingByPath(params.countryCode, params.stateCode, decodeURIComponent(params.city), params.slug)
      .then((item) => { if (active) setListing(item); })
      .finally(() => { if (active) setListingLoading(false); });
    return () => { active = false; };
  }, [initialListing, params.city, params.countryCode, params.slug, params.stateCode]);
  useEffect(() => { if (!listing) return; setSeoMeta(`${listing.title} | Marketplace | Caramelinho`, `${listing.title} em ${listing.city}. Veja preço, condição e entre em contato com o vendedor no Marketplace do Caramelinho.`); void getSimilarMarketplaceListings(listing).then(setSimilar); }, [listing]);
  if (listingLoading) return <div className="min-h-screen bg-background" aria-busy="true" aria-label="Carregando anúncio"><Header /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8"><div className="animate-pulse space-y-5"><div className="aspect-video rounded-xl bg-muted/60" /><div className="h-8 w-2/3 rounded bg-muted/60" /><div className="h-4 w-1/2 rounded bg-muted/50" /><div className="h-32 rounded bg-muted/40" /></div></main></div>;
  if (!listing) return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="text-2xl font-bold">Anúncio não encontrado</h1><p className="mt-2 text-muted-foreground">Este anúncio pode ter sido removido ou não está mais disponível.</p><Button asChild className="mt-6"><Link to="/marketplace">Voltar ao Marketplace</Link></Button></main></div>;
  const images = listing.images || [];
  const sellerName = listing.seller_business_name?.trim() || listing.owner_name || "Usuário";
  const sellerAvatar = listing.seller_business_logo || listing.owner_avatar;
  const sellerPath = listing.seller_business_id ? marketplaceBusinessSellerPath(listing.seller_business_id) : marketplaceSellerPath(listing.owner_id);
  const sellerListingCount = listing.seller_listing_count ?? listing.owner_listing_count ?? 0;
  const handleContact = async () => { if (!message.trim()) return; const result = await contactMarketplaceSeller(listing, message); setNotice(result.ok ? "Mensagem enviada. Você pode continuar a conversa na sua conta." : result.error || "Não foi possível enviar a mensagem."); if (result.ok) setMessage(""); };
  const handleFavorite = async () => { const next = !favorite; const result = await toggleMarketplaceFavorite(listing.id, next); if (result.ok) setFavorite(next); else setNotice(result.error || "Faça login para salvar anúncios."); };
  return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8"><Link to="/marketplace" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Marketplace</Link><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"><section><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.length ? images.map((image, index) => <img key={image.id} src={image.image_url} alt={`${listing.title} - foto ${index + 1}`} className="aspect-square w-full rounded-xl object-cover sm:first:col-span-2 sm:first:row-span-2" />) : <div className="col-span-full flex aspect-video items-center justify-center rounded-xl bg-secondary text-muted-foreground"><Tag className="h-16 w-16" /></div>}</div><div className="mt-8"><div className="flex flex-wrap items-center gap-2"><Badge>{TYPE_LABELS[listing.listing_type]}</Badge>{listing.condition ? <Badge variant="secondary">{CONDITION_LABELS[listing.condition]}</Badge> : null}<Badge variant="secondary">{listing.category?.name || "Marketplace"}</Badge></div><h1 className="mt-4 break-words text-3xl font-extrabold tracking-tight sm:text-4xl">{listing.title}</h1><p className="mt-3 text-2xl font-bold text-primary">{formatPrice(listing)}</p><div className="mt-4 flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{listingLocation(listing)}</div><div className="prose prose-sm mt-8 max-w-none whitespace-pre-wrap break-words text-foreground"><p>{listing.description}</p></div>{listing.keywords?.length ? <div className="mt-6 flex flex-wrap gap-2">{listing.keywords.map((keyword) => <Badge key={keyword} variant="secondary">#{keyword}</Badge>)}</div> : null}{getYouTubeEmbedUrl(listing.video_url) ? <section className="mt-8"><h2 className="mb-3 text-xl font-bold">Vídeo do anúncio</h2><div className="aspect-video overflow-hidden rounded-xl bg-secondary"><iframe src={getYouTubeEmbedUrl(listing.video_url) || undefined} title={`${listing.title} - vídeo`} loading="lazy" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></section> : null}<div className="mt-8 flex flex-wrap gap-3"><Button variant={favorite ? "default" : "outline"} onClick={handleFavorite}><Heart className={`mr-2 h-4 w-4 ${favorite ? "fill-current" : ""}`} />{favorite ? "Salvo" : "Salvar"}</Button><Button variant="outline" onClick={() => void navigator.clipboard?.writeText(window.location.href).then(() => setNotice("Link copiado."))}><Share2 className="mr-2 h-4 w-4" />Compartilhar</Button></div></div></section><aside className="space-y-5"><Card className="p-5"><h2 className="text-lg font-bold">Fale com o vendedor</h2>{session ? <><Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-4" rows={4} placeholder="Olá! Tenho interesse neste anúncio." /><Button className="mt-3 w-full" onClick={() => void handleContact()}><MessageCircle className="mr-2 h-4 w-4" />Enviar mensagem</Button></> : <><p className="mt-2 text-sm text-muted-foreground">Entre na sua conta para iniciar uma conversa segura sem expor seu e-mail ou telefone.</p><Button asChild className="mt-4 w-full"><Link to="/entrar">Entrar para conversar</Link></Button></>} </Card><Card className="p-5"><div className="flex items-center gap-3">{sellerAvatar ? <img src={sellerAvatar} alt={sellerName} className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary"><User className="h-5 w-5" /></div>}<div><Link to={sellerPath} className="font-semibold text-primary hover:underline">{sellerName}</Link><p className="text-xs text-muted-foreground">{sellerListingCount} anúncio(s) ativo(s)</p>{listing.seller_business_id ? <p className="text-xs text-muted-foreground">Anunciando como negócio</p> : <p className="text-xs text-muted-foreground">{accountAgeLabel(listing.owner_created_at)}</p>}</div></div><p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4" />Publicado em {new Date(listing.created_at).toLocaleDateString("pt-BR")}</p></Card><Card className="p-5"><h2 className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" />Denunciar anúncio</h2><select value={reportReason} onChange={(event) => setReportReason(event.target.value as MarketplaceReport["reason"])} className="mt-3 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="fraud">Golpe/fraude</option><option value="prohibited">Produto proibido</option><option value="spam">Spam</option><option value="duplicate">Anúncio duplicado</option><option value="misleading">Informação enganosa</option><option value="offensive">Conteúdo ofensivo</option><option value="other">Outro</option></select><Textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} className="mt-3" rows={3} placeholder="Descreva o problema (opcional)." /><Button variant="outline" className="mt-3 w-full" onClick={async () => { const result = await reportMarketplaceListing(listing.id, reportReason, reportDetails); setNotice(result.ok ? "Denúncia enviada para análise." : result.error || "Não foi possível denunciar."); }}>Enviar denúncia</Button></Card></aside></div>{notice ? <p className="mt-6 rounded-lg bg-secondary p-3 text-sm">{notice}</p> : null}{similar.length ? <section className="mt-14"><h2 className="mb-5 text-2xl font-bold">Anúncios semelhantes</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{similar.map((item) => <MarketplaceListingCard key={item.id} listing={item} />)}</div></section> : null}</main><SiteFooter /></div>;
}

export function MarketplaceSellerPage({ initialSeller }: { initialSeller?: MarketplaceSellerPage | null }) {
  const { ownerId } = useParams<{ ownerId: string }>();
  const [seller, setSeller] = useState<MarketplaceSellerPage | null>(initialSeller || null);
  const [loading, setLoading] = useState(!initialSeller);

  useEffect(() => {
    if (initialSeller || !ownerId) {
      setLoading(false);
      return;
    }
    let active = true;
    void getMarketplaceSellerPage(ownerId)
      .then((value) => { if (active) setSeller(value); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialSeller, ownerId]);

  useEffect(() => {
    if (!seller) return;
    const name = seller.profile.name?.trim() || "Vendedor";
    setSeoMeta(`${name} | Vendedor do Marketplace | Caramelinho`, `Veja os anúncios ativos e as avaliações dos negócios de ${name} no Marketplace do Caramelinho.`);
  }, [seller]);

  if (loading) {
    return <div className="min-h-screen bg-background" aria-busy="true" aria-label="Carregando perfil do vendedor"><Header /><main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-12 lg:px-8"><div className="h-32 animate-pulse rounded-2xl bg-muted/60" /><div className="h-8 w-56 animate-pulse rounded bg-muted/60" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-xl bg-muted/50" />)}</div></main></div>;
  }

  if (!seller) {
    return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-2xl font-bold">Vendedor não encontrado</h1><p className="mt-2 text-muted-foreground">Este perfil não está disponível no momento.</p><Button asChild className="mt-6"><Link to="/marketplace">Voltar ao Marketplace</Link></Button></main></div>;
  }

  const sellerName = seller.profile.name?.trim() || "Vendedor";
  return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8"><Link to="/marketplace" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Marketplace</Link><Card className="mb-10 overflow-hidden border-border"><div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-8">{seller.profile.avatar ? <img src={seller.profile.avatar} alt={`Foto de ${sellerName}`} className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-muted-foreground"><User className="h-9 w-9" aria-hidden="true" /></div>}<div><h1 className="text-3xl font-extrabold tracking-tight text-foreground">{sellerName}</h1><p className="mt-2 text-muted-foreground">{seller.listings.length} anúncio(s) ativo(s) no Marketplace</p>{seller.profile.created_at ? <p className="mt-1 text-sm text-muted-foreground">No Caramelinho desde {new Date(seller.profile.created_at).toLocaleDateString("pt-BR")}</p> : null}</div></div></Card><section aria-labelledby="seller-listings-heading"><div className="flex items-end justify-between gap-4"><h2 id="seller-listings-heading" className="text-2xl font-bold text-foreground">Anúncios ativos</h2><span className="text-sm text-muted-foreground">{seller.listings.length} no total</span></div>{seller.listings.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{seller.listings.map((item) => <MarketplaceListingCard key={item.id} listing={item} />)}</div> : <Card className="mt-5 p-8 text-center text-muted-foreground">Este vendedor não possui anúncios ativos no momento.</Card>}</section><section className="mt-12" aria-labelledby="seller-reviews-heading"><div className="flex items-end justify-between gap-4"><h2 id="seller-reviews-heading" className="text-2xl font-bold text-foreground">Avaliações dos negócios</h2><span className="text-sm text-muted-foreground">{seller.reviews.length} no total</span></div>{seller.reviews.length ? <div className="mt-5 grid gap-4 md:grid-cols-2">{seller.reviews.map((review) => <Card key={review.id} className="p-5"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3">{review.user_avatar ? <img src={review.user_avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">{review.user_name.charAt(0)}</div>}<div className="min-w-0"><p className="truncate font-semibold">{review.user_name}</p><Link to={review.businessSlug} className="truncate text-sm text-primary hover:underline">{review.businessName}</Link></div></div><div className="flex shrink-0 text-amber-500" aria-label={`${review.rating} de 5 estrelas`}>{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-current" : "text-muted-foreground/20"}`} aria-hidden="true" />)}</div></div>{review.comment ? <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{review.comment}</p> : null}<p className="mt-3 text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString("pt-BR")}</p></Card>)}</div> : <Card className="mt-5 p-8 text-center text-muted-foreground">Os negócios deste vendedor ainda não receberam avaliações.</Card>}</section></main><SiteFooter /></div>;
}

export function MarketplaceBusinessSellerPage({ initialBusinessSeller }: { initialBusinessSeller?: MarketplaceBusinessSellerPage | null }) {
  const { businessId } = useParams<{ businessId: string }>();
  const [seller, setSeller] = useState<MarketplaceBusinessSellerPage | null>(initialBusinessSeller || null);
  const [loading, setLoading] = useState(!initialBusinessSeller);

  useEffect(() => {
    if (initialBusinessSeller || !businessId) {
      setLoading(false);
      return;
    }
    let active = true;
    void getMarketplaceBusinessSellerPage(businessId)
      .then((value) => { if (active) setSeller(value); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, initialBusinessSeller]);

  useEffect(() => {
    if (!seller) return;
    setSeoMeta(`${seller.business.name} | Marketplace | Caramelinho`, `Veja os anúncios ativos e as avaliações de ${seller.business.name} no Marketplace do Caramelinho.`);
  }, [seller]);

  if (loading) {
    return <div className="min-h-screen bg-background" aria-busy="true" aria-label="Carregando página do negócio"><Header /><main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-12 lg:px-8"><div className="h-32 animate-pulse rounded-2xl bg-muted/60" /><div className="h-8 w-56 animate-pulse rounded bg-muted/60" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-xl bg-muted/50" />)}</div></main></div>;
  }

  if (!seller) {
    return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-2xl font-bold">Negócio não encontrado</h1><p className="mt-2 text-muted-foreground">Este perfil de anunciante não está disponível no momento.</p><Button asChild className="mt-6"><Link to="/marketplace">Voltar ao Marketplace</Link></Button></main></div>;
  }

  const businessName = seller.business.name.trim() || "Negócio";
  return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8"><Link to="/marketplace" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Marketplace</Link><Card className="mb-10 overflow-hidden border-border"><div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-8">{seller.business.logo_url ? <img src={seller.business.logo_url} alt={`Logo de ${businessName}`} className="h-20 w-20 rounded-xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><Package className="h-9 w-9" aria-hidden="true" /></div>}<div><p className="text-sm font-medium text-primary">Anunciante comercial</p><h1 className="text-3xl font-extrabold tracking-tight text-foreground">{businessName}</h1><p className="mt-2 text-muted-foreground">{seller.listings.length} anúncio(s) ativo(s) no Marketplace</p><Link to={seller.business.publicPath} className="mt-2 inline-flex text-sm text-primary hover:underline">Ver página do negócio</Link></div></div></Card><section aria-labelledby="business-seller-listings-heading"><div className="flex items-end justify-between gap-4"><h2 id="business-seller-listings-heading" className="text-2xl font-bold text-foreground">Anúncios ativos</h2><span className="text-sm text-muted-foreground">{seller.listings.length} no total</span></div>{seller.listings.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{seller.listings.map((item) => <MarketplaceListingCard key={item.id} listing={item} />)}</div> : <Card className="mt-5 p-8 text-center text-muted-foreground">Este negócio não possui anúncios ativos no momento.</Card>}</section><section className="mt-12" aria-labelledby="business-seller-reviews-heading"><div className="flex items-end justify-between gap-4"><h2 id="business-seller-reviews-heading" className="text-2xl font-bold text-foreground">Avaliações do negócio</h2><span className="text-sm text-muted-foreground">{seller.reviews.length} no total</span></div>{seller.reviews.length ? <div className="mt-5 grid gap-4 md:grid-cols-2">{seller.reviews.map((review) => <Card key={review.id} className="p-5"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3">{review.user_avatar ? <img src={review.user_avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">{review.user_name.charAt(0)}</div>}<div className="min-w-0"><p className="truncate font-semibold">{review.user_name}</p><Link to={review.businessSlug} className="truncate text-sm text-primary hover:underline">{review.businessName}</Link></div></div><div className="flex shrink-0 text-amber-500" aria-label={`${review.rating} de 5 estrelas`}>{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-current" : "text-muted-foreground/20"}`} aria-hidden="true" />)}</div></div>{review.comment ? <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{review.comment}</p> : null}<p className="mt-3 text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString("pt-BR")}</p></Card>)}</div> : seller.reviewsUnavailable ? <Card className="mt-5 p-8 text-center text-muted-foreground">As avaliações estão temporariamente indisponíveis.</Card> : <Card className="mt-5 p-8 text-center text-muted-foreground">Este negócio ainda não recebeu avaliações.</Card>}</section></main><SiteFooter /></div>;
}
