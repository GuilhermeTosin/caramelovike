import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  approveOwnershipRequest,
  getPendingOwnershipRequests,
  rejectOwnershipRequest,
  transferBusinessOwnershipByEmail,
} from "@/services/ownership";
import type { OwnerClaimRequest } from "@/types/database";

type UseOwnershipAdminOptions = {
  isAdmin: boolean;
  sessionUserId?: string;
  onAllBusinessesRefresh: () => Promise<unknown>;
  onOwnedBusinessesRefresh: (ownerId?: string) => Promise<unknown>;
};

export function useOwnershipAdmin({
  isAdmin,
  sessionUserId,
  onAllBusinessesRefresh,
  onOwnedBusinessesRefresh,
}: UseOwnershipAdminOptions) {
  const [ownershipRequests, setOwnershipRequests] = useState<OwnerClaimRequest[]>([]);
  const [ownershipLoading, setOwnershipLoading] = useState(false);
  const [transferBusinessId, setTransferBusinessId] = useState("");
  const [transferEmail, setTransferEmail] = useState("");

  const loadOwnershipAdminData = async () => {
    setOwnershipLoading(true);
    const [requests] = await Promise.all([getPendingOwnershipRequests(), onAllBusinessesRefresh()]);
    setOwnershipRequests(requests);
    setOwnershipLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) {
      setOwnershipRequests([]);
      return;
    }
    void loadOwnershipAdminData();
  }, [isAdmin]);

  const handleApproveOwnership = async (request: OwnerClaimRequest) => {
    const result = await approveOwnershipRequest(request.id);
    if (!result.ok) {
      toast.error(result.error || "Erro ao aprovar solicitacao.");
      return;
    }
    toast.success(`Ownership transferido para ${request.requester_name || request.requester_email}.`);
    await loadOwnershipAdminData();
  };

  const handleRejectOwnership = async (request: OwnerClaimRequest) => {
    const result = await rejectOwnershipRequest(request.id);
    if (!result.ok) {
      toast.error(result.error || "Erro ao recusar solicitacao.");
      return;
    }
    toast.success("Solicitacao recusada.");
    await loadOwnershipAdminData();
  };

  const handleDirectTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transferBusinessId || !transferEmail.trim()) {
      toast.error("Selecione o negocio e informe o email do novo dono.");
      return;
    }

    const result = await transferBusinessOwnershipByEmail(transferBusinessId, transferEmail.trim());
    if (!result.ok) {
      toast.error(result.error || "Erro ao transferir ownership.");
      return;
    }

    toast.success("Ownership transferido com sucesso.");
    setTransferBusinessId("");
    setTransferEmail("");
    await loadOwnershipAdminData();
    if (sessionUserId) {
      await onOwnedBusinessesRefresh(sessionUserId);
    }
  };

  return {
    ownershipRequests,
    ownershipLoading,
    transferBusinessId,
    transferEmail,
    setTransferBusinessId,
    setTransferEmail,
    loadOwnershipAdminData,
    handleApproveOwnership,
    handleRejectOwnership,
    handleDirectTransfer,
  };
}
