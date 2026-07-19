import type { Locale } from "@/i18n/types";

// Display-only aliases for well-established Portuguese city names. Stored values and URLs stay untouched.
const PT_BR_CITY_EXONYMS: Record<string, Record<string, string>> = {
  at: { vienna: "Viena", wien: "Viena" },
  be: { antwerp: "Antu\u00e9rpia", antwerpen: "Antu\u00e9rpia", brussels: "Bruxelas", bruxelles: "Bruxelas" },
  ch: { geneva: "Genebra", geneve: "Genebra", genf: "Genebra", zurich: "Zurique" },
  cn: { beijing: "Pequim" },
  cz: { prague: "Praga", praha: "Praga" },
  de: {
    cologne: "Col\u00f4nia",
    koln: "Col\u00f4nia",
    munich: "Munique",
    munchen: "Munique",
    nuremberg: "Nurembergue",
    nurnberg: "Nurembergue",
  },
  dk: { copenhagen: "Copenhague", kobenhavn: "Copenhague" },
  es: { seville: "Sevilha", sevilla: "Sevilha" },
  fi: { helsinki: "Helsinque" },
  fr: { marseille: "Marselha", marseilles: "Marselha" },
  gb: { london: "Londres" },
  gr: { athens: "Atenas", athina: "Atenas" },
  hu: { budapest: "Budapeste" },
  ie: { dublin: "Dublim" },
  it: {
    florence: "Floren\u00e7a",
    firenze: "Floren\u00e7a",
    milan: "Mil\u00e3o",
    milano: "Mil\u00e3o",
    rome: "Roma",
    roma: "Roma",
    turin: "Turim",
    torino: "Turim",
    venice: "Veneza",
    venezia: "Veneza",
  },
  jp: { kyoto: "Quioto", tokyo: "T\u00f3quio", "tokyo to": "T\u00f3quio" },
  kr: { seoul: "Seul" },
  nl: { "the hague": "Haia", "den haag": "Haia" },
  pl: { warsaw: "Vars\u00f3via", warszawa: "Vars\u00f3via" },
  ro: { bucharest: "Bucareste", bucuresti: "Bucareste" },
  ru: { moscow: "Moscou", moskva: "Moscou" },
  se: { stockholm: "Estocolmo" },
  tr: { istanbul: "Istambul" },
  us: { "new york": "Nova York", "new york city": "Nova York" },
};

// Keep the historical URL slug when Google returns the Portuguese exonym for a new record.
const CITY_URL_SLUG_ALIASES: Record<string, Record<string, string>> = {
  de: {
    colonia: "cologne",
    cologne: "cologne",
    munich: "munich",
    munique: "munich",
    munchen: "munich",
    nuremberg: "nuremberg",
    nurembergue: "nuremberg",
    nurnberg: "nuremberg",
  },
  gb: { london: "london", londres: "london" },
  it: {
    florenca: "florence",
    florence: "florence",
    milao: "milan",
    milan: "milan",
    roma: "rome",
    rome: "rome",
    turim: "turin",
    turin: "turin",
    veneza: "venice",
    venice: "venice",
  },
  jp: { kyoto: "kyoto", quioto: "kyoto", toquio: "tokyo", tokyo: "tokyo", "tokyo to": "tokyo" },
  us: { "new york": "new-york", "nova york": "new-york" },
};

function normalizeCityKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugifyCity(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Returns a Portuguese display name without changing the canonical city value
 * used by addresses, filters, slugs, and URLs.
 */
export function getCityDisplayName(
  city: string | null | undefined,
  countryCode?: string | null,
  locale: Locale = "pt-BR",
): string {
  const rawCity = (city || "").trim();
  if (!rawCity || locale !== "pt-BR") return rawCity;

  const normalizedCountry = (countryCode || "").trim().toLowerCase();
  const alias = PT_BR_CITY_EXONYMS[normalizedCountry]?.[normalizeCityKey(rawCity)];
  return alias || rawCity;
}

export function getCanonicalCitySlug(
  city: string | null | undefined,
  countryCode?: string | null,
): string {
  const rawCity = (city || "").trim();
  if (!rawCity) return "";

  const normalizedCountry = (countryCode || "").trim().toLowerCase();
  const alias = CITY_URL_SLUG_ALIASES[normalizedCountry]?.[normalizeCityKey(rawCity)];
  return alias || slugifyCity(rawCity);
}
