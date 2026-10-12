import { describe, expect, it } from "vitest";
import { buildMarketplaceListingSeoMeta, buildMarketplaceSellerSeoMeta } from "@/lib/seo/marketplaceMeta";
import { buildSearchSeoMeta } from "@/lib/seo/searchMeta";

describe("shared page SEO metadata", () => {
  it("builds the same search title and description from filter values on SSR and client", () => {
    expect(buildSearchSeoMeta({ categoryLabel: "Restaurantes e Alimentação", city: "Montreal", query: "coxinha" })).toEqual({
      title: "Buscar negócios brasileiros em Montreal | Caramelinho.com",
      description: "Encontre restaurantes, padarias e cafés em Montreal para coxinha. Compare opções perto de você e fale direto com os negócios.",
    });
  });

  it("uses general search metadata when no category, city, or query is selected", () => {
    expect(buildSearchSeoMeta({})).toEqual({
      title: "Buscar negócios brasileiros | Caramelinho.com",
      description: "Encontre negócios e serviços. Compare opções perto de você e fale direto com os negócios.",
    });
  });

  it("builds Marketplace detail and seller metadata from shared functions", () => {
    expect(buildMarketplaceListingSeoMeta({ title: "Jaqueta", city: "Montreal" })).toEqual({
      title: "Jaqueta | Marketplace | Caramelinho",
      description: "Jaqueta em Montreal. Veja preço, condição e entre em contato com o vendedor no Marketplace do Caramelinho.",
    });
    expect(buildMarketplaceSellerSeoMeta(" Ana ").title).toBe("Ana | Vendedor do Marketplace | Caramelinho");
  });
});
