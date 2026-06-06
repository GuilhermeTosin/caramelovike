import type { PageContextServer } from "vike/types";
import type { BusinessFrontend } from "@/types/database";

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
