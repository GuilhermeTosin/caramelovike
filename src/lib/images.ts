type SupabaseImageOptions = {
  width: number | undefined;
  quality: number | undefined;
  format: "origin" | "webp" | undefined;
};

export const DEFAULT_BUSINESS_LOGO = "/cachorro-caramelo.webp";

function isSupabaseStoragePublicUrl(url: string): boolean {
  return /\/storage\/v1\/object\/public\//.test(url);
}

function getVariantWidths(pathname: string) {
  const fileName = pathname.split("/").pop()?.toLowerCase() || "";
  if (fileName.startsWith("logo_")) return { thumbnail: 240, full: 700 };
  if (fileName.startsWith("avatar_")) return { thumbnail: 160, full: 500 };
  if (fileName.startsWith("hero_")) return { thumbnail: 640, full: 1600 };
  if (fileName.startsWith("photo_")) return { thumbnail: 480, full: 1400 };
  if (fileName.startsWith("event-flyer_")) return { thumbnail: 480, full: 1200 };
  return { thumbnail: 480, full: 1600 };
}

const PRELOADED_RESPONSIVE_IMAGE_KEYS = new Set<string>();

export function getOptimizedImageUrl(
  url: string,
  options: SupabaseImageOptions = { width: undefined, quality: undefined, format: undefined }
): string {
  if (!url || !isSupabaseStoragePublicUrl(url)) return url;
  const width = options.width ?? 768;

  try {
    const parsed = new URL(url);
    // Storage image transformations require the /render/image endpoint and an
    // enabled transformations plan. Uploaded assets use durable WebP variants
    // instead, so avoid unique query URLs that only reduce CDN cache reuse.
    parsed.searchParams.delete("width");
    parsed.searchParams.delete("quality");
    parsed.searchParams.delete("format");

    const variantWidths = getVariantWidths(parsed.pathname);
    if (width <= variantWidths.thumbnail && parsed.pathname.endsWith("__full.webp")) {
      parsed.pathname = parsed.pathname.replace(/__full\.webp$/i, "__thumb.webp");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function getOptimizedImageSrcSet(
  url: string,
  _widths: number[] = [480, 768, 1024],
  _quality = 80
): string | undefined {
  if (!url || !isSupabaseStoragePublicUrl(url)) return undefined;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("width");
    parsed.searchParams.delete("quality");
    parsed.searchParams.delete("format");
    if (!parsed.pathname.endsWith("__full.webp")) return undefined;

    const thumbnail = new URL(parsed);
    thumbnail.pathname = thumbnail.pathname.replace(/__full\.webp$/i, "__thumb.webp");
    const variantWidths = getVariantWidths(parsed.pathname);
    return `${thumbnail.toString()} ${variantWidths.thumbnail}w, ${parsed.toString()} ${variantWidths.full}w`;
  } catch {
    return undefined;
  }
}

export function preloadResponsiveImage(
  url: string,
  options: { srcSet?: string; sizes?: string } = {}
) {
  if (typeof document === "undefined" || !url) return;
  const key = `${url}|${options.srcSet || ""}|${options.sizes || ""}`;
  if (PRELOADED_RESPONSIVE_IMAGE_KEYS.has(key)) return;
  PRELOADED_RESPONSIVE_IMAGE_KEYS.add(key);

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = url;
  if (options.srcSet) {
    link.setAttribute("imagesrcset", options.srcSet);
  }
  if (options.sizes) {
    link.setAttribute("imagesizes", options.sizes);
  }
  document.head.appendChild(link);
}
