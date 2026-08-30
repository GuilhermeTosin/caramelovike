import type { BusinessFrontend } from "@/types/database";
import { stripRichTextHtml } from "@/lib/richText";
import { buildBusinessUrl } from "@/services/businesses";

export function hasEnglishBusinessTranslation(business: Pick<BusinessFrontend, "descriptionEn">): boolean {
  return Boolean(stripRichTextHtml(business.descriptionEn || "").trim());
}

export function buildEnglishBusinessUrl(business: BusinessFrontend): string {
  return `/en${buildBusinessUrl(business)}`;
}

export function buildBusinessUrlForLocale(business: BusinessFrontend, locale: "pt-BR" | "en"): string {
  return locale === "en" && hasEnglishBusinessTranslation(business)
    ? buildEnglishBusinessUrl(business)
    : buildBusinessUrl(business);
}

export function getEnglishBusinessContent(business: BusinessFrontend): BusinessFrontend {
  return {
    ...business,
    description: business.descriptionEn || business.description,
  };
}

export function getBusinessDescriptionForLocale(
  business: Pick<BusinessFrontend, "description" | "descriptionEn">,
  locale: "pt-BR" | "en",
): string {
  if (locale === "en") {
    // Use the optional translation when present; otherwise preserve the original user content.
    return business.descriptionEn || business.description || "";
  }
  return business.description || "";
}
