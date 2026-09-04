import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || "business-images";
const IMAGE_CACHE_CONTROL = "31536000";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listAll(prefix = "") {
  const out = [];
  const queue = [prefix];

  while (queue.length) {
    const current = queue.shift();
    const { data, error } = await supabase.storage.from(BUCKET).list(current, { limit: 1000 });
    if (error) throw error;

    for (const item of data || []) {
      if (!item.name) continue;
      const full = current ? `${current}/${item.name}` : item.name;
      if (!item.id) {
        queue.push(full);
      } else {
        out.push(full);
      }
    }
  }

  return out;
}

function isImageFile(path) {
  return /\.(avif|gif|jpe?g|png|webp|bmp|tiff?)$/i.test(path);
}

async function main() {
  const files = await listAll("");
  const targets = files.filter(isImageFile);
  console.log(`Encontrados ${targets.length} arquivos de imagem para regravar o cache.`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const path of targets) {
    try {
      const { data: downloadData, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
      if (downloadError || !downloadData) {
        console.warn(`Falha no download: ${path}`);
        failed += 1;
        continue;
      }

      const arrayBuffer = await downloadData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType: downloadData.type || undefined,
          upsert: true,
          cacheControl: IMAGE_CACHE_CONTROL,
        });

      if (uploadError) {
        console.warn(`Falha ao atualizar cache: ${path}`);
        failed += 1;
        continue;
      }

      updated += 1;
      console.log(`Atualizado: ${path}`);
    } catch (err) {
      console.warn(`Falha inesperada em ${path}:`, err?.message || err);
      skipped += 1;
    }
  }

  console.log("Atualização de cache finalizada.");
  console.log(`Resumo: atualizados=${updated}, ignorados=${skipped}, falhas=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
