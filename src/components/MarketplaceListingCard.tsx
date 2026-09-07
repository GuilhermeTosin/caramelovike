import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MapPin, Tag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { marketplaceListingPath } from "@/lib/marketplaceSnapshot";
import { toggleMarketplaceFavorite } from "@/services/marketplace";
import type { MarketplaceListing } from "@/types/database";

const LISTING_TYPE_LABELS: Record<MarketplaceListing["listing_type"], string> = {
  selling: "Vendendo",
  wanted: "Procurando",
  giving_away: "Doando",
};

function formatPrice(listing: MarketplaceListing) {
  if (listing.listing_type !== "selling" && listing.price == null) return LISTING_TYPE_LABELS[listing.listing_type];
  if (listing.price == null) return "Preço a combinar";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: listing.currency || "CAD" }).format(listing.price);
}

function listingLocation(listing: MarketplaceListing) {
  return listing.neighborhood
    ? `${listing.city}, ${listing.state_code.toUpperCase()} - ${listing.neighborhood}`
    : `${listing.city}, ${listing.state_code.toUpperCase()}`;
}

type MarketplaceListingCardProps = {
  listing: MarketplaceListing;
  onFavoriteChange?: (isFavorite: boolean) => void;
};

export default function MarketplaceListingCard({ listing, onFavoriteChange }: MarketplaceListingCardProps) {
  const image = listing.images?.[0]?.image_url;
  const [favorite, setFavorite] = useState(!!listing.is_favorited);
  const [savingFavorite, setSavingFavorite] = useState(false);

  useEffect(() => {
    setFavorite(!!listing.is_favorited);
  }, [listing.is_favorited]);

  const handleFavorite = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (savingFavorite) return;

    const nextFavorite = !favorite;
    setSavingFavorite(true);
    const result = await toggleMarketplaceFavorite(listing.id, nextFavorite);
    setSavingFavorite(false);

    if (!result.ok) {
      toast.error(result.error || "Não foi possível salvar o anúncio.");
      return;
    }

    setFavorite(nextFavorite);
    onFavoriteChange?.(nextFavorite);
    toast.success(nextFavorite ? "Anúncio salvo nos favoritos." : "Anúncio removido dos favoritos.");
  };

  return (
    <Card className="relative h-full overflow-hidden border-border transition-shadow hover:shadow-lg">
      <Link to={marketplaceListingPath(listing)} className="group block h-full">
        <div className="aspect-square overflow-hidden bg-secondary">
          {image ? (
            <img
              src={image}
              alt={listing.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Tag className="h-9 w-9" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="space-y-1.5 p-3">
          <h2 className="line-clamp-2 pr-8 text-sm font-semibold leading-snug text-foreground">{listing.title}</h2>
          <p className="text-base font-bold text-primary">{formatPrice(listing)}</p>
          <p className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{listingLocation(listing)}</span>
          </p>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className="max-w-[65%] truncate text-[10px]">
              {listing.category?.name || "Marketplace"}
            </Badge>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {new Date(listing.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      </Link>
      <button
        type="button"
        aria-label={favorite ? `Remover ${listing.title} dos favoritos` : `Salvar ${listing.title} nos favoritos`}
        aria-pressed={favorite}
        disabled={savingFavorite}
        onClick={handleFavorite}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-background/95 text-muted-foreground shadow-sm transition-colors hover:text-red-500 disabled:cursor-wait disabled:opacity-70"
      >
        <Heart className={`h-4 w-4 ${favorite ? "fill-red-500 text-red-500" : ""}`} aria-hidden="true" />
      </button>
    </Card>
  );
}
