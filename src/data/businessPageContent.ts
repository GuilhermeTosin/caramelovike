export type BusinessPageContent = {
  loading: string;
  businessNotFoundTitle: string;
  businessNotFoundDescription: string;
  shareMessagePrefix: string;
  reportSendError: string;
  reportSent: string;
  seoFallbackTitle: string;
  seoFallbackDescription: string;
  reviewsTitle: string;
  reviewCountSingular: string;
  reviewCountPlural: string;
  writeReviewTitle: string;
  alreadyReviewedNotice: string;
  experiencePlaceholder: string;
  submitReview: string;
  submittingReview: string;
  noReviews: string;
  photosTitle: string;
  noPhotos: string;
  promotionsTitle: string;
  validUntil: string;
  upcomingEventsTitle: string;
  freeEntry: string;
  paidEventFallback: string;
  buyTickets: string;
  nextPhotoAria: string;
  verifiedBadgeTitle: string;
  verifiedBadgeTooltip: string;
  contactInfoTitle: string;
  openingHoursTitle: string;
  openingHoursMissing: string;
  socialNetworksTitle: string;
  sharePageTitle: string;
  moreOptions: string;
  ownershipRequestSent: string;
  sendingOwnershipRequest: string;
  claimOwnership: string;
  reportAdTitle: string;
  reportAnonymousNotice: string;
  reportReasonLabel: string;
  reportDetailsLabel: string;
  cancel: string;
  sendReport: string;
  sendingReport: string;
  similarBusinessesTitle: string;
  verifiedLabel: string;
  veganLabel: string;
  vegetarianLabel: string;
  glutenFreeLabel: string;
  sendMessage: string;
  route: string;
  whatsapp: string;
  openInGoogleMaps: string;
  specialtiesLabel: string;
  seeReviewsAndContact: string;
  onlineServiceLabel: string;
  inLocationLabel: (city: string) => string;
};

const BUSINESS_PAGE_CONTENT_BY_LOCALE: Record<"pt-BR", BusinessPageContent> = {
  "pt-BR": {
    loading: "Carregando...",
    businessNotFoundTitle: "Negócio não encontrado",
    businessNotFoundDescription: "O Caramelinho não achou esse negócio.",
    shareMessagePrefix: "Confira este negócio no Caramelinho:",
    reportSendError: "Não foi possível enviar denúncia.",
    reportSent: "Denúncia enviada para análise.",
    seoFallbackTitle: "Negócio brasileiro",
    seoFallbackDescription: "Encontre negócios perto de você.",
    reviewsTitle: "Avaliações",
    reviewCountSingular: "avaliação",
    reviewCountPlural: "avaliações",
    writeReviewTitle: "Deixe sua avaliação",
    alreadyReviewedNotice: "Você já avaliou este negócio. Para alterar, use \"Editar minha avaliação\" na sua avaliação abaixo.",
    experiencePlaceholder: "Conte sua experiência...",
    submitReview: "Enviar Avaliação",
    submittingReview: "Enviando...",
    noReviews: "Nenhuma avaliação ainda. Seja o primeiro!",
    photosTitle: "Fotos",
    noPhotos: "Nenhuma foto disponível.",
    promotionsTitle: "Promoções",
    validUntil: "Válido até",
    upcomingEventsTitle: "Próximos eventos",
    freeEntry: "Entrada franca",
    paidEventFallback: "Evento pago",
    buyTickets: "Comprar ingressos",
    nextPhotoAria: "Próxima foto",
    verifiedBadgeTitle: "Negócio Verificado",
    verifiedBadgeTooltip:
      "Selo de Autenticidade: este negócio foi validado pela equipe Caramelinho. Verificamos a presença real e a veracidade das informações para garantir uma experiência segura e livre de perfis enganosos.",
    contactInfoTitle: "Informações de Contato",
    openingHoursTitle: "Horários",
    openingHoursMissing: "Horários ainda não informados.",
    socialNetworksTitle: "Redes Sociais",
    sharePageTitle: "Compartilhar página",
    moreOptions: "Mais opções",
    ownershipRequestSent: "Solicitação de ownership enviada",
    sendingOwnershipRequest: "Enviando solicitação...",
    claimOwnership: "Sou dono deste negócio",
    reportAdTitle: "Denunciar anúncio",
    reportAnonymousNotice: "Sua denúncia é 100% anônima. Nenhum dado pessoal é exibido ao anúncio denunciado.",
    reportReasonLabel: "Motivo",
    reportDetailsLabel: "Detalhes (opcional)",
    cancel: "Cancelar",
    sendReport: "Enviar denúncia",
    sendingReport: "Enviando...",
    similarBusinessesTitle: "Negócios similares na região",
    verifiedLabel: "Verificado",
    veganLabel: "Vegano",
    vegetarianLabel: "Vegetariano",
    glutenFreeLabel: "Sem Glúten",
    sendMessage: "Enviar mensagem",
    route: "Ver rota",
    whatsapp: "WhatsApp",
    openInGoogleMaps: "Abrir no Google Maps",
    specialtiesLabel: "Especialidades",
    seeReviewsAndContact: "Veja avaliações e contato para escolher com confiança.",
    onlineServiceLabel: "atendimento online",
    inLocationLabel: (city) => `em ${city}`,
  },
};

export function getBusinessPageContent(): BusinessPageContent {
  return BUSINESS_PAGE_CONTENT_BY_LOCALE["pt-BR"];
}
