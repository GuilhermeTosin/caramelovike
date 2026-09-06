export const MARKETPLACE_CATEGORIES = [
  { slug: "eletronicos", name: "Eletrônicos" },
  { slug: "casa-e-moveis", name: "Casa e móveis" },
  { slug: "instrumentos-musicais", name: "Instrumentos musicais" },
  { slug: "roupas-e-acessorios", name: "Roupas e acessórios" },
  { slug: "bebes-e-criancas", name: "Bebês e crianças" },
  { slug: "esportes-e-lazer", name: "Esportes e lazer" },
  { slug: "automoveis-e-acessorios", name: "Automóveis e acessórios" },
  { slug: "ferramentas", name: "Ferramentas" },
  { slug: "livros", name: "Livros" },
  { slug: "produtos-brasileiros", name: "Produtos brasileiros" },
  { slug: "beleza-e-cuidados-pessoais", name: "Beleza e cuidados pessoais" },
  { slug: "outros", name: "Outros" },
] as const;

export type MarketplaceCategorySlug = (typeof MARKETPLACE_CATEGORIES)[number]["slug"];

export const MAX_MARKETPLACE_KEYWORDS = 10;

export function normalizeMarketplaceKeywords(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLocaleLowerCase("pt-BR")).filter(Boolean))].slice(0, MAX_MARKETPLACE_KEYWORDS);
}

export function getMarketplaceCategoryBySlug(slug: string) {
  return MARKETPLACE_CATEGORIES.find((category) => category.slug === slug) || null;
}

export function getMarketplaceCategoryName(slug: string) {
  return getMarketplaceCategoryBySlug(slug)?.name || "Outros";
}

export function slugifyMarketplace(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "anuncio";
}
