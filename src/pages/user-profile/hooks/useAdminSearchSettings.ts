import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_CATEGORY_SYNONYMS,
  getCategorySynonymsConfig,
  getFollowLinksBusinessIds,
  getGlobalCategorySynonymsConfig,
  saveFollowLinksBusinessIds,
  saveGlobalCategorySynonymsConfig,
} from "@/services/searchPreferences";

type UseAdminSearchSettingsOptions = {
  isAdmin: boolean;
};

export function useAdminSearchSettings({ isAdmin }: UseAdminSearchSettingsOptions) {
  const [searchSynonymsConfig, setSearchSynonymsConfig] = useState<Record<string, string[]>>(getCategorySynonymsConfig());
  const [searchSynonymsCategory, setSearchSynonymsCategory] = useState<string>(Object.keys(getCategorySynonymsConfig())[0] || "");
  const [searchSynonymsDraft, setSearchSynonymsDraft] = useState("");
  const [followLinksBusinessIds, setFollowLinksBusinessIds] = useState<string[]>([]);
  const [selectedFollowBusinessId, setSelectedFollowBusinessId] = useState("");
  const [savingFollowLinksBusinessIds, setSavingFollowLinksBusinessIds] = useState(false);

  useEffect(() => {
    let alive = true;
    getGlobalCategorySynonymsConfig().then((cfg) => {
      if (!alive) return;
      setSearchSynonymsConfig(cfg);
      const first = Object.keys(cfg)[0] || "";
      setSearchSynonymsCategory((prev) => prev || first);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    getFollowLinksBusinessIds().then((ids) => {
      if (!alive) return;
      setFollowLinksBusinessIds(ids);
      setSelectedFollowBusinessId((prev) => prev || ids[0] || "");
    });
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!searchSynonymsCategory) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setSearchSynonymsDraft((searchSynonymsConfig[searchSynonymsCategory] || []).join(", "));
      }
    });
    return () => {
      active = false;
    };
  }, [searchSynonymsCategory, searchSynonymsConfig]);

  const handleSaveSearchSynonyms = async () => {
    if (!searchSynonymsCategory) return;
    const next = { ...searchSynonymsConfig };
    next[searchSynonymsCategory] = searchSynonymsDraft
      .split(",")
      .map((term) => term.trim())
      .filter(Boolean);
    const ok = await saveGlobalCategorySynonymsConfig(next);
    if (!ok) {
      toast.error("Não foi possível salvar os sinônimos globais.");
      return;
    }
    setSearchSynonymsConfig(next);
    toast.success("Sinônimos globais da busca salvos.");
  };

  const handleResetSearchSynonyms = () => {
    setSearchSynonymsConfig(DEFAULT_CATEGORY_SYNONYMS);
    void saveGlobalCategorySynonymsConfig(DEFAULT_CATEGORY_SYNONYMS);
    const first = Object.keys(DEFAULT_CATEGORY_SYNONYMS)[0] || "";
    setSearchSynonymsCategory(first);
    setSearchSynonymsDraft((DEFAULT_CATEGORY_SYNONYMS[first] || []).join(", "));
    toast.success("Sinônimos restaurados para o padrão.");
  };

  const handleSaveFollowLinksBusinessIds = async (nextIds: string[]) => {
    setSavingFollowLinksBusinessIds(true);
    const ok = await saveFollowLinksBusinessIds(nextIds);
    setSavingFollowLinksBusinessIds(false);
    if (!ok) {
      toast.error("Não foi possível salvar a whitelist de links follow.");
      return false;
    }
    setFollowLinksBusinessIds(nextIds);
    return true;
  };

  const handleEnableBusinessFollowLinks = async () => {
    if (!selectedFollowBusinessId) {
      toast.error("Selecione um negócio.");
      return;
    }
    if (followLinksBusinessIds.includes(selectedFollowBusinessId)) {
      toast.message("Esse negócio já está com follow liberado.");
      return;
    }
    const nextIds = [...followLinksBusinessIds, selectedFollowBusinessId];
    const saved = await handleSaveFollowLinksBusinessIds(nextIds);
    if (!saved) return;
    toast.success("Follow liberado para os links externos desse negócio.");
  };

  const handleDisableBusinessFollowLinks = async (businessId: string) => {
    const nextIds = followLinksBusinessIds.filter((id) => id !== businessId);
    const saved = await handleSaveFollowLinksBusinessIds(nextIds);
    if (!saved) return;
    if (selectedFollowBusinessId === businessId) {
      setSelectedFollowBusinessId(nextIds[0] || "");
    }
    toast.success("Nofollow restaurado para esse negócio.");
  };

  const handleRefreshSitemap = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token || "";
      if (!accessToken) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      const response = await fetch("/api/sitemap-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const rawText = await response.text();
      const payload = (() => {
        try {
          return JSON.parse(rawText);
        } catch {
          return { error: rawText };
        }
      })();
      if (!response.ok) {
        const reason = payload?.reason ? ` (${payload.reason})` : "";
        toast.error((payload?.error || "Não foi possível atualizar o sitemap.") + reason);
        return;
      }
      toast.success("Sitemap atualizado.");
    } catch {
      toast.error("Erro ao atualizar sitemap.");
    }
  };

  return {
    searchSynonymsConfig,
    searchSynonymsCategory,
    searchSynonymsDraft,
    followLinksBusinessIds,
    selectedFollowBusinessId,
    savingFollowLinksBusinessIds,
    setSearchSynonymsCategory,
    setSearchSynonymsDraft,
    setSelectedFollowBusinessId,
    handleSaveSearchSynonyms,
    handleResetSearchSynonyms,
    handleRefreshSitemap,
    handleEnableBusinessFollowLinks,
    handleDisableBusinessFollowLinks,
  };
}
