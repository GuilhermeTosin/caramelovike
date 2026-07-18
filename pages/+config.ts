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
    "initialFeaturedBusinesses",
    "initialAvailableLocations",
    "initialSearchSuggestions",
    "isBusinessPage",
  ],
} satisfies Config;
