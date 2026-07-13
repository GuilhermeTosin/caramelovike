import type { Locale } from "@/i18n/types";

export type HomeSearchMode = "businesses" | "events" | "achadinhos";

export type HomeSearchModeText = {
  label: string;
  description: string;
  placeholder: string;
  ctaLabel: string;
  quickTags: string[];
};

export type HomeCategoryText = {
  id: string;
  name: string;
};

export type HomeContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  searchIntroduction: string;
  currentLocationLabel: string;
  locationPlaceholder: string;
  locationUnavailableTitle: string;
  locationUnavailableMessage: string;
  locationNoticeButton: string;
  searchRequiresQueryOrLocationMessage: string;
  searchingLabel: string;
  featuredEmptyTitle: string;
  featuredEmptyDescription: string;
  verifiedLabel: string;
  veganLabel: string;
  vegetarianLabel: string;
  glutenFreeLabel: string;
  stats: {
    businesses: string;
    cities: string;
    countries: string;
    reviews: string;
  };
  categoriesHeading: string;
  categoriesDescription: string;
  featuredHeading: string;
  featuredDescription: string;
  citiesHeading: string;
  citiesDescription: string;
  ctaHeading: string;
  ctaDescription: string;
  ctaButton: string;
  searchModes: Record<HomeSearchMode, HomeSearchModeText>;
  categories: HomeCategoryText[];
};

const HOME_CONTENT_BY_LOCALE: Record<Locale, HomeContent> = {
  "pt-BR": {
    heroEyebrow: "O farejador de negócios brasileiros",
    heroTitle: "Encontre negócios brasileiros no mundo todo",
    heroSubtitle:
      "De padarias a clínicas, de Montreal a Tóquio.\nO Caramelinho fareja os melhores serviços brasileiros perto de você.",
    searchIntroduction:
      "Procure negócios brasileiros, serviços, lojas e profissionais perto de você.",
    currentLocationLabel: "Minha localização",
    locationPlaceholder: "Em qual cidade?",
    locationUnavailableTitle: "Localização indisponível",
    locationUnavailableMessage: "Para usar esta funcionalidade, habilite a localização no navegador/dispositivo.",
    locationNoticeButton: "Entendi",
    searchRequiresQueryOrLocationMessage: "Digite o que procura ou informe sua cidade para iniciar a busca.",
    searchingLabel: "Farejando...",
    featuredEmptyTitle: "Nenhum negócio encontrado ainda.",
    featuredEmptyDescription: "Seja o primeiro a cadastrar!",
    verifiedLabel: "Verificado",
    veganLabel: "Vegano",
    vegetarianLabel: "Vegetariano",
    glutenFreeLabel: "Sem Glúten",
    stats: {
      businesses: "Negócios Cadastrados",
      cities: "Cidades Atendidas",
      countries: "Países",
      reviews: "Avaliações",
    },
    categoriesHeading: "Categorias",
    categoriesDescription: "Navegue por categoria para encontrar o que precisa",
    featuredHeading: "Negócios em Destaque",
    featuredDescription: "Recomendados pelo Caramelinho",
    citiesHeading: "Cidades Populares",
    citiesDescription: "Descubra negócios brasileiros pelo mundo",
    ctaHeading: "Tem um negócio brasileiro no exterior?",
    ctaDescription:
      "Cadastre seu negócio no Caramelinho e seja encontrado por milhares de brasileiros espalhados pelo mundo!",
    ctaButton: "Criar conta gratuita",
    searchModes: {
      businesses: {
        label: "Negócios",
        description: "Procure negócios brasileiros, serviços, lojas e profissionais perto de você.",
        placeholder: "Buscar por produto ou serviço (Ex: coxinha)",
        ctaLabel: "Farejar negócios",
        quickTags: ["Padaria", "Mecânico", "Dentista", "Advogado", "Restaurante", "Cabeleireiro"],
      },
      events: {
        label: "Eventos",
        description: "Encontre festas, feiras, encontros e inaugurações da comunidade brasileira.",
        placeholder: "Buscar por festa, feira ou encontro",
        ctaLabel: "Farejar eventos",
        quickTags: ["Festa", "Show", "Feira", "Inauguração", "Encontro", "Samba"],
      },
      achadinhos: {
        label: "Achadinhos",
        description: "Descubra promoções, ofertas e novidades compartilhadas pela comunidade.",
        placeholder: "Buscar por promoção, desconto ou novidade",
        ctaLabel: "Farejar achadinhos",
        quickTags: ["Promoção", "Desconto", "Oferta", "Outlet", "Novidade", "Cupom"],
      },
    },
    categories: [
      { id: "food", name: "Restaurantes e Alimentação" },
      { id: "health_beauty", name: "Saúde & Beleza" },
      { id: "auto", name: "Automotivo" },
      { id: "construction", name: "Construção" },
      { id: "legal_consulting", name: "Advocacia & Traduções" },
      { id: "education", name: "Educação" },
      { id: "accounting_finance", name: "Contabilidade" },
      { id: "retail", name: "Comércio" },
      { id: "transport_moving", name: "Transporte & Mudança" },
      { id: "real_estate", name: "Imobiliária" },
      { id: "artists", name: "Artistas" },
      { id: "pets", name: "Serviços para Pets" },
      { id: "child_elder_care", name: "Cuidados Infantis e de Idosos" },
      { id: "cleaning", name: "Diaristas" },
      { id: "other", name: "Outros" },
    ],
  },
  en: {
    heroEyebrow: "The Brazilian business finder",
    heroTitle: "Find Brazilian businesses around the world",
    heroSubtitle:
      "From bakeries to clinics, from Montreal to Tokyo.\nCaramelinho finds the best Brazilian services near you.",
    searchIntroduction: "Search Brazilian businesses, services, stores, and professionals near you.",
    currentLocationLabel: "My location",
    locationPlaceholder: "Which city?",
    locationUnavailableTitle: "Location unavailable",
    locationUnavailableMessage: "To use this feature, enable location in your browser/device.",
    locationNoticeButton: "Got it",
    searchRequiresQueryOrLocationMessage: "Type what you are looking for or enter your city to start searching.",
    searchingLabel: "Searching...",
    featuredEmptyTitle: "No businesses found yet.",
    featuredEmptyDescription: "Be the first to list one!",
    verifiedLabel: "Verified",
    veganLabel: "Vegan",
    vegetarianLabel: "Vegetarian",
    glutenFreeLabel: "Gluten-free",
    stats: {
      businesses: "Listed Businesses",
      cities: "Cities Covered",
      countries: "Countries",
      reviews: "Reviews",
    },
    categoriesHeading: "Categories",
    categoriesDescription: "Browse by category to find exactly what you need",
    featuredHeading: "Featured Businesses",
    featuredDescription: "Recommended by Caramelinho",
    citiesHeading: "Popular Cities",
    citiesDescription: "Discover Brazilian businesses around the world",
    ctaHeading: "Have a Brazilian business abroad?",
    ctaDescription:
      "List your business on Caramelinho and get discovered by thousands of Brazilians around the world!",
    ctaButton: "Create free account",
    searchModes: {
      businesses: {
        label: "Businesses",
        description: "Search Brazilian businesses, services, stores, and professionals near you.",
        placeholder: "Search for a product or service (e.g. coxinha)",
        ctaLabel: "Find businesses",
        quickTags: ["Bakery", "Mechanic", "Dentist", "Lawyer", "Restaurant", "Hairdresser"],
      },
      events: {
        label: "Events",
        description: "Find parties, fairs, meetups, and grand openings from the Brazilian community.",
        placeholder: "Search for parties, fairs, or meetups",
        ctaLabel: "Find events",
        quickTags: ["Party", "Show", "Fair", "Opening", "Meetup", "Samba"],
      },
      achadinhos: {
        label: "Deals",
        description: "Discover promotions, deals, and updates shared by the community.",
        placeholder: "Search for promotions, discounts, or new finds",
        ctaLabel: "Find deals",
        quickTags: ["Promotion", "Discount", "Deal", "Outlet", "New find", "Coupon"],
      },
    },
    categories: [
      { id: "food", name: "Food" },
      { id: "health_beauty", name: "Health & Beauty" },
      { id: "auto", name: "Automotive" },
      { id: "construction", name: "Construction" },
      { id: "legal_consulting", name: "Law & Translation" },
      { id: "education", name: "Education" },
      { id: "accounting_finance", name: "Accounting" },
      { id: "retail", name: "Retail" },
      { id: "transport_moving", name: "Transport & Moving" },
      { id: "real_estate", name: "Real Estate" },
      { id: "artists", name: "Artists" },
      { id: "pets", name: "Pet Services" },
      { id: "child_elder_care", name: "Child & Elder Care" },
      { id: "cleaning", name: "Cleaning" },
      { id: "other", name: "Other" },
    ],
  },
};

export function getHomeContent(locale: Locale = "pt-BR"): HomeContent {
  return HOME_CONTENT_BY_LOCALE[locale] || HOME_CONTENT_BY_LOCALE["pt-BR"];
}
