import type { Locale } from "@/i18n/types";
import { stripLocalePrefix } from "@/i18n/routing";
import { getCountryName, getStateDisplayName } from "@/services/businesses";
import type { BusinessFrontend } from "@/types/database";

export type DirectoryPageMeta = {
  title: string;
  description: string;
  heading: string;
};

const COUNTRY_PREPOSITIONS_PT_BR: Record<string, string> = {
  au: "na",
  br: "no",
  ca: "no",
  de: "na",
  gb: "no",
  jp: "no",
  pt: "em",
  us: "nos",
};

function normalizeCode(value?: string) {
  return (value || "").trim().toLowerCase();
}

function slugifyMetaPart(value: string) {
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

function titleCaseFromSlug(value: string) {
  let decodedValue = value;
  try {
    decodedValue = decodeURIComponent(value);
  } catch {
    // Keep the original route segment when it contains invalid URL encoding.
  }

  return decodedValue
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isCodeLikeStateLabel(value: string, stateCode: string) {
  return !!value && !!stateCode && value.trim().toLowerCase() === stateCode.trim().toLowerCase();
}

function preferStateLabel(current: string, candidate: string, stateCode: string) {
  const currentLabel = current.trim();
  const candidateLabel = candidate.trim();
  if (!candidateLabel) return currentLabel;
  if (!currentLabel) return candidateLabel;

  const currentIsCode = isCodeLikeStateLabel(currentLabel, stateCode);
  const candidateIsCode = isCodeLikeStateLabel(candidateLabel, stateCode);
  if (currentIsCode && !candidateIsCode) return candidateLabel;
  if (!currentIsCode && candidateIsCode) return currentLabel;
  return candidateLabel.length > currentLabel.length && !candidateIsCode ? candidateLabel : currentLabel;
}

function findDirectoryLabels(
  businesses: BusinessFrontend[],
  countryCode: string,
  stateCode: string,
  citySlug: string,
) {
  let state = "";
  let city = "";

  for (const business of businesses) {
    if (normalizeCode(business.address.countryCode) !== countryCode) continue;
    if (stateCode && normalizeCode(business.address.stateCode) === stateCode) {
      state = preferStateLabel(
        state,
        getStateDisplayName(countryCode, stateCode, business.address.state),
        stateCode,
      );

      if (citySlug && slugifyMetaPart(business.address.city || "") === citySlug) {
        city = business.address.city || city;
      }
    }
  }

  return {
    country: getCountryName(countryCode) || countryCode.toUpperCase(),
    state: state || getStateDisplayName(countryCode, stateCode),
    city: city || titleCaseFromSlug(citySlug),
  };
}

function getCountryLocation(countryCode: string, countryName: string, locale: Locale) {
  if (locale === "en") return `in ${countryName}`;
  const preposition = COUNTRY_PREPOSITIONS_PT_BR[countryCode] || "em";
  return `${preposition} ${countryName}`;
}

function getPageNumber(parts: string[]) {
  if (parts[4] !== "pagina") return 1;
  const parsedPage = Number(parts[5]);
  return Number.isFinite(parsedPage) && parsedPage > 1 ? Math.floor(parsedPage) : 1;
}

function addPageToDescription(description: string, pageNumber: number, locale: Locale) {
  if (pageNumber <= 1) return description;
  return `${description} ${locale === "en" ? `Directory page ${pageNumber}.` : `P\u00e1gina ${pageNumber} do diret\u00f3rio.`}`;
}

export function getDirectoryPageMeta(
  urlOriginal: string | undefined,
  businesses: BusinessFrontend[] = [],
  locale: Locale = "pt-BR",
): DirectoryPageMeta | null {
  const pathname = stripLocalePrefix(new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname);
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "negocios") return null;

  const countryCode = normalizeCode(parts[1]);
  const stateCode = normalizeCode(parts[2]);
  const citySlug = slugifyMetaPart(parts[3] || "");
  const pageNumber = getPageNumber(parts);
  const pageSuffix = pageNumber > 1 ? ` - ${locale === "en" ? "Page" : "P\u00e1gina"} ${pageNumber}` : "";

  if (!countryCode) {
    const heading = locale === "en" ? "Brazilian businesses abroad by country" : "Neg\u00f3cios brasileiros no exterior por pa\u00eds";
    const description = locale === "en"
      ? "Find Brazilian businesses abroad by country, state, and city. Discover companies, professionals, restaurants, stores, and services from the Brazilian community."
      : "Encontre neg\u00f3cios brasileiros no exterior por pa\u00eds, estado e cidade. Descubra empresas, profissionais, restaurantes, lojas e servi\u00e7os da comunidade brasileira.";
    return {
      heading,
      title: `${heading}${pageSuffix} | Caramelinho.com`,
      description: addPageToDescription(description, pageNumber, locale),
    };
  }

  const labels = findDirectoryLabels(businesses, countryCode, stateCode, citySlug);
  const countryLocation = getCountryLocation(countryCode, labels.country, locale);

  if (!stateCode) {
    const heading = locale === "en"
      ? `Brazilian businesses ${countryLocation}`
      : `Neg\u00f3cios brasileiros ${countryLocation}`;
    const description = locale === "en"
      ? `Find Brazilian businesses ${countryLocation}. Browse states and cities and discover companies, professionals, restaurants, stores, and services.`
      : `Encontre neg\u00f3cios brasileiros ${countryLocation}. Navegue por estados e cidades e descubra empresas, profissionais, restaurantes, lojas e servi\u00e7os brasileiros.`;
    return {
      heading,
      title: `${heading}${pageSuffix} | Caramelinho.com`,
      description: addPageToDescription(description, pageNumber, locale),
    };
  }

  if (!citySlug) {
    const heading = locale === "en"
      ? `Brazilian businesses in ${labels.state}, ${labels.country}`
      : `Neg\u00f3cios brasileiros em ${labels.state}, ${labels.country}`;
    const description = locale === "en"
      ? `Find Brazilian businesses in ${labels.state}, ${labels.country}. Explore cities with companies, professionals, restaurants, stores, and services from the Brazilian community.`
      : `Encontre neg\u00f3cios brasileiros em ${labels.state}, ${labels.country}. Explore cidades com empresas, profissionais, restaurantes, lojas e servi\u00e7os da comunidade brasileira.`;
    return {
      heading,
      title: `${heading}${pageSuffix} | Caramelinho.com`,
      description: addPageToDescription(description, pageNumber, locale),
    };
  }

  const heading = locale === "en"
    ? `Brazilian businesses in ${labels.city}, ${labels.state}, ${labels.country}`
    : `Neg\u00f3cios brasileiros em ${labels.city}, ${labels.state}, ${labels.country}`;
  const description = locale === "en"
    ? `Find Brazilian businesses in ${labels.city}, ${labels.state}, ${labels.country}. See companies, professionals, restaurants, stores, services, contacts, and reviews.`
    : `Encontre neg\u00f3cios brasileiros em ${labels.city}, ${labels.state}, ${labels.country}. Veja empresas, profissionais, restaurantes, lojas, servi\u00e7os, contatos e avalia\u00e7\u00f5es.`;
  return {
    heading,
    title: `${heading}${pageSuffix} | Caramelinho.com`,
    description: addPageToDescription(description, pageNumber, locale),
  };
}
