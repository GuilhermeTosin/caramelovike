import { Ban, CheckCircle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { getCountryName } from "@/services/businesses";
import type { BusinessFrontend } from "@/types/database";

type BusinessModerationTabProps = {
  moderationLoading: boolean;
  pendingModerationBusinesses: BusinessFrontend[];
  onRefresh: () => void;
  onPreview: (business: BusinessFrontend) => void;
  onDecision: (business: BusinessFrontend, status: "approved" | "rejected") => void;
};

export default function BusinessModerationTab({
  moderationLoading,
  pendingModerationBusinesses,
  onRefresh,
  onPreview,
  onDecision,
}: BusinessModerationTabProps) {
  return (
    <TabsContent value="analise-negocios" className="mt-0">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Análise de negócios</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Revise novos cadastros antes de publicar no site.
          </p>
        </div>

        <Card className="border-border overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between gap-4">
            <h3 className="font-semibold">Negócios em análise</h3>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={moderationLoading}>
              Atualizar
            </Button>
          </div>

          {moderationLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando negócios pendentes...</div>
          ) : pendingModerationBusinesses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum negócio pendente de análise.</div>
          ) : (
            <div className="divide-y divide-border">
              {pendingModerationBusinesses.map((business) => (
                <div key={business.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{business.name}</h4>
                      <Badge variant="outline">Em análise</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {business.address.city || "Cidade n?o informada"}
                      {getCountryName(business.address.countryCode || business.address.country) ? `, ${getCountryName(business.address.countryCode || business.address.country)}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Dono: {business.ownerName || "Usuário"} · Criado em {new Date(business.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => onPreview(business)}>
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Ver detalhes
                    </Button>
                    <Button size="sm" onClick={() => onDecision(business, "approved")}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => onDecision(business, "rejected")}
                    >
                      <Ban className="w-3.5 h-3.5 mr-1.5" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </TabsContent>
  );
}
