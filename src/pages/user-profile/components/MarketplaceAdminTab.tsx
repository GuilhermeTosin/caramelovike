import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMarketplaceListingsForAdmin, updateMarketplaceListingStatus } from "@/services/marketplace";
import { getMarketplaceListingStatusLabel } from "@/lib/marketplaceStatus";
import type { MarketplaceListing } from "@/types/database";

export default function MarketplaceAdminTab() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setListings(await getMarketplaceListingsForAdmin());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os anúncios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const changeListingStatus = async (id: string, status: MarketplaceListing["status"]) => {
    const result = await updateMarketplaceListingStatus(id, status);
    if (!result.ok) {
      toast.error(result.error || "Não foi possível atualizar o anúncio.");
      return;
    }
    setListings((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    toast.success("Anúncio atualizado.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Marketplace</h2>
          <p className="mt-1 text-sm text-muted-foreground">Modere anúncios da comunidade. As denúncias ficam na aba Denúncias.</p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading}>Atualizar</Button>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4 font-semibold">Anúncios ({listings.length})</div>
        {loading ? (
          <p className="p-6 text-center text-muted-foreground" role="status">Carregando anúncios...</p>
        ) : error ? (
          <div className="space-y-3 p-6" role="alert">
            <p className="font-medium text-destructive">Não foi possível carregar os anúncios.</p>
            <p className="break-words text-sm text-muted-foreground">{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">Nenhum anúncio registrado.</p>
        ) : (
          <div className="divide-y divide-border">
            {listings.map((listing) => (
              <div key={listing.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{listing.title}</p>
                  <p className="text-sm text-muted-foreground">{listing.city} · {listing.owner_name || "Usuário"}</p>
                  <Badge variant="secondary" className="mt-1">{getMarketplaceListingStatusLabel(listing.status)}</Badge>
                </div>
                <div className="flex gap-2">
                  {listing.status !== "removed" ? (
                    <Button size="sm" variant="outline" onClick={() => void changeListingStatus(listing.id, "removed")}>Remover</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => void changeListingStatus(listing.id, "active")}>Restaurar</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
