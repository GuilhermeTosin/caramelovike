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
    "initialRecentBusinesses",
    "initialAvailableLocations",
    "initialSearchSuggestions",
    "initialSearchSynonyms",
    "initialSearchSnapshot",
    "initialHomeSnapshot",
    "initialDirectorySnapshot",
    "initialEvent",
    "initialMarketplaceSnapshot",
    "initialMarketplaceListing",
    "initialMarketplaceSeller",
    "initialMarketplaceBusinessSeller",
    "isBusinessPage",
  ],
} satisfies Config;
