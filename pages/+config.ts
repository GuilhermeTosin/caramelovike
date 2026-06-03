import type { Config } from "vike/types";

export default {
  prerender: {
    partial: true,
  },
  passToClient: [
    "urlOriginal",
    "initialBusiness",
    "initialBusinesses",
    "initialFeaturedBusinesses",
    "initialAvailableLocations",
    "initialSearchSuggestions",
    "isBusinessPage",
  ],
} satisfies Config;
