import type { Locale } from "@/i18n/types";

export type SiteContent = {
  appName: string;
  tagline: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  footer: {
    tagline: string;
    navigationTitle: string;
    institutionalTitle: string;
    socialTitle: string;
    searchBusinesses: string;
    allBusinesses: string;
    registerBusiness: string;
    loginAccount: string;
    about: string;
    contact: string;
    privacy: string;
    terms: string;
    copyright: string;
    madeFor: string;
  };
  notFound: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    description: string;
    backHome: string;
    goSearch: string;
    imageAlt: string;
  };
  seo: {
    homeTitle: string;
    homeDescription: string;
    searchTitle: string;
    searchDescription: string;
    directoryTitle: string;
    directoryDescription: string;
    notFoundTitle: string;
    notFoundDescription: string;
    businessTitle: string;
    businessDescription: string;
  };
};

const SITE_CONTENT_BY_LOCALE: Record<Locale, SiteContent> = {
  "pt-BR": {
    appName: "Caramelinho.com",
    tagline: "O farejador de negócios brasileiros pelo mundo",
    description:
      "Encontre empresas, serviços e negócios de brasileiros onde quer que você esteja. Como um bom caramelinho, a gente fareja tudo!",
    primaryCta: "Cadastre seu negócio",
    secondaryCta: "Começar pesquisa",
    footer: {
      tagline:
        "Encontre negócios brasileiros onde você estiver. Busca local, contato direto e informações confiáveis em um só lugar.",
      navigationTitle: "Navegação",
      institutionalTitle: "Institucional",
      socialTitle: "Siga-nos",
      searchBusinesses: "Buscar negócios",
      allBusinesses: "Todos os negócios",
      registerBusiness: "Cadastrar negócio",
      loginAccount: "Entrar na conta",
      about: "Sobre",
      contact: "Contato",
      privacy: "Privacidade",
      terms: "Termos e Condições",
      copyright: "© 2026 Caramelinho.com. Todos os direitos reservados.",
      madeFor: "Feito para facilitar a vida de quem mora fora.",
    },
    notFound: {
      eyebrow: "Erro 404",
      titleLead: "O Caramelinho farejou...",
      titleAccent: "mas não encontrou essa página",
      description:
        "Essa página não está disponível no momento. Mas você pode continuar explorando os melhores negócios brasileiros por aqui.",
      backHome: "Voltar para a inicial",
      goSearch: "Ir para buscar",
      imageAlt: "Caramelinho com lupa procurando páginas",
    },
    seo: {
      homeTitle: "Caramelinho.com - Encontre negócios brasileiros no mundo",
      homeDescription:
        "Encontre empresas, serviços e negócios brasileiros perto de você no exterior. Descubra restaurantes, profissionais e eventos da comunidade em um só lugar.",
      searchTitle: "Buscar negócios brasileiros | Caramelinho.com",
      searchDescription:
        "Busque negócios, serviços, produtos e eventos brasileiros perto de você no exterior.",
      directoryTitle: "Negócios brasileiros por país | Caramelinho.com",
      directoryDescription:
        "Explore o diretório de negócios brasileiros no exterior por país, estado e cidade.",
      notFoundTitle: "Página não encontrada | Caramelinho.com",
      notFoundDescription:
        "A página solicitada não foi encontrada. Use a busca ou volte para a inicial do Caramelinho.",
      businessTitle: "Negócio brasileiro | Caramelinho.com",
      businessDescription:
        "Encontre informações de contato, avaliações e detalhes sobre negócios brasileiros no exterior.",
    },
  },
  en: {
    appName: "Caramelinho.com",
    tagline: "The Brazilian business finder around the world",
    description:
      "Find Brazilian businesses and services wherever you are. Like a good little scout, Caramelinho finds everything.",
    primaryCta: "List your business",
    secondaryCta: "Start searching",
    footer: {
      tagline:
        "Find Brazilian businesses wherever you are. Local search, direct contact, and trusted information in one place.",
      navigationTitle: "Navigation",
      institutionalTitle: "Company",
      socialTitle: "Follow us",
      searchBusinesses: "Search businesses",
      allBusinesses: "All businesses",
      registerBusiness: "List a business",
      loginAccount: "Sign in",
      about: "About",
      contact: "Contact",
      privacy: "Privacy",
      terms: "Terms and Conditions",
      copyright: "© 2026 Caramelinho.com. All rights reserved.",
      madeFor: "Built to make life easier for people living abroad.",
    },
    notFound: {
      eyebrow: "404 Error",
      titleLead: "Caramelinho sniffed around...",
      titleAccent: "but couldn't find that page",
      description:
        "That page is not available right now. You can still keep exploring the best Brazilian businesses from here.",
      backHome: "Back to home",
      goSearch: "Go to search",
      imageAlt: "Caramelinho with a magnifying glass looking for pages",
    },
    seo: {
      homeTitle: "Caramelinho.com - Find Brazilian businesses around the world",
      homeDescription:
        "Find Brazilian businesses and services near you abroad. Discover restaurants, professionals, and community events in one place.",
      searchTitle: "Search Brazilian businesses | Caramelinho.com",
      searchDescription:
        "Search Brazilian businesses, services, products, and events near you abroad.",
      directoryTitle: "Brazilian businesses by country | Caramelinho.com",
      directoryDescription:
        "Browse the directory of Brazilian businesses abroad by country, state, and city.",
      notFoundTitle: "Page not found | Caramelinho.com",
      notFoundDescription:
        "The requested page could not be found. Use search or go back to the Caramelinho home page.",
      businessTitle: "Brazilian business | Caramelinho.com",
      businessDescription:
        "Find contact information, reviews, and details about Brazilian businesses abroad.",
    },
  },
};

export function getSiteContent(locale: Locale = "pt-BR"): SiteContent {
  return SITE_CONTENT_BY_LOCALE[locale] || SITE_CONTENT_BY_LOCALE["pt-BR"];
}

export const siteContent = SITE_CONTENT_BY_LOCALE["pt-BR"];

const MASCOT_PHRASES_BY_LOCALE: Record<Locale, readonly string[]> = {
  "pt-BR": [
    "O farejador de negócios brasileiros",
    "Achamos tudo! Até pastel na neve 🐶",
    "Caramelinho farejou mais um negócio!",
    "Brasileiro no exterior? A gente acha!",
    "Farejando brasilidade pelo mundo",
  ] as const,
  en: [
    "The Brazilian business finder",
    "We find everything, even pastel in the snow 🐶",
    "Caramelinho sniffed out another business!",
    "Brazilian abroad? We can find it!",
    "Sniffing out Brazilian vibes around the world",
  ] as const,
};

export function getMascotPhrases(locale: Locale = "pt-BR") {
  return MASCOT_PHRASES_BY_LOCALE[locale] || MASCOT_PHRASES_BY_LOCALE["pt-BR"];
}

export const MASCOT_PHRASES = MASCOT_PHRASES_BY_LOCALE["pt-BR"];
