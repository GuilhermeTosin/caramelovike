import { describe, expect, it } from "vitest";
import type { Business, BusinessFrontend } from "@/types/database";
import {
  buildCityAliases,
  filterBusinesses,
  resolveSearchQueryCategoryIds,
} from "@/lib/search/businessSearch";
import { getCategoryId, isBusinessVerified, toFrontend } from "@/services/businesses";
import "./businessSearchLocation.test";

const categoryFilterAliases: Record<string, string[]> = {
  alimentacao: ["Alimentação"],
  "advocacia & consultoria": ["Advocacia & Consultoria"],
};

const searchSynonyms: Record<string, string[]> = {
  advogado: ["Advocacia & Consultoria"],
};

const categoryKeywords: Record<string, string[]> = {
  "Alimentação": ["coxinha", "salgado", "catupiry"],
  "Advocacia & Consultoria": ["advogado", "juridico"],
};

const cityAliases = buildCityAliases([
  ["tokyo", "toquio", "tóquio"],
  ["sainte-eustache", "sainte eustache"],
  ["mirabel"],
]);

function createBusiness(overrides: Partial<BusinessFrontend>): BusinessFrontend {
  return {
    id: "biz-default",
    ownerId: "owner-1",
    ownerName: "Owner",
    name: "Negócio",
    slug: "negocio",
    categoryId: "cat-1",
    category: "Alimentação",
    description: "Descrição",
    heroImage: "",
    logoUrl: "",
    address: {
      street: "Rua",
      city: "Mirabel",
      state: "Quebec",
      country: "Canada",
      countryCode: "CA",
      stateCode: "QC",
      postalCode: "00000",
      lat: 45.6794,
      lng: -74.0036,
    },
    services: [],
    serviceItems: [],
    keywords: [],
    menu: [],
    menuPdfUrl: "",
    isBrazilianOwned: false,
    servesPortuguese: false,
    isVeganFriendly: false,
    isVegetarianFriendly: false,
    isGlutenFreeFriendly: false,
    photos: [],
    phone: "",
    email: "",
    website: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
    reviews: [],
    averageRating: 0,
    ownerVerified: false,
    ownerVerifiedUntil: "",
    openingHours: [],
    promotions: [],
    events: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createRawBusiness(overrides: Partial<Business>): Business {
  return {
    id: "biz-raw-default",
    owner_id: "owner-1",
    name: "Negocio",
    slug: "negocio",
    category_id: "food",
    category: "Alimentacao",
    description: "Descricao",
    hero_image: null,
    logo_url: null,
    street: "Rua",
    city: "Mirabel",
    state: "Quebec",
    country: "Canada",
    country_code: "CA",
    state_code: "QC",
    attendance_type: "presencial",
    postal_code: "00000",
    lat: 45.6794,
    lng: -74.0036,
    services: [],
    service_items: [],
    keywords: [],
    menu: [],
    menu_pdf_url: null,
    is_brazilian_owned: false,
    serves_portuguese: false,
    is_vegan_friendly: false,
    is_vegetarian_friendly: false,
    is_gluten_free_friendly: false,
    photos: [],
    phone: null,
    email: null,
    website: null,
    instagram: null,
    facebook: null,
    whatsapp: null,
    reviews: [],
    average_rating: 0,
    owner_verified: false,
    owner_verified_until: null,
    moderation_status: "approved",
    moderation_reviewed_at: null,
    moderation_reviewed_by: null,
    opening_hours: [],
    promotions: [],
    events: [],
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function runSearch(options: {
  allBusinesses: BusinessFrontend[];
  query?: string;
  cityFilter?: string;
  locationFilter?: string;
  radiusKm?: number | null;
  distanceOrigin?: { lat: number; lng: number } | null;
  categorySynonymsMap?: Record<string, string[]>;
}): BusinessFrontend[] {
  return filterBusinesses({
    allBusinesses: options.allBusinesses,
    query: options.query || "",
    categoryFilter: options.categoryFilter || "",
    cityFilter: options.cityFilter || "",
    locationFilter: options.locationFilter || "",
    countryFilter: "",
    stateFilter: "",
    eventsFilter: "",
    radiusKm: options.radiusKm ?? null,
    effectiveRadiusKm: options.radiusKm ?? null,
    hasLocationContext: !!(options.cityFilter || options.locationFilter),
    hasTypedLocation: !!(options.locationFilter || "").trim(),
    distanceOrigin: options.distanceOrigin ?? null,
    categorySynonymsMap: options.categorySynonymsMap || {},
    searchSynonyms,
    categoryKeywords,
    categoryFilterAliases,
    cityAliases,
    strictSearchMode: true,
    strictSearchMinScore: 3,
    getCategoryLabel: (value) => value,
  });
}

describe("businessSearch", () => {
  it("respeita raio de 5km para coxinha em Mirabel", () => {
    const mirabel = createBusiness({
      id: "mirabel",
      name: "Coxinha Mirabel",
      menu: [{ name: "Coxinha", description: "", price: "5" }],
      address: { ...createBusiness({}).address, city: "Mirabel", lat: 45.6794, lng: -74.0036 },
    });
    const sainteEustache = createBusiness({
      id: "sainte-eustache",
      name: "Coxinha Catupiry",
      menu: [{ name: "Coxinha cremosa com catupiry", description: "", price: "8" }],
      address: { ...createBusiness({}).address, city: "Sainte-Eustache", lat: 45.565, lng: -73.9055 },
    });

    const results = runSearch({
      allBusinesses: [mirabel, sainteEustache],
      query: "coxinha",
      radiusKm: 5,
      distanceOrigin: { lat: 45.6794, lng: -74.0036 },
    });

    expect(results.map((b) => b.id)).toEqual(["mirabel"]);
  });

  it("inclui Sainte-Eustache ao aumentar raio para 50km", () => {
    const mirabel = createBusiness({
      id: "mirabel",
      name: "Coxinha Mirabel",
      menu: [{ name: "Coxinha", description: "", price: "5" }],
      address: { ...createBusiness({}).address, city: "Mirabel", lat: 45.6794, lng: -74.0036 },
    });
    const sainteEustache = createBusiness({
      id: "sainte-eustache",
      name: "Coxinha Catupiry",
      menu: [{ name: "Coxinha cremosa com catupiry", description: "", price: "8" }],
      address: { ...createBusiness({}).address, city: "Sainte-Eustache", lat: 45.565, lng: -73.9055 },
    });

    const results = runSearch({
      allBusinesses: [mirabel, sainteEustache],
      query: "coxinha",
      radiusKm: 50,
      distanceOrigin: { lat: 45.6794, lng: -74.0036 },
    });

    expect(results.map((b) => b.id)).toEqual(["mirabel", "sainte-eustache"]);
  });

  it("reconhece cidade em português para cadastro em inglês (Tóquio/Tokyo)", () => {
    const tokyoBiz = createBusiness({
      id: "tokyo-1",
      name: "Loja em Tokyo",
      address: { ...createBusiness({}).address, city: "Tokyo", state: "Tokyo", stateCode: "13", lat: 35.6762, lng: 139.6503 },
    });

    const results = runSearch({
      allBusinesses: [tokyoBiz],
      cityFilter: "Tóquio",
      locationFilter: "Tóquio",
    });

    expect(results.map((b) => b.id)).toEqual(["tokyo-1"]);
  });
  it("resolve categorias da home para IDs canonicos", () => {
    expect(getCategoryId("Advocacia & Traducoes")).toBe("legal_consulting");
    expect(getCategoryId("Transporte & Mudanca")).toBe("transport_moving");
  });

  it("filtra negocios por categoryId sem depender do nome", () => {
    const legalBusiness = createBusiness({
      id: "legal",
      categoryId: "legal_consulting",
      category: "Advocacia & Consultoria",
      name: "Advocacia Montreal",
    });
    const foodBusiness = createBusiness({
      id: "food",
      categoryId: "food",
      category: "Alimentacao",
      name: "Padaria Montreal",
    });

    const results = runSearch({
      allBusinesses: [legalBusiness, foodBusiness],
      categoryFilter: "legal_consulting",
    });

    expect(results.map((b) => b.id)).toEqual(["legal"]);
  });

  it("only treats businesses as verified when they have a valid verification expiry", () => {
    const transferred = toFrontend(
      createRawBusiness({
        id: "transferred",
        owner_verified: true,
        owner_verified_until: null,
      }),
      "Owner"
    );
    const verified = toFrontend(
      createRawBusiness({
        id: "verified",
        owner_verified: true,
        owner_verified_until: "2030-01-01T00:00:00.000Z",
      }),
      "Owner"
    );

    expect(isBusinessVerified(createRawBusiness({ owner_verified: true, owner_verified_until: null }))).toBe(false);
    expect(transferred.ownerVerified).toBe(false);
    expect(verified.ownerVerified).toBe(true);
  });

  it("mantem negocios da categoria quando a busca vem de sinonimo", () => {
    const categorySynonymsMap = {
      "Advocacia & Consultoria": ["traducoes"],
    };

    const keywordRichBusiness = createBusiness({
      id: "rich",
      categoryId: "legal_consulting",
      category: "Advocacia & Consultoria",
      name: "Traducoes e Imigracao",
      description: "Servicos para traducoes e documentos",
      keywords: ["traducoes"],
    });
    const categoryOnlyBusiness = createBusiness({
      id: "plain",
      categoryId: "legal_consulting",
      category: "Advocacia & Consultoria",
      name: "Escritorio Montreal",
      description: "Atendimento juridico",
      keywords: [],
    });

    expect(resolveSearchQueryCategoryIds("traducoes", categorySynonymsMap, {})).toEqual([
      "legal_consulting",
    ]);

    const results = runSearch({
      allBusinesses: [categoryOnlyBusiness, keywordRichBusiness],
      query: "traducoes",
      categorySynonymsMap,
    });

    expect(results.map((b) => b.id)).toEqual(["rich", "plain"]);
  });

});
