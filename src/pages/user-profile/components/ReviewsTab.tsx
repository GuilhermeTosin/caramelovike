import { Link } from "react-router-dom";
import { Edit3, ExternalLink, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ConfirmDeleteReviewState,
  GivenReviewWithBusiness,
  ReceivedReviewWithBusiness,
} from "@/pages/user-profile/types";

type ReviewsTabProps = {
  subAvaliacoesTab: string;
  onSubAvaliacoesTabChange: (value: string) => void;
  myReviews: ReceivedReviewWithBusiness[];
  givenReviews: GivenReviewWithBusiness[];
  userName: string;
  onStartEditReview: (review: GivenReviewWithBusiness) => void;
  onConfirmDeleteReview: (value: ConfirmDeleteReviewState) => void;
};

export default function ReviewsTab({
  subAvaliacoesTab,
  onSubAvaliacoesTabChange,
  myReviews,
  givenReviews,
  userName,
  onStartEditReview,
  onConfirmDeleteReview,
}: ReviewsTabProps) {
  return (
    <TabsContent value="avaliacoes" className="mt-0">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-foreground">Avaliações</h2>
        <Tabs value={subAvaliacoesTab} onValueChange={onSubAvaliacoesTabChange} className="ml-auto">
          <TabsList>
            <TabsTrigger value="recebidas" className="text-sm">
              Recebidas ({myReviews.length})
            </TabsTrigger>
            <TabsTrigger value="feitas" className="text-sm">
              Feitas ({givenReviews.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {subAvaliacoesTab === "recebidas" && (
        <>
          {myReviews.length === 0 ? (
            <Card className="p-8 text-center border-border">
              <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Seus negócios ainda não receberam avaliações.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {myReviews.map((review) => (
                <Card key={review.id} className="p-4 border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                          {((review as { user_name?: string }).user_name || "Usuário").charAt(0)}
                        </div>
                        <span className="font-medium">{(review as { user_name?: string }).user_name || "Usuário"}</span>
                        <span className="text-muted-foreground">em</span>
                        <Link to={review.businessSlug} className="text-primary hover:underline font-medium">
                          {review.businessName}
                          <ExternalLink className="w-3 h-3 ml-0.5 inline" />
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "fill-current" : "text-muted-foreground/20"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.created_at || (review as { createdAt?: string }).createdAt || "").toLocaleDateString("pt-BR")}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {subAvaliacoesTab === "feitas" && (
        <>
          {givenReviews.length === 0 ? (
            <Card className="p-8 text-center border-border">
              <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Você ainda não avaliou nenhum negócio.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {givenReviews.map((review) => (
                <Card key={review.id} className="p-4 border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                          {(userName || "U").charAt(0)}
                        </div>
                        <span className="font-medium">Você</span>
                        <span className="text-muted-foreground">em</span>
                        <Link to={review.businessSlug} className="text-primary hover:underline font-medium">
                          {review.businessName}
                          <ExternalLink className="w-3 h-3 ml-0.5 inline" />
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "fill-current" : "text-muted-foreground/20"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.created_at || (review as { createdAt?: string }).createdAt || "").toLocaleDateString("pt-BR")}
                  </p>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Button size="sm" variant="outline" onClick={() => onStartEditReview(review)}>
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() =>
                        onConfirmDeleteReview({
                          reviewId: review.id,
                          businessId: review.businessId,
                        })
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Remover
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </TabsContent>
  );
}
