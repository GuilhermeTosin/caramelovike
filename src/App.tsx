import { BrowserRouter, Route, Routes, StaticRouter, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { setCanonical, setRobots, upsertMetaTag } from "@/lib/seo";
import type { BusinessFrontend } from "@/types/database";
import Home from "@/pages/Home";
import SearchResults from "@/pages/SearchResults";
import BusinessPage from "@/pages/BusinessPage";
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

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return null;
}

function CanonicalManager() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const privatePaths = new Set(["/cadastro", "/entrar", "/redefinir-senha", "/perfil", "/negocio/wizard"]);
    const isSearchPage = pathname === "/buscar";
    const canonicalPath = isSearchPage ? pathname : `${pathname}${search}`;
    const canonicalUrl = `${window.location.origin}${canonicalPath}`;

    setCanonical(canonicalUrl);
    upsertMetaTag("property", "og:url", canonicalUrl);

    if (privatePaths.has(pathname)) {
      setRobots("noindex,nofollow,noarchive");
      return;
    }

    if (isSearchPage && search) {
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
  isBusinessPage?: boolean;
};

function AppRouter({ router = "browser", location, children }: AppProps & { children: ReactNode }) {
  if (router === "static") {
    return <StaticRouter location={location || "/"}>{children}</StaticRouter>;
  }

  return <BrowserRouter>{children}</BrowserRouter>;
}

export default function App({ router = "browser", location, initialBusiness = null }: AppProps = {}) {
  return (
    <AuthProvider>
      <AppRouter router={router} location={location}>
        <ScrollToTop />
        <CanonicalManager />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/buscar" element={<SearchResults />} />
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
          <Route path="/go/:businessSlug" element={<BusinessShortLink />} />
          <Route path="/:countryCode/:stateCode/:city/:businessName" element={<BusinessPage initialBusiness={initialBusiness} />} />
          <Route path="/:countryCode/:businessName" element={<BusinessPage initialBusiness={initialBusiness} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppRouter>
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
