import type { DirectoryPageSnapshot } from "@/lib/directorySnapshot";
import { getCountryDisplayName, type SiteLocale } from "@/lib/locales";

export type LocalizedDirectoryMeta = {
  heading: string;
  title: string;
  description: string;
};

function englishLocation(snapshot: DirectoryPageSnapshot) {
  const country = getCountryDisplayName(snapshot.route.countryCode, snapshot.labels.country, "en");
  return [snapshot.labels.city, snapshot.labels.state, country].filter(Boolean).join(", ");
}

export function getLocalizedDirectoryMeta(snapshot: DirectoryPageSnapshot, locale: SiteLocale): LocalizedDirectoryMeta {
  if (locale !== "en") return snapshot.pageMeta;

  const country = getCountryDisplayName(snapshot.route.countryCode, snapshot.labels.country, "en");
  const pageSuffix = snapshot.route.page > 1 ? ` - Page ${snapshot.route.page}` : "";
  const location = englishLocation(snapshot);

  if (snapshot.level === "countries") {
    return {
      heading: "Brazilian businesses abroad by country",
      title: `Brazilian businesses abroad by country${pageSuffix} | Caramelinho.com`,
      description: "Explore Brazilian businesses abroad by country, state and city on Caramelinho.",
    };
  }

  if (snapshot.level === "states") {
    const heading = `Brazilian businesses in ${country}`;
    return { heading, title: `${heading}${pageSuffix} | Caramelinho.com`, description: `Find Brazilian businesses, services and professionals in ${country}.` };
  }

  if (snapshot.level === "cities") {
    const heading = `Brazilian businesses in ${snapshot.labels.state}, ${country}`;
    return { heading, title: `${heading}${pageSuffix} | Caramelinho.com`, description: `Explore Brazilian businesses by city in ${snapshot.labels.state}, ${country}.` };
  }

  const heading = `Brazilian businesses in ${location}`;
  return {
    heading,
    title: `${heading}${pageSuffix} | Caramelinho.com`,
    description: `Find Brazilian businesses, services and professionals in ${location}. Browse contacts, opening hours and public business profiles.`,
  };
}

export function getLocalizedDirectoryIntro(snapshot: DirectoryPageSnapshot, locale: SiteLocale): string {
  if (locale !== "en") return "";

  const count = snapshot.insights?.totalBusinesses || snapshot.totalBusinesses;
  const location = englishLocation(snapshot);
  return `Browse ${count} ${count === 1 ? "Brazilian business" : "Brazilian businesses"} in ${location}.`;
}
