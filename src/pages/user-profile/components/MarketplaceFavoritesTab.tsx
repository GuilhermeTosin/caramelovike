import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import MarketplaceListingCard from "@/components/MarketplaceListingCard";
import { getMarketplaceFavoritesByUser } from "@/services/marketplace";
import type { MarketplaceListing } from "@/types/database";

export default function MarketplaceFavoritesTab({ userId }: { userId: string }) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    void getMarketplaceFavoritesByUser(userId)
      .then((items) => {
        if (active) setListings(items);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar seus anúncios favoritos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Anúncios favoritos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Acesse rapidamente os produtos que você salvou no Marketplace.</p>
      </div>

      {loading ? <Card className="p-8 text-center text-muted-foreground">Carregando favoritos...</Card> : null}
      {!loading && error ? <Card className="p-8 text-center text-destructive">{error}</Card> : null}
      {!loading && !error && listings.length === 0 ? (
        <Card className="p-10 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-muted-foreground">Você ainda não salvou nenhum anúncio.</p>
        </Card>
      ) : null}
      {!loading && !error && listings.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {listings.map((listing) => (
            <MarketplaceListingCard
              key={listing.id}
              listing={listing}
              onFavoriteChange={(isFavorite) => {
                if (!isFavorite) setListings((items) => items.filter((item) => item.id !== listing.id));
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
