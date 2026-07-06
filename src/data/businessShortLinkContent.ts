import type { Locale } from "@/i18n/types";

export type BusinessShortLinkContent = {
  loading: string;
  notFoundTitle: string;
  notFoundDescription: string;
  backHome: string;
};

const BUSINESS_SHORT_LINK_CONTENT_BY_LOCALE: Record<Locale, BusinessShortLinkContent> = {
  "pt-BR": {
    loading: "Abrindo o negócio...",
    notFoundTitle: "Negócio não encontrado",
    notFoundDescription: "Esse link curto não está mais disponível.",
    backHome: "Voltar ao início",
  },
  en: {
    loading: "Opening the business...",
    notFoundTitle: "Business not found",
    notFoundDescription: "This short link is no longer available.",
    backHome: "Back to home",
  },
};

export function getBusinessShortLinkContent(locale: Locale = "pt-BR"): BusinessShortLinkContent {
  return BUSINESS_SHORT_LINK_CONTENT_BY_LOCALE[locale] || BUSINESS_SHORT_LINK_CONTENT_BY_LOCALE["pt-BR"];
}
