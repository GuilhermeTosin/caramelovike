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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const selectedImage = images[selectedIndex] || null;

  useEffect(() => {
    setSelectedIndex((current) => images.length ? Math.min(current, images.length - 1) : 0);
  }, [images.length]);

  useEffect(() => {
    if (!isViewerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsViewerOpen(false);
      if (event.key === "ArrowLeft" && images.length > 1) {
        setSelectedIndex((current) => (current - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight" && images.length > 1) {
        setSelectedIndex((current) => (current + 1) % images.length);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [images.length, isViewerOpen]);

  const showPrevious = () => {
    if (images.length < 2) return;
    setSelectedIndex((current) => (current - 1 + images.length) % images.length);
  };

  const showNext = () => {
    if (images.length < 2) return;
    setSelectedIndex((current) => (current + 1) % images.length);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#13272b] sm:aspect-square">
          {selectedImage ? (
            <>
              <img
                aria-hidden="true"
                src={getOptimizedImageUrl(selectedImage.image_url, { width: 1200, quality: 65, format: "webp" })}
                alt=""
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-[#13272b]/30" />
              <button
                type="button"
                aria-label={`Ampliar foto ${selectedIndex + 1} de ${images.length}`}
                onClick={() => setIsViewerOpen(true)}
                className="group relative z-10 block h-full w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <MarketplaceImageFrame
                  src={getOptimizedImageUrl(selectedImage.image_url, { width: 1200, quality: 82, format: "webp" })}
                  srcSet={getOptimizedImageSrcSet(selectedImage.image_url, [480, 768, 1200], 82)}
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  alt={`${title} - foto ${selectedIndex + 1}`}
                  loading="eager"
                  className="h-full w-full"
                />
              </button>
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Foto anterior"
                    onClick={showPrevious}
                    className="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#13272b] shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Próxima foto"
                    onClick={showNext}
                    className="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#13272b] shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </>
              ) : null}
              <span className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white">
                {selectedIndex + 1} / {images.length}
              </span>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-white/65">
              <Tag className="h-16 w-16" aria-hidden="true" />
            </div>
          )}
        </div>

        {images.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Miniaturas das fotos do anuncio" role="list">
            {images.map((image, index) => (
              <div key={image.id} role="listitem">
                <button
                  type="button"
                  aria-label={`Selecionar foto ${index + 1} de ${images.length}`}
                  aria-current={selectedIndex === index ? "true" : undefined}
                  onClick={() => setSelectedIndex(index)}
                  className={`group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-20 sm:w-20 ${selectedIndex === index ? "ring-2 ring-primary ring-offset-2" : "opacity-75 hover:opacity-100"}`}
                >
                  <img
                    src={getOptimizedImageUrl(image.image_url, { width: 240, quality: 75, format: "webp" })}
                    alt={`${title} - miniatura ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {selectedImage && isViewerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ampliada ${selectedIndex + 1} de ${images.length}`}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#13272b]/90 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setIsViewerOpen(false)}
        >
          <img
            aria-hidden="true"
            src={getOptimizedImageUrl(selectedImage.image_url, { width: 1600, quality: 60, format: "webp" })}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-3xl"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-[#13272b]/70" />
          <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            <div className="relative flex min-h-[50vh] w-full items-center justify-center sm:min-h-0">
              <img
                src={getOptimizedImageUrl(selectedImage.image_url, { width: 1600, quality: 85, format: "webp" })}
                srcSet={getOptimizedImageSrcSet(selectedImage.image_url, [720, 1200, 1600], 85)}
                sizes="100vw"
                alt={`${title} - foto ${selectedIndex + 1}`}
                className="max-h-[78vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
              />
              <button
                type="button"
                aria-label="Fechar foto ampliada"
                onClick={() => setIsViewerOpen(false)}
                className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-3 sm:top-3"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Foto anterior"
                    onClick={showPrevious}
                    className="absolute left-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#13272b] shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-3"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Próxima foto"
                    onClick={showNext}
                    className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#13272b] shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-3"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
            {images.length > 1 ? (
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Miniaturas das fotos ampliadas" role="list">
                {images.map((image, index) => (
                  <div key={image.id} role="listitem">
                    <button
                      type="button"
                      aria-label={`Selecionar foto ampliada ${index + 1} de ${images.length}`}
                      aria-current={selectedIndex === index ? "true" : undefined}
                      onClick={() => setSelectedIndex(index)}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-md bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${selectedIndex === index ? "ring-2 ring-white ring-offset-2 ring-offset-[#13272b]" : "opacity-70 hover:opacity-100"}`}
                    >
                      <img
                        src={getOptimizedImageUrl(image.image_url, { width: 180, quality: 72, format: "webp" })}
                        alt={`${title} - miniatura ampliada ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
              {selectedIndex + 1} / {images.length}
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
