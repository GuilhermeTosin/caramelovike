import type { BusinessFrontend } from "@/types/database";
import { stripRichTextHtml } from "@/lib/richText";
import { getPrimaryActivityLabel, getPrimaryActivitySeoLabel } from "@/lib/businessActivities";
import { getCityDisplayName } from "@/lib/locationDisplay";
import { getStateDisplayName } from "@/services/businesses";

type BusinessSeoLocale = "pt-BR" | "en";
type BusinessSeoInput = Pick<
  BusinessFrontend,
  | "name"
  | "categoryId"
  | "category"
  | "primaryActivity"
  | "primaryActivityCustom"
  | "description"
  | "address"
  | "attendanceType"
>;

const ENGLISH_CATEGORY_FALLBACKS: Record<string, string> = {
  food: "Brazilian restaurants and food",
  auto: "Brazilian automotive services",
  health_beauty: "Brazilian health and beauty services",
  construction: "Brazilian construction and renovation services",
  legal_consulting: "Brazilian legal and consulting services",
  accounting_finance: "Brazilian accounting and finance services",
  education: "Brazilian education and language services",
  retail: "Brazilian retail",
  transport_moving: "Brazilian transport and moving services",
  pets: "Brazilian pet services",
  child_elder_care: "Brazilian child and elder care",
  cleaning: "Brazilian cleaning services",
  real_estate: "Brazilian real estate services",
  tourism: "Brazilian tourism and travel services",
  artists: "Brazilian artists",
  other: "Brazilian business",
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getCategoryFallback(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  if (locale === "en") return ENGLISH_CATEGORY_FALLBACKS[business.categoryId] || "Brazilian business";
  const category = cleanText(business.category).split("(")[0].trim();
  return category || "Neg\u00f3cio brasileiro";
}

function getBusinessSeoDescriptorForTitle(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  return getPrimaryActivitySeoLabel(
    business.categoryId,
    business.primaryActivity,
    business.primaryActivityCustom,
    locale,
  ) || getCategoryFallback(business, locale);
}

export function getBusinessSeoDescriptor(business: BusinessSeoInput, locale: BusinessSeoLocale = "pt-BR"): string {
  return getPrimaryActivityLabel(
    business.categoryId,
    business.primaryActivity,
    business.primaryActivityCustom,
    locale,
  ) || getCategoryFallback(business, locale);
}

function getBusinessLocationPhrase(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  const city = locale === "en"
    ? cleanText(business.address?.cityDisplayName || business.address?.city)
    : getCityDisplayName(
      cleanText(business.address?.cityDisplayName || business.address?.city),
      business.address?.countryCode || business.address?.country,
    );
  if (business.attendanceType === "online" && !city) return "online";

  const state = locale === "en"
    ? cleanText(business.address?.state)
    : cleanText(
      getStateDisplayName(
        business.address?.countryCode,
        business.address?.stateCode,
        business.address?.state,
      ),
    );
  const place = [city, state].filter(Boolean).join(", ") || (locale === "en" ? "your area" : "sua regi\u00e3o");
  return (locale === "en" ? "in " : "em ") + place;
}

function truncateText(value: string, maxLength: number): string {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, maxLength - 3).trimEnd();
  const lastSpace = shortened.lastIndexOf(" ");
  const readable = lastSpace > maxLength * 0.7 ? shortened.slice(0, lastSpace) : shortened;
  return readable + "...";
}

export function buildBusinessSeoTitle(business: BusinessSeoInput, locale: BusinessSeoLocale = "pt-BR"): string {
  const name = cleanText(business.name) || (locale === "en" ? "Brazilian business" : "Neg\u00f3cio brasileiro");
  const descriptor = truncateText(getBusinessSeoDescriptorForTitle(business, locale), 60);
  const location = getBusinessLocationPhrase(business, locale);
  return name + " | " + descriptor + " " + location;
}

export function buildBusinessSeoDescription(business: BusinessSeoInput, locale: BusinessSeoLocale = "pt-BR"): string {
  const name = cleanText(business.name) || (locale === "en" ? "Brazilian business" : "Neg\u00f3cio brasileiro");
  const descriptor = truncateText(getBusinessSeoDescriptor(business, locale), 60);
  const location = getBusinessLocationPhrase(business, locale);
  const lead = name + ": " + descriptor + " " + location + ".";
  const sourceDescription = stripRichTextHtml(business.description || "");
  const suffix = locale === "en"
    ? "See services, reviews, photos, and contact details."
    : "Veja servi\u00e7os, avalia\u00e7\u00f5es, fotos e formas de contato.";
  return truncateText(lead + " " + sourceDescription + " " + suffix, 170);
}