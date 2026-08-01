import type { Config } from "vike/types";

export default {
  prerender: {
    partial: true,
    keepDistServer: true,
  },
  passToClient: [
    "urlOriginal",
    "initialBusiness",
    "initialSimilarBusinesses",
    "initialBusinesses",
    "initialBusinessesAreSearchReady",
    "initialFeaturedBusinesses",
    "initialAvailableLocations",
    "initialSearchSuggestions",
    "initialEvent",
    "isBusinessPage",
  ],
} satisfies Config;
