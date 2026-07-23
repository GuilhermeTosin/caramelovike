import { stripRichTextHtml } from "@/lib/richText";

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

function hasText(value?: string | null): boolean {
  return !!String(value || "").trim();
}

function countItems(data: ProfileCompletenessData): number {
  const serviceItems = (data.serviceItems || []).filter((item) => hasText(item?.name));
  const menuItems = (data.menu || []).filter((item) => hasText(item?.name));
  const legacyServices = (data.services || []).filter((item) => hasText(item));
  return Math.max(serviceItems.length, menuItems.length, legacyServices.length);
}

function countDetailedItems(data: ProfileCompletenessData): number {
  const items = [...(data.serviceItems || []), ...(data.menu || [])];
  return items.filter((item) => hasText(item?.name) && hasText(item?.description)).length;
}

function getDescriptionPoints(length: number): number {
  if (length === 0) return 0;
  if (length < 40) return 4;
  if (length < 120) return 12;
  if (length < 250) return 20;
  return 28;
}

export function getProfileScoreItems(data: ProfileCompletenessData): ProfileScoreItem[] {
  const descriptionLength = stripRichTextHtml(data.description || "").trim().length;
  const descriptionPoints = getDescriptionPoints(descriptionLength);
  const photoCount = (data.photos || []).filter(Boolean).length;
  const itemCount = countItems(data);
  const detailedItemCount = countDetailedItems(data);
  const keywordCount = (data.keywords || []).filter(hasText).length;
  const socialProvided = hasText(data.instagram) || hasText(data.facebook);

  return [
    { id: "location", label: "Localiza\u00e7\u00e3o", points: 4, earned: hasText(data.city) && hasText(data.stateCode) && hasText(data.countryCode) ? 4 : 0, complete: hasText(data.city) && hasText(data.stateCode) && hasText(data.countryCode) },
    { id: "category", label: "Categoria", points: 4, earned: hasText(data.category) ? 4 : 0, complete: hasText(data.category) },
    { id: "activity", label: "Atividade principal", points: 4, earned: hasText(data.primaryActivity) ? 4 : 0, complete: hasText(data.primaryActivity) },
    { id: "description", label: "Descri\u00e7\u00e3o detalhada", progress: `${descriptionLength}/250 caracteres`, points: 28, earned: descriptionPoints, complete: descriptionPoints >= 28 },
    { id: "logo", label: "Logo", points: 4, earned: hasText(data.logoUrl) ? 4 : 0, complete: hasText(data.logoUrl) },
    { id: "hero", label: "Imagem de capa", points: 3, earned: hasText(data.heroImage) ? 3 : 0, complete: hasText(data.heroImage) },
    { id: "photos", label: "Galeria de fotos", progress: `${Math.min(photoCount, 2)}/2 fotos`, points: 4, earned: Math.min(4, photoCount * 2), complete: photoCount >= 2 },
    { id: "phone", label: "Telefone", points: 8, earned: hasText(data.phone) ? 8 : 0, complete: hasText(data.phone) },
    { id: "email", label: "E-mail", points: 8, earned: hasText(data.email) ? 8 : 0, complete: hasText(data.email) },
    { id: "website", label: "Website", points: 5, earned: hasText(data.website) ? 5 : 0, complete: hasText(data.website) },
    { id: "whatsapp", label: "WhatsApp", points: 5, earned: hasText(data.whatsapp) ? 5 : 0, complete: hasText(data.whatsapp) },
    { id: "social", label: "Redes sociais", points: 4, earned: socialProvided ? 4 : 0, complete: socialProvided },
    { id: "offer", label: "Servi\u00e7os ou itens cadastrados", progress: `${Math.min(itemCount, 5)}/5 itens`, points: 5, earned: Math.min(5, itemCount), complete: itemCount >= 5 },
    { id: "offer-details", label: "Detalhes dos servi\u00e7os ou itens", progress: `${Math.min(detailedItemCount, 2)}/2 descri\u00e7\u00f5es`, points: 2, earned: Math.min(2, detailedItemCount), complete: detailedItemCount >= 2 },
    { id: "keywords", label: "Palavras-chave", progress: `${Math.min(keywordCount, 2)}/2 palavras`, points: 2, earned: Math.min(2, keywordCount), complete: keywordCount >= 2 },
    { id: "hours", label: "Hor\u00e1rios de funcionamento", points: 6, earned: (data.openingHours || []).filter(Boolean).length > 0 ? 6 : 0, complete: (data.openingHours || []).filter(Boolean).length > 0 },
    { id: "attendance", label: "Tipo de atendimento", points: 4, earned: hasText(data.attendanceType) ? 4 : 0, complete: hasText(data.attendanceType) },
  ];
}

export function getBusinessProfileScore(data: ProfileCompletenessData): number {
  return Math.min(100, getProfileScoreItems(data).reduce((total, item) => total + item.earned, 0));
}

export function getProfileScoreLabel(score: number): string {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Completo";
  if (score >= 40) return "Em desenvolvimento";
  return "Inicial";
}