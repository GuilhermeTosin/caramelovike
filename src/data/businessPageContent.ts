import type { Locale } from "@/i18n/types";

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

const BUSINESS_PAGE_CONTENT_BY_LOCALE: Record<Locale, BusinessPageContent> = {
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
  en: {
    loading: "Loading...",
    businessNotFoundTitle: "Business not found",
    businessNotFoundDescription: "Caramelinho could not find this business.",
    shareMessagePrefix: "Check out this business on Caramelinho:",
    reportSendError: "Could not send the report.",
    reportSent: "Report sent for review.",
    seoFallbackTitle: "Brazilian business",
    seoFallbackDescription: "Find businesses near you.",
    reviewsTitle: "Reviews",
    reviewCountSingular: "review",
    reviewCountPlural: "reviews",
    writeReviewTitle: "Leave your review",
    alreadyReviewedNotice: "You have already reviewed this business. To change it, use \"Edit my review\" in the review below.",
    experiencePlaceholder: "Share your experience...",
    submitReview: "Submit Review",
    submittingReview: "Sending...",
    noReviews: "No reviews yet. Be the first!",
    photosTitle: "Photos",
    noPhotos: "No photos available.",
    promotionsTitle: "Promotions",
    validUntil: "Valid until",
    upcomingEventsTitle: "Upcoming events",
    freeEntry: "Free entry",
    paidEventFallback: "Paid event",
    buyTickets: "Buy tickets",
    nextPhotoAria: "Next photo",
    verifiedBadgeTitle: "Verified Business",
    verifiedBadgeTooltip:
      "Authenticity badge: this business was validated by the Caramelinho team. We verify real presence and the accuracy of the information to ensure a safe experience free from misleading profiles.",
    contactInfoTitle: "Contact Information",
    openingHoursTitle: "Opening Hours",
    openingHoursMissing: "Opening hours not provided yet.",
    socialNetworksTitle: "Social Networks",
    sharePageTitle: "Share page",
    moreOptions: "More options",
    ownershipRequestSent: "Ownership request sent",
    sendingOwnershipRequest: "Sending request...",
    claimOwnership: "I own this business",
    reportAdTitle: "Report listing",
    reportAnonymousNotice: "Your report is 100% anonymous. No personal data is shown to the reported listing.",
    reportReasonLabel: "Reason",
    reportDetailsLabel: "Details (optional)",
    cancel: "Cancel",
    sendReport: "Send report",
    sendingReport: "Sending...",
    similarBusinessesTitle: "Similar businesses in the area",
    verifiedLabel: "Verified",
    veganLabel: "Vegan",
    vegetarianLabel: "Vegetarian",
    glutenFreeLabel: "Gluten-free",
    sendMessage: "Send message",
    route: "Get directions",
    whatsapp: "WhatsApp",
    openInGoogleMaps: "Open in Google Maps",
    specialtiesLabel: "Specialties",
    seeReviewsAndContact: "See reviews and contact details to choose with confidence.",
    onlineServiceLabel: "online service",
    inLocationLabel: (city) => `in ${city}`,
  },
};

export function getBusinessPageContent(locale: Locale = "pt-BR"): BusinessPageContent {
  return BUSINESS_PAGE_CONTENT_BY_LOCALE[locale] || BUSINESS_PAGE_CONTENT_BY_LOCALE["pt-BR"];
}
