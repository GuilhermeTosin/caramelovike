// Shared by the browser bundle and Vercel API routes so canonical location URLs stay identical.
export const CITY_EXONYMS = {
  at: { vienna: "Viena", wien: "Viena" },
  be: { antwerp: "Antu\u00e9rpia", antwerpen: "Antu\u00e9rpia", brussels: "Bruxelas", bruxelles: "Bruxelas" },
  ch: { geneva: "Genebra", geneve: "Genebra", genf: "Genebra", zurich: "Zurique" },
  cn: { beijing: "Pequim" },
  cz: { prague: "Praga", praha: "Praga" },
  de: {
    berlin: "Berlim", cologne: "Col\u00f4nia", koln: "Col\u00f4nia", munich: "Munique", munchen: "Munique",
    nuremberg: "Nurembergue", nurnberg: "Nurembergue",
  },
  dk: { copenhagen: "Copenhague", kobenhavn: "Copenhague" },
  es: { seville: "Sevilha", sevilla: "Sevilha" },
  fi: { helsinki: "Helsinque" },
  fr: { marseille: "Marselha", marseilles: "Marselha", versailles: "Versalhes" },
  gb: { london: "Londres" },
  gr: { athens: "Atenas", athina: "Atenas" },
  hu: { budapest: "Budapeste" },
  ie: { dublin: "Dublim" },
  it: {
    florence: "Floren\u00e7a", firenze: "Floren\u00e7a", milan: "Mil\u00e3o", milano: "Mil\u00e3o",
    rome: "Roma", roma: "Roma", turin: "Turim", torino: "Turim", venice: "Veneza", venezia: "Veneza",
  },
  jp: { kyoto: "Quioto", tokyo: "T\u00f3quio", "tokyo to": "T\u00f3quio", toquio: "T\u00f3quio" },
  kr: { seoul: "Seul" },
  nl: { "the hague": "Haia", "den haag": "Haia" },
  pl: { warsaw: "Vars\u00f3via", warszawa: "Vars\u00f3via" },
  ro: { bucharest: "Bucareste", bucuresti: "Bucareste" },
  ru: { moscow: "Moscou", moskva: "Moscou" },
  se: { stockholm: "Estocolmo" },
  tr: { istanbul: "Istambul" },
  us: { "new york": "Nova York", "new york city": "Nova York" },
};

export function normalizeCityKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getBrazilianPortugueseCityName(city, countryCode) {
  const rawCity = String(city || "").trim();
  if (!rawCity) return "";

  const country = String(countryCode || "").trim().toLowerCase();
  return CITY_EXONYMS[country]?.[normalizeCityKey(rawCity)] || rawCity;
}

export function slugifyCity(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}
