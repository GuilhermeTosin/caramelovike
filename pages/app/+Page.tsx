import "@/index.css";
import App from "@/App";
import type { BusinessFrontend, CommunityEvent } from "@/types/database";

type PageContext = {
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
      initialFeaturedBusinesses={pageContext?.initialFeaturedBusinesses || []}
      initialAvailableLocations={pageContext?.initialAvailableLocations || []}
      initialSearchSuggestions={pageContext?.initialSearchSuggestions || []}
      initialEvent={pageContext?.initialEvent || null}
      isBusinessPage={pageContext?.isBusinessPage || false}
    />
  );
}
