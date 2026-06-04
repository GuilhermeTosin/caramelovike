import { Edit3, Search, Store, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { buildBusinessUrl } from "@/services/businesses";
import type { BusinessFrontend } from "@/types/database";

type AllBusinessesTabProps = {
  filteredAllBusinesses: BusinessFrontend[];
  paginatedAllBusinesses: BusinessFrontend[];
  allBusinessesSearch: string;
  safeAllBusinessesPage: number;
  allBusinessesTotalPages: number;
  getCategoryLabel: (category: string) => string;
  onSearchChange: (value: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onDeleteBusiness: (business: BusinessFrontend) => void;
};

export default function AllBusinessesTab({
  filteredAllBusinesses,
  paginatedAllBusinesses,
  allBusinessesSearch,
  safeAllBusinessesPage,
  allBusinessesTotalPages,
  getCategoryLabel,
  onSearchChange,
  onPreviousPage,
  onNextPage,
  onDeleteBusiness,
}: AllBusinessesTabProps) {
  return (
    <TabsContent value="todos-negocios" className="mt-0">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-2xl font-bold text-foreground">Todos os negócios</h2>
          <div className="relative w-full sm:w-[340px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={allBusinessesSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nome, cidade ou país"
              className="pl-9"
            />
          </div>
        </div>

        {filteredAllBusinesses.length === 0 ? (
          <Card className="p-8 text-center border-border">
            <Store className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum negócio encontrado com esse filtro.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {paginatedAllBusinesses.map((biz) => (
              <Card key={biz.id} className="p-4 border-border">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                    <img
                      src={biz.logoUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=60"}
                      alt={biz.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={buildBusinessUrl(biz)} className="font-semibold text-foreground hover:text-primary transition-colors">
                        {biz.name}
                      </Link>
                      <Badge variant="secondary">{getCategoryLabel(biz.category).split(" (")[0]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {biz.address.city}, {biz.address.countryCode.toUpperCase()} · {biz.address.country}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/negocio/wizard?editBusinessId=${biz.id}`}>
                      <Button size="sm" variant="outline">
                        <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                        Editar
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => onDeleteBusiness(biz)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Remover
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {allBusinessesTotalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Página {safeAllBusinessesPage} de {allBusinessesTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={safeAllBusinessesPage <= 1} onClick={onPreviousPage}>
                    Anterior
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={safeAllBusinessesPage >= allBusinessesTotalPages} onClick={onNextPage}>
                    Próxima
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </TabsContent>
  );
}
