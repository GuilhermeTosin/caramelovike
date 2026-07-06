import type { Locale } from "@/i18n/types";
import { DEFAULT_LOCALE } from "@/i18n/types";

const EN_PREFIX = "/en";

export function normalizeLocale(locale?: string | null): Locale {
  if (!locale) return DEFAULT_LOCALE;
  const normalized = locale.toLowerCase();
  return normalized.startsWith("en") ? "en" : DEFAULT_LOCALE;
}

export function getLocaleFromPathname(pathname?: string): Locale {
  if (!pathname) return DEFAULT_LOCALE;
  return pathname === EN_PREFIX || pathname.startsWith(`${EN_PREFIX}/`) ? "en" : DEFAULT_LOCALE;
}

export function stripLocalePrefix(pathname?: string): string {
  if (!pathname) return "/";
  if (pathname === EN_PREFIX) return "/";
  if (pathname.startsWith(`${EN_PREFIX}/`)) {
    return pathname.slice(EN_PREFIX.length) || "/";
  }
  return pathname || "/";
}

export function getLocaleBasePath(locale: Locale): string {
  return locale === "en" ? EN_PREFIX : "";
}

export function getLocalizedPathname(pathname: string, locale: Locale): string {
  const normalizedPath = stripLocalePrefix(pathname) || "/";
  if (locale === "en") {
    return normalizedPath === "/" ? EN_PREFIX : `${EN_PREFIX}${normalizedPath}`;
  }
  return normalizedPath;
}

export function getLocalizedUrl(origin: string, pathname: string, search = "", hash = "", locale: Locale): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${getLocalizedPathname(pathname, locale)}${search}${hash}`;
}
