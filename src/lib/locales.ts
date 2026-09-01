export const SITE_SLOGAN = "O SEU FARO FORA DO BRASIL";

export function localizePath(path: string): string {
  return path;
}

export function getLocaleHtmlLang(): string {
  return "pt-BR";
}

export function getLocaleOgCode(): string {
  return "pt_BR";
}

export function getSiteSlogan(): string {
  return SITE_SLOGAN;
}

export function getCountryDisplayName(_countryCode: string, fallback: string): string {
  return fallback;
}
