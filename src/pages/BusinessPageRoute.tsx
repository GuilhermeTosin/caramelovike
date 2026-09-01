import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PawPrint } from "lucide-react";
import type { BusinessFrontend } from "@/types/database";
import { getLoadedBusinessPageModule, preloadBusinessPageChunk } from "@/pages/BusinessPagePrefetch";

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

export default function BusinessPageRoute(props: BusinessPageProps = {}) {
  const { countryCode, stateCode, city, businessName, businessId } = useParams();
  const [PageComponent, setPageComponent] = useState<BusinessPageModule["default"] | null>(
    () => getLoadedBusinessPageModule()?.default ?? null
  );
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
    });
    return () => {
      cancelled = true;
    };
  }, [PageComponent]);

  if (PageComponent) {
    return <PageComponent key={routeKey} {...props} />;
  }

  if (import.meta.env.SSR) {
    const ServerComponent = getLoadedBusinessPageModule()?.default;
    if (ServerComponent) {
      return <ServerComponent key={routeKey} {...props} />;
    }
  }

  return <BusinessPageLoading />;
}
