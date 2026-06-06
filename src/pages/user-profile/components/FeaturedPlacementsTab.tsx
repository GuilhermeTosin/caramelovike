import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { formatFeaturedScope } from "@/pages/user-profile/utils";
import type { FeaturedForm } from "@/pages/user-profile/types";
import type { BusinessFrontend, FeaturedPlacementFrontend, FeaturedScopeType } from "@/types/database";

type FeaturedPlacementsTabProps = {
  allBusinesses: BusinessFrontend[];
  featuredForm: FeaturedForm;
  featuredPlacements: FeaturedPlacementFrontend[];
  featuredLoading: boolean;
  setFeaturedForm: Dispatch<SetStateAction<FeaturedForm>>;
  onBusinessChange: (businessId: string) => void;
  onSubmit: (event: FormEvent) => void;
  onRefresh: () => void;
  onToggleStatus: (placement: FeaturedPlacementFrontend) => void;
  onDelete: (placement: FeaturedPlacementFrontend) => void;
};

export default function FeaturedPlacementsTab({
  allBusinesses,
  featuredForm,
  featuredPlacements,
  featuredLoading,
  setFeaturedForm,
  onBusinessChange,
  onSubmit,
  onRefresh,
  onToggleStatus,
  onDelete,
}: FeaturedPlacementsTabProps) {
  return (
    <TabsContent value="destaques">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Destaques Regionais</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie campanhas de destaque por cidade, estado/província, país ou global.
          </p>
        </div>

        <Card className="border-border p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Megaphone className="h-4 w-4 text-primary" />
            Novo destaque
          </h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <Label>Negócio</Label>
                <Select value={featuredForm.businessId} onValueChange={onBusinessChange}>
                  <SelectTrigger className="mt-1.5">
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
              </div>

              <div>
                <Label>Escopo</Label>
                <Select
                  value={featuredForm.scopeType}
                  onValueChange={(value) =>
                    setFeaturedForm((prev) => ({ ...prev, scopeType: value as FeaturedScopeType }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="city">Cidade</SelectItem>
                    <SelectItem value="state">Estado/Província</SelectItem>
                    <SelectItem value="country">País</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>País</Label>
                <Input
                  value={featuredForm.countryCode}
                  onChange={(event) =>
                    setFeaturedForm((prev) => ({ ...prev, countryCode: event.target.value.toLowerCase() }))
                  }
                  placeholder="ca"
                  className="mt-1.5"
                  disabled={featuredForm.scopeType === "global"}
                />
              </div>

              <div>
                <Label>Estado/Província</Label>
                <Input
                  value={featuredForm.stateCode}
                  onChange={(event) =>
                    setFeaturedForm((prev) => ({ ...prev, stateCode: event.target.value.toLowerCase() }))
                  }
                  placeholder="qc"
                  className="mt-1.5"
                  disabled={featuredForm.scopeType === "country" || featuredForm.scopeType === "global"}
                />
              </div>

              <div>
                <Label>Cidade</Label>
                <Input
                  value={featuredForm.city}
                  onChange={(event) => setFeaturedForm((prev) => ({ ...prev, city: event.target.value }))}
                  placeholder="Montreal"
                  className="mt-1.5"
                  disabled={featuredForm.scopeType !== "city"}
                />
              </div>

              <div>
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  value={featuredForm.priority}
                  onChange={(event) => setFeaturedForm((prev) => ({ ...prev, priority: event.target.value }))}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Inicio</Label>
                <Input
                  type="date"
                  value={featuredForm.startsAt}
                  onChange={(event) => setFeaturedForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Fim</Label>
                <Input
                  type="date"
                  value={featuredForm.endsAt}
                  onChange={(event) => setFeaturedForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Preço cobrado (centavos)</Label>
                <Input
                  type="number"
                  value={featuredForm.priceCents}
                  onChange={(event) => setFeaturedForm((prev) => ({ ...prev, priceCents: event.target.value }))}
                  placeholder="9900"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Observacoes</Label>
                <Input
                  value={featuredForm.notes}
                  onChange={(event) => setFeaturedForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Ex: pago manualmente"
                  className="mt-1.5"
                />
              </div>
            </div>

            <Button type="submit" className="caramelo-gradient border-0 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Criar destaque
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden border-border">
          <div className="flex items-center justify-between gap-4 border-b border-border p-5">
            <div>
              <h3 className="font-semibold">Campanhas</h3>
              <p className="text-sm text-muted-foreground">Destaques ativos, pausados e expirados.</p>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={featuredLoading}>
              Atualizar
            </Button>
          </div>

          {featuredLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando destaques...</div>
          ) : featuredPlacements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum destaque cadastrado.</div>
          ) : (
            <div className="divide-y divide-border">
              {featuredPlacements.map((placement) => (
                <div key={placement.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{placement.business?.name || "negócio removido"}</h4>
                      <Badge variant={placement.status === "active" ? "default" : "secondary"}>
                        {placement.status}
                      </Badge>
                      <Badge variant="secondary">{formatFeaturedScope(placement)}</Badge>
                      {placement.priority > 0 ? <Badge variant="outline">prioridade {placement.priority}</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(placement.startsAt).toLocaleDateString("pt-BR")} ate{" "}
                      {new Date(placement.endsAt).toLocaleDateString("pt-BR")}
                      {placement.priceCents > 0
                        ? ` · ${(placement.priceCents / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "CAD",
                          })}`
                        : ""}
                    </p>
                    {placement.notes ? <p className="mt-2 text-sm">{placement.notes}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onToggleStatus(placement)}>
                      {placement.status === "active" ? "Pausar" : "Ativar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(placement)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Remover
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
