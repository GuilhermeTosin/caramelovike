import { BrowserRouter, Route, Routes, StaticRouter, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { setCanonical, setRobots, upsertMetaTag } from "@/lib/seo";
import type { BusinessFrontend } from "@/types/database";
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
import NotFound from "@/pages/NotFound";
import BusinessPageRoute from "@/pages/BusinessPageRoute";

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return null;
}

function isIndexableSearch(search: string) {
  if (!search) return true;
  const params = new URLSearchParams(search);
  return ["categoria", "cidade", "local", "q"].some((key) => (params.get(key) || "").trim().length > 0);
}

function CanonicalManager() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const privatePaths = new Set(["/cadastro", "/entrar", "/redefinir-senha", "/perfil", "/negocio/wizard"]);
    const isPrivatePreviewPath = pathname.startsWith("/preview/negocio/");
    const isSearchPage = pathname === "/buscar";
    const canonicalPath = isSearchPage && !isIndexableSearch(search) ? pathname : `${pathname}${search}`;
    const canonicalUrl = `${window.location.origin}${canonicalPath}`;

    setCanonical(canonicalUrl);
    upsertMetaTag("property", "og:url", canonicalUrl);

    if (privatePaths.has(pathname) || isPrivatePreviewPath) {
      setRobots("noindex,nofollow,noarchive");
      return;
    }

    if (isSearchPage && search && !isIndexableSearch(search)) {
      setRobots("noindex,follow,max-image-preview:large");
      return;
    }

    setRobots("index,follow,max-image-preview:large");
  }, [pathname, search]);

  return null;
}

type AppProps = {
  router?: "browser" | "static";
  location?: string;
  initialBusiness?: BusinessFrontend | null;
  initialBusinesses?: BusinessFrontend[];
  initialFeaturedBusinesses?: BusinessFrontend[];
  initialAvailableLocations?: Array<{
    countryCode: string;
    countryName: string;
    states: { code: string; name: string; cities: string[] }[];
  }>;
  initialSearchSuggestions?: string[];
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
  initialBusinesses = [],
  initialFeaturedBusinesses = [],
  initialAvailableLocations = [],
  initialSearchSuggestions = [],
}: AppProps = {}) {
  return (
    <AuthProvider>
      <AppRouter router={router} location={location}>
        <ScrollToTop />
        <CanonicalManager />
        <Routes>
          <Route
            path="/"
            element={
              <Home
                initialBusinesses={initialBusinesses}
                initialFeaturedBusinesses={initialFeaturedBusinesses}
                initialAvailableLocations={initialAvailableLocations}
                initialSearchSuggestions={initialSearchSuggestions}
              />
            }
          />
          <Route
            path="/buscar"
            element={
              <SearchResults
                initialBusinesses={initialBusinesses}
                initialAvailableLocations={initialAvailableLocations}
                initialSearchSuggestions={initialSearchSuggestions}
              />
            }
          />
          <Route path="/negocios" element={<BusinessDirectoryPage businesses={initialBusinesses} />} />
          <Route path="/negocios/:countryCode" element={<BusinessDirectoryPage businesses={initialBusinesses} />} />
          <Route path="/negocios/:countryCode/:stateCode" element={<BusinessDirectoryPage businesses={initialBusinesses} />} />
          <Route path="/negocios/:countryCode/:stateCode/:citySlug" element={<BusinessDirectoryPage businesses={initialBusinesses} />} />
          <Route path="/negocios/:countryCode/:stateCode/:citySlug/pagina/:page" element={<BusinessDirectoryPage businesses={initialBusinesses} />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />
          <Route path="/perfil" element={<UserProfile />} />
          <Route path="/negocio-verificado" element={<VerifiedBusinessInfo />} />
          <Route path="/sobre" element={<AboutPage />} />
          <Route path="/contato" element={<ContactPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
          <Route path="/termos" element={<TermsPage />} />
          <Route path="/eventos/:eventId" element={<EventPage />} />
          <Route path="/negocio/wizard" element={<BusinessWizardPage />} />
          <Route path="/preview/negocio/:businessId" element={<BusinessPageRoute previewMode />} />
          <Route path="/go/:businessSlug" element={<BusinessShortLink />} />
          <Route path="/:countryCode/:stateCode/:city/:businessName" element={<BusinessPageRoute initialBusiness={initialBusiness} />} />
          <Route path="/:countryCode/:businessName" element={<BusinessPageRoute initialBusiness={initialBusiness} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppRouter>
      <Toaster richColors position="top-center" />
      <Analytics />
    </AuthProvider>
  );
}
