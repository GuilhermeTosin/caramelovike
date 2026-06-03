import "@/index.css";
import App from "@/App";
import type { BusinessFrontend } from "@/types/database";

type PageContext = {
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
};

export function Page({ pageContext }: { pageContext?: PageContext }) {
  const isServer = typeof window === "undefined";
  const location = pageContext?.urlOriginal || "/";

  return (
    <App
      router={isServer ? "static" : "browser"}
      location={location}
      initialBusiness={pageContext?.initialBusiness || null}
      initialBusinesses={pageContext?.initialBusinesses || []}
      initialFeaturedBusinesses={pageContext?.initialFeaturedBusinesses || []}
      initialAvailableLocations={pageContext?.initialAvailableLocations || []}
      initialSearchSuggestions={pageContext?.initialSearchSuggestions || []}
      isBusinessPage={pageContext?.isBusinessPage || false}
    />
  );
}
