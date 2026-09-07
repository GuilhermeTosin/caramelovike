import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { uploadImage, generateImagePath } from "@/services/storage";
import {
  createCommunityEvent,
  deleteCommunityEvent,
  getCommunityEventsByOwner,
  getCommunityEventsByOwnerAndBusiness,
  replaceBusinessLinkedEvents,
  updateCommunityEvent,
} from "@/services/events";
import { formatIsoToBr, parseBrDateToIso } from "@/pages/user-profile/utils";
import type { CommunityEvent } from "@/types/database";
import type { CommunityEventForm } from "@/pages/user-profile/types";

type UseCommunityContentOptions = {
  sessionUserId?: string;
  onBusinessesRefresh: () => Promise<void>;
  onActivateEventsTab: () => void;
};

const DEFAULT_COMMUNITY_EVENT_FORM: CommunityEventForm = {
  title: "",
  description: "",
  date: "",
  location: "",
  isFree: true,
  price: "",
  ticketUrl: "",
  flyerUrl: "",
  businessId: "none",
};

function mapLinkedEvents(events: CommunityEvent[]) {
  return events.map((event) => ({
    title: event.title,
    description: event.description || "",
    date: event.date,
    location: event.location,
    isFree: !!event.is_free,
    price: event.price || "",
    flyerUrl: event.flyer_url || "",
    ticketUrl: event.ticket_url || "",
  }));
}

export function useCommunityContent({
  sessionUserId,
  onBusinessesRefresh,
  onActivateEventsTab,
}: UseCommunityContentOptions) {
  const [myCommunityEvents, setMyCommunityEvents] = useState<CommunityEvent[]>([]);
  const [savingCommunityEvent, setSavingCommunityEvent] = useState(false);
  const [editingCommunityEventId, setEditingCommunityEventId] = useState<string | null>(null);
  const [communityEventFlyerFile, setCommunityEventFlyerFile] = useState<File | null>(null);
  const [communityEventForm, setCommunityEventForm] = useState<CommunityEventForm>(DEFAULT_COMMUNITY_EVENT_FORM);

  const resetCommunityEventEditor = () => {
    setEditingCommunityEventId(null);
    setCommunityEventForm(DEFAULT_COMMUNITY_EVENT_FORM);
    setCommunityEventFlyerFile(null);
  };

  const refreshCommunityEvents = useCallback(async () => {
    if (!sessionUserId) return;
    const events = await getCommunityEventsByOwner(sessionUserId);
    setMyCommunityEvents(events);
  }, [sessionUserId]);

  useEffect(() => {
    let active = true;
    if (!sessionUserId) {
      Promise.resolve().then(() => {
        if (!active) return;
        setMyCommunityEvents([]);
        resetCommunityEventEditor();
      });
      return () => { active = false; };
    }
    const timer = window.setTimeout(() => { void refreshCommunityEvents(); }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [refreshCommunityEvents, sessionUserId]);

  const handleCreateCommunityEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sessionUserId) return;
    if (!communityEventForm.title.trim() || !communityEventForm.date || !communityEventForm.location.trim()) {
      toast.error("Preencha título, data e local do evento.");
      return;
    }

    const eventDateIso = parseBrDateToIso(communityEventForm.date);
    if (!eventDateIso) {
      toast.error("Data inválida. Use o formato dd-mm-yyyy.");
      return;
    }

    setSavingCommunityEvent(true);
    let flyerUrl = communityEventForm.flyerUrl || "";
    if (communityEventFlyerFile) {
      const ownerRef = communityEventForm.businessId !== "none" ? communityEventForm.businessId : sessionUserId;
      const path = generateImagePath(ownerRef, "event-flyer", communityEventFlyerFile.name);
      const uploaded = await uploadImage("business-images", path, communityEventFlyerFile);
      if (uploaded) flyerUrl = uploaded;
    }

    const payload = {
      title: communityEventForm.title,
      description: communityEventForm.description,
      date: eventDateIso,
      location: communityEventForm.location,
      isFree: communityEventForm.isFree,
      price: communityEventForm.isFree ? "" : communityEventForm.price,
      ticketUrl: communityEventForm.ticketUrl || null,
      flyerUrl: flyerUrl || null,
      businessId: communityEventForm.businessId === "none" ? null : communityEventForm.businessId,
      status: "published" as const,
    };
    const result = editingCommunityEventId
      ? await updateCommunityEvent(editingCommunityEventId, payload)
      : await createCommunityEvent(sessionUserId, payload);

    setSavingCommunityEvent(false);

    if (!result.ok) {
      toast.error(result.error || "Não foi possível criar o evento.");
      return;
    }

    toast.success(editingCommunityEventId ? "Evento atualizado com sucesso." : "Evento publicado com sucesso.");
    resetCommunityEventEditor();
    await refreshCommunityEvents();

    if (payload.businessId) {
      const linked = await getCommunityEventsByOwnerAndBusiness(sessionUserId, payload.businessId);
      await replaceBusinessLinkedEvents(sessionUserId, payload.businessId, mapLinkedEvents(linked));
    }

    await onBusinessesRefresh();
  };

  const handleStartEditCommunityEvent = (event: CommunityEvent) => {
    setEditingCommunityEventId(event.id);
    setCommunityEventForm({
      title: event.title || "",
      description: event.description || "",
      date: formatIsoToBr(event.date || ""),
      location: event.location || "",
      isFree: !!event.is_free,
      price: event.price || "",
      ticketUrl: event.ticket_url || "",
      flyerUrl: event.flyer_url || "",
      businessId: event.business_id || "none",
    });
    setCommunityEventFlyerFile(null);
    onActivateEventsTab();
  };

  const handleDeleteCommunityEvent = async (event: CommunityEvent) => {
    if (!confirm("Excluir este evento?")) return;
    const result = await deleteCommunityEvent(event.id);
    if (!result.ok) {
      toast.error(result.error || "Não foi possível excluir o evento.");
      return;
    }

    toast.success("Evento excluído.");
    setMyCommunityEvents((prev) => prev.filter((item) => item.id !== event.id));

    if (sessionUserId && event.business_id) {
      const linked = await getCommunityEventsByOwnerAndBusiness(sessionUserId, event.business_id);
      await replaceBusinessLinkedEvents(sessionUserId, event.business_id, mapLinkedEvents(linked));
    }

    await onBusinessesRefresh();
  };

  return {
    myCommunityEvents,
    savingCommunityEvent,
    editingCommunityEventId,
    communityEventFlyerFile,
    communityEventForm,
    setCommunityEventFlyerFile,
    setCommunityEventForm,
    refreshCommunityEvents,
    resetCommunityEventEditor,
    handleCreateCommunityEvent,
    handleStartEditCommunityEvent,
    handleDeleteCommunityEvent,
  };
}
