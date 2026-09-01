import { AlertTriangle, Clock3, FileText, Pencil, RefreshCw, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { getBusinessQualityAudit, SHORT_DESCRIPTION_MIN_LENGTH } from "@/lib/businessQuality";
import { getCityDisplayName } from "@/lib/locationDisplay";
import { buildBusinessUrl, getCountryName } from "@/services/businesses";
import type { BusinessFrontend } from "@/types/database";

type BusinessQualityTabProps = {
  businesses: BusinessFrontend[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
};

function BusinessIssueRow({
  business,
  detail,
}: {
  business: BusinessFrontend;
  detail: React.ReactNode;
}) {

  const city = getCityDisplayName(business.address.cityDisplayName || business.address.city, business.address.countryCode || business.address.country);
  const country = getCountryName(business.address.countryCode || business.address.country);

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <Link to={buildBusinessUrl(business)} className="font-semibold text-foreground hover:text-primary">
          {business.name}
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">
          {[city, country].filter(Boolean).join(", ") || "Localização não informada"}
        </p>
        <div className="mt-2">{detail}</div>
      </div>
      <Link to={`/negocio/wizard?editBusinessId=${business.id}`}>
        <Button size="sm" variant="outline">
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Editar
        </Button>
      </Link>
    </div>
  );
}

export default function BusinessQualityTab({ businesses, loading, error, onRefresh }: BusinessQualityTabProps) {
  const audit = getBusinessQualityAudit(businesses);

  return (
    <TabsContent value="qualidade" className="mt-0">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">Qualidade dos perfis</h2>
              <Badge variant={audit.shortDescriptions.length || audit.legacyHours.length ? "default" : "secondary"}>
                {audit.shortDescriptions.length + audit.legacyHours.length} sinalizações
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Revise dados que podem reduzir a utilidade e a confiança das páginas públicas. Nenhuma informação é alterada automaticamente.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {error ? (
          <Card className="border-destructive/30 p-4 text-sm text-destructive">{error}</Card>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{loading ? "..." : audit.shortDescriptions.length}</p>
                <p className="text-sm text-muted-foreground">Descrições curtas</p>
              </div>
            </div>
          </Card>
          <Card className="border-border p-4">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{loading ? "..." : audit.legacyHours.length}</p>
                <p className="text-sm text-muted-foreground">Possíveis horários legados</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden border-border">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              <h3 className="font-semibold">Descrições com pouco conteúdo</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Menos de {SHORT_DESCRIPTION_MIN_LENGTH} caracteres úteis, sem contar formatação HTML.
            </p>
          </div>
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Carregando negócios...</p>
          ) : audit.shortDescriptions.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma descrição curta encontrada.</p>
          ) : (
            <div className="divide-y divide-border">
              {audit.shortDescriptions.map(({ business, descriptionLength }) => (
                <BusinessIssueRow
                  key={business.id}
                  business={business}
                  detail={<Badge variant="secondary">{descriptionLength} caracteres úteis</Badge>}
                />
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden border-border">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="font-semibold">Possíveis horários padrão antigos</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              A lista identifica apenas os dois conjuntos de horários padrão usados em cadastros antigos. Confirme antes de editar, pois o horário pode ser legítimo.
            </p>
          </div>
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Carregando negócios...</p>
          ) : audit.legacyHours.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhum horário legado encontrado.</p>
          ) : (
            <div className="divide-y divide-border">
              {audit.legacyHours.map(({ business }) => (
                <BusinessIssueRow
                  key={business.id}
                  business={business}
                  detail={<Badge variant="secondary">Padrão legado detectado</Badge>}
                />
              ))}
            </div>
          )}
        </Card>

        {!loading && businesses.length === 0 && !error ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            <Store className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
            Nenhum negócio disponível para análise.
          </Card>
        ) : null}
      </div>
    </TabsContent>
  );
}
