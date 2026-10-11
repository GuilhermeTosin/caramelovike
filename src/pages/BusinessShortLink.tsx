import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PawPrint } from "lucide-react";
import { getBusinessByShortSlug, buildBusinessUrl, isBusinessUrlTombstoned } from "@/services/businesses";
import { Button } from "@/components/ui/button";
import BusinessRemovedNotice from "@/components/BusinessRemovedNotice";

export default function BusinessShortLink() {
  const navigate = useNavigate();
  const { businessSlug = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [wasRemoved, setWasRemoved] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const business = await getBusinessByShortSlug(businessSlug);
        if (cancelled) return;
        if (!business) {
          setWasRemoved(await isBusinessUrlTombstoned(`/go/${businessSlug}`));
          if (cancelled) return;
          setLoading(false);
          return;
        }
        navigate(buildBusinessUrl(business), { replace: true, state: { preloadedBusiness: business } });
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessSlug, navigate]);

  if (wasRemoved) return <BusinessRemovedNotice />;

  if (loadFailed) {
    return (
      <div role="alert" className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground">Não foi possível abrir este link</h1>
          <p className="mt-2 text-muted-foreground">O serviço está temporariamente indisponível. Tente novamente em instantes.</p>
          <Button type="button" className="mt-6" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <PawPrint className="w-10 h-10 mx-auto text-muted-foreground/60 animate-pulse" />
          <p className="mt-3 text-muted-foreground">Abrindo o negócio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-foreground">Negócio não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Esse link curto não está mais disponível.</p>
        <div className="mt-6">
          <Link to="/">
            <Button>
              <PawPrint className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
