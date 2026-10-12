import { describe, expect, it } from "vitest";
import { getErrorPageMeta, getStaticPageMeta } from "@/lib/seo/staticPageMeta";

describe("static route SEO metadata", () => {
  it.each([
    ["/entrar", "Entrar | Caramelinho.com"],
    ["/cadastro", "Criar conta | Caramelinho.com"],
    ["/redefinir-senha", "Redefinir senha | Caramelinho.com"],
    ["/perfil", "Meu perfil | Caramelinho.com"],
    ["/negocio/wizard", "Cadastrar negócio | Caramelinho.com"],
    ["/marketplace/novo", "Publicar anúncio | Marketplace | Caramelinho"],
    ["/marketplace/editar/abc123", "Editar anúncio | Marketplace | Caramelinho"],
    ["/preview/negocio/abc123", "Pré-visualização de negócio | Caramelinho.com"],
  ])("provides route-specific metadata for %s", (path, expectedTitle) => {
    expect(getStaticPageMeta(path)?.title).toBe(expectedTitle);
    expect(getStaticPageMeta(path)?.description).toBeTruthy();
  });

  it("normalizes a trailing slash and leaves dynamic SEO routes to their page builders", () => {
    expect(getStaticPageMeta("/contato/")?.title).toBe("Contato | Caramelinho.com");
    expect(getStaticPageMeta("/marketplace/ca/qc/montreal/item")).toBeNull();
    expect(getStaticPageMeta("/buscar")).toBeNull();
  });

  it("provides shared metadata for not-found and removed pages", () => {
    expect(getErrorPageMeta()).toEqual({
      title: "Página não encontrada | Caramelinho.com",
      description: expect.any(String),
    });
    expect(getErrorPageMeta(true)).toEqual({
      title: "Negócio removido | Caramelinho",
      description: "Este negócio foi removido e este endereço não será reutilizado.",
    });
  });
});
