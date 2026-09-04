import type { PageContextServer } from "vike/types";
import type { BusinessFrontend } from "@/types/database";
import type { HomePublicSnapshot } from "@/lib/homeSnapshot";
import type { DirectoryPageSnapshot } from "@/lib/directorySnapshot";
import type { PublicSearchPageSnapshot } from "@/lib/search/publicSearchPage";

export type RendererPageContext = PageContextServer & {
  urlOriginal?: string;
  initialBusiness?: BusinessFrontend | null;
  initialSimilarBusinesses?: BusinessFrontend[];
  initialBusinesses?: BusinessFrontend[];
  initialFeaturedBusinesses?: BusinessFrontend[];
  initialAvailableLocations?: Array<{
    countryCode: string;
    countryName: string;
    states: { code: string; name: string; cities: string[] }[];
  }>;
  initialSearchSuggestions?: string[];
  initialSearchSnapshot?: PublicSearchPageSnapshot;
  initialHomeSnapshot?: HomePublicSnapshot;
  initialDirectorySnapshot?: DirectoryPageSnapshot;
  isBusinessPage?: boolean;
  is404?: boolean;
  abortStatusCode?: number;
  abortReason?: unknown;
  isPrerendering?: boolean;
};
