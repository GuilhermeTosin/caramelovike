import { describe, expect, it } from "vitest";
import { buildCityAliases, filterBusinesses } from "@/lib/search/businessSearch";
import type { BusinessFrontend } from "@/types/database";

const cityAliases = buildCityAliases([
  ["montreal"],
  ["edogawa city", "edogawa", "edogawa-ku"],
]);

function createBusiness(overrides: Partial<BusinessFrontend>): BusinessFrontend {
  return {
    id: "biz-default",
    ownerId: "owner-1",
    ownerName: "Owner",
    name: "Negocio",
    slug: "negocio",
    categoryId: "cat-1",
    category: "Alimentação",
    description: "Descricao",
    heroImage: "",
    logoUrl: "",
    address: {
      street: "Rua",
      city: "Montreal",
      state: "Quebec",
      country: "Canada",
      countryCode: "ca",
      stateCode: "qc",
      postalCode: "00000",
      lat: 45.5017,
      lng: -73.5673,
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

function runSearch(options: {
  allBusinesses: BusinessFrontend[];
  query?: string;
  cityFilter?: string;
  locationFilter?: string;
}): BusinessFrontend[] {
  return filterBusinesses({
    allBusinesses: options.allBusinesses,
    query: options.query || "",
    categoryFilter: "",
    onlineFilter: "",
    onlineCountryCode: "",
    cityFilter: options.cityFilter || "",
    locationFilter: options.locationFilter || "",
    countryFilter: "",
    stateFilter: "",
    eventsFilter: "",
    radiusKm: null,
    effectiveRadiusKm: null,
    hasLocationContext: !!(options.cityFilter || options.locationFilter),
    hasTypedLocation: !!(options.locationFilter || "").trim(),
    distanceOrigin: null,
    categorySynonymsMap: {},
    searchSynonyms: {},
    categoryKeywords: {},
    categoryFilterAliases: {},
    cityAliases,
    strictSearchMode: false,
    strictSearchMinScore: 0,
    getCategoryLabel: (value) => value,
  });
}

describe("businessSearch location safety", () => {
  it("aceita o negocio com endereco completo e exclui o cadastro apenas com cidade na busca por Montreal", () => {
    const fullMontreal = createBusiness({
      id: "montreal-full",
      name: "Bagel Montreal",
      menu: [{ name: "Bagel", description: "Bagel artesanal", price: "12" }],
    });
    const cityOnlyMontreal = createBusiness({
      id: "montreal-city-only",
      name: "Bagel Montreal Local",
      menu: [{ name: "Bagel", description: "Bagel artesanal", price: "11" }],
      address: {
        ...createBusiness({}).address,
        street: "Montreal",
        city: "Montreal",
        state: "Quebec",
        country: "Canada",
        countryCode: "ca",
        stateCode: "qc",
        postalCode: "",
        lat: 45.5017,
        lng: -73.5673,
      },
    });

    const results = runSearch({
      allBusinesses: [fullMontreal, cityOnlyMontreal],
      locationFilter: "Montreal",
    });

    expect(results.map((b) => b.id)).toEqual(["montreal-full"]);
  });

  it("mantem a busca textual quando ha um negocio com localizacao incompleta", () => {
    const fullMontreal = createBusiness({
      id: "montreal-full",
      name: "Bagel Montreal",
      menu: [{ name: "Bagel", description: "Bagel artesanal", price: "12" }],
    });
    const cityOnlyMontreal = createBusiness({
      id: "montreal-city-only",
      name: "Bagel Montreal Local",
      menu: [{ name: "Bagel", description: "Bagel artesanal", price: "11" }],
      address: {
        ...createBusiness({}).address,
        street: "Montreal",
        city: "Montreal",
        state: "Quebec",
        country: "Canada",
        countryCode: "ca",
        stateCode: "qc",
        postalCode: "",
        lat: 45.5017,
        lng: -73.5673,
      },
    });

    const results = runSearch({
      allBusinesses: [fullMontreal, cityOnlyMontreal],
      query: "bagel",
    });

    expect(results.map((b) => b.id)).toEqual(["montreal-full", "montreal-city-only"]);
  });

  it("nao deixa uma localizacao distante trazer negocios sem localizacao confiavel", () => {
    const fullMontreal = createBusiness({
      id: "montreal-full",
      name: "Bagel Montreal",
      menu: [{ name: "Bagel", description: "Bagel artesanal", price: "12" }],
    });
    const cityOnlyMontreal = createBusiness({
      id: "montreal-city-only",
      name: "Bagel Montreal Local",
      menu: [{ name: "Bagel", description: "Bagel artesanal", price: "11" }],
      address: {
        ...createBusiness({}).address,
        street: "Montreal",
        city: "Montreal",
        state: "Quebec",
        country: "Canada",
        countryCode: "ca",
        stateCode: "qc",
        postalCode: "",
        lat: 45.5017,
        lng: -73.5673,
      },
    });

    const results = runSearch({
      allBusinesses: [fullMontreal, cityOnlyMontreal],
      query: "bagel",
      locationFilter: "Edogawa City, Japan",
    });

    expect(results).toEqual([]);
  });

  it("exclui cadastro apenas com cidade em busca por raio, mesmo com coordenadas do centro da cidade", () => {
    const fullMontreal = createBusiness({
      id: "montreal-full",
      name: "Bagel Montreal",
      menu: [{ name: "Bagel", description: "Bagel artesanal", price: "12" }],
    });
    const cityOnlyMontreal = createBusiness({
      id: "montreal-city-only",
      name: "Bagel Montreal Local",
      menu: [{ name: "Bagel", description: "Bagel artesanal", price: "11" }],
      address: {
        ...createBusiness({}).address,
        street: "Montreal",
        city: "Montreal",
        state: "Quebec",
        country: "Canada",
        countryCode: "ca",
        stateCode: "qc",
        postalCode: "",
        lat: 45.5017,
        lng: -73.5673,
      },
    });

    const results = filterBusinesses({
      allBusinesses: [fullMontreal, cityOnlyMontreal],
      query: "bagel",
      categoryFilter: "",
      onlineFilter: "",
      onlineCountryCode: "",
      cityFilter: "Montreal",
      locationFilter: "Montreal",
      countryFilter: "",
      stateFilter: "",
      eventsFilter: "",
      radiusKm: 50,
      effectiveRadiusKm: 50,
      hasLocationContext: true,
      hasTypedLocation: true,
      distanceOrigin: { lat: 45.5017, lng: -73.5673 },
      categorySynonymsMap: {},
      searchSynonyms: {},
      categoryKeywords: {},
      categoryFilterAliases: {},
      cityAliases,
      strictSearchMode: false,
      strictSearchMinScore: 0,
      getCategoryLabel: (value) => value,
    });

    expect(results.map((b) => b.id)).toEqual(["montreal-full"]);
  });

  it("exclui endereco que repete apenas cidade e pais formatados", () => {
    const fullMontreal = createBusiness({
      id: "montreal-full",
      name: "Bagel Montreal",
    });
    const cityOnlyFormatted = createBusiness({
      id: "montreal-city-formatted",
      name: "Bagel Montreal Formatado",
      address: {
        ...createBusiness({}).address,
        street: "Montreal, Quebec, Canada",
        city: "Montreal",
        state: "Quebec",
        country: "Canada",
        countryCode: "ca",
        stateCode: "qc",
      },
    });

    const results = runSearch({
      allBusinesses: [fullMontreal, cityOnlyFormatted],
      locationFilter: "Montreal",
    });

    expect(results.map((b) => b.id)).toEqual(["montreal-full"]);
  });

  it("permite cadastro com localizacao em nivel de cidade apenas em raios amplos", () => {
    const fullMontreal = createBusiness({
      id: "montreal-full",
      name: "Bagel Montreal",
    });
    const cityOnlyMontreal = createBusiness({
      id: "montreal-city-only",
      name: "Bagel Montreal Local",
      address: {
        ...createBusiness({}).address,
        street: "Montreal",
        city: "Montreal",
        state: "Quebec",
        country: "Canada",
        countryCode: "ca",
        stateCode: "qc",
        lat: 45.5017,
        lng: -73.5673,
      },
    });

    const narrowRadiusResults = filterBusinesses({
      allBusinesses: [fullMontreal, cityOnlyMontreal],
      query: "",
      categoryFilter: "",
      onlineFilter: "",
      onlineCountryCode: "",
      cityFilter: "Mirabel",
      locationFilter: "Mirabel",
      countryFilter: "",
      stateFilter: "",
      eventsFilter: "",
      radiusKm: 50,
      effectiveRadiusKm: 50,
      hasLocationContext: true,
      hasTypedLocation: true,
      distanceOrigin: { lat: 45.6794, lng: -74.0036 },
      categorySynonymsMap: {},
      searchSynonyms: {},
      categoryKeywords: {},
      categoryFilterAliases: {},
      cityAliases,
      strictSearchMode: false,
      strictSearchMinScore: 0,
      getCategoryLabel: (value) => value,
    });

    const wideRadiusResults = filterBusinesses({
      allBusinesses: [fullMontreal, cityOnlyMontreal],
      query: "",
      categoryFilter: "",
      onlineFilter: "",
      onlineCountryCode: "",
      cityFilter: "Mirabel",
      locationFilter: "Mirabel",
      countryFilter: "",
      stateFilter: "",
      eventsFilter: "",
      radiusKm: 250,
      effectiveRadiusKm: 250,
      hasLocationContext: true,
      hasTypedLocation: true,
      distanceOrigin: { lat: 45.6794, lng: -74.0036 },
      categorySynonymsMap: {},
      searchSynonyms: {},
      categoryKeywords: {},
      categoryFilterAliases: {},
      cityAliases,
      strictSearchMode: false,
      strictSearchMinScore: 0,
      getCategoryLabel: (value) => value,
    });

    expect(narrowRadiusResults.map((b) => b.id)).toEqual(["montreal-full"]);
    expect(wideRadiusResults.map((b) => b.id)).toEqual(["montreal-full", "montreal-city-only"]);
  });

  it("inclui negocio online aprovado quando ele esta dentro do raio e da cidade buscada", () => {
    const montrealOnline = createBusiness({
      id: "montreal-online",
      name: "Finalement Esfihas MTL",
      attendanceType: "online",
      address: {
        ...createBusiness({}).address,
        street: "",
        city: "Montreal",
        state: "Quebec",
        country: "Canada",
        countryCode: "ca",
        stateCode: "qc",
        lat: 45.5017,
        lng: -73.5673,
      },
      keywords: ["esfihas", "esfiha"],
    });

    const results = filterBusinesses({
      allBusinesses: [montrealOnline],
      query: "esfiha",
      categoryFilter: "",
      onlineFilter: "",
      onlineCountryCode: "",
      cityFilter: "Montreal",
      locationFilter: "Montreal",
      countryFilter: "",
      stateFilter: "",
      eventsFilter: "",
      radiusKm: 50,
      effectiveRadiusKm: 50,
      hasLocationContext: true,
      hasTypedLocation: true,
      distanceOrigin: { lat: 45.5017, lng: -73.5673 },
      categorySynonymsMap: {},
      searchSynonyms: {},
      categoryKeywords: {},
      categoryFilterAliases: {},
      cityAliases,
      strictSearchMode: false,
      strictSearchMinScore: 0,
      getCategoryLabel: (value) => value,
    });

    expect(results.map((b) => b.id)).toEqual(["montreal-online"]);
  });

  it("nao inclui negocio online de Montreal em busca por raio em Edogawa", () => {
    const montrealOnline = createBusiness({
      id: "montreal-online",
      name: "Finalement Esfihas MTL",
      attendanceType: "online",
      address: {
        ...createBusiness({}).address,
        street: "",
        city: "Montreal",
        state: "Quebec",
        country: "Canada",
        countryCode: "ca",
        stateCode: "qc",
        lat: 45.5017,
        lng: -73.5673,
      },
      keywords: ["esfihas", "esfiha"],
    });

    const results = filterBusinesses({
      allBusinesses: [montrealOnline],
      query: "esfiha",
      categoryFilter: "",
      onlineFilter: "",
      onlineCountryCode: "",
      cityFilter: "Edogawa City",
      locationFilter: "Edogawa City",
      countryFilter: "",
      stateFilter: "",
      eventsFilter: "",
      radiusKm: 50,
      effectiveRadiusKm: 50,
      hasLocationContext: true,
      hasTypedLocation: true,
      distanceOrigin: { lat: 35.7258341, lng: 139.8828889 },
      categorySynonymsMap: {},
      searchSynonyms: {},
      categoryKeywords: {},
      categoryFilterAliases: {},
      cityAliases,
      strictSearchMode: false,
      strictSearchMinScore: 0,
      getCategoryLabel: (value) => value,
    });

    expect(results).toEqual([]);
  });
});
