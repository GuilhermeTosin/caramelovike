import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CommunityFind } from "@/types/database";
import type { CommunityFindEditForm } from "@/pages/user-profile/types";

type EditCommunityFindDialogProps = {
  editingCommunityFind: CommunityFind | null;
  editingCommunityFindForm: CommunityFindEditForm;
  editingCommunityFindSubmitting: boolean;
  onClose: () => void;
  onFormChange: (value: CommunityFindEditForm | ((prev: CommunityFindEditForm) => CommunityFindEditForm)) => void;
  onSave: () => void;
};

export default function EditCommunityFindDialog({
  editingCommunityFind,
  editingCommunityFindForm,
  editingCommunityFindSubmitting,
  onClose,
  onFormChange,
  onSave,
}: EditCommunityFindDialogProps) {
  return (
    <Dialog open={!!editingCommunityFind} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar achadinho</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-find-product">Nome do produto</Label>
            <Input
              id="edit-find-product"
              className="mt-1.5"
              value={editingCommunityFindForm.productName}
              onChange={(e) => onFormChange((prev) => ({ ...prev, productName: e.target.value }))}
              maxLength={140}
            />
          </div>
          <div>
            <Label htmlFor="edit-find-location">Nome do local</Label>
            <Input
              id="edit-find-location"
              className="mt-1.5"
              value={editingCommunityFindForm.locationName}
              onChange={(e) => onFormChange((prev) => ({ ...prev, locationName: e.target.value }))}
              maxLength={180}
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select
              value={editingCommunityFindForm.category}
              onValueChange={(value) =>
                onFormChange((prev) => ({
                  ...prev,
                  category: value as CommunityFind["category"],
                }))
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comida">Comida</SelectItem>
                <SelectItem value="beleza">Beleza</SelectItem>
                <SelectItem value="casa">Casa</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            onClick={onSave}
            disabled={editingCommunityFindSubmitting}
          >
            {editingCommunityFindSubmitting ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
