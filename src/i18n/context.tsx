import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/i18n/types";
import { DEFAULT_LOCALE } from "@/i18n/types";

type LocaleContextValue = {
  locale: Locale;
};

const LocaleContext = createContext<LocaleContextValue>({ locale: DEFAULT_LOCALE });

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={{ locale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext).locale;
}
