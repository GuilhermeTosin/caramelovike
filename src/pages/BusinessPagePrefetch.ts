import { getOptimizedImageSrcSet, getOptimizedImageUrl, preloadResponsiveImage } from "@/lib/images";
import type { BusinessFrontend } from "@/types/database";

type BusinessPageModule = typeof import("@/pages/BusinessPage");

const BUSINESS_HERO_FALLBACK = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80";
const BUSINESS_PAGE_RELOAD_GUARD_KEY = "business-page-chunk-reload-at";

let loadedBusinessPageModule: BusinessPageModule | null = null;
let loadingBusinessPageModule: Promise<BusinessPageModule> | null = null;

function clearChunkReloadGuard() {
  try {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(BUSINESS_PAGE_RELOAD_GUARD_KEY);
  } catch {
    // Storage can be disabled by browser privacy settings.
  }
}

export function shouldReloadAfterBusinessPageChunkFailure() {
  try {
    if (typeof window === "undefined") return false;
    const lastReloadAt = Number(window.sessionStorage.getItem(BUSINESS_PAGE_RELOAD_GUARD_KEY) || 0);
    if (Date.now() - lastReloadAt < 30_000) return false;
    window.sessionStorage.setItem(BUSINESS_PAGE_RELOAD_GUARD_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

export function preloadBusinessPageChunk() {
  if (loadedBusinessPageModule) {
    return Promise.resolve(loadedBusinessPageModule);
  }

  if (!loadingBusinessPageModule) {
    loadingBusinessPageModule = import("@/pages/BusinessPage")
      .then((module) => {
        loadedBusinessPageModule = module;
        clearChunkReloadGuard();
        return module;
      })
      .catch((error: unknown) => {
        loadingBusinessPageModule = null;
        throw error;
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
  const url = getOptimizedImageUrl(source, { width: 960, quality: 72, format: "webp" });
  const srcSet = getOptimizedImageSrcSet(source, [480, 640, 800, 960], 72);
  preloadResponsiveImage(url, { srcSet, sizes: "100vw" });
}

export function preloadBusinessPageAssets(business: Pick<BusinessFrontend, "heroImage" | "logoUrl">) {
  void preloadBusinessPageChunk().catch((error: unknown) => {
    console.warn("[BusinessPage] Falha ao antecipar o carregamento da página:", error);
  });
  preloadBusinessHeroImage(business);
}
