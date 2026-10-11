import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { PawPrint } from "lucide-react";
import type { BusinessFrontend } from "@/types/database";
import { getLoadedBusinessPageModule, preloadBusinessPageChunk, shouldReloadAfterBusinessPageChunkFailure } from "@/pages/BusinessPagePrefetch";

type BusinessPageProps = {
  initialBusiness?: BusinessFrontend | null;
  initialBusinesses?: BusinessFrontend[];
  initialSimilarBusinesses?: BusinessFrontend[];
  previewMode?: boolean;
};

type BusinessPageModule = typeof import("@/pages/BusinessPage");

if (import.meta.env.SSR) {
  await preloadBusinessPageChunk();
}

function BusinessPageLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <PawPrint className="w-10 h-10 mx-auto text-muted-foreground/60 animate-pulse" />
        <p className="mt-3 text-muted-foreground">Carregando negócio...</p>
      </div>
    </div>
  );
}

function BusinessPageUnavailable() {
  return (
    <div role="alert" className="mx-auto my-12 max-w-xl rounded-xl border border-border bg-background p-6 text-center shadow-sm">
      <h1 className="text-xl font-bold">Não foi possível abrir a página do negócio</h1>
      <p className="mt-2 text-sm text-muted-foreground">Recarregue a página para tentar novamente.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
        Recarregar página
      </button>
    </div>
  );
}

class BusinessPageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[BusinessPageRoute] Falha ao renderizar a página do negócio:", error, info);
  }

  render() {
    return this.state.hasError ? <BusinessPageUnavailable /> : this.props.children;
  }
}

export default function BusinessPageRoute(props: BusinessPageProps = {}) {
  const { countryCode, stateCode, city, businessName, businessId } = useParams();
  const [PageComponent, setPageComponent] = useState<BusinessPageModule["default"] | null>(
    () => getLoadedBusinessPageModule()?.default ?? null
  );
  const [loadErrorRouteKey, setLoadErrorRouteKey] = useState<string | null>(null);
  const routeKey = [
    props.previewMode ? "preview" : "public",
    countryCode || "",
    stateCode || "",
    city || "",
    businessName || "",
    businessId || "",
  ].join("|");

  useEffect(() => {
    if (PageComponent) return;
    let cancelled = false;
    void preloadBusinessPageChunk().then((module) => {
      if (!cancelled) {
        setPageComponent(() => module.default);
      }
    }).catch((error: unknown) => {
      console.error("[BusinessPageRoute] Falha ao carregar o módulo da página:", error);
      if (cancelled) return;
      if (shouldReloadAfterBusinessPageChunkFailure()) {
        window.location.reload();
        return;
      }
      setLoadErrorRouteKey(routeKey);
    });
    return () => {
      cancelled = true;
    };
  }, [PageComponent, routeKey]);

  if (PageComponent) {
    return (
      <BusinessPageErrorBoundary key={routeKey}>
        <PageComponent {...props} />
      </BusinessPageErrorBoundary>
    );
  }

  if (import.meta.env.SSR) {
    const ServerComponent = getLoadedBusinessPageModule()?.default;
    if (ServerComponent) {
      return <ServerComponent key={routeKey} {...props} />;
    }
  }

  if (loadErrorRouteKey === routeKey) return <BusinessPageUnavailable />;

  return <BusinessPageLoading />;
}
