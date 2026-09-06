import { BrowserRouter, Navigate, Route, Routes, StaticRouter, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { setCanonical, setRobots, upsertMetaTag } from "@/lib/seo";
import { getInternalSearchCanonicalPath, getInternalSearchRobots } from "@/lib/seo/searchIndexing";
import type { BusinessFrontend, CommunityEvent } from "@/types/database";
import type { HomePublicSnapshot } from "@/lib/homeSnapshot";
import type { DirectoryPageSnapshot } from "@/lib/directorySnapshot";
import type { PublicSearchPageSnapshot } from "@/lib/search/publicSearchPage";
import type { MarketplaceSnapshot } from "@/lib/marketplaceSnapshot";
import { DEFAULT_CATEGORY_SYNONYMS } from "@/services/searchPreferences";
import HomeV2 from "@/pages/HomeV2";
import SearchResults from "@/pages/SearchResults";
import BusinessDirectoryPage from "@/pages/BusinessDirectoryPage";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import UserProfile from "@/pages/UserProfile";
import VerifiedBusinessInfo from "@/pages/VerifiedBusinessInfo";
import EventPage from "@/pages/EventPage";
import BusinessShortLink from "@/pages/BusinessShortLink";
import BusinessWizardPage from "@/pages/BusinessWizardPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import NotFound from "@/pages/NotFound";
import BusinessPageRoute from "@/pages/BusinessPageRoute";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import SiteHeader from "@/components/SiteHeader";
import MarketplacePage, { MarketplaceCreatePage, MarketplaceEditPage, MarketplaceListingPage } from "@/pages/MarketplacePage";

const VercelAnalytics = lazy(async () => {
  const module = await import("@vercel/analytics/react");
  return { default: module.Analytics };
});

function DeferredAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setEnabled(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  return enabled ? (
    <Suspense fallback={null}>
      <VercelAnalytics />
    </Suspense>
  ) : null;
}
function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return null;
}

function CanonicalManager({ isBusinessPage = false }: { isBusinessPage?: boolean }) {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const privatePaths = new Set([
      "/cadastro", "/entrar", "/redefinir-senha", "/perfil", "/negocio/wizard",
    ]);
    const isPrivatePreviewPath = pathname.startsWith("/preview/negocio/");
    const isExperimentalHome = pathname === "/index2";
    const isMarketplacePath = pathname === "/marketplace" || pathname.startsWith("/marketplace/");
    const canonicalPathname = isExperimentalHome ? "/" : isBusinessPage || isMarketplacePath ? pathname : getInternalSearchCanonicalPath(pathname);
    const canonicalSearch = isExperimentalHome || isBusinessPage || isMarketplacePath || getInternalSearchRobots(pathname) ? "" : search;
    const canonicalPath = `${canonicalPathname}${canonicalSearch}`;
    const canonicalUrl = `${window.location.origin}${canonicalPath}`;

    setCanonical(canonicalUrl);
    upsertMetaTag("property", "og:url", canonicalUrl);

    if (privatePaths.has(pathname) || isPrivatePreviewPath) {
      setRobots("noindex,nofollow,noarchive");
      return;
    }

    if (isExperimentalHome) {
      setRobots("noindex,follow");
      return;
    }

    const searchRobots = getInternalSearchRobots(pathname);
    if (searchRobots) {
      setRobots(searchRobots);
      return;
    }

    setRobots("index,follow,max-image-preview:large");
  }, [isBusinessPage, pathname, search]);

  return null;
}

type AppProps = {
  router?: "browser" | "static";
  location?: string;
  initialBusiness?: BusinessFrontend | null;
  initialSimilarBusinesses?: BusinessFrontend[];
  initialBusinesses?: BusinessFrontend[];
  initialBusinessesAreSearchReady?: boolean;
  initialFeaturedBusinesses?: BusinessFrontend[];
  initialRecentBusinesses?: BusinessFrontend[];
  initialAvailableLocations?: Array<{
    countryCode: string;
    countryName: string;
    states: { code: string; name: string; cities: string[] }[];
  }>;
  initialSearchSuggestions?: string[];
  initialSearchSynonyms?: Record<string, string[]>;
  initialSearchSnapshot?: PublicSearchPageSnapshot;
  initialHomeSnapshot?: HomePublicSnapshot;
  initialDirectorySnapshot?: DirectoryPageSnapshot;
  initialEvent?: CommunityEvent | null;
  initialMarketplaceSnapshot?: MarketplaceSnapshot;
  initialMarketplaceListing?: import("@/types/database").MarketplaceListing | null;
  isBusinessPage?: boolean;
};

function AppRouter({ router = "browser", location, children }: AppProps & { children: ReactNode }) {
  if (router === "static") {
    return <StaticRouter location={location || "/"}>{children}</StaticRouter>;
  }

  return <BrowserRouter>{children}</BrowserRouter>;
}

export default function App({
  router = "browser",
  location,
  initialBusiness = null,
  initialSimilarBusinesses = [],
  initialBusinesses = [],
  initialBusinessesAreSearchReady = false,
  initialFeaturedBusinesses = [],
  initialRecentBusinesses = [],
  initialAvailableLocations = [],
  initialSearchSuggestions = [],
  initialSearchSynonyms = DEFAULT_CATEGORY_SYNONYMS,
  initialSearchSnapshot,
  initialHomeSnapshot,
  initialDirectorySnapshot,
  initialEvent = null,
  initialMarketplaceSnapshot,
  initialMarketplaceListing = null,
  isBusinessPage = false,
}: AppProps = {}) {
  return (
    <AuthProvider>
      <AppRouter router={router} location={location}>
        <ScrollToTop />
        <CanonicalManager isBusinessPage={isBusinessPage} />
        <GoogleAnalytics />
        <SiteHeader
          initialAvailableLocations={initialAvailableLocations}
          initialSearchSuggestions={initialSearchSuggestions}
        />
        <Routes>
          <Route
            path="/"
            element={
              <HomeV2
                initialFeaturedBusinesses={initialFeaturedBusinesses}
                initialRecentBusinesses={initialRecentBusinesses}
                initialAvailableLocations={initialAvailableLocations}
                initialSearchSuggestions={initialSearchSuggestions}
                initialHomeSnapshot={initialHomeSnapshot}
                initialMarketplaceSnapshot={initialMarketplaceSnapshot}
              />
            }
          />
          <Route
            path="/index2"
            element={<Navigate to="/" replace />}
          />
          <Route
            path="/buscar"
            element={
              <SearchResults
                initialBusinesses={initialBusinesses}
                initialBusinessesAreSearchReady={initialBusinessesAreSearchReady}
                initialAvailableLocations={initialAvailableLocations}
                initialSearchSynonyms={initialSearchSynonyms}
                initialSearchSnapshot={initialSearchSnapshot}
              />
            }
          />
          <Route path="/negocios" element={<BusinessDirectoryPage initialDirectorySnapshot={initialDirectorySnapshot} />} />
          <Route path="/negocios/:countryCode" element={<BusinessDirectoryPage initialDirectorySnapshot={initialDirectorySnapshot} />} />
          <Route path="/negocios/:countryCode/:stateCode" element={<BusinessDirectoryPage initialDirectorySnapshot={initialDirectorySnapshot} />} />
          <Route path="/negocios/:countryCode/:stateCode/:citySlug/:categorySlug/pagina/:page" element={<BusinessDirectoryPage initialDirectorySnapshot={initialDirectorySnapshot} />} />
          <Route path="/negocios/:countryCode/:stateCode/:citySlug/:categorySlug" element={<BusinessDirectoryPage initialDirectorySnapshot={initialDirectorySnapshot} />} />
          <Route path="/negocios/:countryCode/:stateCode/:citySlug" element={<BusinessDirectoryPage initialDirectorySnapshot={initialDirectorySnapshot} />} />
          <Route path="/negocios/:countryCode/:stateCode/:citySlug/pagina/:page" element={<BusinessDirectoryPage initialDirectorySnapshot={initialDirectorySnapshot} />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />
          <Route path="/perfil" element={<UserProfile />} />
          <Route path="/negocio-verificado" element={<VerifiedBusinessInfo />} />
          <Route path="/sobre" element={<AboutPage />} />
          <Route path="/contato" element={<ContactPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
          <Route path="/termos" element={<TermsPage />} />
          <Route path="/eventos" element={<Navigate to="/buscar?eventos=1" replace />} />
          <Route path="/eventos/:eventId" element={<EventPage initialEvent={initialEvent} />} />
          <Route path="/marketplace" element={<MarketplacePage initialSnapshot={initialMarketplaceSnapshot} />} />
          <Route path="/marketplace/novo" element={<MarketplaceCreatePage />} />
          <Route path="/marketplace/editar/:id" element={<MarketplaceEditPage />} />
          <Route path="/marketplace/:countryCode/:stateCode/:city/:slug" element={<MarketplaceListingPage initialListing={initialMarketplaceListing} />} />
          <Route path="/negocio/wizard" element={<BusinessWizardPage />} />
          <Route path="/preview/negocio/:businessId" element={<BusinessPageRoute previewMode />} />
          <Route path="/go/:businessSlug" element={<BusinessShortLink />} />
          <Route path="/:countryCode/:stateCode/:city/:businessName" element={<BusinessPageRoute initialBusiness={initialBusiness} initialBusinesses={initialBusinesses} initialSimilarBusinesses={initialSimilarBusinesses} />} />
          <Route path="/:countryCode/:businessName" element={<BusinessPageRoute initialBusiness={initialBusiness} initialBusinesses={initialBusinesses} initialSimilarBusinesses={initialSimilarBusinesses} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppRouter>
      <Toaster richColors position="top-center" />
      <DeferredAnalytics />
    </AuthProvider>
  );
}
