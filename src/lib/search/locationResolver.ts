import type { BusinessFrontend } from "@/types/database";
import { calculateDistance } from "@/lib/utils/geo";
import { buildCityAliases, cityMatches, hasPreciseBusinessLocation, hasReliableBusinessLocation } from "@/lib/search/businessSearch";
import { geocodeAddress } from "@/lib/google-maps";
import { getCountryName } from "@/services/businesses";

export const CITY_ALIAS_GROUPS: string[][] = [
  ["montreal", "montreal city"],
  ["quebec", "cidade de quebec", "quebec city"],
  ["toronto"],
  ["vancouver"],
  ["calgary"],
  ["edmonton"],
  ["ottawa", "otava"],
  ["winnipeg"],
  ["halifax"],
  ["victoria"],
  ["new york", "nova york", "nyc"],
  ["los angeles", "la"],
  ["san francisco", "sao francisco"],
  ["washington", "washington dc"],
  ["miami"],
  ["orlando"],
  ["boston"],
  ["chicago"],
  ["seattle"],
  ["houston"],
  ["dallas"],
  ["las vegas"],
  ["philadelphia", "filadelfia"],
  ["mexico city", "cidade do mexico", "ciudad de mexico"],
  ["guadalajara"],
  ["monterrey"],
  ["tijuana"],
  ["sao paulo"],
  ["rio de janeiro"],
  ["belo horizonte"],
  ["brasilia"],
  ["curitiba"],
  ["porto alegre"],
  ["salvador"],
  ["recife"],
  ["fortaleza"],
  ["manaus"],
  ["bogota", "bogota d.c"],
  ["medellin"],
  ["cali"],
  ["buenos aires"],
  ["cordoba"],
  ["rosario"],
  ["santiago"],
  ["valparaiso"],
  ["lima"],
  ["arequipa"],
  ["quito"],
  ["guayaquil"],
  ["montevideo"],
  ["asuncion"],
  ["la paz"],
  ["santa cruz de la sierra", "santa cruz"],
  ["caracas"],
  ["london", "londres"],
  ["manchester"],
  ["birmingham"],
  ["dublin", "dublim"],
  ["lisbon", "lisboa"],
  ["porto", "oporto"],
  ["madrid"],
  ["barcelona"],
  ["seville", "sevilla", "sevilha"],
  ["valencia"],
  ["paris"],
  ["lyon"],
  ["marseille", "marselha"],
  ["brussels", "bruxelas", "brussel", "bruxelles"],
  ["amsterdam", "amsterda"],
  ["rotterdam", "rotterda"],
  ["berlin", "berlim"],
  ["munich", "munique", "muenchen"],
  ["frankfurt", "frankfurt am main"],
  ["hamburg", "hamburgo"],
  ["cologne", "koln", "colonia"],
  ["vienna", "viena", "wien"],
  ["zurich", "zuerich", "zurique"],
  ["geneva", "genebra"],
  ["rome", "roma"],
  ["milan", "milao", "milano"],
  ["naples", "napoli"],
  ["venice", "venezia", "veneza"],
  ["athens", "atenas"],
  ["thessaloniki", "salonica"],
  ["warsaw", "varsovia", "warszawa"],
  ["prague", "praga", "praha"],
  ["budapest", "budapeste"],
  ["bucharest", "bucareste", "bucuresti"],
  ["copenhagen", "copenhague", "kobenhavn"],
  ["stockholm", "estocolmo"],
  ["oslo"],
  ["helsinki", "helsinquia"],
  ["reykjavik", "reiquiavique"],
  ["moscow", "moscou", "moskva"],
  ["saint petersburg", "sao petersburgo", "sankt-peterburg"],
  ["istanbul", "istambul"],
  ["tokyo", "toquio"],
  ["edogawa city", "edogawa", "edogawa-ku"],
  ["kyoto", "quioto", "kyoto-shi"],
  ["osaka"],
  ["nagoya"],
  ["sapporo"],
  ["fukuoka"],
  ["hiroshima"],
  ["seoul", "seul"],
  ["busan", "pusan"],
  ["incheon"],
  ["beijing", "pequim"],
  ["shanghai", "xangai"],
  ["guangzhou", "cantao"],
  ["shenzhen"],
  ["hong kong", "hong kong sar"],
  ["macau", "macao", "macau sar"],
  ["taipei"],
  ["kaohsiung"],
  ["singapore", "singapura"],
  ["bangkok", "banguecoque"],
  ["kuala lumpur"],
  ["jakarta"],
  ["bali", "denpasar"],
  ["manila"],
  ["ho chi minh city", "cidade de ho chi minh", "saigon", "saigao"],
  ["hanoi"],
  ["phnom penh"],
  ["yangon", "rangum"],
  ["new delhi", "nova delhi", "delhi"],
  ["mumbai", "bombaim"],
  ["bangalore", "bengaluru"],
  ["chennai", "madras"],
  ["kolkata", "calcuta"],
  ["hyderabad"],
  ["karachi"],
  ["lahore"],
  ["islamabad"],
  ["dubai"],
  ["abu dhabi", "abu dabi"],
  ["doha"],
  ["riyadh", "riad"],
  ["jeddah", "jedah"],
  ["tel aviv", "tel avive"],
  ["jerusalem", "jerusalem"],
  ["tehran"],
  ["sydney", "sidney", "sidnei"],
  ["melbourne", "melburne"],
  ["brisbane"],
  ["perth"],
  ["adelaide"],
  ["auckland"],
  ["wellington"],
  ["christchurch"],
  ["cairo"],
  ["alexandria"],
  ["casablanca"],
  ["rabat"],
  ["marrakesh", "marrakech", "marraquexe"],
  ["algiers", "argel", "alger"],
  ["tunis"],
  ["lagos"],
  ["abuja"],
  ["nairobi"],
  ["addis ababa", "adis abeba"],
  ["johannesburg", "joanesburgo"],
  ["cape town", "cidade do cabo"],
  ["durban"],
  ["luanda"],
  ["maputo"],
  ["mirabel"],
  ["sainte-eustache", "sainte eustache"],
];

export const CITY_ALIASES: Record<string, string[]> = buildCityAliases(CITY_ALIAS_GROUPS);

export function getMatchingCityBusinesses(allBusinesses: BusinessFrontend[], cityText: string): BusinessFrontend[] {
  const term = cityText.trim();
  if (!term) return [];
  return allBusinesses.filter(
    (biz) =>
      hasReliableBusinessLocation(biz) &&
      hasPreciseBusinessLocation(biz) &&
      biz.attendanceType !== "online" &&
      cityMatches(biz.address.city || "", term, CITY_ALIASES) &&
      Number.isFinite(biz.address.lat) &&
      Number.isFinite(biz.address.lng)
  );
}

export function resolveLocationContextFromBusinesses(
  allBusinesses: BusinessFrontend[],
  cityText: string
): { coords: { lat: number; lng: number } | null; countryCode: string | null } {
  const matching = getMatchingCityBusinesses(allBusinesses, cityText);
  if (matching.length === 0) {
    return { coords: null, countryCode: null };
  }

  const coords = {
    lat: matching.reduce((sum, biz) => sum + biz.address.lat, 0) / matching.length,
    lng: matching.reduce((sum, biz) => sum + biz.address.lng, 0) / matching.length,
  };

  const countryCounts = matching.reduce((acc, biz) => {
    const cc = (biz.address.countryCode || "").toLowerCase();
    if (!cc) return acc;
    acc.set(cc, (acc.get(cc) || 0) + 1);
    return acc;
  }, new Map<string, number>());
  const countryCode = Array.from(countryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return { coords, countryCode };
}

export function inferNearestCityFromBusinesses(
  allBusinesses: BusinessFrontend[],
  coords: { lat: number; lng: number }
): string | null {
  const nearest = allBusinesses
    .filter((biz) => hasReliableBusinessLocation(biz) && hasPreciseBusinessLocation(biz) && !!biz.address?.city)
    .map((biz) => ({
      city: biz.address.city,
      distance: calculateDistance(coords.lat, coords.lng, biz.address.lat, biz.address.lng),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  return nearest?.city || null;
}

export async function geocodeLocationWithCountryFallback(
  locationText: string,
  preferredCountryCode?: string | null
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = locationText.trim();
  if (!trimmed) return null;

  const countryCode = (preferredCountryCode || "").toLowerCase().trim();
  const countryName = getCountryName(countryCode);
  const candidates = [
    trimmed,
    countryName ? `${trimmed}, ${countryName}` : "",
    countryCode ? `${trimmed}, ${countryCode.toUpperCase()}` : "",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const coords = await geocodeAddress(candidate);
    if (coords) return coords;
  }

  return null;
}
