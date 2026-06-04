import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BusinessFrontend } from "@/types/database";

type ModerationPreviewDialogProps = {
  business: BusinessFrontend | null;
  onClose: () => void;
  onDecision: (business: BusinessFrontend, status: "approved" | "rejected") => void;
  getCategoryLabel: (value: string) => string;
};

export default function ModerationPreviewDialog({
  business,
  onClose,
  onDecision,
  getCategoryLabel,
}: ModerationPreviewDialogProps) {
  return (
    <Dialog open={!!business} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Revisão de negócio</DialogTitle>
        </DialogHeader>
        {business && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Mídia enviada</p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Logo</p>
                    {business.logoUrl ? (
                      <div className="w-20 h-20 rounded-md overflow-hidden border border-border bg-secondary/30">
                        <img src={business.logoUrl} alt="Logo enviada" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Não enviada</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Capa</p>
                    {business.heroImage ? (
                      <div className="w-full max-w-[220px] h-20 rounded-md overflow-hidden border border-border bg-secondary/30">
                        <img src={business.heroImage} alt="Capa enviada" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Não enviada</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Galeria</p>
                  {business.photos?.length ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {business.photos.slice(0, 8).map((url, idx) => (
                        <div key={`${url}-${idx}`} className="aspect-square rounded-md overflow-hidden border border-border bg-secondary/30">
                          <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhuma foto na galeria</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-medium">{business.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Categoria</p>
              <p>{getCategoryLabel(business.category)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Descrição</p>
              <p>{business.description || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Endereço</p>
              <p>
                {[
                  business.address.street,
                  business.address.city,
                  business.address.state,
                  business.address.country,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p>{business.phone || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p>{business.email || "-"}</p>
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {business && (
            <>
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => onDecision(business, "rejected")}
              >
                Rejeitar
              </Button>
              <Button onClick={() => onDecision(business, "approved")}>
                Aprovar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
