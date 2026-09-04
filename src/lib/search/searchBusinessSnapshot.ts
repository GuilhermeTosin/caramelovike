import type { BusinessFrontend } from "@/types/database";

type ResolveInitialSearchBusinessesInput = {
  preloadedBusinesses?: BusinessFrontend[];
  initialBusinesses?: BusinessFrontend[];
  initialBusinessesAreSearchReady?: boolean;
};

export function resolveInitialSearchBusinesses({
  preloadedBusinesses = [],
  initialBusinesses = [],
  initialBusinessesAreSearchReady = false,
}: ResolveInitialSearchBusinessesInput): BusinessFrontend[] {
  if (preloadedBusinesses.length > 0) return preloadedBusinesses;
  return initialBusinessesAreSearchReady ? initialBusinesses : [];
}