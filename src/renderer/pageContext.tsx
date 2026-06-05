import { createContext, useContext, type ReactNode } from "react";
import type { BusinessFrontend } from "@/types/database";
import type { PageContextServer } from "vike/types";

export type RendererPageContext = PageContextServer & {
  urlOriginal?: string;
  initialBusiness?: BusinessFrontend | null;
  initialBusinesses?: BusinessFrontend[];
  initialFeaturedBusinesses?: BusinessFrontend[];
  initialAvailableLocations?: Array<{
    countryCode: string;
    countryName: string;
    states: { code: string; name: string; cities: string[] }[];
  }>;
  initialSearchSuggestions?: string[];
  isBusinessPage?: boolean;
  is404?: boolean;
  abortStatusCode?: number;
  abortReason?: unknown;
  isPrerendering?: boolean;
};

const PageContext = createContext<RendererPageContext | null>(null);

export function PageContextProvider({
  pageContext,
  children,
}: {
  pageContext: RendererPageContext;
  children: ReactNode;
}) {
  return <PageContext.Provider value={pageContext}>{children}</PageContext.Provider>;
}

export function usePageContext() {
  const pageContext = useContext(PageContext);
  if (!pageContext) {
    throw new Error("usePageContext must be used within PageContextProvider.");
  }
  return pageContext;
}
