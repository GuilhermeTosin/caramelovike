import { BrowserRouter, Route, Routes, StaticRouter, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { setCanonical, setRobots, upsertMetaTag } from "@/lib/seo";
import { getInternalSearchCanonicalPath, getInternalSearchRobots } from "@/lib/seo/searchIndexing";
import type { BusinessFrontend, CommunityEvent } from "@/types/database";
import type { HomePublicSnapshot } from "@/lib/homeSnapshot";
import type { DirectoryPageSnapshot } from "@/lib/directorySnapshot";
import type { PublicSearchPageSnapshot } from "@/lib/search/publicSearchPage";
import Home from "@/pages/Home";
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
import { EnglishAboutPage, EnglishContactPage, EnglishPrivacyPage, EnglishTermsPage } from "@/pages/EnglishPublicPages";
import NotFound from "@/pages/NotFound";
import BusinessPageRoute from "@/pages/BusinessPageRoute";
import EnglishBusinessPage from "@/pages/EnglishBusinessPage";
import GoogleAnalytics from "@/components/GoogleAnalytics";

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
    const privatePaths = new Set(["/cadastro", "/entrar", "/redefinir-senha", "/perfil", "/negocio/wizard"]);
    const isPrivatePreviewPath = pathname.startsWith("/preview/negocio/");
    const canonicalPathname = isBusinessPage ? pathname : getInternalSearchCanonicalPath(pathname);
    const canonicalSearch = isBusinessPage || getInternalSearchRobots(pathname) ? "" : search;
    const canonicalPath = `${canonicalPathname}${canonicalSearch}`;
    const canonicalUrl = `${window.location.origin}${canonicalPath}`;

    setCanonical(canonicalUrl);
    upsertMetaTag("property", "og:url", canonicalUrl);

    if (privatePaths.has(pathname) || isPrivatePreviewPath) {
      setRobots("noindex,nofollow,noarchive");
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
  initialAvailableLocations?: Array<{
    countryCode: string;
    countryName: string;
    states: { code: string; name: string; cities: string[] }[];
  }>;
  initialSearchSuggestions?: string[];
  initialSearchSnapshot?: PublicSearchPageSnapshot;
  initialHomeSnapshot?: HomePublicSnapshot;
  initialDirectorySnapshot?: DirectoryPageSnapshot;
  initialEvent?: CommunityEvent | null;
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
  initialAvailableLocations = [],
  initialSearchSuggestions = [],
  initialSearchSnapshot,
  initialHomeSnapshot,
  initialDirectorySnapshot,
  initialEvent = null,
  isBusinessPage = false,
}: AppProps = {}) {
  return (
    <AuthProvider>
      <AppRouter router={router} location={location}>
        <LocaleProvider>
        <ScrollToTop />
        <CanonicalManager isBusinessPage={isBusinessPage} />
        <GoogleAnalytics />
        <Routes>
          <Route
            path="/"
            element={
              <Home
                initialBusinesses={initialBusinesses}
                initialBusinessesAreSearchReady={initialBusinessesAreSearchReady}
                initialFeaturedBusinesses={initialFeaturedBusinesses}
                initialAvailableLocations={initialAvailableLocations}
                initialSearchSuggestions={initialSearchSuggestions}
                initialSearchSnapshot={initialSearchSnapshot}
                initialHomeSnapshot={initialHomeSnapshot}
              />
            }
          />
          <Route
            path="/en"
            element={
              <Home
                initialBusinesses={initialBusinesses}
                initialBusinessesAreSearchReady={initialBusinessesAreSearchReady}
                initialFeaturedBusinesses={initialFeaturedBusinesses}
                initialAvailableLocations={initialAvailableLocations}
                initialSearchSuggestions={initialSearchSuggestions}
                initialSearchSnapshot={initialSearchSnapshot}
                initialHomeSnapshot={initialHomeSnapshot}
              />
            }
          />
                    <Route
            path="/en/search"
            element={
              <SearchResults
                initialBusinesses={initialBusinesses}
                initialBusinessesAreSearchReady={initialBusinessesAreSearchReady}
                initialAvailableLocations={initialAvailableLocations}
                initialSearchSuggestions={initialSearchSuggestions}
                initialSearchSnapshot={initialSearchSnapshot}
              />
            }
          />
          <Route
            path="/buscar"
            element={
              <SearchResults
                initialBusinesses={initialBusinesses}
                initialBusinessesAreSearchReady={initialBusinessesAreSearchReady}
                initialAvailableLocations={initialAvailableLocations}
                initialSearchSuggestions={initialSearchSuggestions}
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
          <Route path="/en/businesses" element={<BusinessDirectoryPage initialDirectorySnapshot={initialDirectorySnapshot} />} />
          <Route path="/en/businesses/:countryCode" element={<BusinessDirectoryPage initialDirectorySnapshot={initialDirectorySnapshot} />} />
          <Route path="/en/businesses/:countryCode/:stateCode" element={<BusinessDirectoryPage initialDirectorySnapshot={initialDirectorySnapshot} />} />
          <Route path="/en/businesses/:countryCode/:stateCode/:citySlug/pagina/:page" element={<BusinessDirectoryPage initialDirectorySnapshot={initialDirectorySnapshot} />} />
          <Route path="/en/businesses/:countryCode/:stateCode/:citySlug" element={<BusinessDirectoryPage initialDirectorySnapshot={initialDirectorySnapshot} />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />
          <Route path="/perfil" element={<UserProfile />} />
          <Route path="/negocio-verificado" element={<VerifiedBusinessInfo />} />
          <Route path="/en/about" element={<EnglishAboutPage />} />
          <Route path="/en/contact" element={<EnglishContactPage />} />
          <Route path="/en/privacy" element={<EnglishPrivacyPage />} />
          <Route path="/en/terms" element={<EnglishTermsPage />} />
          <Route path="/sobre" element={<AboutPage />} />
          <Route path="/contato" element={<ContactPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
          <Route path="/termos" element={<TermsPage />} />
          <Route path="/eventos/:eventId" element={<EventPage initialEvent={initialEvent} />} />
          <Route path="/negocio/wizard" element={<BusinessWizardPage />} />
          <Route path="/preview/negocio/:businessId" element={<BusinessPageRoute previewMode />} />
          <Route path="/go/:businessSlug" element={<BusinessShortLink />} />
          <Route path="/en/:countryCode/:stateCode/:city/:businessName" element={<EnglishBusinessPage initialBusiness={initialBusiness} />} />
          <Route path="/:countryCode/:stateCode/:city/:businessName" element={<BusinessPageRoute initialBusiness={initialBusiness} initialBusinesses={initialBusinesses} initialSimilarBusinesses={initialSimilarBusinesses} />} />
          <Route path="/:countryCode/:businessName" element={<BusinessPageRoute initialBusiness={initialBusiness} initialBusinesses={initialBusinesses} initialSimilarBusinesses={initialSimilarBusinesses} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </LocaleProvider>
      </AppRouter>
      <Toaster richColors position="top-center" />
      <DeferredAnalytics />
    </AuthProvider>
  );
}
