import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Tag, X, ZoomIn } from "lucide-react";
import { getOptimizedImageSrcSet, getOptimizedImageUrl } from "@/lib/images";
import type { MarketplaceListingImage } from "@/types/database";

export type MarketplaceImageFrameProps = {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  loading?: "eager" | "lazy";
  className?: string;
};

export function MarketplaceImageFrame({
  src,
  srcSet,
  sizes,
  alt,
  loading = "lazy",
  className = "",
}: MarketplaceImageFrameProps) {
  return (
    <span className={`relative block overflow-hidden ${className}`}>
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={loading}
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 group-focus-visible:scale-110"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <ZoomIn className="h-3.5 w-3.5" />
        Ampliar
      </span>
    </span>
  );
}

type MarketplaceListingGalleryProps = {
  images: MarketplaceListingImage[];
  title: string;
};

export default function MarketplaceListingGallery({ images, title }: MarketplaceListingGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImage = activeIndex === null ? null : images[activeIndex] || null;

  useEffect(() => {
    if (activeIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft") setActiveIndex((current) => current === null ? null : (current - 1 + images.length) % images.length);
      if (event.key === "ArrowRight") setActiveIndex((current) => current === null ? null : (current + 1) % images.length);
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex, images.length]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.length ? images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            aria-label={`Ampliar foto ${index + 1} de ${images.length}`}
            onClick={() => setActiveIndex(index)}
            className={`${images.length === 1 ? "col-span-full" : index === 0 ? "col-span-2 sm:col-span-2 sm:row-span-2" : ""} group relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:aspect-square`}
          >
            <MarketplaceImageFrame
              src={getOptimizedImageUrl(image.image_url, { width: index === 0 ? 1200 : 720, quality: 78, format: "webp" })}
              srcSet={getOptimizedImageSrcSet(image.image_url, [480, 720, 1200], 78)}
              sizes="(min-width: 1024px) 60vw, 100vw"
              alt={`${title} - foto ${index + 1}`}
              loading={index === 0 ? "eager" : "lazy"}
              className="h-full w-full"
            />
          </button>
        )) : (
          <div className="col-span-full flex aspect-[4/3] items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <Tag className="h-16 w-16" aria-hidden="true" />
          </div>
        )}
      </div>

      {activeImage && activeIndex !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ampliada ${activeIndex + 1} de ${images.length}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#13272b]/90 p-4 backdrop-blur-sm"
          onClick={() => setActiveIndex(null)}
        >
          <div className="relative flex max-h-[92vh] max-w-6xl items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <img
              src={getOptimizedImageUrl(activeImage.image_url, { width: 1600, quality: 85, format: "webp" })}
              srcSet={getOptimizedImageSrcSet(activeImage.image_url, [720, 1200, 1600], 85)}
              sizes="100vw"
              alt={`${title} - foto ${activeIndex + 1}`}
              className="max-h-[84vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              aria-label="Fechar foto ampliada"
              onClick={() => setActiveIndex(null)}
              className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Foto anterior"
                  onClick={() => setActiveIndex((current) => current === null ? null : (current - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Próxima foto"
                  onClick={() => setActiveIndex((current) => current === null ? null : (current + 1) % images.length)}
                  className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </>
            ) : null}
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
              {activeIndex + 1} / {images.length}
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
