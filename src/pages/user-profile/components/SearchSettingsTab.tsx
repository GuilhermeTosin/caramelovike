import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessFrontend } from "@/types/database";

type SearchSettingsTabProps = {
  allBusinesses: BusinessFrontend[];
  searchSynonymsConfig: Record<string, string[]>;
  searchSynonymsCategory: string;
  searchSynonymsDraft: string;
  selectedFollowBusinessId: string;
  followLinksBusinessIds: string[];
  savingFollowLinksBusinessIds: boolean;
  onSearchSynonymsCategoryChange: (value: string) => void;
  onSearchSynonymsDraftChange: (value: string) => void;
  onSelectedFollowBusinessIdChange: (value: string) => void;
  onSaveSearchSynonyms: () => void;
  onResetSearchSynonyms: () => void;
  onRefreshSitemap: () => void;
  onEnableBusinessFollowLinks: () => void;
  onDisableBusinessFollowLinks: (businessId: string) => void;
};

export default function SearchSettingsTab({
  allBusinesses,
  searchSynonymsConfig,
  searchSynonymsCategory,
  searchSynonymsDraft,
  selectedFollowBusinessId,
  followLinksBusinessIds,
  savingFollowLinksBusinessIds,
  onSearchSynonymsCategoryChange,
  onSearchSynonymsDraftChange,
  onSelectedFollowBusinessIdChange,
  onSaveSearchSynonyms,
  onResetSearchSynonyms,
  onRefreshSitemap,
  onEnableBusinessFollowLinks,
  onDisableBusinessFollowLinks,
}: SearchSettingsTabProps) {
  return (
    <TabsContent value="busca">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configuração de Busca</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edite sinônimos por categoria para melhorar a relevância dos resultados.
          </p>
        </div>

        <Card className="space-y-4 border-border p-6">
          <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
            <h3 className="font-semibold text-foreground">Sitemap</h3>
            <p className="text-xs text-muted-foreground">
              Atualize manualmente o sitemap sempre que quiser forçar uma nova geração das URLs públicas.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onRefreshSitemap}>
                Recarregar sitemap
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              O sitemap público é servido em <code>/sitemap.xml</code>, com dois arquivos públicos:{" "}
              <code>/sitemaps/static.xml</code> e <code>/sitemaps/businesses.xml</code>. O sitemap de negócios
              consulta a base atual e usa um fallback estático se o Supabase estiver indisponível.
            </p>
          </div>

          <div>
            <Label>Categoria</Label>
            <Select value={searchSynonymsCategory} onValueChange={onSearchSynonymsCategoryChange}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(searchSynonymsConfig).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Sinônimos (separados por vírgula)</Label>
            <Textarea
              value={searchSynonymsDraft}
              onChange={(e) => onSearchSynonymsDraftChange(e.target.value)}
              className="mt-1.5 min-h-[120px]"
              placeholder="Ex: advogado, jurídico, imigração, tradução"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onSaveSearchSynonyms}>Salvar sinônimos</Button>
            <Button variant="outline" onClick={onResetSearchSynonyms}>
              Restaurar padrão
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-secondary/20 p-4">
            <div>
              <h3 className="font-semibold text-foreground">Links follow por negócio</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Por padrão, links externos públicos saem com <code>ugc nofollow noopener</code>. Aqui você escolhe os
                negócios que podem sair sem <code>nofollow</code>.
              </p>
            </div>

            <div>
              <Label>Negócio</Label>
              <Select value={selectedFollowBusinessId} onValueChange={onSelectedFollowBusinessIdChange}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione um negócio" />
                </SelectTrigger>
                <SelectContent>
                  {allBusinesses.map((biz) => (
                    <SelectItem key={biz.id} value={biz.id}>
                      {biz.name} {biz.address.city ? `- ${biz.address.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={onEnableBusinessFollowLinks} disabled={savingFollowLinksBusinessIds}>
                Liberar follow
              </Button>
              {selectedFollowBusinessId && followLinksBusinessIds.includes(selectedFollowBusinessId) ? (
                <Button
                  variant="outline"
                  onClick={() => onDisableBusinessFollowLinks(selectedFollowBusinessId)}
                  disabled={savingFollowLinksBusinessIds}
                >
                  Restaurar nofollow
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Negócios com follow liberado</Label>
              {followLinksBusinessIds.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum negócio com exceção configurada.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {followLinksBusinessIds.map((businessId) => {
                    const biz = allBusinesses.find((item) => item.id === businessId);
                    if (!biz) return null;
                    return (
                      <button
                        key={businessId}
                        type="button"
                        onClick={() => onDisableBusinessFollowLinks(businessId)}
                        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary"
                      >
                        <span>{biz.name}</span>
                        <X className="h-3 w-3" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </TabsContent>
  );
}
