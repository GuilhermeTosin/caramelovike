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

const SEARCH_CONTENT_BY_LOCALE: Record<"pt-BR", SearchContent> = {
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
      "Restaurantes e Alimentação": "restaurantes, padarias e cafés",
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
};

export function getSearchContent(): SearchContent {
  return SEARCH_CONTENT_BY_LOCALE["pt-BR"];
}
