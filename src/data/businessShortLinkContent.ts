export type BusinessShortLinkContent = {
  loading: string;
  notFoundTitle: string;
  notFoundDescription: string;
  backHome: string;
};

const BUSINESS_SHORT_LINK_CONTENT_BY_LOCALE: Record<"pt-BR", BusinessShortLinkContent> = {
  "pt-BR": {
    loading: "Abrindo o negócio...",
    notFoundTitle: "Negócio não encontrado",
    notFoundDescription: "Esse link curto não está mais disponível.",
    backHome: "Voltar ao início",
  },
};

export function getBusinessShortLinkContent(): BusinessShortLinkContent {
  return BUSINESS_SHORT_LINK_CONTENT_BY_LOCALE["pt-BR"];
}
