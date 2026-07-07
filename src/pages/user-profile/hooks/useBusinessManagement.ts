import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AddressResult } from "@/components/AddressAutocomplete";
import { getCurrencyPrefixForCountry } from "@/lib/currency";
import { hasPreciseBusinessLocation } from "@/lib/search/businessSearch";
import {
  BUSINESS_CATEGORY_OPTIONS,
  createBusiness,
  deleteBusiness,
  getCategoryId,
  isBusinessSlugAvailable,
  slugify,
  updateBusiness,
} from "@/services/businesses";
import { getCommunityEventsByOwner, replaceBusinessLinkedEvents } from "@/services/events";
import { generateImagePath, uploadImage } from "@/services/storage";
import type { BusinessEvent, BusinessFrontend, Promotion } from "@/types/database";
import { sanitizeRichTextHtml, stripRichTextHtml } from "@/lib/richText";
import type { BusinessHour } from "@/pages/user-profile/types";
import {
  createDefaultBusinessHours,
  formatIsoToBr,
  normalizeDateForInput,
  parseBrDateToIso,
  parseBusinessHours,
  serializeBusinessHours,
} from "@/pages/user-profile/utils";

type BusinessFormData = {
  name: string;
  shortSlug: string;
  category: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  street: string;
  city: string;
  state: string;
  stateCode: string;
  country: string;
  countryCode: string;
  postalCode: string;
  services: string;
  lat: number;
  lng: number;
  instagram: string;
  facebook: string;
  whatsapp: string;
  menu: { name: string; description: string; price: string }[];
  menuPdfUrl: string;
  isBrazilianOwned: boolean;
  servesPortuguese: boolean;
  isVeganFriendly: boolean;
  isVegetarianFriendly: boolean;
  isGlutenFreeFriendly: boolean;
  keywords: string;
};

const DEFAULT_COUPON_FORM: Promotion = {
  title: "",
  description: "",
  code: "",
  expiresAt: "",
};

const DEFAULT_EDIT_FORM_DATA: BusinessFormData = {
  name: "",
  shortSlug: "",
  category: "",
  description: "",
  phone: "",
  email: "",
  website: "",
  street: "",
  city: "",
  state: "",
  stateCode: "",
  country: "",
  countryCode: "",
  postalCode: "",
  services: "",
  lat: 0,
  lng: 0,
  instagram: "",
  facebook: "",
  whatsapp: "",
  menu: [],
  menuPdfUrl: "",
  isBrazilianOwned: false,
  servesPortuguese: true,
  isVeganFriendly: false,
  isVegetarianFriendly: false,
  isGlutenFreeFriendly: false,
  keywords: "",
};

type UseBusinessManagementOptions = {
  sessionUserId?: string;
  onOwnedBusinessesRefresh: (ownerId?: string) => Promise<unknown>;
  onAllBusinessesRefresh: () => Promise<unknown>;
  onCommunityEventsRefresh: () => Promise<unknown>;
};

export function useBusinessManagement({
  sessionUserId,
  onOwnedBusinessesRefresh,
  onAllBusinessesRefresh,
  onCommunityEventsRefresh,
}: UseBusinessManagementOptions) {
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessFrontend | null>(null);
  const [couponBusiness, setCouponBusiness] = useState<BusinessFrontend | null>(null);
  const [menuBusiness, setMenuBusiness] = useState<BusinessFrontend | null>(null);
  const [serviceBusiness, setServiceBusiness] = useState<BusinessFrontend | null>(null);
  const [eventsBusiness, setEventsBusiness] = useState<BusinessFrontend | null>(null);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [savingEvents, setSavingEvents] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [couponItems, setCouponItems] = useState<Promotion[]>([]);
  const [menuItems, setMenuItems] = useState<{ name: string; description: string; price: string }[]>([]);
  const [serviceItems, setServiceItems] = useState<{ name: string; description: string; price: string }[]>([]);
  const [menuNameErrors, setMenuNameErrors] = useState<Record<number, boolean>>({});
  const [serviceNameErrors, setServiceNameErrors] = useState<Record<number, boolean>>({});
  const [menuPdfUrl, setMenuPdfUrl] = useState("");
  const [menuPdfFile, setMenuPdfFile] = useState<File | null>(null);
  const [eventItems, setEventItems] = useState<BusinessEvent[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<BusinessFrontend | null>(null);
  const [couponForm, setCouponForm] = useState<Promotion>(DEFAULT_COUPON_FORM);
  const [editFormData, setEditFormData] = useState<BusinessFormData>(DEFAULT_EDIT_FORM_DATA);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editHeroFile, setEditHeroFile] = useState<File | null>(null);
  const [editPhotoFiles, setEditPhotoFiles] = useState<File[]>([]);
  const [editMenuPdfFile, setEditMenuPdfFile] = useState<File | null>(null);
  const [eventFlyerFiles, setEventFlyerFiles] = useState<Record<number, File>>({});
  const eventDatePickerRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [editBusinessHours, setEditBusinessHours] = useState<BusinessHour[]>(createDefaultBusinessHours());
  const [shortSlugStatus, setShortSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">(
    "idle"
  );
  const [shortSlugMessage, setShortSlugMessage] = useState("");

  const closeBusinessEditor = () => {
    setCreatingBusiness(false);
    setEditingBusiness(null);
  };

  const handleStartEditBusiness = (business: BusinessFrontend) => {
    setEditFormData({
      name: business.name,
      shortSlug: business.slug || "",
      category: business.categoryId,
      description: business.description,
      phone: business.phone || "",
      email: business.email || "",
      website: business.website || "",
      street: business.address.street,
      city: business.address.city,
      state: business.address.state,
      stateCode: business.address.stateCode,
      country: business.address.country,
      countryCode: business.address.countryCode,
      postalCode: business.address.postalCode,
      services: business.services.join("\n"),
      lat: business.address.lat,
      lng: business.address.lng,
      instagram: business.instagram || "",
      facebook: business.facebook || "",
      whatsapp: business.whatsapp || "",
      menu: business.menu || [],
      menuPdfUrl: business.menuPdfUrl || "",
      isBrazilianOwned: !!business.isBrazilianOwned,
      servesPortuguese: !!business.servesPortuguese,
      isVeganFriendly: !!business.isVeganFriendly,
      isVegetarianFriendly: !!business.isVegetarianFriendly,
      isGlutenFreeFriendly: !!business.isGlutenFreeFriendly,
      keywords: (business.keywords || []).join(", "),
    });
    setEditBusinessHours(parseBusinessHours(business.openingHours || []));
    setEditingBusiness(business);
    setExistingPhotos(business.photos || []);
  };

  const normalizeShortSlugTyping = (value: string) =>
    (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+/, "");

  const normalizeShortSlugFinal = (value: string) => normalizeShortSlugTyping(value).replace(/-+$/, "");

  const handleEditInputChange = (field: string, value: string) => {
    if (field === "shortSlug") {
      const normalized = normalizeShortSlugTyping(value);
      setEditFormData((prev) => ({ ...prev, shortSlug: normalized }));
      return;
    }
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!creatingBusiness && !editingBusiness) return;
    const raw = (editFormData.shortSlug || "").trim();
    const normalized = normalizeShortSlugFinal(raw);

    if (!normalized) {
      setShortSlugStatus("idle");
      setShortSlugMessage("Escolha um link curto para compartilhar seu negócio.");
      return;
    }
    if (normalized.includes("caramelinho")) {
      setShortSlugStatus("invalid");
      setShortSlugMessage('Não use "caramelinho" no link curto. Escolha algo único do seu negócio.');
      return;
    }
    if (normalized.length < 3) {
      setShortSlugStatus("invalid");
      setShortSlugMessage("Use pelo menos 3 caracteres.");
      return;
    }

    setShortSlugStatus("checking");
    setShortSlugMessage("Verificando disponibilidade...");

    let cancelled = false;
    const timer = setTimeout(async () => {
      const available = await isBusinessSlugAvailable(normalized, editingBusiness?.id);
      if (cancelled) return;
      if (available) {
        setShortSlugStatus("available");
        setShortSlugMessage("Disponivel.");
      } else {
        setShortSlugStatus("taken");
        setShortSlugMessage("Indisponível. Esse link já está em uso.");
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [editFormData.shortSlug, creatingBusiness, editingBusiness]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: "logo" | "hero", isEdit: boolean) => {
    const file = event.target.files?.[0] || null;
    if (!isEdit) return;
    if (type === "logo") setEditLogoFile(file);
    else setEditHeroFile(file);
  };

  const handleRemoveNewPhoto = (index: number, isEdit: boolean) => {
    if (!isEdit) return;
    setEditPhotoFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleRemoveExistingPhoto = (index: number) => {
    setExistingPhotos((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handlePhotosChange = (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => {
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error(`Formato inválido: ${file.name}. Use JPG, PNG ou WEBP.`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Arquivo muito grande: ${file.name}. Limite de 5MB.`);
        return false;
      }
      return true;
    });
    if (!isEdit) return;

    setEditPhotoFiles((prev) => {
      const existingCount = existingPhotos.length;
      const total = prev.length + validFiles.length + existingCount;
      if (total > 8) {
        toast.error("Limite máximo de 8 fotos no total.");
        return [...prev, ...validFiles].slice(0, 8 - existingCount - prev.length);
      }
      return [...prev, ...validFiles];
    });
  };

  const handleMenuPdfChange = (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      if (isEdit) setEditMenuPdfFile(null);
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Formato inválido. O cardápio completo deve ser um arquivo PDF.");
      event.target.value = "";
      return;
    }
    if (isEdit) setEditMenuPdfFile(file);
  };

  const updateBusinessHour = (day: string, changes: Partial<BusinessHour>) => {
    setEditBusinessHours((prev) => prev.map((entry) => (entry.day === day ? { ...entry, ...changes } : entry)));
  };

  const handleEditPlaceSelected = (place: AddressResult) => {
    setEditFormData((prev) => ({
      ...prev,
      street: place.formattedAddress,
      city: place.city,
      state: place.state,
      stateCode: place.stateCode,
      country: place.country,
      countryCode: place.countryCode,
      postalCode: place.postalCode,
      lat: place.lat,
      lng: place.lng,
    }));
  };

  const handleSaveBusiness = async () => {
    if (!sessionUserId) return;
    const isCreateMode = creatingBusiness;
    if (!isCreateMode && !editingBusiness) return;
    if (!editFormData.name || !editFormData.category || !stripRichTextHtml(editFormData.description).trim()) {
      toast.error("Preencha os campos obrigatórios: Nome, Categoria e Descrição");
      return;
    }
    if (!editFormData.phone.trim() || !editFormData.email.trim()) {
      toast.error("Telefone e e-mail são obrigatórios.");
      return;
    }
    if (!editFormData.street || !editFormData.city || !editFormData.stateCode) {
      toast.error("O endereço completo (Rua, Cidade e Estado) é obrigatório.");
      return;
    }
    if (
      !hasPreciseBusinessLocation({
        address: {
          street: editFormData.street,
          city: editFormData.city,
          state: editFormData.state,
          country: editFormData.country,
          countryCode: editFormData.countryCode,
          stateCode: editFormData.stateCode,
          postalCode: editFormData.postalCode,
          lat: editFormData.lat,
          lng: editFormData.lng,
        },
      })
    ) {
      toast.error("Informe um endereço específico. Usar apenas cidade/estado/país não é suficiente.");
      return;
    }

    const services = editFormData.services
      .split("\n")
      .map((service) => service.trim())
      .filter(Boolean);
    const desiredSlug = slugify((editFormData.shortSlug || editFormData.name).trim());
    if (!desiredSlug) {
      toast.error("Defina um link curto válido para o negócio.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(desiredSlug)) {
      toast.error("Use apenas letras, números e hífen (-) no link curto.");
      return;
    }
    if (desiredSlug.includes("caramelinho")) {
      toast.error('Não use "caramelinho" no link curto. Escolha algo único do seu negócio.');
      return;
    }
    const slugAvailable = await isBusinessSlugAvailable(desiredSlug, editingBusiness?.id);
    if (!slugAvailable) {
      const baseCity = slugify(editFormData.city || "");
      const baseState = slugify(editFormData.stateCode || editFormData.state || "");
      const suggestion1 = `${desiredSlug}-${baseCity || "local"}`.replace(/-+$/g, "");
      const suggestion2 = `${desiredSlug}-${baseState || "oficial"}`.replace(/-+$/g, "");
      const suggestion3 = `${desiredSlug}-${Date.now().toString().slice(-4)}`;
      toast.error(`Esse link curto já está em uso. Tente: ${suggestion1}, ${suggestion2} ou ${suggestion3}.`);
      return;
    }

    const updates: any = {
      name: editFormData.name,
      slug: desiredSlug,
      categoryId: editFormData.category,
      description: sanitizeRichTextHtml(editFormData.description),
      street: editFormData.street,
      city: editFormData.city,
      state: editFormData.state,
      stateCode: editFormData.stateCode,
      country: editFormData.country,
      countryCode: editFormData.countryCode,
      postalCode: editFormData.postalCode,
      lat: editFormData.lat,
      lng: editFormData.lng,
      services,
      phone: editFormData.phone,
      email: editFormData.email,
      website: editFormData.website,
      instagram: editFormData.instagram,
      facebook: editFormData.facebook,
      whatsapp: editFormData.whatsapp,
      menu: getCategoryId(editFormData.category) === "food" ? editFormData.menu : [],
      menuPdfUrl: getCategoryId(editFormData.category) === "food" ? editFormData.menuPdfUrl : "",
      isBrazilianOwned: false,
      servesPortuguese: false,
      isVeganFriendly: getCategoryId(editFormData.category) === "food" ? !!editFormData.isVeganFriendly : false,
      isVegetarianFriendly:
        getCategoryId(editFormData.category) === "food" ? !!editFormData.isVegetarianFriendly : false,
      isGlutenFreeFriendly:
        getCategoryId(editFormData.category) === "food" ? !!editFormData.isGlutenFreeFriendly : false,
      keywords: editFormData.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean),
      openingHours: serializeBusinessHours(editBusinessHours),
    };

    setSavingBusiness(true);
    let targetBusinessId = editingBusiness?.id || "";
    let ok = false;

    if (isCreateMode) {
      const created = await createBusiness(sessionUserId, {
        ...updates,
        photos: existingPhotos,
      });
      if (!created) {
        toast.error("Erro ao criar negócio.");
        setSavingBusiness(false);
        return;
      }
      targetBusinessId = created.id;
      ok = true;
    }

    if (editLogoFile && targetBusinessId) {
      const path = generateImagePath(targetBusinessId, "logo", editLogoFile.name);
      const url = await uploadImage("business-images", path, editLogoFile);
      if (url) updates.logoUrl = url;
    }
    if (editHeroFile && targetBusinessId) {
      const path = generateImagePath(targetBusinessId, "hero", editHeroFile.name);
      const url = await uploadImage("business-images", path, editHeroFile);
      if (url) updates.heroImage = url;
    }
    updates.photos = existingPhotos;
    if (editPhotoFiles.length > 0 && targetBusinessId) {
      const uploadedPhotos: string[] = [];
      for (const file of editPhotoFiles) {
        const path = generateImagePath(targetBusinessId, "photo", file.name);
        const url = await uploadImage("business-images", path, file);
        if (url) uploadedPhotos.push(url);
      }
      updates.photos = [...existingPhotos, ...uploadedPhotos];
    }
    if (getCategoryId(editFormData.category) === "food" && editMenuPdfFile && targetBusinessId) {
      const path = generateImagePath(targetBusinessId, "menu", editMenuPdfFile.name);
      const url = await uploadImage("business-images", path, editMenuPdfFile);
      if (url) updates.menuPdfUrl = url;
    }

    if (isCreateMode) {
      ok = await updateBusiness(targetBusinessId, { ...updates });
    } else if (editingBusiness) {
      ok = await updateBusiness(editingBusiness.id, { ...updates });
    }

    if (!ok) {
      toast.error(isCreateMode ? "Erro ao criar negócio." : "Erro ao atualizar negócio.");
      setSavingBusiness(false);
      return;
    }

    toast.success(
      isCreateMode
        ? `"${editFormData.name}" enviado para analise. Esse processo pode levar ate 24 horas.`
        : `"${editFormData.name}" atualizado com sucesso!`
    );
    closeBusinessEditor();
    setEditLogoFile(null);
    setEditHeroFile(null);
    setEditPhotoFiles([]);
    setEditMenuPdfFile(null);
    await onOwnedBusinessesRefresh(sessionUserId);
    setSavingBusiness(false);
  };

  const handleDeleteMyBusiness = (business: BusinessFrontend) => {
    setDeleteTarget(business);
  };

  const handleConfirmDeleteMyBusiness = async () => {
    if (!deleteTarget) return;
    const ok = await deleteBusiness(deleteTarget.id);
    if (!ok) {
      toast.error("Erro ao remover negócio.");
      return;
    }
      toast.success("Negócio removido com sucesso!");
    setDeleteTarget(null);
    await onOwnedBusinessesRefresh(sessionUserId);
    await onAllBusinessesRefresh();
  };

  const handleOpenCouponModal = (business: BusinessFrontend) => {
    setCouponForm(DEFAULT_COUPON_FORM);
    setCouponItems(business.promotions || []);
    setCouponBusiness(business);
  };

  const handleOpenMenuModal = (business: BusinessFrontend) => {
    setMenuItems(business.menu || []);
    setMenuPdfUrl(business.menuPdfUrl || "");
    setMenuPdfFile(null);
    setMenuNameErrors({});
    setMenuBusiness(business);
  };

  const handleSaveMenu = async () => {
    if (!menuBusiness) return;
    const nextErrors: Record<number, boolean> = {};
    const normalizedMenu: { name: string; description: string; price: string }[] = [];
    for (let index = 0; index < menuItems.length; index += 1) {
      const item = menuItems[index];
      const normalized = {
        name: (item.name || "").trim(),
        description: (item.description || "").trim(),
        price: (item.price || "").trim(),
      };
      const hasAnyData = !!normalized.name || !!normalized.description || !!normalized.price;
      if (!hasAnyData) continue;
      if (!normalized.name) {
        nextErrors[index] = true;
        continue;
      }
      normalizedMenu.push(normalized);
    }
    setMenuNameErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("No cardápio, o nome do item é obrigatório.");
      return;
    }

    setSavingMenu(true);
    let nextMenuPdfUrl = menuPdfUrl || "";
    if (menuPdfFile) {
      const path = generateImagePath(menuBusiness.id, "menu", menuPdfFile.name);
      const uploaded = await uploadImage("business-images", path, menuPdfFile);
      if (uploaded) nextMenuPdfUrl = uploaded;
    }
    const ok = await updateBusiness(menuBusiness.id, {
      menu: normalizedMenu,
      menuPdfUrl: nextMenuPdfUrl,
    });
    setSavingMenu(false);
    if (!ok) {
      toast.error("Não foi possível salvar o cardápio.");
      return;
    }
    await onOwnedBusinessesRefresh(sessionUserId);
    toast.success("Cardápio salvo com sucesso.");
    setMenuBusiness(null);
  };

  const handleOpenServicesModal = (business: BusinessFrontend) => {
    setServiceItems(business.serviceItems || []);
    setServiceNameErrors({});
    setServiceBusiness(business);
  };

  const handleSaveServices = async () => {
    if (!serviceBusiness) return;
    const nextErrors: Record<number, boolean> = {};
    const normalized: { name: string; description: string; price: string }[] = [];
    for (let index = 0; index < serviceItems.length; index += 1) {
      const item = serviceItems[index];
      const row = {
        name: (item.name || "").trim(),
        description: (item.description || "").trim(),
        price: (item.price || "").trim(),
      };
      const hasAnyData = !!row.name || !!row.description || !!row.price;
      if (!hasAnyData) continue;
      if (!row.name) {
        nextErrors[index] = true;
        continue;
      }
      normalized.push(row);
    }
    setServiceNameErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Em serviços, o nome do serviço é obrigatório.");
      return;
    }
    const legacyServices = normalized.map((item) => item.name).filter(Boolean);
    setSavingServices(true);
    const ok = await updateBusiness(serviceBusiness.id, {
      serviceItems: normalized,
      services: legacyServices,
    });
    setSavingServices(false);
    if (!ok) {
      toast.error("Não foi possível salvar os serviços.");
      return;
    }
    await onOwnedBusinessesRefresh(sessionUserId);
    toast.success("Serviços salvos com sucesso.");
    setServiceBusiness(null);
  };

  const handleOpenEventsModal = (business: BusinessFrontend) => {
    setEventItems(business.events || []);
    setEventFlyerFiles({});
    setEventsBusiness(business);
  };

  const handleAddEvent = () => {
    setEventItems((prev) => [
      ...prev,
      {
        title: "",
        description: "",
        date: "",
        location: "",
        isFree: true,
        price: "",
        flyerUrl: "",
        ticketUrl: "",
      },
    ]);
  };

  const handleRemoveEvent = (index: number) => {
    setEventItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSaveEvents = async () => {
    if (!eventsBusiness || !sessionUserId) return;
    const normalizedEvents: BusinessEvent[] = [];

    setSavingEvents(true);
    for (let index = 0; index < eventItems.length; index += 1) {
      const event = eventItems[index];
      const hasAnyData =
        !!event.title?.trim() ||
        !!event.description?.trim() ||
        !!event.date?.trim() ||
        !!event.location?.trim() ||
        !!event.price?.trim() ||
        !!event.flyerUrl?.trim() ||
        !!event.ticketUrl?.trim() ||
        !!eventFlyerFiles[index];
      if (!hasAnyData) continue;

      if (!event.title?.trim() || !event.date?.trim() || !event.location?.trim()) {
      toast.error("Nos eventos, preencha pelo menos título, data e local.");
        setSavingEvents(false);
        return;
      }
      const eventDateIso = parseBrDateToIso(event.date || "");
      if (!eventDateIso) {
        toast.error(`Data inválida no evento "${event.title}". Use dd-mm-yyyy.`);
        setSavingEvents(false);
        return;
      }
      if (!event.isFree && !event.price?.trim()) {
        toast.error(`Informe o preço do evento "${event.title}" ou marque entrada franca.`);
        setSavingEvents(false);
        return;
      }

      let flyerUrl = event.flyerUrl?.trim() || "";
      const flyerFile = eventFlyerFiles[index];
      if (flyerFile) {
        const path = generateImagePath(eventsBusiness.id, `event-${index}`, flyerFile.name);
        const uploadedUrl = await uploadImage("business-images", path, flyerFile);
        if (uploadedUrl) flyerUrl = uploadedUrl;
      }

      normalizedEvents.push({
        title: event.title.trim(),
        description: event.description?.trim() || "",
        date: eventDateIso,
        location: event.location.trim(),
        isFree: !!event.isFree,
        price: event.isFree ? "" : (event.price?.trim() || ""),
        flyerUrl,
        ticketUrl: event.ticketUrl?.trim() || "",
      });
    }

    const ok = await updateBusiness(eventsBusiness.id, { events: normalizedEvents });
    const syncResult = await replaceBusinessLinkedEvents(sessionUserId, eventsBusiness.id, normalizedEvents);
    setSavingEvents(false);
    if (!ok || !syncResult.ok) {
      toast.error("Não foi possível salvar os eventos.");
      return;
    }
    toast.success("Eventos salvos com sucesso.");
    setEventsBusiness(null);
    setEventFlyerFiles({});
    await onOwnedBusinessesRefresh(sessionUserId);
    await onCommunityEventsRefresh();
  };

  const handleOpenPdfPrivately = async (pdfUrl: string) => {
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("Falha ao carregar PDF");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      console.error("Erro ao abrir PDF privado:", error);
      toast.error("Não foi possível abrir o PDF agora.");
    }
  };

  const handleAddCoupon = () => {
    if (!couponForm.title.trim() || !couponForm.description.trim() || !couponForm.expiresAt) {
      toast.error("Preencha título, descrição e data limite antes de adicionar.");
      return;
    }
    const expiresAtIso = parseBrDateToIso(couponForm.expiresAt);
    if (!expiresAtIso) {
      toast.error("Data limite inválida. Use o formato dd-mm-yyyy.");
      return;
    }
    setCouponItems((prev) => [
      ...prev,
      {
        title: couponForm.title.trim(),
        description: couponForm.description.trim(),
        code: couponForm.code.trim(),
        expiresAt: expiresAtIso,
      },
    ]);
    setCouponForm(DEFAULT_COUPON_FORM);
  };

  const handleRemoveCoupon = (index: number) => {
    setCouponItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSaveCoupon = async () => {
    if (!couponBusiness) return;
    const hasDraftField =
      !!couponForm.title.trim() ||
      !!couponForm.description.trim() ||
      !!couponForm.code.trim() ||
      !!couponForm.expiresAt;
    const isDraftComplete =
      !!couponForm.title.trim() && !!couponForm.description.trim() && !!couponForm.expiresAt;

    if (hasDraftField && !isDraftComplete) {
      toast.error("Complete título, descrição e data limite da promoção atual ou limpe-os antes de salvar.");
      return;
    }

    const promotionsToSave = [...couponItems];
    if (isDraftComplete) {
      const expiresAtIso = parseBrDateToIso(couponForm.expiresAt);
      if (!expiresAtIso) {
        toast.error("Data limite inválida. Use o formato dd-mm-yyyy.");
        return;
      }
      promotionsToSave.push({
        title: couponForm.title.trim(),
        description: couponForm.description.trim(),
        code: couponForm.code.trim(),
        expiresAt: expiresAtIso,
      });
    }

    setSavingCoupon(true);
    const ok = await updateBusiness(couponBusiness.id, {
      promotions: promotionsToSave,
    });
    setSavingCoupon(false);
    if (!ok) {
      toast.error("Não foi possível salvar a promoção. Verifique se a coluna 'promotions' existe na tabela businesses.");
      return;
    }
    await onOwnedBusinessesRefresh(sessionUserId);
    toast.success("Promoção salva com sucesso.");
    setCouponBusiness(null);
  };

  return {
    BUSINESS_CATEGORY_OPTIONS,
    creatingBusiness,
    editingBusiness,
    couponBusiness,
    menuBusiness,
    serviceBusiness,
    eventsBusiness,
    savingCoupon,
    savingMenu,
    savingServices,
    savingEvents,
    savingBusiness,
    couponItems,
    menuItems,
    serviceItems,
    menuNameErrors,
    serviceNameErrors,
    menuPdfUrl,
    menuPdfFile,
    eventItems,
    deleteTarget,
    couponForm,
    editFormData,
    existingPhotos,
    editLogoFile,
    editHeroFile,
    editPhotoFiles,
    editMenuPdfFile,
    eventFlyerFiles,
    eventDatePickerRefs,
    editBusinessHours,
    shortSlugStatus,
    shortSlugMessage,
    setCreatingBusiness,
    setEditingBusiness,
    setCouponBusiness,
    setMenuBusiness,
    setServiceBusiness,
    setEventsBusiness,
    setCouponItems,
    setMenuItems,
    setServiceItems,
    setMenuPdfUrl,
    setMenuPdfFile,
    setEventItems,
    setDeleteTarget,
    setCouponForm,
    setEditFormData,
    setExistingPhotos,
    setEditLogoFile,
    setEditHeroFile,
    setEditPhotoFiles,
    setEditMenuPdfFile,
    setEventFlyerFiles,
    setEditBusinessHours,
    closeBusinessEditor,
    handleStartEditBusiness,
    normalizeShortSlugFinal,
    handleEditInputChange,
    handleFileChange,
    handleRemoveNewPhoto,
    handleRemoveExistingPhoto,
    handlePhotosChange,
    handleMenuPdfChange,
    updateBusinessHour,
    handleEditPlaceSelected,
    handleSaveBusiness,
    handleDeleteMyBusiness,
    handleConfirmDeleteMyBusiness,
    handleOpenCouponModal,
    handleOpenMenuModal,
    handleSaveMenu,
    handleOpenServicesModal,
    handleSaveServices,
    handleOpenEventsModal,
    handleAddEvent,
    handleRemoveEvent,
    handleSaveEvents,
    handleOpenPdfPrivately,
    handleAddCoupon,
    handleRemoveCoupon,
    handleSaveCoupon,
    formatIsoToBr,
    normalizeDateForInput,
    getCategoryId,
    getCurrencyPrefixForCountry,
  };
}
