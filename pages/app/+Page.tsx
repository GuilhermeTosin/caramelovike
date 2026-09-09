import "@/index.css";
import App from "@/App";
import type { BusinessFrontend, CommunityEvent } from "@/types/database";
import type { HomePublicSnapshot } from "@/lib/homeSnapshot";
import type { DirectoryPageSnapshot } from "@/lib/directorySnapshot";
import type { PublicSearchPageSnapshot } from "@/lib/search/publicSearchPage";
import type { MarketplaceSnapshot } from "@/lib/marketplaceSnapshot";

type PageContext = {
  urlOriginal?: string;
  initialBusiness?: BusinessFrontend | null;
  initialSimilarBusinesses?: BusinessFrontend[];
  initialBusinesses?: BusinessFrontend[];
  initialBusinessesAreSearchReady?: boolean;
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
  initialEvent?: CommunityEvent | null;
  initialMarketplaceSnapshot?: MarketplaceSnapshot;
  initialMarketplaceListing?: import("@/types/database").MarketplaceListing | null;
  initialMarketplaceSeller?: import("@/services/marketplace").MarketplaceSellerPage | null;
  initialMarketplaceBusinessSeller?: import("@/services/marketplace").MarketplaceBusinessSellerPage | null;
  isBusinessPage?: boolean;
};

export function Page({ pageContext }: { pageContext?: PageContext }) {
  const isServer = typeof window === "undefined";
  const location = pageContext?.urlOriginal || "/";

  return (
    <App
      router={isServer ? "static" : "browser"}
      location={location}
      initialBusiness={pageContext?.initialBusiness || null}
      initialSimilarBusinesses={pageContext?.initialSimilarBusinesses || []}
      initialBusinesses={pageContext?.initialBusinesses || []}
      initialBusinessesAreSearchReady={pageContext?.initialBusinessesAreSearchReady || false}
      initialFeaturedBusinesses={pageContext?.initialFeaturedBusinesses || []}
      initialRecentBusinesses={pageContext?.initialRecentBusinesses || []}
      initialAvailableLocations={pageContext?.initialAvailableLocations || []}
      initialSearchSuggestions={pageContext?.initialSearchSuggestions || []}
      initialSearchSynonyms={pageContext?.initialSearchSynonyms}
      initialSearchSnapshot={pageContext?.initialSearchSnapshot}
      initialHomeSnapshot={pageContext?.initialHomeSnapshot}
      initialDirectorySnapshot={pageContext?.initialDirectorySnapshot}
      initialEvent={pageContext?.initialEvent || null}
      initialMarketplaceSnapshot={pageContext?.initialMarketplaceSnapshot}
      initialMarketplaceListing={pageContext?.initialMarketplaceListing || null}
      initialMarketplaceSeller={pageContext?.initialMarketplaceSeller || null}
      initialMarketplaceBusinessSeller={pageContext?.initialMarketplaceBusinessSeller || null}
      isBusinessPage={pageContext?.isBusinessPage || false}
    />
  );
}
