import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EditingReviewState } from "@/pages/user-profile/types";

type EditReviewDialogProps = {
  editingReview: EditingReviewState | null;
  onClose: () => void;
  onChange: (value: EditingReviewState) => void;
  onSave: () => void;
};

export default function EditReviewDialog({
  editingReview,
  onClose,
  onChange,
  onSave,
}: EditReviewDialogProps) {
  return (
    <Dialog open={!!editingReview} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Avaliação</DialogTitle>
        </DialogHeader>
        {editingReview && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Avaliação em <span className="font-medium text-foreground">{editingReview.review.businessName}</span>
            </p>

            <div>
              <Label>Nota</Label>
              <div className="flex gap-1 mt-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      onChange({ ...editingReview, rating: star })
                    }
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= editingReview.rating
                          ? "fill-amber-500 text-amber-500"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="edit-comment">Comentário</Label>
              <Textarea
                id="edit-comment"
                value={editingReview.comment}
                onChange={(e) =>
                  onChange({ ...editingReview, comment: e.target.value })
                }
                placeholder="Escreva seu comentário..."
                className="mt-1.5"
                rows={4}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose} disabled={editingReview.saving}>
                Cancelar
              </Button>
              <Button onClick={onSave} disabled={editingReview.saving || !editingReview.comment.trim()}>
                {editingReview.saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
