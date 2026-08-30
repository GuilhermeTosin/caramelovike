import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ConfirmDeleteReviewState } from "@/pages/user-profile/types";
import { useSiteLocale } from "@/contexts/LocaleContext";

type DeleteReviewDialogProps = {
  confirmDeleteReview: ConfirmDeleteReviewState | null;
  onClose: () => void;
  onDelete: () => void;
};

export default function DeleteReviewDialog({
  confirmDeleteReview,
  onClose,
  onDelete,
}: DeleteReviewDialogProps) {
  const { locale } = useSiteLocale();
  const isEnglish = locale === "en";
  return (
    <Dialog open={!!confirmDeleteReview} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEnglish ? "Remove review" : "Remover Avaliação"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          {isEnglish ? "Are you sure you want to remove this review? This action cannot be undone." : "Tem certeza que deseja remover esta avaliação? Esta ação não pode ser desfeita."}
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {isEnglish ? "Cancel" : "Cancelar"}
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            {isEnglish ? "Remove" : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
