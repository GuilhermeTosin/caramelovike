import { Ban, CheckCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import type { BusinessFrontend, OwnerClaimRequest } from "@/types/database";

type OwnershipAdminTabProps = {
  transferBusinessId: string;
  transferEmail: string;
  allBusinesses: BusinessFrontend[];
  ownershipRequests: OwnerClaimRequest[];
  ownershipLoading: boolean;
  onTransferBusinessIdChange: (value: string) => void;
  onTransferEmailChange: (value: string) => void;
  onSubmitTransfer: (event: React.FormEvent) => void;
  onRefresh: () => void;
  onApproveOwnership: (request: OwnerClaimRequest) => void;
  onRejectOwnership: (request: OwnerClaimRequest) => void;
};

export default function OwnershipAdminTab({
  transferBusinessId,
  transferEmail,
  allBusinesses,
  ownershipRequests,
  ownershipLoading,
  onTransferBusinessIdChange,
  onTransferEmailChange,
  onSubmitTransfer,
  onRefresh,
  onApproveOwnership,
  onRejectOwnership,
}: OwnershipAdminTabProps) {
  return (
    <TabsContent value="ownership" className="mt-0">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Ownership</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aprove solicitações de donos ou transfira um negócio diretamente por e-mail.
          </p>
        </div>

        <Card className="border-border p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Transferencia direta
          </h3>
          <form onSubmit={onSubmitTransfer} className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <Select value={transferBusinessId} onValueChange={onTransferBusinessIdChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o negócio" />
              </SelectTrigger>
              <SelectContent>
                {allBusinesses.map((business) => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.name} · {business.address.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="email"
              value={transferEmail}
              onChange={(event) => onTransferEmailChange(event.target.value)}
              placeholder="e-mail do novo dono"
            />
            <Button type="submit">Transferir</Button>
          </form>
        </Card>

        <Card className="overflow-hidden border-border">
          <div className="flex items-center justify-between gap-4 border-b border-border p-5">
            <div>
            <h3 className="font-semibold">Solicitações pendentes</h3>
              <p className="text-sm text-muted-foreground">
                Pedidos feitos pelo botão &quot;Sou dono deste negócio&quot;.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={ownershipLoading}>
              Atualizar
            </Button>
          </div>

          {ownershipLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando solicitações...</div>
          ) : ownershipRequests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhuma solicitação pendente.</div>
          ) : (
            <div className="divide-y divide-border">
              {ownershipRequests.map((request) => (
                <div key={request.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{request.business?.name || "negócio"}</h4>
                      <Badge variant="secondary">
                        {request.business?.city || "Cidade não informada"}
                        {request.business?.country_code ? `, ${request.business.country_code.toUpperCase()}` : ""}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Solicitado por {request.requester_name || "Usuário"} · {request.requester_email || "sem e-mail"}
                    </p>
                    {request.message ? <p className="mt-2 text-sm text-foreground/80">{request.message}</p> : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => onApproveOwnership(request)}>
                      <CheckCircle className="mr-1 h-3.5 w-3.5" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => onRejectOwnership(request)}
                    >
                      <Ban className="mr-1 h-3.5 w-3.5" />
                      Recusar
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
