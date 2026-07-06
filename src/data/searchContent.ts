import type { Locale } from "@/i18n/types";

export type SearchContent = {
  currentLocationLabel: string;
  searchBarPlaceholder: string;
  locationPlaceholder: string;
  categoryPlaceholder: string;
  countryPlaceholder: string;
  statePlaceholder: string;
  cityPlaceholder: string;
  distancePlaceholder: string;
  allCategories: string;
  allCountries: string;
  allStates: string;
  allCities: string;
  filters: string;
  locateMe: string;
  locatingMe: string;
  map: string;
  list: string;
  clearFilters: string;
  loadingResults: string;
  loadingResultsMessage: string;
  noResultsTitle: string;
  noResultsBackHome: string;
  noResultsNoCriteria: string;
  noResultsWithCriteria: (parts: string[]) => string;
  incompleteSearchTitle: string;
  incompleteSearchMessage: string;
  approximateLocationTitle: string;
  approximateLocationMessage: string;
  unableToLocateTitle: string;
  unableToLocateMessage: string;
  resultsSummary: (kind: "businesses" | "events" | "achadinhos", count: number) => string;
  communityFindsHeading: string;
  eventsHeading: string;
  noCommunityFinds: string;
  noEvents: string;
  locationNoticeTitle: string;
  locationNoticeMessage: string;
  locationNoticeButton: string;
  searchPromptMessage: string;
  radiusRequiredMessage: string;
  locatingReferenceMessage: string;
  pageOf: (page: number, total: number) => string;
  previous: string;
  next: string;
  distanceOption: (radius: number) => string;
  filtersActiveFindsTitle: string;
  filtersInactiveFindsTitle: string;
  filtersActiveEventsTitle: string;
  filtersInactiveEventsTitle: string;
  seo: {
    baseTitle: string;
    baseDescription: string;
    categoryFallback: string;
    compareText: string;
  };
  categorySeoText: Record<string, string>;
};

const SEARCH_CONTENT_BY_LOCALE: Record<Locale, SearchContent> = {
  "pt-BR": {
    currentLocationLabel: "Minha localização",
    searchBarPlaceholder: "Buscar por produto ou serviço (Ex: coxinha)",
    locationPlaceholder: "Em qual cidade?",
    categoryPlaceholder: "Todas as categorias",
    allCategories: "Todas as categorias",
    countryPlaceholder: "País",
    statePlaceholder: "Estado/Província",
    cityPlaceholder: "Cidade",
    distancePlaceholder: "Distância",
    allCountries: "Todos os países",
    allStates: "Todos os estados",
    allCities: "Todas as cidades",
    filters: "Filtros",
    locateMe: "Me localizar",
    locatingMe: "Localizando...",
    map: "Mapa",
    list: "Lista",
    clearFilters: "Limpar filtros",
    loadingResults: "Carregando resultados...",
    loadingResultsMessage: "Aguarde um instante enquanto preparamos os negócios para você.",
    noResultsTitle: "Nenhum resultado encontrado",
    noResultsBackHome: "Voltar ao Início",
    noResultsNoCriteria: "O Caramelinho não achou nada com esses critérios.",
    noResultsWithCriteria: (parts) => `Não encontramos resultados ${parts.join(" ")}.`,
    incompleteSearchTitle: "Busca incompleta",
    incompleteSearchMessage: "Digite o que você procura ou informe sua cidade para iniciar a busca.",
    approximateLocationTitle: "Usando localização aproximada",
    approximateLocationMessage:
      "Não consegui acessar sua localização exata. O mapa foi centralizado usando uma localização aproximada por IP.",
    unableToLocateTitle: "Não foi possível localizar",
    unableToLocateMessage:
      "Não consegui acessar sua localização e o fallback por IP também falhou.",
    resultsSummary: (kind, count) => {
      const labels = {
        businesses: ["negócio", "negócios"],
        events: ["evento", "eventos"],
        achadinhos: ["achadinho", "achadinhos"],
      } as const;
      const [singular, plural] = labels[kind];
      return `${count} ${count === 1 ? singular : plural} encontrado${count !== 1 ? "s" : ""}`;
    },
    communityFindsHeading: "Achadinhos da comunidade",
    eventsHeading: "Festas e eventos",
    noCommunityFinds: "Ainda não há achadinhos ativos na sua região.",
    noEvents: "Ainda não há eventos ativos na sua região.",
    locationNoticeTitle: "Localização necessária",
    locationNoticeMessage: "Para usar esta funcionalidade, habilite a localização no navegador/dispositivo.",
    locationNoticeButton: "Entendi",
    searchPromptMessage: "Digite o que você procura ou informe sua cidade para iniciar a busca.",
    radiusRequiredMessage: "informe um local ou permita sua localização para usar raio",
    locatingReferenceMessage: "localizando referência...",
    pageOf: (page, total) => `Página ${page} de ${total}`,
    previous: "Anterior",
    next: "Próxima",
    distanceOption: (radius) => `Até ${radius} km`,
    filtersActiveFindsTitle: "Filtro de achadinhos ativo",
    filtersInactiveFindsTitle: "Filtro de achadinhos desativado",
    filtersActiveEventsTitle: "Filtro de eventos ativo",
    filtersInactiveEventsTitle: "Filtro de eventos desativado",
    seo: {
      baseTitle: "Buscar negócios brasileiros",
      baseDescription: "Encontre negócios, serviços, produtos e eventos brasileiros perto de você no exterior.",
      categoryFallback: "negócios e serviços",
      compareText: "Compare opções perto de você e fale direto com os negócios.",
    },
    categorySeoText: {
      "Alimentação (Restaurantes, Padarias, Cafés)": "restaurantes, padarias e cafés",
      "Serviços Automotivos": "oficinas e serviços automotivos",
      "Saúde & Beleza": "serviços de saúde e beleza",
      "Construção & Reformas": "serviços de construção e reformas",
      "Advocacia & Consultoria": "advocacia, traduções e consultoria de imigração",
      "Contabilidade & Finanças": "contabilidade e finanças",
      "Educação & Idiomas": "educação e idiomas",
      "Tecnologia & TI": "tecnologia e TI",
      "Comércio & Varejo": "comércio e varejo",
      "Transporte & Mudança": "transporte e mudança",
      "Serviços para Pets": "serviços para pets",
      "Cuidados Infantis e de Idosos": "cuidados infantis e de idosos",
      "Diaristas": "diaristas e serviços de limpeza",
      "Imobiliária": "imobiliárias e corretores",
      "Turismo & Viagens": "turismo e viagens",
      "Outros": "serviços diversos",
    },
  },
  en: {
    currentLocationLabel: "My location",
    searchBarPlaceholder: "Search for a product or service (e.g. coxinha)",
    locationPlaceholder: "Which city?",
    categoryPlaceholder: "All categories",
    allCategories: "All categories",
    countryPlaceholder: "Country",
    statePlaceholder: "State/Province",
    cityPlaceholder: "City",
    distancePlaceholder: "Distance",
    allCountries: "All countries",
    allStates: "All states",
    allCities: "All cities",
    filters: "Filters",
    locateMe: "Locate me",
    locatingMe: "Locating...",
    map: "Map",
    list: "List",
    clearFilters: "Clear filters",
    loadingResults: "Loading results...",
    loadingResultsMessage: "Give us a moment while we prepare the businesses for you.",
    noResultsTitle: "No results found",
    noResultsBackHome: "Back to Home",
    noResultsNoCriteria: "Caramelinho couldn't find anything with these filters.",
    noResultsWithCriteria: (parts) => `We couldn't find any results ${parts.join(" ")}.`,
    incompleteSearchTitle: "Incomplete search",
    incompleteSearchMessage: "Type what you are looking for or enter your city to start searching.",
    approximateLocationTitle: "Using approximate location",
    approximateLocationMessage:
      "I couldn't access your exact location. The map was centered using an approximate IP-based location.",
    unableToLocateTitle: "Could not locate",
    unableToLocateMessage:
      "I couldn't access your location and the IP fallback also failed.",
    resultsSummary: (kind, count) => {
      const labels = {
        businesses: ["business", "businesses"],
        events: ["event", "events"],
        achadinhos: ["deal", "deals"],
      } as const;
      const [singular, plural] = labels[kind];
      return `${count} ${count === 1 ? singular : plural} found`;
    },
    communityFindsHeading: "Community finds",
    eventsHeading: "Events and parties",
    noCommunityFinds: "There are no active community finds in your area yet.",
    noEvents: "There are no active events in your area yet.",
    locationNoticeTitle: "Location required",
    locationNoticeMessage: "To use this feature, enable location in your browser/device.",
    locationNoticeButton: "Got it",
    searchPromptMessage: "Type what you are looking for or enter your city to start searching.",
    radiusRequiredMessage: "enter a location or allow location to use radius",
    locatingReferenceMessage: "locating reference...",
    pageOf: (page, total) => `Page ${page} of ${total}`,
    previous: "Previous",
    next: "Next",
    distanceOption: (radius) => `Up to ${radius} km`,
    filtersActiveFindsTitle: "Community finds filter active",
    filtersInactiveFindsTitle: "Community finds filter inactive",
    filtersActiveEventsTitle: "Events filter active",
    filtersInactiveEventsTitle: "Events filter inactive",
    seo: {
      baseTitle: "Search Brazilian businesses",
      baseDescription: "Search Brazilian businesses, services, products, and events near you abroad.",
      categoryFallback: "businesses and services",
      compareText: "Compare options near you and contact the businesses directly.",
    },
    categorySeoText: {
      "Alimentação (Restaurantes, Padarias, Cafés)": "restaurants, bakeries, and cafés",
      "Serviços Automotivos": "automotive workshops and services",
      "Saúde & Beleza": "health and beauty services",
      "Construção & Reformas": "construction and renovation services",
      "Advocacia & Consultoria": "law, translation, and immigration consulting",
      "Contabilidade & Finanças": "accounting and finance",
      "Educação & Idiomas": "education and languages",
      "Tecnologia & TI": "technology and IT",
      "Comércio & Varejo": "retail and commerce",
      "Transporte & Mudança": "transport and moving",
      "Serviços para Pets": "pet services",
      "Cuidados Infantis e de Idosos": "child and elder care",
      "Diaristas": "cleaning and housekeeping services",
      "Imobiliária": "real estate and agents",
      "Turismo & Viagens": "travel and tourism",
      "Outros": "miscellaneous services",
    },
  },
};

export function getSearchContent(locale: Locale = "pt-BR"): SearchContent {
  return SEARCH_CONTENT_BY_LOCALE[locale] || SEARCH_CONTENT_BY_LOCALE["pt-BR"];
}
