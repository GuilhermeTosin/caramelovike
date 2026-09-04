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

const DIRECTORY_CONTENT_BY_LOCALE: Record<"pt-BR", DirectoryContent> = {
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
};

export function getDirectoryContent(): DirectoryContent {
  return DIRECTORY_CONTENT_BY_LOCALE["pt-BR"];
}
