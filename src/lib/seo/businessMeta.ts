import type { BusinessFrontend } from "@/types/database";
import { stripRichTextHtml } from "@/lib/richText";
import { getPrimaryActivityLabel, getPrimaryActivitySeoLabel } from "@/lib/businessActivities";
import { getCityDisplayName } from "@/lib/locationDisplay";
import { getStateDisplayName } from "@/services/businesses";

type BusinessSeoLocale = "pt-BR";
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
  const place = [city, state].filter(Boolean).join(", ") || "sua regi\u00e3o";
  return "em " + place;
}

function truncateText(value: string, maxLength: number): string {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, maxLength - 3).trimEnd();
  const lastSpace = shortened.lastIndexOf(" ");
  const readable = lastSpace > maxLength * 0.7 ? shortened.slice(0, lastSpace) : shortened;
  return readable + "...";
}

export function buildBusinessSeoTitle(business: BusinessSeoInput, _locale: BusinessSeoLocale = "pt-BR"): string {
  const name = cleanText(business.name) || "Neg\u00f3cio brasileiro";
  const descriptor = truncateText(getBusinessSeoDescriptorForTitle(business), 60);
  const location = getBusinessLocationPhrase(business);
  return name + " | " + descriptor + " " + location;
}

export function buildBusinessSeoDescription(business: BusinessSeoInput, _locale: BusinessSeoLocale = "pt-BR"): string {
  const name = cleanText(business.name) || "Neg\u00f3cio brasileiro";
  const descriptor = truncateText(getBusinessSeoDescriptor(business), 60);
  const location = getBusinessLocationPhrase(business);
  const lead = name + ": " + descriptor + " " + location + ".";
  const sourceDescription = stripRichTextHtml(business.description || "");
  return truncateText(lead + " " + sourceDescription + " Veja servi\u00e7os, avalia\u00e7\u00f5es, fotos e formas de contato.", 170);
}
