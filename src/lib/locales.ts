export type SiteLocale = "pt-BR" | "en";

export const DEFAULT_SITE_LOCALE: SiteLocale = "pt-BR";

export function getSiteLocale(pathname?: string | null): SiteLocale {
  const path = String(pathname || "/").split("?")[0];
  return path === "/en" || path.startsWith("/en/") ? "en" : DEFAULT_SITE_LOCALE;
}

export function localizePath(path: string, locale: SiteLocale): string {
  if (locale !== "en") return path;

  const match = String(path || "/").match(/^([^?#]*)(.*)$/);
  const pathname = match?.[1] || "/";
  const suffix = match?.[2] || "";
  if (!pathname.startsWith("/")) return path;

  let localizedPath: string;
  if (pathname === "/") localizedPath = "/en";
  else if (pathname === "/negocios") localizedPath = "/en/businesses";
  else {
    const publicPagePath: Record<string, string> = {
      "/sobre": "/en/about",
      "/contato": "/en/contact",
      "/privacidade": "/en/privacy",
      "/termos": "/en/terms",
      "/buscar": "/en/search",
      "/eventos": "/en/events",
      "/perfil": "/en/profile",
      "/entrar": "/en/login",
      "/cadastro": "/en/register",
      "/redefinir-senha": "/en/reset-password",
      "/negocio/wizard": "/en/business/wizard",
      "/negocio-verificado": "/en/verified-business",
    };
    localizedPath = publicPagePath[pathname] || (pathname.startsWith("/negocios/")
      ? `/en/businesses${pathname.slice("/negocios".length)}`
      : `/en${pathname}`);
  }

  return `${localizedPath}${suffix}`;
}
export function getPortuguesePath(pathname: string): string {
  if (pathname === "/en") return "/";
  if (pathname === "/en/businesses") return "/negocios";
  const portuguesePublicPath = {
    "/en/about": "/sobre",
    "/en/contact": "/contato",
    "/en/privacy": "/privacidade",
    "/en/terms": "/termos",
    "/en/search": "/buscar",
    "/en/events": "/eventos",
    "/en/profile": "/perfil",
    "/en/login": "/entrar",
    "/en/register": "/cadastro",
    "/en/reset-password": "/redefinir-senha",
    "/en/business/wizard": "/negocio/wizard",
    "/en/verified-business": "/negocio-verificado",
  }[pathname];
  if (portuguesePublicPath) return portuguesePublicPath;
  if (pathname.startsWith("/en/businesses/")) {
    return `/negocios${pathname.slice("/en/businesses".length)}`;
  }
  if (pathname.startsWith("/en/events/")) {
    return `/eventos${pathname.slice("/en/events".length)}`;
  }
  return pathname.startsWith("/en/") ? pathname.slice(3) || "/" : pathname;
}

export function getLocaleHtmlLang(locale: SiteLocale): string {
  return locale === "en" ? "en" : "pt-BR";
}

export function getLocaleOgCode(locale: SiteLocale): string {
  return locale === "en" ? "en_US" : "pt_BR";
}

export function getSiteSlogan(locale: SiteLocale): string {
  return locale === "en" ? "YOUR NOSE OUTSIDE BRAZIL" : "O SEU FARO FORA DO BRASIL";
}

export function getCountryDisplayName(countryCode: string, fallback: string, locale: SiteLocale): string {
  if (locale !== "en") return fallback;

  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode.toUpperCase()) || fallback;
  } catch {
    return fallback;
  }
}
