import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { marketplaceListingPath } from "@/lib/marketplaceSnapshot";
import { getMarketplaceReportsForAdmin, updateMarketplaceReportStatus } from "@/services/marketplace";
import type { MarketplaceReport } from "@/types/database";

const REASON_LABELS: Record<MarketplaceReport["reason"], string> = {
  fraud: "Golpe ou fraude",
  prohibited: "Produto proibido",
  spam: "Spam",
  duplicate: "Anúncio duplicado",
  misleading: "Informação enganosa",
  offensive: "Conteúdo ofensivo",
  other: "Outro",
};

const STATUS_LABELS: Record<MarketplaceReport["status"], string> = {
  pending: "Pendente",
  reviewing: "Em análise",
  resolved: "Resolvida",
  rejected: "Rejeitada",
};

export default function MarketplaceReportsAdminSection() {
  const [reports, setReports] = useState<MarketplaceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await getMarketplaceReportsForAdmin());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as denúncias de anúncios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const changeStatus = async (id: string, status: MarketplaceReport["status"]) => {
    setUpdatingId(id);
    try {
      const result = await updateMarketplaceReportStatus(id, status);
      if (!result.ok) {
        toast.error(result.error || "Não foi possível atualizar a denúncia.");
        return;
      }
      setReports((items) => items.map((item) => item.id === id ? { ...item, status } : item));
      toast.success("Denúncia de anúncio atualizada.");
    } catch {
      toast.error("Não foi possível atualizar a denúncia.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card className="overflow-hidden border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h3 className="font-semibold">Denúncias de anúncios ({reports.length})</h3>
          <p className="mt-1 text-sm text-muted-foreground">Relatos enviados sobre produtos do Marketplace.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>Atualizar</Button>
      </div>
      {loading ? (
        <p className="p-6 text-sm text-muted-foreground" role="status">Carregando denúncias de anúncios...</p>
      ) : error ? (
        <div className="space-y-3 p-6" role="alert">
          <p className="font-medium text-destructive">Não foi possível carregar as denúncias de anúncios.</p>
          <p className="break-words text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>Tentar novamente</Button>
        </div>
      ) : reports.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">Nenhuma denúncia de anúncio registrada.</p>
      ) : (
        <div className="divide-y divide-border">
          {reports.map((report) => (
            <div key={report.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {report.listing && ["active", "sold"].includes(report.listing.status) ? (
                    <Link to={marketplaceListingPath(report.listing)} className="font-semibold text-primary hover:underline">
                      {report.listing.title}
                    </Link>
                  ) : (
                    <h4 className="font-semibold">{report.listing?.title || "Anúncio indisponível"}</h4>
                  )}
                  <Badge variant={report.status === "pending" ? "secondary" : "outline"}>{STATUS_LABELS[report.status]}</Badge>
                  <Badge variant="outline">{REASON_LABELS[report.reason]}</Badge>
                </div>
                {report.listing?.city ? <p className="text-sm text-muted-foreground">{report.listing.city}{report.listing.country_code ? `, ${report.listing.country_code.toUpperCase()}` : ""}</p> : null}
                {report.details ? <p className="whitespace-pre-wrap break-words text-sm">{report.details}</p> : null}
                <p className="text-xs text-muted-foreground">Enviada em {new Date(report.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={!!updatingId || report.status === "reviewing"} onClick={() => void changeStatus(report.id, "reviewing")}>Em análise</Button>
                <Button size="sm" disabled={!!updatingId || report.status === "resolved"} onClick={() => void changeStatus(report.id, "resolved")}>Resolver</Button>
                <Button size="sm" variant="outline" disabled={!!updatingId || report.status === "rejected"} onClick={() => void changeStatus(report.id, "rejected")}>Rejeitar</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
