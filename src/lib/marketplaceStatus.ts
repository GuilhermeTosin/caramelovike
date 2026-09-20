import type { MarketplaceListingStatus } from "@/types/database";

export const MARKETPLACE_LISTING_STATUS_LABELS: Record<MarketplaceListingStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
  sold: "Vendido",
  expired: "Expirado",
  removed: "Removido",
};

export function getMarketplaceListingStatusLabel(status: MarketplaceListingStatus) {
  return MARKETPLACE_LISTING_STATUS_LABELS[status] || status;
}
