import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  archiveCommunityFindReport,
  getCommunityFindReportsForAdmin,
  unarchiveCommunityFindReport,
  updateCommunityFindReportStatus,
} from "@/services/communityFindReports";
import { archiveReport, getReportsForAdmin, unarchiveReport, updateReportStatus } from "@/services/reports";
import type { BusinessReport, CommunityFindReport } from "@/types/database";
import type { ReportsKind, ReportsView } from "@/pages/user-profile/types";

type UseReportsAdminOptions = {
  isAdmin: boolean;
  sessionUserId?: string;
};

export function useReportsAdmin({ isAdmin, sessionUserId }: UseReportsAdminOptions) {
  const [reports, setReports] = useState<BusinessReport[]>([]);
  const [communityFindReports, setCommunityFindReports] = useState<CommunityFindReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsView, setReportsView] = useState<ReportsView>("active");
  const [reportsKind, setReportsKind] = useState<ReportsKind>("negocios");

  const loadReportsAdminData = async (mode: ReportsView = reportsView, kind: ReportsKind = reportsKind) => {
    setReportsLoading(true);
    if (kind === "negocios") {
      const data = await getReportsForAdmin(mode);
      setReports(data);
    } else {
      const data = await getCommunityFindReportsForAdmin(mode);
      setCommunityFindReports(data);
    }
    setReportsLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) {
      setReports([]);
      setCommunityFindReports([]);
      return;
    }
    void loadReportsAdminData(reportsView, reportsKind);
  }, [isAdmin, reportsView, reportsKind]);

  const handleReportStatus = async (id: string, status: BusinessReport["status"]) => {
    const result = await updateReportStatus(id, status);
    if (!result.ok) {
      toast.error(result.error || "Erro ao atualizar denuncia.");
      return;
    }
    toast.success("Denuncia atualizada.");
    await loadReportsAdminData(reportsView, reportsKind);
  };

  const handleArchiveReport = async (report: BusinessReport) => {
    if (!sessionUserId) {
      toast.error("Sessao invalida.");
      return;
    }
    if (report.status !== "resolved" && report.status !== "rejected") {
      toast.error("So e possivel arquivar denuncias resolvidas ou rejeitadas.");
      return;
    }
    const result = await archiveReport(report.id, sessionUserId);
    if (!result.ok) {
      toast.error(result.error || "Erro ao arquivar denuncia.");
      return;
    }
    toast.success("Denuncia arquivada.");
    await loadReportsAdminData(reportsView, reportsKind);
  };

  const handleUnarchiveReport = async (report: BusinessReport) => {
    const result = await unarchiveReport(report.id);
    if (!result.ok) {
      toast.error(result.error || "Erro ao desarquivar denuncia.");
      return;
    }
    toast.success("Denuncia desarquivada.");
    await loadReportsAdminData(reportsView, reportsKind);
  };

  const handleCommunityFindReportStatus = async (
    id: string,
    status: CommunityFindReport["status"]
  ) => {
    const result = await updateCommunityFindReportStatus(id, status);
    if (!result.ok) {
      toast.error(result.error || "Erro ao atualizar denuncia de achadinho.");
      return;
    }
    toast.success("Denuncia de achadinho atualizada.");
    await loadReportsAdminData(reportsView, reportsKind);
  };

  const handleArchiveCommunityFindReport = async (report: CommunityFindReport) => {
    if (!sessionUserId) {
      toast.error("Sessao invalida.");
      return;
    }
    if (report.status !== "resolved" && report.status !== "rejected") {
      toast.error("So e possivel arquivar denuncias resolvidas ou rejeitadas.");
      return;
    }
    const result = await archiveCommunityFindReport(report.id, sessionUserId);
    if (!result.ok) {
      toast.error(result.error || "Erro ao arquivar denuncia de achadinho.");
      return;
    }
    toast.success("Denuncia de achadinho arquivada.");
    await loadReportsAdminData(reportsView, reportsKind);
  };

  const handleUnarchiveCommunityFindReport = async (report: CommunityFindReport) => {
    const result = await unarchiveCommunityFindReport(report.id);
    if (!result.ok) {
      toast.error(result.error || "Erro ao desarquivar denuncia de achadinho.");
      return;
    }
    toast.success("Denuncia de achadinho desarquivada.");
    await loadReportsAdminData(reportsView, reportsKind);
  };

  return {
    reports,
    communityFindReports,
    reportsLoading,
    reportsView,
    reportsKind,
    setReportsView,
    setReportsKind,
    loadReportsAdminData,
    handleReportStatus,
    handleArchiveReport,
    handleUnarchiveReport,
    handleCommunityFindReportStatus,
    handleArchiveCommunityFindReport,
    handleUnarchiveCommunityFindReport,
  };
}
