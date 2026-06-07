import { getOptimizedImageSrcSet, getOptimizedImageUrl, preloadResponsiveImage } from "@/lib/images";
import type { BusinessFrontend } from "@/types/database";

type BusinessPageModule = typeof import("@/pages/BusinessPage");

const BUSINESS_HERO_FALLBACK = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80";

let loadedBusinessPageModule: BusinessPageModule | null = null;
let loadingBusinessPageModule: Promise<BusinessPageModule> | null = null;

export function preloadBusinessPageChunk() {
  if (loadedBusinessPageModule) {
    return Promise.resolve(loadedBusinessPageModule);
  }

  if (!loadingBusinessPageModule) {
    loadingBusinessPageModule = import("@/pages/BusinessPage").then((module) => {
      loadedBusinessPageModule = module;
      return module;
    });
  }

  return loadingBusinessPageModule;
}

export function getLoadedBusinessPageModule() {
  return loadedBusinessPageModule;
}

export function preloadBusinessHeroImage(business: Pick<BusinessFrontend, "heroImage" | "logoUrl">) {
  if (typeof document === "undefined") return;
  const source = business.heroImage || business.logoUrl || BUSINESS_HERO_FALLBACK;
  const url = getOptimizedImageUrl(source, { width: 1024, quality: 76, format: "webp" });
  const srcSet = getOptimizedImageSrcSet(source, [480, 720, 960, 1024], 76);
  preloadResponsiveImage(url, { srcSet, sizes: "100vw" });
}

export function preloadBusinessPageAssets(business: Pick<BusinessFrontend, "heroImage" | "logoUrl">) {
  void preloadBusinessPageChunk();
  preloadBusinessHeroImage(business);
}
