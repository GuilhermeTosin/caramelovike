import { createContext, useContext, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getSiteLocale, localizePath, type SiteLocale } from "@/lib/locales";

type LocaleContextValue = {
  locale: SiteLocale;
  toLocalePath: (path: string) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "pt-BR",
  toLocalePath: (path) => path,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const locale = getSiteLocale(pathname);

  return (
    <LocaleContext.Provider value={{ locale, toLocalePath: (path) => localizePath(path, locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useSiteLocale() {
  return useContext(LocaleContext);
}
