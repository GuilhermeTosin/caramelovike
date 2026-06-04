import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getVerificationRequestsByOwner,
  getPendingVerificationRequestsForAdmin,
  requestBusinessVerification,
  setBusinessVerifiedFlag,
  setVerificationRequestStatus,
} from "@/services/verification";
import { getPendingBusinessesForAdmin, setBusinessModerationStatus } from "@/services/businesses";
import type { BusinessFrontend, BusinessVerificationRequest } from "@/types/database";

type UseVerificationAdminOptions = {
  isAdmin: boolean;
  sessionUserId?: string;
  onAllBusinessesRefresh: () => Promise<void>;
};

export function useVerificationAdmin({
  isAdmin,
  sessionUserId,
  onAllBusinessesRefresh,
}: UseVerificationAdminOptions) {
  const [verificationBusiness, setVerificationBusiness] = useState<BusinessFrontend | null>(null);
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const [instagramPostUrl, setInstagramPostUrl] = useState("");
  const [verificationRequests, setVerificationRequests] = useState<BusinessVerificationRequest[]>([]);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [myVerificationRequests, setMyVerificationRequests] = useState<BusinessVerificationRequest[]>([]);
  const [pendingModerationBusinesses, setPendingModerationBusinesses] = useState<BusinessFrontend[]>([]);
  const [moderationLoading, setModerationLoading] = useState(false);

  const refreshOwnerVerificationRequests = async () => {
    if (!sessionUserId) return;
    const requests = await getVerificationRequestsByOwner(sessionUserId);
    setMyVerificationRequests(requests);
  };

  const loadVerificationAdminData = async () => {
    setVerificationLoading(true);
    const data = await getPendingVerificationRequestsForAdmin();
    setVerificationRequests(data);
    setVerificationLoading(false);
  };

  const loadBusinessModerationData = async () => {
    setModerationLoading(true);
    const data = await getPendingBusinessesForAdmin();
    setPendingModerationBusinesses(data);
    setModerationLoading(false);
  };

  useEffect(() => {
    if (!sessionUserId) {
      setMyVerificationRequests([]);
      return;
    }
    void refreshOwnerVerificationRequests();
  }, [sessionUserId]);

  useEffect(() => {
    if (!isAdmin) {
      setVerificationRequests([]);
      setPendingModerationBusinesses([]);
      return;
    }
    void loadVerificationAdminData();
    void loadBusinessModerationData();
  }, [isAdmin]);

  const getMyVerificationStatusByBusiness = (businessId: string): "pending" | "approved" | "rejected" | null => {
    const request = myVerificationRequests.find((item) => item.business_id === businessId);
    return request?.status || null;
  };

  const handleModerationDecision = async (
    business: BusinessFrontend,
    status: "approved" | "rejected"
  ) => {
    if (!sessionUserId) {
      toast.error("Sessão inválida.");
      return;
    }
    const ok = await setBusinessModerationStatus(business.id, status, sessionUserId);
    if (!ok) {
      toast.error("Não foi possível atualizar o status deste negócio.");
      return;
    }
    toast.success(status === "approved" ? "Negócio aprovado e publicado." : "Negócio rejeitado.");
    setPendingModerationBusinesses((prev) => prev.filter((item) => item.id !== business.id));
    await onAllBusinessesRefresh();
  };

  const handleOpenVerificationModal = (business: BusinessFrontend) => {
    if (getMyVerificationStatusByBusiness(business.id) === "pending") {
      toast.info("Este negócio já possui uma solicitação de verificação pendente.");
      return;
    }
    setInstagramPostUrl("");
    setVerificationBusiness(business);
  };

  const handleSubmitVerificationRequest = async () => {
    if (!verificationBusiness || !sessionUserId) return;
    if (getMyVerificationStatusByBusiness(verificationBusiness.id) === "pending") {
      toast.info("Este negócio já possui uma solicitação de verificação pendente.");
      return;
    }
    if (verificationBusiness.reviews.length < 5) {
      toast.error("Seu negócio precisa ter pelo menos 5 avaliações para solicitar verificação.");
      return;
    }
    if (!verificationBusiness.instagram?.trim()) {
      toast.error("Adicione o Instagram do negócio antes de solicitar verificação.");
      return;
    }
    if (!instagramPostUrl.trim()) {
      toast.error("Informe o link do post no Instagram marcando o Caramelinho.");
      return;
    }

    setVerificationSubmitting(true);
    const result = await requestBusinessVerification({
      businessId: verificationBusiness.id,
      ownerId: sessionUserId,
      instagramPostUrl,
    });
    setVerificationSubmitting(false);

    if (!result.ok) {
      toast.error(result.error || "Não foi possível enviar a solicitação de verificação.");
      return;
    }

    await refreshOwnerVerificationRequests();
    toast.success("Solicitação de verificação enviada para análise.");
    setVerificationBusiness(null);
  };

  const handleApproveVerification = async (request: BusinessVerificationRequest) => {
    if (!sessionUserId) return;
    const statusResult = await setVerificationRequestStatus(request.id, "approved", sessionUserId);
    if (!statusResult.ok || !statusResult.businessId) {
      toast.error(statusResult.error || "Erro ao aprovar verificação.");
      return;
    }

    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 12);
    const flagResult = await setBusinessVerifiedFlag(statusResult.businessId, true, validUntil.toISOString());
    if (!flagResult.ok) {
      toast.error(flagResult.error || "Aprovado, mas falhou ao atualizar o badge de verificação.");
      return;
    }

    toast.success("Negócio verificado com sucesso (validade de 12 meses).");
    await loadVerificationAdminData();
    await onAllBusinessesRefresh();
  };

  const handleRejectVerification = async (request: BusinessVerificationRequest) => {
    if (!sessionUserId) return;
    const result = await setVerificationRequestStatus(request.id, "rejected", sessionUserId);
    if (!result.ok) {
      toast.error(result.error || "Erro ao rejeitar verificação.");
      return;
    }
    toast.success("Solicitação de verificação rejeitada.");
    await loadVerificationAdminData();
  };

  const handleRemoveBusinessVerification = async (business: BusinessFrontend) => {
    if (!confirm(`Remover o selo de verificação de "${business.name}"?`)) return;
    const result = await setBusinessVerifiedFlag(business.id, false);
    if (!result.ok) {
      toast.error(result.error || "Não foi possível remover a verificação.");
      return;
    }
    toast.success("Verificação removida com sucesso.");
    await onAllBusinessesRefresh();
  };

  return {
    verificationBusiness,
    verificationSubmitting,
    instagramPostUrl,
    verificationRequests,
    verificationLoading,
    myVerificationRequests,
    pendingModerationBusinesses,
    moderationLoading,
    setVerificationBusiness,
    setInstagramPostUrl,
    loadVerificationAdminData,
    loadBusinessModerationData,
    getMyVerificationStatusByBusiness,
    handleModerationDecision,
    handleOpenVerificationModal,
    handleSubmitVerificationRequest,
    handleApproveVerification,
    handleRejectVerification,
    handleRemoveBusinessVerification,
  };
}
