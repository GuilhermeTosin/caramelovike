import type { PageContextServer } from "vike/types";
import type { BusinessFrontend } from "@/types/database";
import type { HomePublicSnapshot } from "@/lib/homeSnapshot";
import type { DirectoryPageSnapshot } from "@/lib/directorySnapshot";
import type { PublicSearchPageSnapshot } from "@/lib/search/publicSearchPage";
import type { MarketplaceSnapshot } from "@/lib/marketplaceSnapshot";

export type RendererPageContext = PageContextServer & {
  urlOriginal?: string;
  initialBusiness?: BusinessFrontend | null;
  initialSimilarBusinesses?: BusinessFrontend[];
  initialBusinesses?: BusinessFrontend[];
  initialFeaturedBusinesses?: BusinessFrontend[];
  initialRecentBusinesses?: BusinessFrontend[];
  initialAvailableLocations?: Array<{
    countryCode: string;
    countryName: string;
    states: { code: string; name: string; cities: string[] }[];
  }>;
  initialSearchSuggestions?: string[];
  initialSearchSynonyms?: Record<string, string[]>;
  initialSearchSnapshot?: PublicSearchPageSnapshot;
  initialHomeSnapshot?: HomePublicSnapshot;
  initialDirectorySnapshot?: DirectoryPageSnapshot;
  initialMarketplaceSnapshot?: MarketplaceSnapshot;
  initialMarketplaceListing?: import("@/types/database").MarketplaceListing | null;
  initialMarketplaceSeller?: import("@/services/marketplace").MarketplaceSellerPage | null;
  initialMarketplaceBusinessSeller?: import("@/services/marketplace").MarketplaceBusinessSellerPage | null;
  isBusinessPage?: boolean;
  is404?: boolean;
  abortStatusCode?: number;
  abortReason?: unknown;
  isPrerendering?: boolean;
};
