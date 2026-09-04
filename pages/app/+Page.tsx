import "@/index.css";
import App from "@/App";
import type { BusinessFrontend, CommunityEvent } from "@/types/database";
import type { HomePublicSnapshot } from "@/lib/homeSnapshot";
import type { DirectoryPageSnapshot } from "@/lib/directorySnapshot";
import type { PublicSearchPageSnapshot } from "@/lib/search/publicSearchPage";

type PageContext = {
  urlOriginal?: string;
  initialBusiness?: BusinessFrontend | null;
  initialSimilarBusinesses?: BusinessFrontend[];
  initialBusinesses?: BusinessFrontend[];
  initialBusinessesAreSearchReady?: boolean;
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
  initialEvent?: CommunityEvent | null;
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
      initialAvailableLocations={pageContext?.initialAvailableLocations || []}
      initialSearchSuggestions={pageContext?.initialSearchSuggestions || []}
      initialSearchSnapshot={pageContext?.initialSearchSnapshot}
      initialHomeSnapshot={pageContext?.initialHomeSnapshot}
      initialDirectorySnapshot={pageContext?.initialDirectorySnapshot}
      initialEvent={pageContext?.initialEvent || null}
      isBusinessPage={pageContext?.isBusinessPage || false}
    />
  );
}
