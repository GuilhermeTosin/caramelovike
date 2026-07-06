import type { Locale } from "@/i18n/types";

export type DirectoryContent = {
  backHome: string;
  intro: string;
  loadingBusinesses: string;
  countriesTitle: string;
  statesTitle: string;
  citiesTitle: string;
  businessesInCity: (count: number) => string;
  businessSingular: string;
  businessPlural: string;
  searchBusinesses: string;
  rootTitle: string;
};

const DIRECTORY_CONTENT_BY_LOCALE: Record<Locale, DirectoryContent> = {
  "pt-BR": {
    backHome: "Voltar para início",
    intro: "Diretório público organizado por país, estado e cidade para facilitar a descoberta das páginas de negócios.",
    loadingBusinesses: "Carregando países com negócios publicados...",
    countriesTitle: "Países",
    statesTitle: "Estados e regiões",
    citiesTitle: "Cidades",
    businessesInCity: (count) => `${count} ${count === 1 ? "negócio" : "negócios"} publicados nesta cidade`,
    businessSingular: "negócio",
    businessPlural: "negócios",
    searchBusinesses: "Buscar negócios",
    rootTitle: "Negócios brasileiros por país",
  },
  en: {
    backHome: "Back to home",
    intro: "Public directory organized by country, state, and city to make it easier to discover business pages.",
    loadingBusinesses: "Loading countries with published businesses...",
    countriesTitle: "Countries",
    statesTitle: "States and regions",
    citiesTitle: "Cities",
    businessesInCity: (count) => `${count} published ${count === 1 ? "business" : "businesses"} in this city`,
    businessSingular: "business",
    businessPlural: "businesses",
    searchBusinesses: "Search businesses",
    rootTitle: "Brazilian businesses by country",
  },
};

export function getDirectoryContent(locale: Locale = "pt-BR"): DirectoryContent {
  return DIRECTORY_CONTENT_BY_LOCALE[locale] || DIRECTORY_CONTENT_BY_LOCALE["pt-BR"];
}
