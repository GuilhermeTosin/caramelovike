import { getSiteContent } from "@/data/siteContent";

export type StaticPageMeta = {
  title: string;
  description: string;
};

const STATIC_PAGE_META: Record<string, StaticPageMeta> = {
  "/sobre": {
    title: "Sobre Nós | Caramelinho.com",
    description: "Conheça o Caramelinho, a plataforma que conecta brasileiros no exterior a negócios e serviços da comunidade.",
  },
  "/contato": {
    title: "Contato | Caramelinho.com",
    description: "Fale com o Caramelinho para tirar dúvidas, obter suporte ou conversar sobre parcerias.",
  },
  "/privacidade": {
    title: "Política de Privacidade | Caramelinho.com",
    description: "Entenda como o Caramelinho coleta, utiliza e protege seus dados pessoais.",
  },
  "/termos": {
    title: "Termos e Condições | Caramelinho.com",
    description: "Leia os termos e condições de uso da plataforma Caramelinho.",
  },
  "/negocio-verificado": {
    title: "Verificação de negócio | Caramelinho.com",
    description: "Entenda como solicitar a verificação do seu negócio no Caramelinho e exiba um selo de confiança para seus clientes.",
  },
  "/entrar": {
    title: "Entrar | Caramelinho.com",
    description: "Acesse sua conta Caramelinho para gerenciar seus negócios, anúncios e mensagens.",
  },
  "/cadastro": {
    title: "Criar conta | Caramelinho.com",
    description: "Crie sua conta gratuita no Caramelinho e conecte-se à comunidade brasileira no exterior.",
  },
  "/redefinir-senha": {
    title: "Redefinir senha | Caramelinho.com",
    description: "Solicite ou conclua a redefinição de senha da sua conta Caramelinho.",
  },
  "/perfil": {
    title: "Meu perfil | Caramelinho.com",
    description: "Gerencie seu perfil, negócios, anúncios e mensagens no Caramelinho.",
  },
  "/negocio/wizard": {
    title: "Cadastrar negócio | Caramelinho.com",
    description: "Cadastre seu negócio brasileiro no Caramelinho para ser encontrado pela comunidade no exterior.",
  },
  "/marketplace/novo": {
    title: "Publicar anúncio | Marketplace | Caramelinho",
    description: "Publique um anúncio no Marketplace do Caramelinho e encontre pessoas da comunidade brasileira.",
  },
};

const MARKETPLACE_EDIT_META: StaticPageMeta = {
  title: "Editar anúncio | Marketplace | Caramelinho",
  description: "Atualize as informações e fotos do seu anúncio no Marketplace do Caramelinho.",
};

const BUSINESS_PREVIEW_META: StaticPageMeta = {
  title: "Pré-visualização de negócio | Caramelinho.com",
  description: "Confira como a página do seu negócio será exibida no Caramelinho.",
};

export function getStaticPageMeta(pathname: string): StaticPageMeta | null {
  const normalizedPath = pathname.replace(/\/+$/u, "") || "/";
  if (normalizedPath in STATIC_PAGE_META) return STATIC_PAGE_META[normalizedPath];
  if (/^\/marketplace\/editar\/[^/]+$/u.test(normalizedPath)) return MARKETPLACE_EDIT_META;
  if (/^\/preview\/negocio\/[^/]+$/u.test(normalizedPath)) return BUSINESS_PREVIEW_META;
  return null;
}

export function getErrorPageMeta(isGone = false): StaticPageMeta {
  const content = getSiteContent();
  return {
    title: isGone ? "Negócio removido | Caramelinho" : content.seo.notFoundTitle,
    description: isGone
      ? "Este negócio foi removido e este endereço não será reutilizado."
      : content.seo.notFoundDescription,
  };
}
