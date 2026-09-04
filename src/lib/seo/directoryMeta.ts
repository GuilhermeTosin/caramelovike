import { getCanonicalCitySlug, getCityDisplayName } from "@/lib/locationDisplay";
import {
  DIRECTORY_CATEGORY_MINIMUM_BUSINESSES,
  getDirectoryCategoryBusinesses,
  getDirectoryCategoryBySlug,
} from "@/lib/directoryCategories";
import { getCountryName, getStateDisplayName, slugify } from "@/services/businesses";
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

function findDirectoryLabels(businesses: BusinessFrontend[], countryCode: string, stateCode: string, citySlug: string) {
  let state = "";
  let city = "";

  for (const business of businesses) {
    if (normalizeCode(business.address.countryCode) !== countryCode) continue;
    if (stateCode && normalizeCode(business.address.stateCode) === stateCode) {
      state = preferStateLabel(state, getStateDisplayName(countryCode, stateCode, business.address.state), stateCode);
      const businessCity = business.address.cityDisplayName || business.address.city;
      const businessCitySlug = getCanonicalCitySlug(businessCity, countryCode) || business.address.citySlug;
      if (citySlug && businessCitySlug === citySlug) city = getCityDisplayName(businessCity, countryCode) || city;
    }
  }

  return {
    country: getCountryName(countryCode) || countryCode.toUpperCase(),
    state: state || getStateDisplayName(countryCode, stateCode),
    city: city || titleCaseFromSlug(citySlug),
  };
}

function getCountryLocation(countryCode: string, countryName: string) {
  return (COUNTRY_PREPOSITIONS_PT_BR[countryCode] || "em") + " " + countryName;
}

function getPageNumber(parts: string[]) {
  const pageMarkerIndex = parts.indexOf("pagina");
  if (pageMarkerIndex < 0) return 1;
  const parsedPage = Number(parts[pageMarkerIndex + 1]);
  return Number.isFinite(parsedPage) && parsedPage > 1 ? Math.floor(parsedPage) : 1;
}

function addPageToDescription(description: string, pageNumber: number) {
  return pageNumber <= 1 ? description : description + " P\u00e1gina " + pageNumber + " do diret\u00f3rio.";
}

function getCityLocation(labels: { city: string; state: string; country: string }) {
  const city = labels.city.trim();
  const state = labels.state.trim();
  const country = labels.country.trim();
  const sameCityAndState = city && state && slugify(city) === slugify(state);
  return [city, sameCityAndState ? "" : state, country].filter(Boolean).join(", ");
}

export function getDirectoryPageMeta(urlOriginal: string | undefined, businesses: BusinessFrontend[] = []): DirectoryPageMeta | null {
  const pathname = new URL(urlOriginal || "/", "https://www.caramelinho.com").pathname;
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "negocios") return null;

  const countryCode = normalizeCode(parts[1]);
  const stateCode = normalizeCode(parts[2]);
  const citySlug = slugify(parts[3] || "");
  const categorySlug = parts[4] && parts[4] !== "pagina" ? slugify(parts[4]) : "";
  const category = getDirectoryCategoryBySlug(categorySlug);
  const pageNumber = getPageNumber(parts);
  const pageSuffix = pageNumber > 1 ? " - P\u00e1gina " + pageNumber : "";

  if (!countryCode) {
    const heading = "Neg\u00f3cios brasileiros no exterior por pa\u00eds";
    const description = "Encontre neg\u00f3cios brasileiros no exterior por pa\u00eds, estado e cidade. Descubra empresas, profissionais, restaurantes, lojas e servi\u00e7os da comunidade brasileira.";
    return { heading, title: heading + pageSuffix + " | Caramelinho.com", description: addPageToDescription(description, pageNumber) };
  }

  const labels = findDirectoryLabels(businesses, countryCode, stateCode, citySlug);
  const countryLocation = getCountryLocation(countryCode, labels.country);
  const countryBusinesses = businesses.filter((business) => normalizeCode(business.address.countryCode) === countryCode);
  const stateBusinesses = stateCode
    ? countryBusinesses.filter((business) => normalizeCode(business.address.stateCode) === stateCode)
    : countryBusinesses;
  const cityBusinesses = citySlug
    ? stateBusinesses.filter((business) => {
      const businessCity = business.address.cityDisplayName || business.address.city;
      return (getCanonicalCitySlug(businessCity, countryCode) || business.address.citySlug) === citySlug;
    })
    : stateBusinesses;
  const stateCount = new Set(countryBusinesses.map((business) => normalizeCode(business.address.stateCode)).filter(Boolean)).size;
  const cityCount = new Set(stateBusinesses.map((business) => {
    const businessCity = business.address.cityDisplayName || business.address.city;
    return getCanonicalCitySlug(businessCity, countryCode) || business.address.citySlug;
  }).filter(Boolean)).size;

  if (!stateCode) {
    const heading = "Neg\u00f3cios brasileiros " + countryLocation;
    const description = "Consulte " + countryBusinesses.length + " neg\u00f3cios brasileiros " + countryLocation + ", distribu\u00eddos em " + stateCount + " " + (stateCount === 1 ? "estado ou regi\u00e3o" : "estados e regi\u00f5es") + ". Explore empresas, profissionais, restaurantes, lojas e servi\u00e7os com atendimento \u00e0 comunidade brasileira.";
    return { heading, title: heading + pageSuffix + " | Caramelinho.com", description: addPageToDescription(description, pageNumber) };
  }

  if (!citySlug) {
    const heading = "Neg\u00f3cios brasileiros em " + labels.state + ", " + labels.country;
    const description = "Consulte " + stateBusinesses.length + " neg\u00f3cios brasileiros em " + labels.state + ", " + labels.country + ", presentes em " + cityCount + " " + (cityCount === 1 ? "cidade" : "cidades") + ". Veja empresas, profissionais, restaurantes, lojas e servi\u00e7os da comunidade brasileira.";
    return { heading, title: heading + pageSuffix + " | Caramelinho.com", description: addPageToDescription(description, pageNumber) };
  }

  const cityLocation = getCityLocation(labels);
  if (category) {
    const categoryBusinesses = getDirectoryCategoryBusinesses(businesses, countryCode, stateCode, citySlug, category);
    const categoryName = category.label.toLocaleLowerCase("pt-BR");
    const countText = categoryBusinesses.length >= DIRECTORY_CATEGORY_MINIMUM_BUSINESSES
      ? categoryBusinesses.length + " " + categoryName
      : categoryName;
    const heading = category.label + " em " + cityLocation;
    const description = "Encontre " + countText + " em " + cityLocation + ". Consulte endere\u00e7os, hor\u00e1rios, contatos e avalia\u00e7\u00f5es de neg\u00f3cios brasileiros.";
    return { heading, title: heading + pageSuffix + " | Caramelinho.com", description: addPageToDescription(description, pageNumber) };
  }

  const heading = "Neg\u00f3cios brasileiros em " + cityLocation;
  const description = "Consulte " + cityBusinesses.length + " " + (cityBusinesses.length === 1 ? "neg\u00f3cio brasileiro" : "neg\u00f3cios brasileiros") + " em " + cityLocation + ". Veja empresas, profissionais, restaurantes, lojas, servi\u00e7os, contatos e avalia\u00e7\u00f5es.";
  return { heading, title: heading + pageSuffix + " | Caramelinho.com", description: addPageToDescription(description, pageNumber) };
}
