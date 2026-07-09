import { BadgeCheck, BookOpen, Calendar, Edit3, Eye, Lock, MapPin, Plus, Star, Store, TicketPercent, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { buildBusinessUrl, getCategoryId, getCountryName } from "@/services/businesses";
import { preloadBusinessPageAssets } from "@/pages/BusinessPagePrefetch";
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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Meus negócios</h2>
        <Link to="/negocio/wizard">
          <Button size="sm">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Adicionar novo negócio
          </Button>
        </Link>
      </div>

      {loadingMyBusinesses ? (
        <Card className="border-border p-8 text-center">
          <Store className="mx-auto mb-3 h-12 w-12 animate-pulse text-muted-foreground/30" />
          <p className="mb-1 text-muted-foreground">Carregando seus negócios...</p>
        </Card>
      ) : myBusinesses.length === 0 ? (
        <Card className="border-border p-8 text-center">
          <Store className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="mb-4 text-muted-foreground">Você ainda não cadastrou nenhum negócio.</p>
          <Link to="/negocio/wizard">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar negócio
            </Button>
          </Link>
        </Card>
      ) : (
        <div id="meus-negocios-lista" className="space-y-4">
          {paginatedMyBusinesses.map((biz) => (
            <Card key={biz.id} className="min-h-[160px] border-border p-4">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                  <img
                    src={biz.logoUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=60"}
                    alt={biz.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={buildBusinessUrl(biz)}
                      state={{ preloadedBusiness: biz }}
                      onMouseEnter={() => preloadBusinessPageAssets(biz)}
                      onFocus={() => preloadBusinessPageAssets(biz)}
                      onPointerDown={() => preloadBusinessPageAssets(biz)}
                      className="font-bold text-foreground transition-colors hover:text-primary"
                    >
                      {biz.name}
                    </Link>
                    {biz.moderationStatus === "pending" ? (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                        Em analise
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
                      if (status === "pending") return <Badge variant="outline">Verificacao pendente</Badge>;
                      if (status === "approved" && biz.ownerVerified) {
                        return (
                          <Badge className="inline-flex items-center gap-1.5 bg-emerald-600 text-white">
                            <Lock className="h-3 w-3" />
                            Verificado
                          </Badge>
                        );
                      }
                      if (status === "approved" && !biz.ownerVerified) {
                        return <Badge variant="outline">Verificacao expirada</Badge>;
                      }
                      return (
                        <Badge variant="outline" className="border-destructive/30 text-destructive">
                          Verificacao rejeitada
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
                <Badge variant="secondary" className="flex-shrink-0">
                  {getCategoryLabel(biz.category).split(" (")[0]}
                </Badge>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span className="flex min-w-0 items-center gap-1 leading-tight">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {biz.address.city}, {getCountryName(biz.address.countryCode || biz.address.country)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 whitespace-nowrap leading-tight">
                  <Star className="h-3 w-3 shrink-0 text-amber-500" />
                  <span>
                    {biz.averageRating.toFixed(1)} ({biz.reviews.length} {biz.reviews.length === 1 ? "avaliação" : "avaliações"})
                  </span>
                </span>
              </div>

              <div className="mt-3 border-t border-border/60 pt-3">
                <div className="grid items-stretch gap-2 sm:flex sm:flex-wrap sm:items-center grid-cols-2">
                  <Link to={`/negocio/wizard?editBusinessId=${biz.id}`}>
                    <Button size="sm" variant="outline" className="w-full sm:w-auto">
                      <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </Link>

                  {getCategoryId(biz.category) === "food" ? (
                    <Button size="sm" variant="outline" onClick={() => onOpenMenuModal(biz)} className="w-full sm:w-auto">
                      <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                      Cardápio
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onOpenServicesModal(biz)} className="w-full sm:w-auto">
                      <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                      Serviços
                    </Button>
                  )}

                  <Button size="sm" variant="outline" onClick={() => onOpenEventsModal(biz)} className="w-full sm:w-auto">
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    Eventos
                  </Button>

                  <Button size="sm" variant="outline" onClick={() => onOpenCouponModal(biz)} className="w-full sm:w-auto">
                    <TicketPercent className="mr-1.5 h-3.5 w-3.5" />
                    Promocoes
                  </Button>

                  {!biz.ownerVerified ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenVerificationModal(biz)}
                      disabled={getMyVerificationStatusByBusiness(biz.id) === "pending"}
                      className="w-full sm:w-auto"
                      title={
                        getMyVerificationStatusByBusiness(biz.id) === "pending"
                          ? "Já existe uma solicitação pendente"
                          : "Solicitar verificacao"
                      }
                    >
                      <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
                      Solicitar verificacao
                    </Button>
                  ) : null}

                  <div className="col-span-2 flex items-center justify-end gap-2 pt-1 sm:col-auto sm:ml-auto sm:pt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      aria-label={`Ver ${biz.name}`}
                    title={biz.moderationStatus === "approved" ? "Ver negócio" : "Pré-visualizar negócio em análise"}
                    >
                    <Link
                      to={biz.moderationStatus === "approved" ? buildBusinessUrl(biz) : `/preview/negocio/${biz.id}`}
                      state={{ preloadedBusiness: biz }}
                      onMouseEnter={() => preloadBusinessPageAssets(biz)}
                      onFocus={() => preloadBusinessPageAssets(biz)}
                      onPointerDown={() => preloadBusinessPageAssets(biz)}
                      target={biz.moderationStatus === "approved" ? "_blank" : undefined}
                      rel={biz.moderationStatus === "approved" ? "noreferrer" : undefined}
                    >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => onDeleteMyBusiness(biz)}
                      aria-label={`Excluir ${biz.name}`}
                      title="Excluir negócio"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {myBusinessesTotalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-sm text-muted-foreground">
                Pagina {safeMyBusinessesPage} de {myBusinessesTotalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={safeMyBusinessesPage <= 1} onClick={onPreviousPage}>
                  Anterior
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={safeMyBusinessesPage >= myBusinessesTotalPages} onClick={onNextPage}>
                  Proxima
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </TabsContent>
  );
}
