// This module is intentionally dependency-free: it is used by both Vike SSR and
// the browser search route, so importing the Supabase services here would create
// a server-side module cycle during the first render.
const CATEGORY_ID_BY_INPUT: Record<string, string> = {
  food: "food",
  "restaurantes e alimentacao": "food",
  "alimentacao (restaurantes, padarias, cafes)": "food",
  alimentacao: "food",
  auto: "auto",
  "servicos automotivos": "auto",
  automotivo: "auto",
  "saude e beleza": "health_beauty",
  "saude & beleza": "health_beauty",
  health_beauty: "health_beauty",
  "construcao e reformas": "construction",
  "construcao & reformas": "construction",
  construction: "construction",
  "advocacia e consultoria": "legal_consulting",
  "advocacia & consultoria": "legal_consulting",
  legal_consulting: "legal_consulting",
  "contabilidade e financas": "accounting_finance",
  "contabilidade & financas": "accounting_finance",
  accounting_finance: "accounting_finance",
  "educacao e idiomas": "education",
  "educacao & idiomas": "education",
  education: "education",
  "comercio e varejo": "retail",
  "comercio & varejo": "retail",
  retail: "retail",
  "transporte e mudanca": "transport_moving",
  "transporte & mudanca": "transport_moving",
  transport_moving: "transport_moving",
  "servicos para pets": "pets",
  pets: "pets",
  "cuidados infantis e de idosos": "child_elder_care",
  child_elder_care: "child_elder_care",
  diaristas: "cleaning",
  cleaning: "cleaning",
  imobiliaria: "real_estate",
  real_estate: "real_estate",
  "turismo e viagens": "tourism",
  "turismo & viagens": "tourism",
  tourism: "tourism",
  artistas: "artists",
  artists: "artists",
  other: "other",
};

function normalizeText(value: string) {
  return (value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getCategoryId(value: string) {
  return CATEGORY_ID_BY_INPUT[normalizeText(value)] || "";
}
export const PUBLIC_SEARCH_PAGE_SIZE = 6;

export type PublicSearchPageRequest = {
  key: string;
  page: number;
  limit: number;
  query: string;
  categoryId: string | null;
  queryCategoryIds: string[];
  city: string | null;
  cityAliases: string[];
  location: string | null;
  countryCode: string | null;
  stateCode: string | null;
  radiusKm: number | null;
  originLat: number | null;
  originLng: number | null;
};

export type PublicSearchPageSnapshot = {
  requestKey: string;
  page: number;
  totalCount: number;
  businesses: import("@/types/database").BusinessFrontend[];
};

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value || "");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseCoordinate(value: string | null) {
  const parsed = Number(value || "");
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRadius(value: string | null) {
  const parsed = Number(value || "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeOptional(value: string | null) {
  const normalized = (value || "").trim();
  return normalized || null;
}

export function isPublicBusinessSearch(params: URLSearchParams) {
  return params.get("eventos") !== "1" && params.get("achadinhos") !== "1";
}

export function buildPublicSearchPageRequest(
  params: URLSearchParams,
  limit = PUBLIC_SEARCH_PAGE_SIZE,
): PublicSearchPageRequest {
  const page = parsePositiveInteger(params.get("pagina"), 1);
  const categoryValue = normalizeOptional(params.get("categoria"));
  const resolvedCategoryId = categoryValue ? getCategoryId(categoryValue) : "";
  const city = normalizeOptional(params.get("cidade"));
  const cityAliases = city ? [city] : [];
  const radiusKm = parseRadius(params.get("raio"));
  const originLat = parseCoordinate(params.get("origem_lat"));
  const originLng = parseCoordinate(params.get("origem_lng"));
  const request = {
    page,
    limit,
    query: normalizeOptional(params.get("q")) || "",
    categoryId: resolvedCategoryId || null,
    queryCategoryIds: [],
    city: radiusKm && originLat !== null && originLng !== null ? null : city,
    cityAliases: radiusKm && originLat !== null && originLng !== null ? [] : cityAliases,
    location: radiusKm && originLat !== null && originLng !== null ? null : (city ? null : normalizeOptional(params.get("local"))),
    countryCode: normalizeOptional(params.get("pais")),
    stateCode: normalizeOptional(params.get("estado")),
    radiusKm: radiusKm && originLat !== null && originLng !== null ? radiusKm : null,
    originLat: radiusKm && originLat !== null && originLng !== null ? originLat : null,
    originLng: radiusKm && originLat !== null && originLng !== null ? originLng : null,
  };

  return {
    ...request,
    key: JSON.stringify(request),
  };
}