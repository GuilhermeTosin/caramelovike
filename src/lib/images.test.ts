import { describe, expect, it } from "vitest";
import { getOptimizedImageSrcSet, getOptimizedImageUrl } from "@/lib/images";

const storageUrl = "https://project.supabase.co/storage/v1/object/public/business-images/owner/photo_123";

describe("public storage image variants", () => {
  it("uses the uploaded thumbnail only for files that have generated variants", () => {
    const uploaded = `${storageUrl}__full.webp`;
    expect(getOptimizedImageUrl(uploaded, { width: 240, quality: 75, format: "webp" }))
      .toBe(`${storageUrl}__thumb.webp`);
    expect(getOptimizedImageUrl(uploaded, { width: 960, quality: 75, format: "webp" }))
      .toBe(`${storageUrl}__full.webp`);
  });

  it("does not upscale a logo thumbnail past its generated width", () => {
    const uploadedLogo = `${storageUrl.replace("photo_123", "logo_456")}__full.webp`;
    expect(getOptimizedImageUrl(uploadedLogo, { width: 240, quality: 75, format: "webp" }))
      .toBe(`${storageUrl.replace("photo_123", "logo_456")}__thumb.webp`);
    expect(getOptimizedImageUrl(uploadedLogo, { width: 384, quality: 75, format: "webp" }))
      .toBe(uploadedLogo);
  });

  it("keeps legacy image URLs usable and removes unsupported transformation parameters", () => {
    const legacy = `${storageUrl}.jpg?width=240&quality=70&format=webp`;
    expect(getOptimizedImageUrl(legacy, { width: 240, quality: 70, format: "webp" }))
      .toBe(`${storageUrl}.jpg`);
    expect(getOptimizedImageSrcSet(legacy)).toBeUndefined();
  });

  it("builds a responsive source set from the generated thumbnail and primary image", () => {
    const uploaded = `${storageUrl}__full.webp`;
    expect(getOptimizedImageSrcSet(uploaded)).toBe(
      `${storageUrl}__thumb.webp 480w, ${uploaded} 1400w`,
    );

    const uploadedHero = `${storageUrl.replace("photo_123", "hero_456")}__full.webp`;
    expect(getOptimizedImageSrcSet(uploadedHero)).toBe(
      `${storageUrl.replace("photo_123", "hero_456")}__thumb.webp 640w, ${uploadedHero} 1600w`,
    );
  });
});
