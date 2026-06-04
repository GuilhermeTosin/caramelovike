import { BadgeCheck, BookOpen, Calendar, Edit3, Eye, Lock, MapPin, Plus, Star, Store, TicketPercent, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { buildBusinessUrl, getCategoryId } from "@/services/businesses";
import type { BusinessFrontend } from "@/types/database";

type BusinessesTabProps = {
  loadingMyBusinesses: boolean;
  myBusinesses: BusinessFrontend[];
  paginatedMyBusinesses: BusinessFrontend[];
  myBusinessesTotalPages: number;
  safeMyBusinessesPage: number;
  getMyVerificationStatusByBusiness: (businessId: string) => string | null;
  getCategoryLabel: (category: string) => string;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onOpenMenuModal: (business: BusinessFrontend) => void;
  onOpenServicesModal: (business: BusinessFrontend) => void;
  onOpenEventsModal: (business: BusinessFrontend) => void;
  onOpenCouponModal: (business: BusinessFrontend) => void;
  onOpenVerificationModal: (business: BusinessFrontend) => void;
  onDeleteMyBusiness: (business: BusinessFrontend) => void;
};

export default function BusinessesTab({
  loadingMyBusinesses,
  myBusinesses,
  paginatedMyBusinesses,
  myBusinessesTotalPages,
  safeMyBusinessesPage,
  getMyVerificationStatusByBusiness,
  getCategoryLabel,
  onPreviousPage,
  onNextPage,
  onOpenMenuModal,
  onOpenServicesModal,
  onOpenEventsModal,
  onOpenCouponModal,
  onOpenVerificationModal,
  onDeleteMyBusiness,
}: BusinessesTabProps) {
  return (
    <TabsContent value="negocios" className="mt-0">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Meus negócios</h2>
        <Link to="/negocio/wizard">
          <Button size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Adicionar Novo negócio
          </Button>
        </Link>
      </div>

      {loadingMyBusinesses ? (
        <Card className="p-8 text-center border-border">
          <Store className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3 animate-pulse" />
          <p className="text-muted-foreground mb-1">Carregando seus negócios...</p>
        </Card>
      ) : myBusinesses.length === 0 ? (
        <Card className="p-8 text-center border-border">
          <Store className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Você ainda não cadastrou nenhum negócio.</p>
          <Link to="/negocio/wizard">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar negócio
            </Button>
          </Link>
        </Card>
      ) : (
        <div id="meus-negocios-lista" className="space-y-4">
          {paginatedMyBusinesses.map((biz) => (
            <Card key={biz.id} className="p-4 border-border min-h-[160px]">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                  <img
                    src={biz.logoUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=60"}
                    alt={biz.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={buildBusinessUrl(biz)} className="font-bold text-foreground hover:text-primary transition-colors">
                      {biz.name}
                    </Link>
                    {biz.moderationStatus === "pending" ? (
                      <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50">
                        Em análise
                      </Badge>
                    ) : null}
                    {biz.moderationStatus === "rejected" ? (
                      <Badge variant="outline" className="border-destructive/30 text-destructive">
                        Rejeitado
                      </Badge>
                    ) : null}
                    {(() => {
                      const status = getMyVerificationStatusByBusiness(biz.id);
                      if (!status) return null;
                      if (status === "pending") return <Badge variant="outline">Verificação pendente</Badge>;
                      if (status === "approved" && biz.ownerVerified) {
                        return (
                          <Badge className="bg-emerald-600 text-white inline-flex items-center gap-1.5">
                            <Lock className="w-3 h-3" />
                            Verificado
                          </Badge>
                        );
                      }
                      if (status === "approved" && !biz.ownerVerified) {
                        return <Badge variant="outline">Verificação expirada</Badge>;
                      }
                      return <Badge variant="outline" className="text-destructive border-destructive/30">Verificação rejeitada</Badge>;
                    })()}
                  </div>
                </div>
                <Badge variant="secondary" className="flex-shrink-0">
                  {getCategoryLabel(biz.category).split(" (")[0]}
                </Badge>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 leading-tight min-w-0">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {biz.address.city}, {biz.address.countryCode.toUpperCase()}
                  </span>
                </span>
                <span className="flex items-center gap-1 leading-tight whitespace-nowrap shrink-0">
                  <Star className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>
                    {biz.averageRating.toFixed(1)} ({biz.reviews.length} {biz.reviews.length === 1 ? "avaliação" : "avaliações"})
                  </span>
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-border/60">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2">
                  <Link to={`/negocio/wizard?editBusinessId=${biz.id}`}>
                    <Button size="sm" variant="outline" className="w-full sm:w-auto">
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      Editar
                    </Button>
                  </Link>
                  {getCategoryId(biz.category) === "food" ? (
                    <Button size="sm" variant="outline" onClick={() => onOpenMenuModal(biz)} className="w-full sm:w-auto">
                      <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                      Cardápio
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onOpenServicesModal(biz)} className="w-full sm:w-auto">
                      <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                      Serviços
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onOpenEventsModal(biz)} className="w-full sm:w-auto">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    Eventos
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onOpenCouponModal(biz)} className="w-full sm:w-auto">
                    <TicketPercent className="w-3.5 h-3.5 mr-1.5" />
                    Promoções
                  </Button>
                  {!biz.ownerVerified && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenVerificationModal(biz)}
                      disabled={getMyVerificationStatusByBusiness(biz.id) === "pending"}
                      className="w-full sm:w-auto"
                      title={
                        getMyVerificationStatusByBusiness(biz.id) === "pending"
                          ? "Já existe uma solicitação pendente"
                          : "Solicitar verificação"
                      }
                    >
                      <BadgeCheck className="w-3.5 h-3.5 mr-1.5" />
                      Solicitar verificação
                    </Button>
                  )}
                  <div className="col-span-2 sm:col-auto sm:ml-auto flex items-center justify-end gap-2 pt-1 sm:pt-0">
                    <Button size="sm" variant="outline" asChild aria-label={`Ver ${biz.name}`} title="Ver negócio">
                      <Link to={buildBusinessUrl(biz)} target="_blank" rel="noreferrer">
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => onDeleteMyBusiness(biz)}
                      aria-label={`Excluir ${biz.name}`}
                      title="Excluir negócio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {myBusinessesTotalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-sm text-muted-foreground">
                Página {safeMyBusinessesPage} de {myBusinessesTotalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={safeMyBusinessesPage <= 1} onClick={onPreviousPage}>
                  Anterior
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={safeMyBusinessesPage >= myBusinessesTotalPages} onClick={onNextPage}>
                  Próxima
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </TabsContent>
  );
}
