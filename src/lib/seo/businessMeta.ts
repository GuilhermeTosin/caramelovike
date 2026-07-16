import type { BusinessFrontend } from "@/types/database";
import { stripRichTextHtml } from "@/lib/richText";

type BusinessSeoLocale = "pt-BR" | "en";
type BusinessSeoInput = Pick<
  BusinessFrontend,
  "name" | "category" | "services" | "keywords" | "description" | "address" | "attendanceType"
>;

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCategoryFallback(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  const category = cleanText(business.category).split("(")[0].trim();
  if (category) return category;
  return locale === "en" ? "Brazilian business" : "Negócio brasileiro";
}

export function getBusinessSeoDescriptor(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  const category = getCategoryFallback(business, locale);
  const categoryKey = normalizeForComparison(category);
  const genericTerms = new Set(["cachorro", "cachorros", "cao", "caes", "dog", "dogs", "pet", "pets"]);
  const candidates = [...(business.services || []), ...(business.keywords || [])]
    .map(cleanText)
    .filter((value) => value.length > 1)
    .filter((value) => normalizeForComparison(value) !== categoryKey)
    .filter((value) => !genericTerms.has(normalizeForComparison(value)));

  return candidates[0] || category;
}

function getBusinessLocationPhrase(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  if (business.attendanceType === "online") return "online";

  const city = cleanText(business.address?.city);
  const place = city || (locale === "en" ? "your area" : "sua região");
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
  const name = cleanText(business.name) || (locale === "en" ? "Brazilian business" : "Negócio brasileiro");
  const descriptor = truncateText(getBusinessSeoDescriptor(business, locale), 60);
  const location = getBusinessLocationPhrase(business, locale);
  return name + " | " + descriptor + " " + location + " - Caramelinho.com";
}

export function buildBusinessSeoDescription(business: BusinessSeoInput, locale: BusinessSeoLocale): string {
  const name = cleanText(business.name) || (locale === "en" ? "Brazilian business" : "Negócio brasileiro");
  const descriptor = truncateText(getBusinessSeoDescriptor(business, locale), 60);
  const location = getBusinessLocationPhrase(business, locale);
  const lead = name + ": " + descriptor + " " + location + ".";
  const sourceDescription = stripRichTextHtml(business.description || "");
  const suffix = locale === "en"
    ? " See services, reviews, photos, and contact information."
    : " Veja serviços, avaliações, fotos e formas de contato.";

  return truncateText(lead + " " + sourceDescription + suffix, 170);
}
