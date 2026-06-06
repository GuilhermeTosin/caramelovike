import { useEffect, useState } from "react";
import { PawPrint } from "lucide-react";
import type { BusinessFrontend } from "@/types/database";
import { getLoadedBusinessPageModule, preloadBusinessPageChunk } from "@/pages/BusinessPagePrefetch";

type BusinessPageProps = {
  initialBusiness?: BusinessFrontend | null;
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
  const [PageComponent, setPageComponent] = useState<BusinessPageModule["default"] | null>(
    () => getLoadedBusinessPageModule()?.default ?? null
  );

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
    return <PageComponent {...props} />;
  }

  if (import.meta.env.SSR) {
    const ServerComponent = getLoadedBusinessPageModule()?.default;
    if (ServerComponent) {
      return <ServerComponent {...props} />;
    }
  }

  return <BusinessPageLoading />;
}
