import { stripRichTextHtml } from "@/lib/richText";
import type { BusinessFrontend } from "@/types/database";
import type { SiteLocale } from "@/lib/locales";

export type ProfileCompletenessData = {
  name?: string;
  category?: string;
  primaryActivity?: string;
  description?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  street?: string;
  logoUrl?: string;
  heroImage?: string;
  photos?: string[];
  phone?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  services?: string[];
  serviceItems?: Array<{ name?: string; description?: string; price?: string }>;
  menu?: Array<{ name?: string; description?: string; price?: string }>;
  keywords?: string[];
  openingHours?: string[];
  attendanceType?: string;
};

export type ProfileScoreItem = {
  id: string;
  label: string;
  progress?: string;
  points: number;
  earned: number;
  complete: boolean;
};

export function getBusinessProfileCompletionData(business: BusinessFrontend): ProfileCompletenessData {
  return {
    name: business.name,
    category: business.categoryId || business.category,
    primaryActivity: business.primaryActivity || business.primaryActivityCustom,
    description: business.description,
    city: business.address.city,
    stateCode: business.address.stateCode,
    countryCode: business.address.countryCode,
    street: business.address.street,
    logoUrl: business.logoUrl,
    heroImage: business.heroImage,
    photos: business.photos,
    phone: business.phone,
    email: business.email,
    website: business.website,
    whatsapp: business.whatsapp,
    instagram: business.instagram,
    facebook: business.facebook,
    services: business.services,
    serviceItems: business.serviceItems,
    menu: business.menu,
    keywords: business.keywords,
    openingHours: business.openingHours,
    attendanceType: business.attendanceType,
  };
}

function hasText(value?: string | null): boolean {
  return !!String(value || "").trim();
}


function getDescriptionPoints(length: number): number {
  if (length === 0) return 0;
  if (length < 40) return 4;
  if (length < 120) return 15;
  if (length < 250) return 25;
  return 35;
}

export function getProfileScoreItems(data: ProfileCompletenessData, locale: SiteLocale = "pt-BR"): ProfileScoreItem[] {
  const descriptionLength = stripRichTextHtml(data.description || "").trim().length;
  const descriptionPoints = getDescriptionPoints(descriptionLength);
  const photoCount = (data.photos || []).filter(Boolean).length;


  const keywordCount = (data.keywords || []).filter(hasText).length;
  const socialProvided = hasText(data.instagram) || hasText(data.facebook);

  const english = locale === "en";
  const label = (portuguese: string, englishValue: string) => english ? englishValue : portuguese;
  return [
    { id: "location", label: label("Localização", "Location"), points: 4, earned: hasText(data.city) && hasText(data.stateCode) && hasText(data.countryCode) ? 4 : 0, complete: hasText(data.city) && hasText(data.stateCode) && hasText(data.countryCode) },
    { id: "category", label: label("Categoria", "Category"), points: 4, earned: hasText(data.category) ? 4 : 0, complete: hasText(data.category) },
    { id: "activity", label: label("Atividade principal", "Primary activity"), points: 4, earned: hasText(data.primaryActivity) ? 4 : 0, complete: hasText(data.primaryActivity) },
    { id: "description", label: label("Descrição detalhada", "Detailed description"), progress: `${descriptionLength}/250 ${english ? "characters" : "caracteres"}`, points: 35, earned: descriptionPoints, complete: descriptionPoints >= 35 },
    { id: "logo", label: "Logo", points: 4, earned: hasText(data.logoUrl) ? 4 : 0, complete: hasText(data.logoUrl) },
    { id: "hero", label: label("Imagem de capa", "Cover image"), points: 3, earned: hasText(data.heroImage) ? 3 : 0, complete: hasText(data.heroImage) },
    { id: "photos", label: label("Galeria de fotos", "Photo gallery"), progress: `${Math.min(photoCount, 2)}/2 ${english ? "photos" : "fotos"}`, points: 4, earned: Math.min(4, photoCount * 2), complete: photoCount >= 2 },
    { id: "phone", label: label("Telefone", "Phone"), points: 8, earned: hasText(data.phone) ? 8 : 0, complete: hasText(data.phone) },
    { id: "email", label: "E-mail", points: 8, earned: hasText(data.email) ? 8 : 0, complete: hasText(data.email) },
    { id: "website", label: "Website", points: 5, earned: hasText(data.website) ? 5 : 0, complete: hasText(data.website) },
    { id: "whatsapp", label: "WhatsApp", points: 5, earned: hasText(data.whatsapp) ? 5 : 0, complete: hasText(data.whatsapp) },
    { id: "social", label: label("Redes sociais", "Social media"), points: 4, earned: socialProvided ? 4 : 0, complete: socialProvided },
    { id: "keywords", label: label("Palavras-chave", "Keywords"), progress: `${Math.min(keywordCount, 2)}/2 ${english ? "keywords" : "palavras"}`, points: 2, earned: Math.min(2, keywordCount), complete: keywordCount >= 2 },
    { id: "hours", label: label("Horários de funcionamento", "Opening hours"), points: 6, earned: (data.openingHours || []).filter(Boolean).length > 0 ? 6 : 0, complete: (data.openingHours || []).filter(Boolean).length > 0 },
    { id: "attendance", label: label("Tipo de atendimento", "Service type"), points: 4, earned: hasText(data.attendanceType) ? 4 : 0, complete: hasText(data.attendanceType) },
  ];
}

export function getBusinessProfileScore(data: ProfileCompletenessData): number {
  return Math.min(100, getProfileScoreItems(data).reduce((total, item) => total + item.earned, 0));
}

export function getProfileScoreLabel(score: number, locale: SiteLocale = "pt-BR"): string {
  if (score >= 85) return locale === "en" ? "Excellent" : "Excelente";
  if (score >= 70) return locale === "en" ? "Complete" : "Completo";
  if (score >= 40) return locale === "en" ? "In progress" : "Em desenvolvimento";
  return locale === "en" ? "Getting started" : "Inicial";
}
