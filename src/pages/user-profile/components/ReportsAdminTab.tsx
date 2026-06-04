import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { slugify } from "@/services/businesses";
import type { ReportsKind, ReportsView } from "@/pages/user-profile/types";
import type { BusinessReport, CommunityFindReport } from "@/types/database";

type ReportsAdminTabProps = {
  reportsKind: ReportsKind;
  reportsView: ReportsView;
  reportsLoading: boolean;
  reports: BusinessReport[];
  communityFindReports: CommunityFindReport[];
  onReportsKindChange: (value: ReportsKind) => void;
  onReportsViewChange: (value: ReportsView) => void;
  onRefresh: () => void;
  onReportStatus: (id: string, status: BusinessReport["status"]) => void;
  onArchiveReport: (report: BusinessReport) => void;
  onUnarchiveReport: (report: BusinessReport) => void;
  onCommunityFindReportStatus: (id: string, status: CommunityFindReport["status"]) => void;
  onArchiveCommunityFindReport: (report: CommunityFindReport) => void;
  onUnarchiveCommunityFindReport: (report: CommunityFindReport) => void;
};

export default function ReportsAdminTab({
  reportsKind,
  reportsView,
  reportsLoading,
  reports,
  communityFindReports,
  onReportsKindChange,
  onReportsViewChange,
  onRefresh,
  onReportStatus,
  onArchiveReport,
  onUnarchiveReport,
  onCommunityFindReportStatus,
  onArchiveCommunityFindReport,
  onUnarchiveCommunityFindReport,
}: ReportsAdminTabProps) {
  return (
    <TabsContent value="denuncias" className="mt-0">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Denuncias</h2>
          <p className="mt-1 text-sm text-muted-foreground">Analise denuncias enviadas pelos usuarios.</p>
        </div>

        <Card className="overflow-hidden border-border">
          <div className="flex items-center justify-between gap-4 border-b border-border p-5">
            <h3 className="font-semibold">Fila de denuncias</h3>
            <div className="flex items-center gap-2">
              <Button
                variant={reportsKind === "negocios" ? "default" : "outline"}
                size="sm"
                onClick={() => onReportsKindChange("negocios")}
                disabled={reportsLoading}
              >
                Negocios
              </Button>
              <Button
                variant={reportsKind === "achadinhos" ? "default" : "outline"}
                size="sm"
                onClick={() => onReportsKindChange("achadinhos")}
                disabled={reportsLoading}
              >
                Achadinhos
              </Button>
              <Button
                variant={reportsView === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => onReportsViewChange("active")}
                disabled={reportsLoading}
              >
                Ativas
              </Button>
              <Button
                variant={reportsView === "archived" ? "default" : "outline"}
                size="sm"
                onClick={() => onReportsViewChange("archived")}
                disabled={reportsLoading}
              >
                Arquivadas
              </Button>
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={reportsLoading}>
                Atualizar
              </Button>
            </div>
          </div>

          {reportsLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando denuncias...</div>
          ) : reportsKind === "negocios" && reports.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {reportsView === "archived" ? "Nenhuma denuncia arquivada." : "Nenhuma denuncia registrada."}
            </div>
          ) : reportsKind === "achadinhos" && communityFindReports.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {reportsView === "archived"
                ? "Nenhuma denuncia de achadinho arquivada."
                : "Nenhuma denuncia de achadinho registrada."}
            </div>
          ) : reportsKind === "negocios" ? (
            <div className="divide-y divide-border">
              {reports.map((report) => (
                <div key={report.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {report.business?.slug &&
                      report.business?.city &&
                      report.business?.country_code &&
                      report.business?.state_code ? (
                        <a
                          href={`/${report.business.country_code.toLowerCase()}/${report.business.state_code.toLowerCase()}/${slugify(report.business.city)}/${report.business.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-primary hover:underline"
                        >
                          {report.business?.name || "negocio"}
                        </a>
                      ) : (
                        <h4 className="font-semibold">{report.business?.name || "negocio"}</h4>
                      )}
                      <Badge variant={report.status === "pending" ? "secondary" : "default"}>{report.status}</Badge>
                      <Badge variant="outline">{report.reason}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {report.business?.city || "Cidade nao informada"}
                      {report.business?.country_code ? `, ${report.business.country_code.toUpperCase()}` : ""}
                    </p>
                    {report.details ? <p className="mt-2 text-sm">{report.details}</p> : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onReportStatus(report.id, "reviewing")}>
                      Em analise
                    </Button>
                    <Button size="sm" onClick={() => onReportStatus(report.id, "resolved")}>
                      Resolver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => onReportStatus(report.id, "rejected")}
                    >
                      Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={reportsView === "archived" ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : ""}
                      disabled={reportsView === "archived" || (report.status !== "resolved" && report.status !== "rejected")}
                      onClick={() => onArchiveReport(report)}
                    >
                      Arquivar
                    </Button>
                    {reportsView === "archived" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-sky-300 text-sky-700 hover:bg-sky-50"
                        onClick={() => onUnarchiveReport(report)}
                      >
                        Desarquivar
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {communityFindReports.map((report) => (
                <div key={report.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{report.find?.product_name || "Achadinho"}</h4>
                      <Badge variant={report.status === "pending" ? "secondary" : "default"}>{report.status}</Badge>
                      <Badge variant="outline">{report.reason}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {report.find?.location_name || "Local nao informado"}
                    </p>
                    {report.message?.message ? (
                      <p className="mt-2 text-sm text-foreground/80">
                        Mensagem reportada: "{report.message.message}"
                      </p>
                    ) : null}
                    {report.details ? <p className="mt-2 text-sm">{report.details}</p> : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCommunityFindReportStatus(report.id, "reviewing")}
                    >
                      Em analise
                    </Button>
                    <Button size="sm" onClick={() => onCommunityFindReportStatus(report.id, "resolved")}>
                      Resolver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => onCommunityFindReportStatus(report.id, "rejected")}
                    >
                      Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={reportsView === "archived" ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : ""}
                      disabled={reportsView === "archived" || (report.status !== "resolved" && report.status !== "rejected")}
                      onClick={() => onArchiveCommunityFindReport(report)}
                    >
                      Arquivar
                    </Button>
                    {reportsView === "archived" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-sky-300 text-sky-700 hover:bg-sky-50"
                        onClick={() => onUnarchiveCommunityFindReport(report)}
                      >
                        Desarquivar
                      </Button>
                    ) : null}
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
