export const MARKETPLACE_INDEX_SEO_META = {
  title: "Marketplace | Caramelinho",
  description: "Compre, venda e encontre produtos perto de você no Marketplace do Caramelinho.",
};

export function buildMarketplaceListingSeoMeta(listing: { title: string; city: string }) {
  return {
    title: `${listing.title} | Marketplace | Caramelinho`,
    description: `${listing.title} em ${listing.city}. Veja preço, condição e entre em contato com o vendedor no Marketplace do Caramelinho.`,
  };
}

export function buildMarketplaceSellerSeoMeta(name: string | null | undefined) {
  const sellerName = name?.trim() || "Vendedor";
  return {
    title: `${sellerName} | Vendedor do Marketplace | Caramelinho`,
    description: `Veja os anúncios ativos e as avaliações dos negócios de ${sellerName} no Marketplace do Caramelinho.`,
  };
}

export function buildMarketplaceBusinessSellerSeoMeta(name: string) {
  return {
    title: `${name} | Marketplace | Caramelinho`,
    description: `Veja os anúncios ativos e as avaliações de ${name} no Marketplace do Caramelinho.`,
  };
}
