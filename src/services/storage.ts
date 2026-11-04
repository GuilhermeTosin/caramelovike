import { supabase } from "@/lib/supabase";

const IMAGE_TYPES_TO_CONVERT = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/bmp",
]);
const MAX_UNCONVERTED_IMAGE_BYTES = 2 * 1024 * 1024;

type ImagePreset = {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  maxBytes: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  thumbnailMaxBytes: number;
};

const DEFAULT_IMAGE_PRESET: ImagePreset = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82,
  maxBytes: 700 * 1024,
  thumbnailWidth: 480,
  thumbnailHeight: 480,
  thumbnailMaxBytes: 90 * 1024,
};

const IMAGE_PRESETS: Record<string, ImagePreset> = {
  hero: {
    maxWidth: 1600, maxHeight: 900, quality: 0.8, maxBytes: 750 * 1024,
    thumbnailWidth: 640, thumbnailHeight: 360, thumbnailMaxBytes: 110 * 1024,
  },
  logo: {
    maxWidth: 700, maxHeight: 700, quality: 0.84, maxBytes: 300 * 1024,
    thumbnailWidth: 240, thumbnailHeight: 240, thumbnailMaxBytes: 55 * 1024,
  },
  photo: {
    maxWidth: 1400, maxHeight: 1400, quality: 0.78, maxBytes: 650 * 1024,
    thumbnailWidth: 480, thumbnailHeight: 480, thumbnailMaxBytes: 90 * 1024,
  },
  "event-flyer": {
    maxWidth: 1200, maxHeight: 1600, quality: 0.78, maxBytes: 700 * 1024,
    thumbnailWidth: 480, thumbnailHeight: 640, thumbnailMaxBytes: 100 * 1024,
  },
  avatar: {
    maxWidth: 500, maxHeight: 500, quality: 0.82, maxBytes: 180 * 1024,
    thumbnailWidth: 160, thumbnailHeight: 160, thumbnailMaxBytes: 35 * 1024,
  },
};

const IMAGE_CACHE_CONTROL = "31536000";

function getImagePresetFromPath(path: string): ImagePreset {
  const fileName = path.split("/").pop() || "";
  const kind = fileName.split("_")[0].toLowerCase();
  return IMAGE_PRESETS[kind] || DEFAULT_IMAGE_PRESET;
}

function fitSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

async function encodeBitmapToWebp(
  bitmap: ImageBitmap,
  maxWidth: number,
  maxHeight: number,
  maxBytes: number,
  quality: number,
): Promise<Blob> {
  let lastBlob: Blob | null = null;

  for (const scale of [1, 0.85, 0.72]) {
    const target = fitSize(
      bitmap.width,
      bitmap.height,
      Math.max(1, Math.round(maxWidth * scale)),
      Math.max(1, Math.round(maxHeight * scale)),
    );
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponivel para otimizar a imagem.");
    ctx.drawImage(bitmap, 0, 0, target.width, target.height);

    for (const qualityStep of [quality, Math.max(0.5, quality - 0.16)]) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", qualityStep);
      });
      if (!blob) continue;
      lastBlob = blob;
      if (blob.size <= maxBytes) return blob;
    }
  }

  if (!lastBlob) throw new Error("Nao foi possivel codificar a imagem como WebP.");
  if (lastBlob.size > maxBytes) {
    throw new Error("Imagem continua acima do limite apos compressao.");
  }
  return lastBlob;
}

async function convertImageToWebp(
  file: File,
  preset: ImagePreset = DEFAULT_IMAGE_PRESET
): Promise<{ primary: File; thumbnail: File | null }> {
  if (!IMAGE_TYPES_TO_CONVERT.has(file.type)) {
    const looksLikeImage = file.type.startsWith("image/")
      || /\.(avif|bmp|gif|heic|jpe?g|png|svg|tiff?|webp)$/i.test(file.name);
    if (looksLikeImage && file.size > MAX_UNCONVERTED_IMAGE_BYTES) {
      throw new Error("Formato de imagem nao suportado para compressao acima de 2 MB.");
    }
    return { primary: file, thumbnail: null };
  }

  try {
    const bitmap = await createImageBitmap(file);
    try {
      const primaryBlob = await encodeBitmapToWebp(
        bitmap,
        preset.maxWidth,
        preset.maxHeight,
        preset.maxBytes,
        preset.quality,
      );
      const thumbnailBlob = await encodeBitmapToWebp(
        bitmap,
        preset.thumbnailWidth,
        preset.thumbnailHeight,
        preset.thumbnailMaxBytes,
        0.72,
      );
      const baseName = file.name.replace(/\.[^.]+$/, "");
      return {
        primary: new File([primaryBlob], `${baseName}.webp`, { type: "image/webp" }),
        thumbnail: new File([thumbnailBlob], `${baseName}.webp`, { type: "image/webp" }),
      };
    } finally {
      bitmap.close();
    }
  } catch (error) {
    console.warn("[uploadImage] Falha ao otimizar imagem; upload cancelado para evitar enviar o original pesado:", error);
    throw error;
  }
}

/**
 * Faz o upload de uma imagem para o bucket do Supabase.
 * @param bucket Nome do bucket (ex: 'business-images')
 * @param path Caminho interno no bucket (ex: 'logos/meu-negocio.png')
 * @param file O arquivo File vindo do input HTML
 */
export async function uploadImage(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  try {
    const preset = getImagePresetFromPath(path);
    const variants = await convertImageToWebp(file, preset);
    const uploadFile = variants.primary;
    const pathWithoutExtension = path.replace(/\.[^./]+$/, "");
    const thumbnailPath = `${pathWithoutExtension}__thumb.webp`;
    let thumbnailUploaded = false;

    if (variants.thumbnail) {
      const { error: thumbnailError } = await supabase.storage
        .from(bucket)
        .upload(thumbnailPath, variants.thumbnail, {
          upsert: true,
          cacheControl: IMAGE_CACHE_CONTROL,
          contentType: "image/webp",
        });
      thumbnailUploaded = !thumbnailError;
      if (thumbnailError) {
        console.warn("[uploadImage] A miniatura falhou; a imagem principal sera publicada sem variante:", thumbnailError.message);
      }
    }

    const normalizedPath = uploadFile.type === "image/webp"
      ? `${pathWithoutExtension}${thumbnailUploaded ? "__full" : ""}.webp`
      : path;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(normalizedPath, uploadFile, {
        upsert: true,
        cacheControl: IMAGE_CACHE_CONTROL,
        contentType: uploadFile.type || undefined,
      });

    if (error) {
      console.error("[uploadImage] Erro no upload:", error.message);
      if (thumbnailUploaded) {
        await supabase.storage.from(bucket).remove([thumbnailPath]);
      }
      return null;
    }

    // Retorna a URL pública
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("[uploadImage] Erro inesperado:", err);
    return null;
  }
}

export async function removePublicImageUrls(
  bucket: string,
  urls: string[],
): Promise<{ ok: boolean; error?: string }> {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const paths = urls.flatMap((url) => {
    const markerIndex = url.indexOf(marker);
    if (markerIndex < 0) return [];
    try {
      const path = decodeURIComponent(url.slice(markerIndex + marker.length).split("?")[0]);
      return path.endsWith("__full.webp")
        ? [path, path.replace(/__full\.webp$/i, "__thumb.webp")]
        : [path];
    } catch {
      return [];
    }
  });
  if (paths.length === 0) return { ok: true };

  const { error } = await supabase.storage.from(bucket).remove(paths);
  return { ok: !error, error: error?.message };
}

/**
 * Helper para gerar caminhos únicos de imagem
 */
export function generateImagePath(
  businessId: string,
  type: string,
  fileName: string
): string {
  const extension = fileName.split(".").pop();
  const timestamp = Date.now();
  return `${businessId}/${type}_${timestamp}.${extension}`;
}
