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
    "initialSearchSnapshot",
    "initialHomeSnapshot",
    "initialDirectorySnapshot",
    "initialEvent",
    "isBusinessPage",
  ],
} satisfies Config;
