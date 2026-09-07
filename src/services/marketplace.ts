import { supabase, getCurrentUserId } from "@/lib/supabase";
import { getOrCreateConversation } from "@/services/messages";
import type {
  MarketplaceCategory,
  MarketplaceCondition,
  MarketplaceListing,
  MarketplaceListingImage,
  MarketplaceListingStatus,
  MarketplaceListingType,
  MarketplaceReport,
} from "@/types/database";
import { normalizeMarketplaceDistance, normalizeMarketplaceKeywords, slugifyMarketplace } from "@/lib/marketplaceCategories";

export type MarketplaceFilters = {
  search?: string;
  category?: string;
  listingType?: MarketplaceListingType;
  city?: string;
  countryCode?: string;
  stateCode?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: MarketplaceCondition;
  radiusKm?: number;
  originLat?: number;
  originLng?: number;
  page?: number;
  pageSize?: number;
};

export type MarketplaceListingInput = {
  listingType: MarketplaceListingType;
  categoryId: string;
  title: string;
  description: string;
  price?: number | null;
  currency: string;
  condition?: MarketplaceCondition | null;
  countryCode: string;
  stateCode: string;
  city: string;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
  keywords?: string[];
  videoUrl?: string | null;
  images?: string[];
  id?: string;
};

export type MarketplacePage = { items: MarketplaceListing[]; totalCount: number };

const MARKETPLACE_CATEGORY_SELECT = "id,slug,name,sort_order,is_active";
const MARKETPLACE_LIST_SELECT = "id,owner_id,listing_type,category_id,title,price,currency,condition,country_code,state_code,city,neighborhood,lat,lng,slug,status,view_count,created_at,updated_at,category:marketplace_categories(id,slug,name,sort_order,is_active)";
const MARKETPLACE_DETAIL_SELECT = "*,category:marketplace_categories(*)";
const marketplaceFavoriteIdsCache = new Map<string, Promise<Set<string>>>();

function normalizeMarketplaceCity(value: string) {
  return (value.split(",")[0] || value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export async function getMarketplaceCategories(): Promise<MarketplaceCategory[]> {
  const { data, error } = await supabase.from("marketplace_categories").select(MARKETPLACE_CATEGORY_SELECT).eq("is_active", true).order("sort_order");
  if (error) throw error;
  return (data || []) as MarketplaceCategory[];
}

type EnrichOptions = {
  includeImages?: boolean;
  includeOwnerProfile?: boolean;
  includeOwnerStats?: boolean;
  includeFavorites?: boolean;
};

type MarketplaceOwnerProfile = {
  id: string;
  name?: string | null;
  avatar?: string | null;
  created_at?: string | null;
};

async function enrichListings(rows: MarketplaceListing[], options: EnrichOptions = {}): Promise<MarketplaceListing[]> {
  if (rows.length === 0) return [];
  const {
    includeImages = true,
    includeOwnerProfile = true,
    includeOwnerStats = false,
    includeFavorites = true,
  } = options;
  const ids = rows.map((row) => row.id);
  const ownerIds = [...new Set(rows.map((row) => row.owner_id))];
  const [{ data: images }, { data: profiles }, { data: ownerListings }] = await Promise.all([
    includeImages
      ? supabase.from("marketplace_listing_images").select("id,listing_id,image_url,sort_order").in("listing_id", ids).order("sort_order")
      : Promise.resolve({ data: [] as MarketplaceListingImage[] }),
    includeOwnerProfile
      ? supabase.from("profiles").select("id,name,avatar,created_at").in("id", ownerIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name?: string | null; avatar?: string | null; created_at?: string | null }> }),
    includeOwnerStats
      ? supabase.from("marketplace_listings").select("owner_id").in("owner_id", ownerIds).eq("status", "active")
      : Promise.resolve({ data: [] as Array<{ owner_id: string }> }),
  ]);
  const imagesById = new Map<string, MarketplaceListingImage[]>();
  (images || []).forEach((image) => imagesById.set(image.listing_id, [...(imagesById.get(image.listing_id) || []), image as MarketplaceListingImage]));
  const profileById = new Map<string, MarketplaceOwnerProfile>();
  ((profiles || []) as unknown as MarketplaceOwnerProfile[]).forEach((profile) => {
    profileById.set(profile.id, profile);
  });
  const countByOwner = new Map<string, number>();
  (ownerListings || []).forEach((row) => countByOwner.set(row.owner_id, (countByOwner.get(row.owner_id) || 0) + 1));
  const userId = includeFavorites ? await getCurrentUserId().catch(() => null) : null;
  const favoriteIds = userId
    ? (await supabase.from("marketplace_favorites").select("listing_id").eq("user_id", userId).in("listing_id", ids)).data || []
    : [];
  const favorites = new Set(favoriteIds.map((row) => row.listing_id));
  return rows.map((row) => {
    const profile = profileById.get(row.owner_id);
    return {
      ...row,
      images: imagesById.get(row.id) || [],
      owner_name: profile?.name || "Usuário",
      owner_avatar: profile?.avatar || null,
      owner_created_at: profile?.created_at || null,
      owner_listing_count: countByOwner.get(row.owner_id) || 0,
      is_favorited: favorites.has(row.id),
    };
  });
}

export async function getMarketplacePage(filters: MarketplaceFilters = {}): Promise<MarketplacePage> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(48, Math.max(1, filters.pageSize || 12));
  let categoryId = "";
  if (filters.category) {
    const categorySlug = filters.category.trim().toLowerCase();
    const { data, error } = await supabase.from("marketplace_categories").select("id").eq("slug", categorySlug).eq("is_active", true).maybeSingle();
    if (error) throw error;
    if (!data?.id) return { items: [], totalCount: 0 };
    categoryId = data.id;
  }

  const radiusKm = normalizeMarketplaceDistance(filters.radiusKm);
  const originLat = Number(filters.originLat);
  const originLng = Number(filters.originLng);
  const hasRadiusOrigin = !!radiusKm && Number.isFinite(originLat) && Number.isFinite(originLng);

  // A radius without an origin is not a valid location query. Do not silently
  // fall back to the global Marketplace list in that case.
  if (radiusKm && !hasRadiusOrigin) return { items: [], totalCount: 0 };

  if (hasRadiusOrigin) {
    const { data: radiusRows, error: radiusError } = await supabase.rpc("search_marketplace_listings_radius", {
      p_origin_lat: originLat,
      p_origin_lng: originLng,
      p_radius_km: radiusKm,
      p_search: filters.search?.trim() || null,
      p_category_id: categoryId || null,
      p_listing_type: filters.listingType || null,
      p_min_price: typeof filters.minPrice === "number" ? filters.minPrice : null,
      p_max_price: typeof filters.maxPrice === "number" ? filters.maxPrice : null,
      p_condition: filters.condition || null,
      p_page: page,
      p_page_size: pageSize,
    });
    if (radiusError) throw radiusError;

    const ids = ((radiusRows || []) as Array<{ listing_id: string }>).map((row) => row.listing_id);
    if (ids.length === 0) return { items: [], totalCount: 0 };

    const { data, error } = await supabase.from("marketplace_listings").select(MARKETPLACE_LIST_SELECT).in("id", ids);
    if (error) throw error;
    const rowsById = new Map((data || []).map((row) => [row.id, row]));
    const orderedRows = ids.map((id) => rowsById.get(id)).filter(Boolean) as unknown as MarketplaceListing[];
    const totalCount = Number((radiusRows as Array<{ total_count?: number }>)[0]?.total_count || 0);
    return {
      items: await enrichListings(orderedRows, { includeOwnerProfile: false, includeOwnerStats: false }),
      totalCount,
    };
  }

  const buildQuery = () => {
    let query = supabase.from("marketplace_listings").select(MARKETPLACE_LIST_SELECT, { count: "exact" }).eq("status", "active").order("created_at", { ascending: false }).order("id", { ascending: false });
    if (filters.search?.trim()) {
      const term = filters.search.trim();
      const filtersForTerm = [`title.ilike.%${term}%`, `description.ilike.%${term}%`];
      const keywordTerm = term.toLocaleLowerCase("pt-BR");
      if (/^[\p{L}\p{N}_-]+$/u.test(keywordTerm)) filtersForTerm.push(`keywords.cs.{${keywordTerm}}`);
      query = query.or(filtersForTerm.join(","));
    }
    if (filters.listingType) query = query.eq("listing_type", filters.listingType);
    if (filters.city?.trim()) {
      query = query.eq("city_normalized", normalizeMarketplaceCity(filters.city));
    }
    if (filters.countryCode) query = query.eq("country_code", filters.countryCode.toLowerCase());
    if (filters.stateCode) query = query.eq("state_code", filters.stateCode.toLowerCase());
    if (categoryId) query = query.eq("category_id", categoryId);
    if (filters.condition) query = query.eq("condition", filters.condition);
    if (typeof filters.minPrice === "number") query = query.gte("price", filters.minPrice);
    if (typeof filters.maxPrice === "number") query = query.lte("price", filters.maxPrice);
    return query;
  };

  const from = (page - 1) * pageSize;
  const executeQuery = async () => {
    const { data, error, count } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    return { data, count: count || 0 };
  };

  const result = await executeQuery();

  return {
    items: await enrichListings((result.data || []) as unknown as MarketplaceListing[], {
      includeOwnerProfile: false,
      includeOwnerStats: false,
    }),
    totalCount: result.count,
  };
}

export async function getMarketplaceListingByPath(countryCode: string, stateCode: string, city: string, slug: string) {
  // City URLs use a normalized slug, while the database keeps the display name
  // with accents. Filter the small slug match set in code to support both.
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(MARKETPLACE_DETAIL_SELECT)
    .eq("country_code", countryCode.toLowerCase())
    .eq("state_code", stateCode.toLowerCase())
    .eq("slug", slug)
    .in("status", ["active", "sold"])
    .limit(10);
  if (error) throw error;

  const row = (data || []).find((item) => slugifyMarketplace(String(item.city || "")) === slugifyMarketplace(city));
  if (!row) return null;
  const [listing] = await enrichListings([row as unknown as MarketplaceListing]);
  return listing || null;
}

export async function createMarketplaceListing(input: MarketplaceListingInput): Promise<{ ok: boolean; listing?: MarketplaceListing; error?: string }> {
  const ownerId = await getCurrentUserId();
  if (!ownerId) return { ok: false, error: "Faça login para publicar um anúncio." };
  const baseSlug = slugifyMarketplace(input.title);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;
  const { data, error } = await supabase.rpc("create_marketplace_listing_with_images", {
    p_listing_id: input.id || crypto.randomUUID(),
    p_listing_type: input.listingType,
    p_category_id: input.categoryId,
    p_title: input.title,
    p_description: input.description,
    p_price: input.price ?? null,
    p_currency: input.currency,
    p_condition: input.condition || null,
    p_country_code: input.countryCode,
    p_state_code: input.stateCode,
    p_city: input.city,
    p_neighborhood: input.neighborhood || null,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
    p_keywords: normalizeMarketplaceKeywords(input.keywords || []),
    p_video_url: input.videoUrl?.trim() || null,
    p_slug: slug,
    p_images: (input.images || []).slice(0, 8),
  }).single();
  if (error || !data) return { ok: false, error: error?.message || "Não foi possível publicar o anúncio." };
  return { ok: true, listing: data as unknown as MarketplaceListing };
}

export async function getMarketplaceListingsByOwner(ownerId: string) {
  const { data, error } = await supabase.from("marketplace_listings").select(MARKETPLACE_LIST_SELECT).eq("owner_id", ownerId).order("created_at", { ascending: false }).order("id", { ascending: false });
  if (error) throw error;
  return enrichListings((data || []) as unknown as MarketplaceListing[], { includeOwnerProfile: false, includeOwnerStats: false });
}

export async function getMarketplaceFavoritesByUser(userId: string) {
  const { data: favoriteRows, error: favoritesError } = await supabase
    .from("marketplace_favorites")
    .select("listing_id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (favoritesError) throw favoritesError;

  const favoriteIds = (favoriteRows || []).map((row) => row.listing_id);
  if (favoriteIds.length === 0) return [];

  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(MARKETPLACE_LIST_SELECT)
    .in("id", favoriteIds)
    .eq("status", "active");
  if (error) throw error;

  const listingsById = new Map((data || []).map((row) => [row.id, row]));
  const orderedListings = favoriteIds
    .map((id) => listingsById.get(id))
    .filter(Boolean) as unknown as MarketplaceListing[];
  const enrichedListings = await enrichListings(orderedListings, { includeFavorites: false });
  return enrichedListings.map((listing) => ({ ...listing, is_favorited: true }));
}

export function getMarketplaceFavoriteIds(userId: string) {
  const cached = marketplaceFavoriteIdsCache.get(userId);
  if (cached) return cached;

  const request = Promise.resolve(
    supabase
      .from("marketplace_favorites")
      .select("listing_id")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (error) throw error;
        return new Set((data || []).map((row) => row.listing_id));
      })
  )
    .catch((error) => {
      marketplaceFavoriteIdsCache.delete(userId);
      throw error;
    });

  marketplaceFavoriteIdsCache.set(userId, request);
  return request;
}

function updateMarketplaceFavoriteCache(userId: string, listingId: string, favorite: boolean) {
  const cached = marketplaceFavoriteIdsCache.get(userId);
  if (!cached) return;

  void cached.then((ids) => {
    if (favorite) ids.add(listingId);
    else ids.delete(listingId);
  }).catch(() => {
    // The failed request already removed itself from the cache.
  });
}

export async function getMarketplaceListingByOwner(id: string, ownerId: string) {
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(MARKETPLACE_DETAIL_SELECT)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error || !data) return null;
  const [listing] = await enrichListings([data as unknown as MarketplaceListing]);
  return listing || null;
}

export async function updateMarketplaceListing(id: string, ownerId: string, input: Partial<MarketplaceListingInput>) {
  const payload = Object.fromEntries(
    Object.entries({
      title: input.title?.trim(),
      description: input.description?.trim(),
      price: input.price,
      currency: input.currency?.toUpperCase(),
      condition: input.condition,
      city: input.city?.trim(),
      neighborhood: input.neighborhood?.trim() || null,
      keywords: input.keywords ? normalizeMarketplaceKeywords(input.keywords) : undefined,
      video_url: input.videoUrl === undefined ? undefined : input.videoUrl.trim() || null,
    }).filter(([, value]) => value !== undefined),
  );
  const { data, error } = await supabase
    .from("marketplace_listings")
    .update(payload)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("*, category:marketplace_categories(*)")
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message || "Não foi possível atualizar o anúncio." };
  const [listing] = await enrichListings([data as unknown as MarketplaceListing]);
  return { ok: true, listing };
}

export async function getMarketplaceListingsForAdmin() {
  const { data, error } = await supabase.from("marketplace_listings").select(MARKETPLACE_LIST_SELECT).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(500);
  if (error) throw error;
  return enrichListings((data || []) as unknown as MarketplaceListing[], { includeImages: false, includeFavorites: false });
}

export async function getMarketplaceReportsForAdmin() {
  const { data, error } = await supabase.from("marketplace_reports").select("*, listing:marketplace_listings(id,title,city,country_code,state_code)").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data || []) as MarketplaceReport[];
}

export async function updateMarketplaceReportStatus(id: string, status: MarketplaceReport["status"]) {
  const { error } = await supabase.from("marketplace_reports").update({ status }).eq("id", id);
  return { ok: !error, error: error?.message };
}

export async function getSimilarMarketplaceListings(listing: MarketplaceListing, limit = 4) {
  const { data } = await supabase
    .from("marketplace_listings")
    .select(MARKETPLACE_LIST_SELECT)
    .eq("status", "active")
    .eq("category_id", listing.category_id)
    .eq("city_normalized", normalizeMarketplaceCity(listing.city))
    .neq("id", listing.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  return enrichListings((data || []) as unknown as MarketplaceListing[], { includeOwnerProfile: false, includeOwnerStats: false });
}

export async function addMarketplaceListingImages(listingId: string, imageUrls: string[]) {
  if (imageUrls.length === 0) return { ok: true };
  const { error } = await supabase.from("marketplace_listing_images").insert(imageUrls.slice(0, 8).map((imageUrl, index) => ({ listing_id: listingId, image_url: imageUrl, sort_order: index })));
  return { ok: !error, error: error?.message };
}

export async function updateMarketplaceListingStatus(id: string, status: MarketplaceListingStatus) {
  const { error } = await supabase.from("marketplace_listings").update({ status }).eq("id", id);
  return { ok: !error, error: error?.message };
}

export async function deleteMarketplaceListing(id: string) {
  const { error } = await supabase.from("marketplace_listings").delete().eq("id", id);
  return { ok: !error, error: error?.message };
}

export async function toggleMarketplaceFavorite(listingId: string, favorite: boolean) {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Faça login para salvar anúncios." };
  const result = favorite
    ? await supabase.from("marketplace_favorites").insert({ listing_id: listingId, user_id: userId })
    : await supabase.from("marketplace_favorites").delete().eq("listing_id", listingId).eq("user_id", userId);
  if (favorite && result.error?.code === "23505") {
    updateMarketplaceFavoriteCache(userId, listingId, true);
    return { ok: true };
  }
  if (!result.error) updateMarketplaceFavoriteCache(userId, listingId, favorite);
  return { ok: !result.error, error: result.error?.message };
}

export async function contactMarketplaceSeller(listing: MarketplaceListing, message: string) {
  const senderId = await getCurrentUserId();
  if (!senderId) return { ok: false, error: "Faça login para entrar em contato com o vendedor." };
  if (senderId === listing.owner_id) return { ok: false, error: "Você não pode enviar mensagem para si mesmo." };
  const conversation = await getOrCreateConversation(senderId, listing.owner_id, undefined, `Marketplace: ${listing.title}`);
  if (!conversation) return { ok: false, error: "Não foi possível iniciar a conversa." };
  const { error } = await supabase.from("messages").insert({ conversation_id: conversation.id, sender_id: senderId, text: message.trim() });
  return { ok: !error, error: error?.message };
}

export async function reportMarketplaceListing(listingId: string, reason: string, details: string) {
  const reporterId = await getCurrentUserId();
  if (!reporterId) return { ok: false, error: "Faça login para denunciar um anúncio." };
  const { error } = await supabase.from("marketplace_reports").insert({ listing_id: listingId, reporter_id: reporterId, reason, details: details.trim() || null });
  return { ok: !error, error: error?.message };
}
