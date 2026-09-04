import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@/components/ui/tabs";
import { getCountryName } from "@/services/businesses";
import { getExternalLinkProps } from "@/lib/seo/externalLinks";
import type { BusinessFrontend, BusinessVerificationRequest } from "@/types/database";
import type { VerificationAdminView } from "@/pages/user-profile/types";

const VERIFICATION_EXPIRY_WARNING_DAYS = 30;

function getDaysUntil(value: string) {
  const expiresAt = new Date(value).getTime();
  if (Number.isNaN(expiresAt)) return null;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
}

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
  const now = Date.now();
  const expiryWarningLimit = now + VERIFICATION_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;
  const expiringBusinesses = verifiedBusinesses
    .filter((business) => {
      const expiresAt = business.ownerVerifiedUntil ? new Date(business.ownerVerifiedUntil).getTime() : Number.NaN;
      return Number.isFinite(expiresAt) && expiresAt >= now && expiresAt <= expiryWarningLimit;
    })
    .sort((a, b) => new Date(a.ownerVerifiedUntil || 0).getTime() - new Date(b.ownerVerifiedUntil || 0).getTime());

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
                <TabsTrigger value="a_vencer">
                  A vencer{expiringBusinesses.length > 0 ? ` (${expiringBusinesses.length})` : ""}
                </TabsTrigger>
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
          ) : verificationAdminView === "a_vencer" ? (
            expiringBusinesses.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma verificação vence nos próximos {VERIFICATION_EXPIRY_WARNING_DAYS} dias.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {expiringBusinesses.map((business) => {
                  const daysUntil = getDaysUntil(business.ownerVerifiedUntil || "");
                  const expiresSoon = daysUntil !== null && daysUntil <= 7;
                  return (
                    <div key={business.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold">{business.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {business.address.city || "Cidade não informada"}
                          {getCountryName(business.address.countryCode || business.address.country) ? `, ${getCountryName(business.address.countryCode || business.address.country)}` : ""}
                        </p>
                        {business.ownerName ? (
                          <p className="text-xs text-muted-foreground mt-2">Responsável: {business.ownerName}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground mt-1">
                          Válido até: {business.ownerVerifiedUntil ? new Date(business.ownerVerifiedUntil).toLocaleDateString("pt-BR") : "Não informado"}
                        </p>
                      </div>
                      <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        expiresSoon ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {daysUntil === 0 ? "Vence hoje" : `Vence em ${daysUntil || 0} ${daysUntil === 1 ? "dia" : "dias"}`}
                      </span>
                    </div>
                  );
                })}
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
