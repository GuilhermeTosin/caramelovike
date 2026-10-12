import type { BusinessFrontend } from "@/types/database";
import { stripRichTextHtml } from "@/lib/richText";
import { getPrimaryActivityLabel, getPrimaryActivitySeoLabel } from "@/lib/businessActivities";
import { getCityDisplayName } from "@/lib/locationDisplay";
import { getStateDisplayName } from "@/services/businesses";

export type BusinessSeoInput = Pick<
  BusinessFrontend,
  | "name"
  | "categoryId"
  | "category"
  | "primaryActivity"
  | "primaryActivityCustom"
  | "description"
  | "attendanceType"
> & {
  address: Pick<BusinessFrontend["address"], "city" | "state" | "country" | "countryCode" | "stateCode"> &
    Partial<Pick<BusinessFrontend["address"], "citySlug" | "cityDisplayName" | "street" | "postalCode" | "lat" | "lng">>;
};


function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getCategoryFallback(business: BusinessSeoInput): string {

  const category = cleanText(business.category).split("(")[0].trim();
  return category || "Neg\u00f3cio brasileiro";
}

function getBusinessSeoDescriptorForTitle(business: BusinessSeoInput): string {
  return getPrimaryActivitySeoLabel(
    business.categoryId,
    business.primaryActivity,
    business.primaryActivityCustom,
  ) || getCategoryFallback(business);
}

export function getBusinessSeoDescriptor(business: BusinessSeoInput): string {
  return getPrimaryActivityLabel(
    business.categoryId,
    business.primaryActivity,
    business.primaryActivityCustom,
  ) || getCategoryFallback(business);
}

function getBusinessLocationPhrase(business: BusinessSeoInput): string {
  const city = getCityDisplayName(
      cleanText(business.address?.cityDisplayName || business.address?.city),
      business.address?.countryCode || business.address?.country,
    );
  if (business.attendanceType === "online" && !city) return "online";

  const state = cleanText(
      getStateDisplayName(
        business.address?.countryCode,
        business.address?.stateCode,
        business.address?.state,
      ),
    );
  const place = [city, state].filter(Boolean).join(", ") || ("sua regi\u00e3o");
  return ("em ") + place;
}

function truncateText(value: string, maxLength: number): string {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, maxLength - 3).trimEnd();
  const lastSpace = shortened.lastIndexOf(" ");
  const readable = lastSpace > maxLength * 0.7 ? shortened.slice(0, lastSpace) : shortened;
  return readable + "...";
}

function truncatePhrase(value: string, maxLength: number): string {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;

  const shortened = text.slice(0, maxLength);
  const lastSpace = shortened.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.6 ? shortened.slice(0, lastSpace) : shortened)
    .replace(/[\s,:;–—-]+$/u, "");
}

function fitMetaDescriptionText(value: string, maxLength: number): string {
  const text = cleanText(value);
  if (!text || maxLength < 2) return "";
  if (text.length <= maxLength) {
    if (/[.!?]$/u.test(text)) return text;
    if (text.length < maxLength) return `${text.replace(/[\s,:;–—-]+$/u, "")}.`;
  }

  let lastSentenceEnd = -1;
  for (const match of text.slice(0, maxLength).matchAll(/[.!?](?=\s|$)/gu)) {
    lastSentenceEnd = (match.index ?? -1) + 1;
  }
  if (lastSentenceEnd > 0) return text.slice(0, lastSentenceEnd).trim();

  const shortened = text.slice(0, maxLength - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  const completeWords = lastSpace > 0 ? shortened.slice(0, lastSpace) : shortened;
  const withoutDanglingWords = completeWords
    .replace(/\s+(?:a|as|o|os|um|uma|uns|umas|de|do|da|dos|das|em|no|na|nos|nas|por|para|com|e|ou|que|and|or|the|a|an|of|in|on|by|for|to)$/iu, "")
    .replace(/[\s,;:–—-]+$/u, "");
  return withoutDanglingWords ? `${withoutDanglingWords}.` : "";
}

export function buildFallbackBusinessSeoMeta(citySegment = "") {
  let decodedCity = citySegment;
  try {
    decodedCity = decodeURIComponent(citySegment);
  } catch {
    // Keep the raw route segment if it contains malformed URI encoding.
  }
  const city = decodedCity
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1))
    .join(" ");

  if (!city) {
    return {
      title: "Negócio brasileiro",
      description: "Encontre informações de contato, avaliações e detalhes sobre negócios brasileiros no exterior.",
    };
  }

  return {
    title: `Negócio brasileiro em ${city}`,
    description: `Encontre informações de contato, avaliações e detalhes sobre negócios brasileiros em ${city}.`,
  };
}

export function buildBusinessSeoTitle(business: BusinessSeoInput): string {
  const name = cleanText(business.name) || ("Neg\u00f3cio brasileiro");
  const descriptor = truncateText(getBusinessSeoDescriptorForTitle(business), 60);
  const location = getBusinessLocationPhrase(business);
  return name + " | " + descriptor + " " + location;
}

export function buildBusinessSeoDescription(business: BusinessSeoInput): string {
  const name = cleanText(business.name) || ("Neg\u00f3cio brasileiro");
  const descriptor = truncatePhrase(getBusinessSeoDescriptor(business), 60);
  const location = getBusinessLocationPhrase(business);
  const lead = name + ": " + descriptor + " " + location + ".";
  const sourceDescription = stripRichTextHtml(business.description || "");
  const fallback = "Veja serviços, avaliações, fotos e formas de contato.";
  const details = sourceDescription || fallback;
  const maxLength = 160;
  const fittedLead = fitMetaDescriptionText(lead, maxLength);
  const remainingLength = maxLength - fittedLead.length - 1;
  if (remainingLength < 2) return fittedLead;

  const fittedDetails = fitMetaDescriptionText(details, remainingLength);
  return fittedDetails ? `${fittedLead} ${fittedDetails}` : fittedLead;
}
