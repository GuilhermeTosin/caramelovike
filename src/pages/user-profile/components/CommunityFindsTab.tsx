import { Edit3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import AddCommunityFindForm from "@/components/AddCommunityFindForm";
import type { CommunityFind } from "@/types/database";

type CommunityFindsTabProps = {
  showCommunityFindForm: boolean;
  myCommunityFinds: CommunityFind[];
  onToggleForm: () => void;
  onCreated: () => Promise<void>;
  onStartEditCommunityFind: (find: CommunityFind) => void;
  onDeleteCommunityFind: (findId: string) => void;
};

export default function CommunityFindsTab({
  showCommunityFindForm,
  myCommunityFinds,
  onToggleForm,
  onCreated,
  onStartEditCommunityFind,
  onDeleteCommunityFind,
}: CommunityFindsTabProps) {
  return (
    <TabsContent value="achadinhos" className="mt-0">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Achadinhos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os achadinhos que você publicou para a comunidade.
            </p>
          </div>
          <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={onToggleForm}>
            <Plus className="w-4 h-4 mr-2" />
            {showCommunityFindForm ? "Fechar formulário" : "Novo achadinho"}
          </Button>
        </div>

        {showCommunityFindForm && <AddCommunityFindForm onCreated={onCreated} />}

        {myCommunityFinds.some((find) => (find.upvotes || 0) - (find.downvotes || 0) <= -2) && (
          <Card className="border-amber-300 bg-amber-50">
            <div className="p-4 text-sm text-amber-800">
              Alguns achadinhos receberam muitos votos negativos. Revise, atualize ou remova para manter a qualidade das informações.
            </div>
          </Card>
        )}

        <Card className="border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">Meus achadinhos publicados</h3>
          </div>
          {myCommunityFinds.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Você ainda não publicou nenhum achadinho.</div>
          ) : (
            <div className="divide-y divide-border">
              {myCommunityFinds.map((find) => (
                <div key={find.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{find.product_name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{find.location_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Publicado em {new Date(find.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {find.category}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => onStartEditCommunityFind(find)}>
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => onDeleteCommunityFind(find.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Excluir
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
