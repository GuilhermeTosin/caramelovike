import { useEffect, useState } from "react";
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
import { deleteCommunityFind, getCommunityFindsByOwner, updateCommunityFind } from "@/services/communityFinds";
import { formatIsoToBr, parseBrDateToIso } from "@/pages/user-profile/utils";
import type { CommunityEvent, CommunityFind } from "@/types/database";
import type { CommunityEventForm, CommunityFindEditForm } from "@/pages/user-profile/types";

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
  const [myCommunityFinds, setMyCommunityFinds] = useState<CommunityFind[]>([]);
  const [showCommunityFindForm, setShowCommunityFindForm] = useState(false);
  const [editingCommunityFind, setEditingCommunityFind] = useState<CommunityFind | null>(null);
  const [editingCommunityFindSubmitting, setEditingCommunityFindSubmitting] = useState(false);
  const [editingCommunityFindForm, setEditingCommunityFindForm] = useState<CommunityFindEditForm>({
    productName: "",
    locationName: "",
    category: "comida",
  });
  const [savingCommunityEvent, setSavingCommunityEvent] = useState(false);
  const [editingCommunityEventId, setEditingCommunityEventId] = useState<string | null>(null);
  const [communityEventFlyerFile, setCommunityEventFlyerFile] = useState<File | null>(null);
  const [communityEventForm, setCommunityEventForm] = useState<CommunityEventForm>(DEFAULT_COMMUNITY_EVENT_FORM);

  const resetCommunityEventEditor = () => {
    setEditingCommunityEventId(null);
    setCommunityEventForm(DEFAULT_COMMUNITY_EVENT_FORM);
    setCommunityEventFlyerFile(null);
  };

  const refreshCommunityEvents = async () => {
    if (!sessionUserId) return;
    const events = await getCommunityEventsByOwner(sessionUserId);
    setMyCommunityEvents(events);
  };

  const refreshCommunityFinds = async () => {
    if (!sessionUserId) return;
    const finds = await getCommunityFindsByOwner(sessionUserId);
    setMyCommunityFinds(finds);
  };

  useEffect(() => {
    if (!sessionUserId) {
      setMyCommunityEvents([]);
      setMyCommunityFinds([]);
      setShowCommunityFindForm(false);
      setEditingCommunityFind(null);
      resetCommunityEventEditor();
      return;
    }
    void refreshCommunityEvents();
    void refreshCommunityFinds();
  }, [sessionUserId]);

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

  const handleCommunityFindCreated = async () => {
    if (!sessionUserId) return;
    await refreshCommunityFinds();
    setShowCommunityFindForm(false);
  };

  const handleDeleteCommunityFind = async (findId: string) => {
    if (!confirm("Excluir este achadinho?")) return;
    const result = await deleteCommunityFind(findId);
    if (!result.ok) {
      toast.error(result.error || "Não foi possível excluir o achadinho.");
      return;
    }
    setMyCommunityFinds((prev) => prev.filter((find) => find.id !== findId));
    toast.success("Achadinho excluído.");
  };

  const handleStartEditCommunityFind = (find: CommunityFind) => {
    setEditingCommunityFind(find);
    setEditingCommunityFindForm({
      productName: find.product_name || "",
      locationName: find.location_name || "",
      category: find.category || "outros",
    });
  };

  const handleSaveCommunityFindEdit = async () => {
    if (!editingCommunityFind) return;
    if (!editingCommunityFindForm.productName.trim() || !editingCommunityFindForm.locationName.trim()) {
      toast.error("Preencha o nome do produto e o local.");
      return;
    }
    setEditingCommunityFindSubmitting(true);
    const result = await updateCommunityFind(editingCommunityFind.id, {
      productName: editingCommunityFindForm.productName,
      locationName: editingCommunityFindForm.locationName,
      category: editingCommunityFindForm.category,
    });
    setEditingCommunityFindSubmitting(false);
    if (!result.ok) {
      toast.error(result.error || "Não foi possível editar o achadinho.");
      return;
    }
    await refreshCommunityFinds();
    setEditingCommunityFind(null);
    toast.success("Achadinho atualizado.");
  };

  return {
    myCommunityEvents,
    myCommunityFinds,
    showCommunityFindForm,
    editingCommunityFind,
    editingCommunityFindSubmitting,
    editingCommunityFindForm,
    savingCommunityEvent,
    editingCommunityEventId,
    communityEventFlyerFile,
    communityEventForm,
    setShowCommunityFindForm,
    setEditingCommunityFind,
    setEditingCommunityFindForm,
    setCommunityEventFlyerFile,
    setCommunityEventForm,
    refreshCommunityEvents,
    resetCommunityEventEditor,
    handleCreateCommunityEvent,
    handleStartEditCommunityEvent,
    handleDeleteCommunityEvent,
    handleCommunityFindCreated,
    handleDeleteCommunityFind,
    handleStartEditCommunityFind,
    handleSaveCommunityFindEdit,
  };
}
