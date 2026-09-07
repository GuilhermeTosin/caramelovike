import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { archiveReport, getReportsForAdmin, unarchiveReport, updateReportStatus } from "@/services/reports";
import type { BusinessReport } from "@/types/database";
import type { ReportsView } from "@/pages/user-profile/types";

type UseReportsAdminOptions = {
  isAdmin: boolean;
  sessionUserId?: string;
};

export function useReportsAdmin({ isAdmin, sessionUserId }: UseReportsAdminOptions) {
  const [reports, setReports] = useState<BusinessReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsView, setReportsView] = useState<ReportsView>("active");

  const loadReportsAdminData = useCallback(async (mode: ReportsView = reportsView) => {
    setReportsLoading(true);
    const data = await getReportsForAdmin(mode);
    setReports(data);
    setReportsLoading(false);
  }, [reportsView]);

  useEffect(() => {
    let active = true;
    if (!isAdmin) {
      Promise.resolve().then(() => {
        if (active) setReports([]);
      });
      return;
    }
    const timer = window.setTimeout(() => { void loadReportsAdminData(reportsView); }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [isAdmin, loadReportsAdminData, reportsView]);

  const handleReportStatus = async (id: string, status: BusinessReport["status"]) => {
    const result = await updateReportStatus(id, status);
    if (!result.ok) {
      toast.error(result.error || "Erro ao atualizar denuncia.");
      return;
    }
    toast.success("Denuncia atualizada.");
    await loadReportsAdminData(reportsView);
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
    await loadReportsAdminData(reportsView);
  };

  const handleUnarchiveReport = async (report: BusinessReport) => {
    const result = await unarchiveReport(report.id);
    if (!result.ok) {
      toast.error(result.error || "Erro ao desarquivar denuncia.");
      return;
    }
    toast.success("Denuncia desarquivada.");
    await loadReportsAdminData(reportsView);
  };

  return {
    reports,
    reportsLoading,
    reportsView,
    setReportsView,
    loadReportsAdminData,
    handleReportStatus,
    handleArchiveReport,
    handleUnarchiveReport,
  };
}
