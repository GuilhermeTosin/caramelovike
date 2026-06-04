import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createFeaturedPlacement,
  deleteFeaturedPlacement,
  getFeaturedPlacementsForAdmin,
  updateFeaturedPlacementStatus,
} from "@/services/featured";
import { getDateInputDaysFromNow } from "@/pages/user-profile/utils";
import type { FeaturedForm } from "@/pages/user-profile/types";
import type { BusinessFrontend, FeaturedPlacementFrontend, FeaturedScopeType } from "@/types/database";

type UseFeaturedAdminOptions = {
  isAdmin: boolean;
  allBusinesses: BusinessFrontend[];
  onAllBusinessesRefresh: () => Promise<unknown>;
};

const DEFAULT_FEATURED_FORM: FeaturedForm = {
  businessId: "",
  scopeType: "city" as FeaturedScopeType,
  countryCode: "",
  stateCode: "",
  city: "",
  startsAt: new Date().toISOString().slice(0, 10),
  endsAt: getDateInputDaysFromNow(30),
  priority: "0",
  priceCents: "",
  notes: "",
};

export function useFeaturedAdmin({
  isAdmin,
  allBusinesses,
  onAllBusinessesRefresh,
}: UseFeaturedAdminOptions) {
  const [featuredPlacements, setFeaturedPlacements] = useState<FeaturedPlacementFrontend[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredForm, setFeaturedForm] = useState<FeaturedForm>(DEFAULT_FEATURED_FORM);

  const loadFeaturedAdminData = async () => {
    setFeaturedLoading(true);
    const [placements] = await Promise.all([getFeaturedPlacementsForAdmin(), onAllBusinessesRefresh()]);
    setFeaturedPlacements(placements);
    setFeaturedLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) {
      setFeaturedPlacements([]);
      return;
    }
    void loadFeaturedAdminData();
  }, [isAdmin]);

  const handleFeaturedBusinessChange = (businessId: string) => {
    const business = allBusinesses.find((item) => item.id === businessId);
    setFeaturedForm((prev) => ({
      ...prev,
      businessId,
      countryCode: business?.address.countryCode || prev.countryCode,
      stateCode: business?.address.stateCode || prev.stateCode,
      city: business?.address.city || prev.city,
    }));
  };

  const handleCreateFeaturedPlacement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!featuredForm.businessId) {
      toast.error("Selecione um negocio para destacar.");
      return;
    }

    const result = await createFeaturedPlacement({
      businessId: featuredForm.businessId,
      scopeType: featuredForm.scopeType,
      countryCode: featuredForm.countryCode,
      stateCode: featuredForm.stateCode,
      city: featuredForm.city,
      startsAt: new Date(`${featuredForm.startsAt}T00:00:00`).toISOString(),
      endsAt: new Date(`${featuredForm.endsAt}T23:59:59`).toISOString(),
      priority: Number(featuredForm.priority) || 0,
      priceCents: Number(featuredForm.priceCents) || 0,
      notes: featuredForm.notes,
    });

    if (!result.ok) {
      toast.error(result.error || "Erro ao criar destaque.");
      return;
    }

    toast.success("Destaque criado com sucesso.");
    setFeaturedForm((prev) => ({
      ...prev,
      businessId: "",
      priority: "0",
      priceCents: "",
      notes: "",
    }));
    await loadFeaturedAdminData();
  };

  const handleToggleFeaturedStatus = async (placement: FeaturedPlacementFrontend) => {
    const nextStatus = placement.status === "active" ? "paused" : "active";
    const result = await updateFeaturedPlacementStatus(placement.id, nextStatus);
    if (!result.ok) {
      toast.error(result.error || "Erro ao atualizar destaque.");
      return;
    }
    toast.success(nextStatus === "active" ? "Destaque ativado." : "Destaque pausado.");
    await loadFeaturedAdminData();
  };

  const handleDeleteFeaturedPlacement = async (placement: FeaturedPlacementFrontend) => {
    if (!confirm(`Remover destaque de "${placement.business?.name || "negocio"}"?`)) return;
    const result = await deleteFeaturedPlacement(placement.id);
    if (!result.ok) {
      toast.error(result.error || "Erro ao remover destaque.");
      return;
    }
    toast.success("Destaque removido.");
    await loadFeaturedAdminData();
  };

  return {
    featuredPlacements,
    featuredLoading,
    featuredForm,
    setFeaturedForm,
    loadFeaturedAdminData,
    handleFeaturedBusinessChange,
    handleCreateFeaturedPlacement,
    handleToggleFeaturedStatus,
    handleDeleteFeaturedPlacement,
  };
}
