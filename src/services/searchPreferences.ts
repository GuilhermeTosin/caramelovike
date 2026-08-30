import { supabase } from "@/lib/supabase";

export type CategorySynonymsMap = Record<string, string[]>;

const STORAGE_KEY = "caramelinho_search_category_synonyms_v1";
const DB_KEY = "category_synonyms";
const FOLLOW_LINKS_BUSINESS_IDS_KEY = "follow_links_business_ids";

export const DEFAULT_CATEGORY_SYNONYMS: CategorySynonymsMap = {
  "Restaurantes e Alimentação": ["restaurante", "restaurantes", "lanchonete", "lanchonetes", "lanches", "padaria", "padarias", "pizzaria", "pizzarias", "churrascaria", "churrascarias", "confeitaria", "confeitarias", "café", "cafés", "comida", "gastronomia", "almoço", "jantar", "marmita"],
  "Alimentação": ["restaurante", "restaurantes", "lanchonete", "lanchonetes", "lanches", "padaria", "padarias", "pizzaria", "pizzarias", "churrascaria", "churrascarias", "confeitaria", "confeitarias", "café", "cafés", "comida", "gastronomia", "almoço", "jantar", "marmita"],
  "Automotivo": ["mecânico", "mecânica", "mecânicos", "mecânicas", "oficina", "oficinas", "carro", "carros", "conserto", "pneu", "pneus", "óleo", "auto", "manutenção", "reparo"],
  "Saúde & Beleza": ["dentista", "dentistas", "médico", "médica", "médicos", "médicas", "clínica", "clínicas", "estética", "salão", "cabelo", "unha", "manicure", "pedicure", "terapia", "psicólogo", "psicóloga", "psicólogos", "psicólogas"],
  "Construção": ["obra", "obras", "reforma", "reformas", "pintor", "pintora", "pintores", "pintoras", "pedreiro", "pedreira", "eletricista", "eletricistas", "encanador", "encanadora", "casa", "apartamento", "telhado"],
  "Advocacia & Traduções": ["advogado", "advogada", "advogados", "advogadas", "jurídico", "lei", "visto", "imigração", "consultoria", "tradutor", "tradutora", "tradutores", "tradutoras", "tradução", "documentos"],
  "Contabilidade": ["contador", "contadora", "contadores", "contadoras", "imposto", "finanças", "investimento", "empresa"],
  "Educação": ["escola", "escolas", "curso", "cursos", "professor", "professora", "professores", "professoras", "aula", "idiomas", "inglês", "francês", "português"],
  "Comércio": ["loja", "lojas", "venda", "produto", "produtos", "mercado", "mercados", "supermercado", "roupa", "acessórios"],
  "Transporte & Mudança": ["mudança", "mudanças", "frete", "entrega", "logística", "caminhão", "envio"],
  "Serviços para Pets": ["pet", "pets", "cachorro", "cães", "gato", "gatos", "banho", "tosa", "veterinário", "veterinária"],
  "Imobiliária": ["casa", "apartamento", "aluguel", "venda", "imóvel", "imóveis", "corretor", "corretora", "corretores", "corretoras"],
  "Cuidados Infantis e de Idosos": ["babá", "babás", "babysitter", "acompanhante", "cuidadora", "cuidador", "cuidadores", "criança", "crianças", "idosos"],
  "Diaristas": ["diarista", "diaristas", "faxina", "limpeza", "limpar", "casa"],
  "Artistas": ["música", "musical", "show", "shows", "banda", "bandas", "cantor", "cantora", "evento", "eventos"],
  "Outros": [],
};

export function getCategorySynonymsConfig(): CategorySynonymsMap {
  if (typeof window === "undefined") return DEFAULT_CATEGORY_SYNONYMS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CATEGORY_SYNONYMS;
    const parsed = JSON.parse(raw) as CategorySynonymsMap;
    return normalizeConfig(parsed);
  } catch {
    return DEFAULT_CATEGORY_SYNONYMS;
  }
}

export function saveCategorySynonymsConfig(config: CategorySynonymsMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function normalizeConfig(input: unknown): CategorySynonymsMap {
  const merged: CategorySynonymsMap = { ...DEFAULT_CATEGORY_SYNONYMS };
  if (!input || typeof input !== "object") return merged;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    merged[key] = Array.from(
      new Set([
        ...(merged[key] || []),
        ...value.map((v) => String(v).trim()).filter(Boolean),
      ])
    );
  }
  return merged;
}

function normalizeBusinessIdList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

export async function getGlobalCategorySynonymsConfig(): Promise<CategorySynonymsMap> {
  try {
    const { data, error } = await supabase
      .from("search_settings")
      .select("value")
      .eq("key", DB_KEY)
      .maybeSingle();

    if (error || !data?.value) {
      return getCategorySynonymsConfig();
    }
    const normalized = normalizeConfig(data.value);
    saveCategorySynonymsConfig(normalized);
    return normalized;
  } catch {
    return getCategorySynonymsConfig();
  }
}

export async function saveGlobalCategorySynonymsConfig(config: CategorySynonymsMap): Promise<boolean> {
  try {
    const payload = normalizeConfig(config);
    const { error } = await supabase.from("search_settings").upsert(
      {
        key: DB_KEY,
        value: payload,
      },
      { onConflict: "key" }
    );
    if (error) return false;
    saveCategorySynonymsConfig(payload);
    return true;
  } catch {
    return false;
  }
}

export async function getFollowLinksBusinessIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("search_settings")
      .select("value")
      .eq("key", FOLLOW_LINKS_BUSINESS_IDS_KEY)
      .maybeSingle();

    if (error || !data?.value) return [];
    return normalizeBusinessIdList(data.value);
  } catch {
    return [];
  }
}

export async function saveFollowLinksBusinessIds(ids: string[]): Promise<boolean> {
  try {
    const payload = normalizeBusinessIdList(ids);
    const { error } = await supabase.from("search_settings").upsert(
      {
        key: FOLLOW_LINKS_BUSINESS_IDS_KEY,
        value: payload,
      },
      { onConflict: "key" }
    );
    return !error;
  } catch {
    return false;
  }
}
