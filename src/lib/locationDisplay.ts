import type { Locale } from "@/i18n/types";
import { getBrazilianPortugueseCityName, slugifyCity } from "../../shared/locationDisplay.js";

/**
 * Returns the Portuguese label used in the interface and canonical URLs.
 */
export function getCityDisplayName(
  city: string | null | undefined,
  countryCode?: string | null,
  locale: Locale = "pt-BR",
): string {
  const rawCity = (city || "").trim();
  if (!rawCity || locale !== "pt-BR") return rawCity;

  return getBrazilianPortugueseCityName(rawCity, countryCode);
}

export function getCanonicalCitySlug(
  city: string | null | undefined,
  countryCode?: string | null,
): string {
  const rawCity = (city || "").trim();
  if (!rawCity) return "";

  return slugifyCity(getCityDisplayName(rawCity, countryCode));
}
