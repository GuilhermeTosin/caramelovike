import { createElement, type ComponentProps, type ComponentType } from "react";

type LazyPageComponent = ComponentType<any>;

function createLazyPage<T extends LazyPageComponent>(load: () => Promise<{ default: T }>) {
  let modulePromise: Promise<{ default: T }> | null = null;
  let loadedComponent: T | null = null;
  const loadOnce = () => {
    modulePromise ??= load().then((module) => {
      loadedComponent = module.default;
      return module;
    });
    return modulePromise;
  };

  function LazyPage(props: ComponentProps<T>) {
    if (loadedComponent) {
      return createElement(loadedComponent, props);
    }

    throw loadOnce();
  }

  return {
    Component: LazyPage,
    preload: loadOnce,
  };
}

const HomeV2Page = createLazyPage(() => import("@/pages/HomeV2"));
const SearchResultsPage = createLazyPage(() => import("@/pages/SearchResults"));
const BusinessDirectoryPageRoute = createLazyPage(() => import("@/pages/BusinessDirectoryPage"));
const RegisterPage = createLazyPage(() => import("@/pages/Register"));
const LoginPage = createLazyPage(() => import("@/pages/Login"));
const ResetPasswordPage = createLazyPage(() => import("@/pages/ResetPassword"));
const UserProfilePage = createLazyPage(() => import("@/pages/UserProfile"));
const VerifiedBusinessInfoPage = createLazyPage(() => import("@/pages/VerifiedBusinessInfo"));
const EventPageRoute = createLazyPage(() => import("@/pages/EventPage"));
const BusinessShortLinkPage = createLazyPage(() => import("@/pages/BusinessShortLink"));
const AboutPageRoute = createLazyPage(() => import("@/pages/AboutPage"));
const ContactPageRoute = createLazyPage(() => import("@/pages/ContactPage"));
const PrivacyPageRoute = createLazyPage(() => import("@/pages/PrivacyPage"));
const TermsPageRoute = createLazyPage(() => import("@/pages/TermsPage"));
const BusinessWizardPageRoute = createLazyPage(() => import("@/pages/BusinessWizardPage"));
const NotFoundPage = createLazyPage(() => import("@/pages/NotFound"));

type MarketplaceModule = typeof import("@/pages/MarketplacePage");
let marketplaceModulePromise: Promise<MarketplaceModule> | null = null;
function loadMarketplaceModule() {
  marketplaceModulePromise ??= import("@/pages/MarketplacePage");
  return marketplaceModulePromise;
}

const MarketplacePageRoute = createLazyPage(() => loadMarketplaceModule().then(({ default: component }) => ({ default: component })));
const MarketplaceCreatePageRoute = createLazyPage(() => loadMarketplaceModule().then(({ MarketplaceCreatePage: component }) => ({ default: component })));
const MarketplaceEditPageRoute = createLazyPage(() => loadMarketplaceModule().then(({ MarketplaceEditPage: component }) => ({ default: component })));
const MarketplaceSellerPageRoute = createLazyPage(() => loadMarketplaceModule().then(({ MarketplaceSellerPage: component }) => ({ default: component })));
const MarketplaceBusinessSellerPageRoute = createLazyPage(() => loadMarketplaceModule().then(({ MarketplaceBusinessSellerPage: component }) => ({ default: component })));
const MarketplaceListingPageRoute = createLazyPage(() => loadMarketplaceModule().then(({ MarketplaceListingPage: component }) => ({ default: component })));

export const HomeV2 = HomeV2Page.Component;
export const SearchResults = SearchResultsPage.Component;
export const BusinessDirectoryPage = BusinessDirectoryPageRoute.Component;
export const Register = RegisterPage.Component;
export const Login = LoginPage.Component;
export const ResetPassword = ResetPasswordPage.Component;
export const UserProfile = UserProfilePage.Component;
export const VerifiedBusinessInfo = VerifiedBusinessInfoPage.Component;
export const EventPage = EventPageRoute.Component;
export const BusinessShortLink = BusinessShortLinkPage.Component;
export const AboutPage = AboutPageRoute.Component;
export const ContactPage = ContactPageRoute.Component;
export const PrivacyPage = PrivacyPageRoute.Component;
export const TermsPage = TermsPageRoute.Component;
export const BusinessWizardPage = BusinessWizardPageRoute.Component;
export const NotFound = NotFoundPage.Component;
export const MarketplacePage = MarketplacePageRoute.Component;
export const MarketplaceCreatePage = MarketplaceCreatePageRoute.Component;
export const MarketplaceEditPage = MarketplaceEditPageRoute.Component;
export const MarketplaceSellerPage = MarketplaceSellerPageRoute.Component;
export const MarketplaceBusinessSellerPage = MarketplaceBusinessSellerPageRoute.Component;
export const MarketplaceListingPage = MarketplaceListingPageRoute.Component;

function isBusinessRoute(pathname: string) {
  return pathname.startsWith("/preview/negocio/")
    || /^\/[a-z]{2}\/[^/]+$/i.test(pathname)
    || /^\/[a-z]{2}\/[a-z]{2}\/[^/]+\/[^/]+$/i.test(pathname);
}

export function preloadAppRoute(pathname: string) {
  if (pathname === "/" || pathname === "/index2") return HomeV2Page.preload();
  if (pathname === "/buscar" || pathname === "/eventos") return SearchResultsPage.preload();
  if (pathname === "/negocios" || pathname.startsWith("/negocios/")) return BusinessDirectoryPageRoute.preload();
  if (pathname === "/cadastro") return RegisterPage.preload();
  if (pathname === "/entrar") return LoginPage.preload();
  if (pathname === "/redefinir-senha") return ResetPasswordPage.preload();
  if (pathname === "/perfil") return UserProfilePage.preload();
  if (pathname === "/negocio-verificado") return VerifiedBusinessInfoPage.preload();
  if (pathname.startsWith("/eventos/")) return EventPageRoute.preload();
  if (pathname.startsWith("/go/")) return BusinessShortLinkPage.preload();
  if (isBusinessRoute(pathname)) return Promise.resolve();
  if (pathname === "/sobre") return AboutPageRoute.preload();
  if (pathname === "/contato") return ContactPageRoute.preload();
  if (pathname === "/privacidade") return PrivacyPageRoute.preload();
  if (pathname === "/termos") return TermsPageRoute.preload();
  if (pathname === "/negocio/wizard") return BusinessWizardPageRoute.preload();
  if (pathname === "/marketplace") return MarketplacePageRoute.preload();
  if (pathname === "/marketplace/novo") return MarketplaceCreatePageRoute.preload();
  if (pathname.startsWith("/marketplace/editar/")) return MarketplaceEditPageRoute.preload();
  if (pathname.startsWith("/marketplace/vendedor/")) return MarketplaceSellerPageRoute.preload();
  if (pathname.startsWith("/marketplace/negocio/")) return MarketplaceBusinessSellerPageRoute.preload();
  if (pathname.startsWith("/marketplace/")) return MarketplaceListingPageRoute.preload();
  return NotFoundPage.preload();
}
