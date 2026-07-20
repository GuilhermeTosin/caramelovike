import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@/components/ui/tabs";
import { getCountryName } from "@/services/businesses";
import { getExternalLinkProps } from "@/lib/seo/externalLinks";
import type { BusinessFrontend, BusinessVerificationRequest } from "@/types/database";
import type { VerificationAdminView } from "@/pages/user-profile/types";

type VerificationAdminTabProps = {
  verificationAdminView: VerificationAdminView;
  verificationLoading: boolean;
  verificationRequests: BusinessVerificationRequest[];
  allBusinesses: BusinessFrontend[];
  onVerificationAdminViewChange: (value: VerificationAdminView) => void;
  onRefresh: () => void;
  onApproveVerification: (request: BusinessVerificationRequest) => void;
  onRejectVerification: (request: BusinessVerificationRequest) => void;
  onRemoveBusinessVerification: (business: BusinessFrontend) => void;
};

export default function VerificationAdminTab({
  verificationAdminView,
  verificationLoading,
  verificationRequests,
  allBusinesses,
  onVerificationAdminViewChange,
  onRefresh,
  onApproveVerification,
  onRejectVerification,
  onRemoveBusinessVerification,
}: VerificationAdminTabProps) {
  const verifiedBusinesses = allBusinesses.filter((business) => business.ownerVerified);

  return (
    <TabsContent value="verificacoes" className="mt-0">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Verificações</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Análise de solicitações de negócios que querem o selo de verificado.
          </p>
        </div>
        <Card className="border-border overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between gap-4">
            <Tabs value={verificationAdminView} onValueChange={(value) => onVerificationAdminViewChange(value as VerificationAdminView)}>
              <TabsList>
                <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
                <TabsTrigger value="verificados">Verificados</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={verificationLoading}>
              Atualizar
            </Button>
          </div>

          {verificationAdminView === "pendentes" ? (
            verificationLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando solicitações...</div>
            ) : verificationRequests.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhuma solicitação pendente.</div>
            ) : (
              <div className="divide-y divide-border">
                {verificationRequests.map((request) => (
                  <div key={request.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold">{request.business?.name || "negócio"}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {request.business?.city || "Cidade não informada"}
                        {request.business?.country_code ? `, ${request.business.country_code.toUpperCase()}` : ""}
                      </p>
                      <a
                        href={request.instagram_post_url}
                        {...getExternalLinkProps()}
                        className="text-sm text-primary underline mt-2 inline-block"
                      >
                        Ver post do Instagram
                      </a>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(request.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onApproveVerification(request)}>Aprovar</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => onRejectVerification(request)}
                      >
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : verifiedBusinesses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum negócio verificado no momento.</div>
          ) : (
            <div className="divide-y divide-border">
              {verifiedBusinesses.map((business) => (
                <div key={business.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{business.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {business.address.city || "Cidade não informada"}
                      {getCountryName(business.address.countryCode || business.address.country) ? `, ${getCountryName(business.address.countryCode || business.address.country)}` : ""}
                    </p>
                    {business.ownerVerifiedUntil ? (
                      <p className="text-xs text-muted-foreground mt-2">
                        Válido até: {new Date(business.ownerVerifiedUntil).toLocaleDateString("pt-BR")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => onRemoveBusinessVerification(business)}
                    >
                      Remover verificação
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
