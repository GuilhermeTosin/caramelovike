import type { BusinessFrontend } from "@/types/database";
import { stripRichTextHtml } from "@/lib/richText";
import { getPrimaryActivityLabel, getPrimaryActivitySeoLabel } from "@/lib/businessActivities";
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

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getCategoryFallback(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  const category = cleanText(business.category).split("(")[0].trim();
  if (category) return category;
  return locale === "en" ? "Brazilian business" : "Neg\u00f3cio brasileiro";
}

function getBusinessSeoDescriptorForTitle(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  const category = getCategoryFallback(business, locale);
  const primaryActivity = getPrimaryActivitySeoLabel(
    business.categoryId,
    business.primaryActivity,
    business.primaryActivityCustom,
    locale,
  );
  return primaryActivity || category;
}

export function getBusinessSeoDescriptor(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  const category = getCategoryFallback(business, locale);
  const primaryActivity = getPrimaryActivityLabel(
    business.categoryId,
    business.primaryActivity,
    business.primaryActivityCustom,
  );
  return primaryActivity || category;
}

function getBusinessLocationPhrase(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  const city = cleanText(business.address?.city);
  if (business.attendanceType === "online" && !city) return "online";
  const state = cleanText(
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

export function buildBusinessSeoTitle(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  const name = cleanText(business.name) || (locale === "en" ? "Brazilian business" : "Neg\u00f3cio brasileiro");
  const descriptor = truncateText(getBusinessSeoDescriptorForTitle(business, locale), 60);
  const location = getBusinessLocationPhrase(business, locale);
  return name + " | " + descriptor + " " + location;
}

export function buildBusinessSeoDescription(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  const name = cleanText(business.name) || (locale === "en" ? "Brazilian business" : "Neg\u00f3cio brasileiro");
  const descriptor = truncateText(getBusinessSeoDescriptor(business, locale), 60);
  const location = getBusinessLocationPhrase(business, locale);
  const lead = name + ": " + descriptor + " " + location + ".";
  const sourceDescription = stripRichTextHtml(business.description || "");
  const suffix = locale === "en"
    ? " See services, reviews, photos, and contact information."
    : " Veja servi\u00e7os, avalia\u00e7\u00f5es, fotos e formas de contato.";
  return truncateText(lead + " " + sourceDescription + suffix, 170);
}
