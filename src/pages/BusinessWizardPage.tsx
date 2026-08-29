import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, FileText, ImageIcon, MapPin, PawPrint, Sparkles, Upload, User, UtensilsCrossed, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/RichTextEditor";
import ProfileCompletionCard from "@/components/ProfileCompletionCard";
import AddressAutocomplete, { type AddressResult } from "@/components/AddressAutocomplete";
import { sanitizeRichTextHtml, stripRichTextHtml } from "@/lib/richText";
import {
  getPrimaryActivityCustomPlaceholder,
  getPrimaryActivityOptions,
  getPrimaryActivityLabel,
  isPrimaryActivityValid,
  normalizePrimaryActivityCustom,
  OTHER_PRIMARY_ACTIVITY_ID,
} from "@/lib/businessActivities";
import SiteFooter from "@/components/SiteFooter";
import SiteHeaderAuthActions from "@/components/SiteHeaderAuthActions";
import MobileHeaderMenu from "@/components/MobileHeaderMenu";
import {
  BUSINESS_CATEGORY_OPTIONS,
  createBusiness,
  resolveBusinessLocation,
  getAvailableLocations,
  getCountryName,
  getStateDisplayName,
  getCategoryId,
  getBusinessesByOwner,
  getBusinessShortSlug,
  isBusinessSlugAvailable,
  slugify,
  updateBusiness,
} from "@/services/businesses";
import type { BusinessFrontend } from "@/types/database";
import { generateImagePath, uploadImage } from "@/services/storage";
import { useSiteLocale } from "@/contexts/LocaleContext";
import { getSiteSlogan } from "@/lib/locales";
import { getHomeContent } from "@/data/homeContent";

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;
type BusinessHour = { day: string; enabled: boolean; open: string; close: string };

const TOTAL_STEPS = 6;

const normalizeShortSlugTyping = (value: string) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "");

const normalizeShortSlugFinal = (value: string) =>
  normalizeShortSlugTyping(value).replace(/-+$/, "");

const sanitizePhoneLike = (value: string) =>
  (value || "").replace(/[^\d+\-()\s]/g, "").slice(0, 25);

const sanitizeTextNoSpaces = (value: string) => (value || "").trim().replace(/\s+/g, "");

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

const normalizeSocialValue = (value: string): string => {
  return (value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^facebook\.com\//i, "")
    .replace(/^@+/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .trim();
};

const buildInstagramUrl = (value: string): string => {
  const handle = normalizeSocialValue(value);
  return handle ? `https://instagram.com/${handle}` : "";
};

const buildFacebookUrl = (value: string): string => {
  const handle = normalizeSocialValue(value);
  return handle ? `https://facebook.com/${handle}` : "";
};

function createDefaultBusinessHours(): BusinessHour[] {
  return [
    { day: "Segunda", enabled: true, open: "09:00", close: "18:00" },
    { day: "Ter\u00e7a", enabled: true, open: "09:00", close: "18:00" },
    { day: "Quarta", enabled: true, open: "09:00", close: "18:00" },
    { day: "Quinta", enabled: true, open: "09:00", close: "18:00" },
    { day: "Sexta", enabled: true, open: "09:00", close: "18:00" },
    { day: "S\u00e1bado", enabled: true, open: "10:00", close: "14:00" },
    { day: "Domingo", enabled: false, open: "10:00", close: "14:00" },
  ];
}

function serializeBusinessHours(hours: BusinessHour[]) {
  return hours.map((hour) =>
    hour.enabled ? `${hour.day}: ${hour.open}-${hour.close}` : `${hour.day}: Fechado`
  );
}

const normalizeBusinessDayKey = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function parseBusinessHours(lines: string[] = []): BusinessHour[] {
  const defaults = createDefaultBusinessHours();
  const map = new Map(defaults.map((h) => [normalizeBusinessDayKey(h.day), { ...h }]));
  for (const raw of lines || []) {
    const text = String(raw || "").trim();
    const [rawDay, rawValue] = text.split(":");
    if (!rawDay || !rawValue) continue;
    const dayKey = normalizeBusinessDayKey(rawDay.trim());
    const existing = map.get(dayKey);
    if (!existing) continue;
    const value = rawValue.trim().toLowerCase();
    if (value.includes("fechado")) {
      existing.enabled = false;
      continue;
    }
    const m = value.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (!m) continue;
    existing.enabled = true;
    existing.open = m[1];
    existing.close = m[2];
  }
  return defaults.map((d) => map.get(normalizeBusinessDayKey(d.day)) || d);
}

export default function BusinessWizardPage() {
  const navigate = useNavigate();
  const { locale, toLocalePath } = useSiteLocale();
  const isEnglish = locale === "en";
  const message = useCallback((english: string, portuguese: string) => isEnglish ? english : portuguese, [isEnglish]);
  const categoryLabels = new Map(getHomeContent(locale).categories.map((category) => [category.id, category.name]));
  const displayBusinessDay = (day: string) => {
    if (!isEnglish) return day;
    return ({ Segunda: "Monday", "Terça": "Tuesday", Quarta: "Wednesday", Quinta: "Thursday", Sexta: "Friday", "Sábado": "Saturday", Domingo: "Sunday" } as Record<string, string>)[day] || day;
  };
  const text = isEnglish ? {
    signInRequired: "Sign in to continue", signInDescription: "You need to be signed in to use the guided listing form.", signIn: "Sign in", backHome: "Back to home", loadingEdit: "Loading listing...", loadingEditDescription: "Getting the business information to fill in the form.", step: "Step", steps: ["Business details", "Description and search", "Contact and location", "Opening hours", "Media", "Review and confirmation"],
    businessName: "Business name", shortLink: "Short link", checkingAvailability: "Checking availability...", category: "Category", chooseCategory: "Select a category", primaryActivity: "Primary business type", primaryActivityDescription: "Choose the activity that best represents your business. Other services can be listed in the description and keywords.", selectPrimaryActivity: "Select the primary type", selectPrimaryActivityOptional: "Select the primary type (optional)", primaryActivityHint: "Required for new businesses. If you cannot find a suitable option, choose Other type and describe the activity.", primaryActivityEditHint: "This helps build a more accurate page title for search without replacing your category.",
    description: "Description", descriptionHint: "This is the most important information on your business page. Explain clearly what you offer, your main products or services, the customers and area you serve, and what makes your business different.", descriptionPlaceholder: "Clearly describe what your business offers.", publishEnglish: "Also publish in English", publishEnglishHint: "The English version has its own URL and is published only when its English description is completed. Without it, your business remains available only in Portuguese.", englishDescription: "English description", englishDescriptionHint: "Write a natural version for customers searching in English. We do not publish automatic translations.", keywords: "Keywords", keywordsHint: "Use real terms customers search for, including variations and synonyms. Separate them with commas and avoid overly generic terms.", keywordsLabel: "Keywords (separated by commas)", audiences: "Other audiences served", vegan: "Vegan", vegetarian: "Vegetarian", glutenFree: "Gluten-free",
    phone: "Phone (optional)", email: "Email (optional)", physicalAddress: "Does your business have a physical address?", yesAddress: "Yes, it has a physical address", noAddress: "No, city-based or online service", addressSummary: "Address summary", cityMissing: "City not provided", addressMissing: "Address not provided", cityRegionMissing: "City/region not provided", openingHours: "Opening hours", hoursPublished: "These hours will appear on the public business page.", hoursMissing: "Opening hours not provided yet.", cancel: "Cancel", editHours: "Edit hours", addHours: "Add hours", open: "Open", closed: "Closed", notProvided: "Not provided", hoursHint: "Click Add hours to enter your schedule and earn profile points.",
    logo: "Logo", cover: "Cover image", gallery: "Photo gallery (up to 8)", chooseImage: "Choose image", chooseImages: "Choose images", currentLogo: "Current logo", currentCover: "Current cover", noFile: "No file selected", removeLogo: "Remove logo", removeCover: "Remove cover", removePhoto: "Remove photo", imageFormats: "Accepted formats: JPG, PNG and WEBP.", selectedFiles: "file(s) selected.", previewLogo: "Logo preview", previewCover: "Cover preview", previewGallery: "Gallery preview", currentPhoto: "Current photo",
    review: "Review your details before publishing", business: "Business", attendance: "Attendance", withAddress: "With a physical address", withoutAddress: "Without a physical address", baseLocation: "Base location", contact: "Contact", media: "Media", noLogo: "no logo", noCover: "no cover", nextMenu: "Recommended next step: Menu", nextServices: "Recommended next step: Services", menuHint: "After publishing, you can add a menu item by item or upload a complete PDF menu from Profile > My businesses.", servicesHint: "After publishing, you can add services with name, description and optional price from Profile > My businesses.", back: "Back", next: "Next", saving: "Saving...", publishing: "Publishing...", saveChanges: "Save changes", publish: "Confirm and publish",
  } : null;
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const editingBusinessId = (searchParams.get("editBusinessId") || "").trim();
  const isEditMode = !!editingBusinessId;
  const [step, setStep] = useState<WizardStep>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingStep, setIsChangingStep] = useState(false);
  const saveInProgressRef = useRef(false);
  const stepTransitionInProgressRef = useRef(false);
  const loadedEditBusinessKeyRef = useRef<string | null>(null);
  const [loadingEditBusiness, setLoadingEditBusiness] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessFrontend | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [onlineCityResolved, setOnlineCityResolved] = useState(false);
  const [locationCatalog, setLocationCatalog] = useState<
    { countryCode: string; states: { code: string; cities: string[] }[] }[]
  >([]);
  const [slugMessage, setSlugMessage] = useState(() => message("Choose a short link to share your business.", "Escolha um link curto para compartilhar seu negócio."));
  const [slugStatus, setSlugStatus] = useState<"idle" | "ok" | "error">("idle");
  const [nameError, setNameError] = useState("");
  const [contactErrors, setContactErrors] = useState({
    phone: "",
    email: "",
    website: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
  });

  const [form, setForm] = useState({
    name: "",
    shortSlug: "",
    category: "",
    primaryActivity: "",
    primaryActivityCustom: "",
    description: "",
    publishEnglishVersion: false,
    descriptionEn: "",
    keywords: "",
    services: "",
    phone: "",
    email: "",
    website: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
    street: "",
    city: "",
    cityPlaceId: "",
    state: "",
    stateCode: "",
    country: "",
    countryCode: "",
    attendanceType: "presencial" as "presencial" | "online" | "hibrido",
    hasPhysicalAddress: true,
    postalCode: "",
    lat: 0,
    lng: 0,
    isVeganFriendly: false,
    isVegetarianFriendly: false,
    isGlutenFreeFriendly: false,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(createDefaultBusinessHours());
  const [businessHoursTouched, setBusinessHoursTouched] = useState(false);
  const [businessHoursEditorOpen, setBusinessHoursEditorOpen] = useState(false);
  const businessHoursEditSnapshotRef = useRef<{ hours: BusinessHour[]; touched: boolean } | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState("");
  const [existingHeroUrl, setExistingHeroUrl] = useState("");
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [heroRemoved, setHeroRemoved] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [galleryTouched, setGalleryTouched] = useState(false);

  const progress = useMemo(() => Math.round((step / TOTAL_STEPS) * 100), [step]);
  const profileCompletionData = useMemo(() => ({
    name: form.name,
    category: form.category,
    primaryActivity: form.primaryActivity || form.primaryActivityCustom,
    description: form.description,
    city: form.city,
    stateCode: form.stateCode,
    countryCode: form.countryCode,
    street: form.street,
    logoUrl: logoFile ? "pending-logo" : logoRemoved ? "" : existingLogoUrl,
    heroImage: heroFile ? "pending-hero" : heroRemoved ? "" : existingHeroUrl,
    photos: [...existingPhotos, ...photoFiles.map((file) => file.name)],
    phone: form.phone,
    email: form.email,
    website: form.website,
    whatsapp: form.whatsapp,
    instagram: form.instagram,
    facebook: form.facebook,
    services: form.services.split("\n").map((item) => item.trim()).filter(Boolean),
    keywords: form.keywords.split(",").map((item) => item.trim()).filter(Boolean),
    openingHours: businessHoursTouched ? serializeBusinessHours(businessHours) : [],
    attendanceType: form.city.trim() ? (form.hasPhysicalAddress ? "presencial" : "online") : undefined,
  }), [form, logoFile, heroFile, existingLogoUrl, existingHeroUrl, logoRemoved, heroRemoved, existingPhotos, photoFiles, businessHours, businessHoursTouched]);

  const StepIcon =
    step === 1
      ? Sparkles
      : step === 2
        ? FileText
        : step === 3
          ? MapPin
          : step === 4
            ? Clock3
            : step === 5
              ? ImageIcon
              : UtensilsCrossed;

  const updateField = (field: string, value: string | boolean | number) => {
    if (field === "category") {
      setForm((prev) => ({ ...prev, category: String(value), primaryActivity: "", primaryActivityCustom: "" }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "name") {
      const v = String(value || "").trim();
      setNameError(v ? "" : message("Business name is required.", "Nome do negócio é obrigatório."));
    }
  };

  const updateStep3Field = (field: "phone" | "email" | "website" | "instagram" | "facebook" | "whatsapp", rawValue: string) => {
    let value = rawValue;
    if (field === "phone" || field === "whatsapp") value = sanitizePhoneLike(rawValue);
    if (field === "email") value = sanitizeTextNoSpaces(rawValue).toLowerCase();
    if (field === "website" || field === "instagram" || field === "facebook") value = sanitizeTextNoSpaces(rawValue);
    updateField(field, value);

    setContactErrors((prev) => {
      const next = { ...prev };
      if (field === "email") {
        next.email = value.length === 0 || isValidEmail(value) ? "" : "Email inválido.";
      } else if (field === "phone") {
        next.phone = value.trim().length === 0 ? "" : "";
      } else if (field === "whatsapp") {
        next.whatsapp = "";
      } else {
        next[field] = "";
      }
      return next;
    });
  };

  const runSlugCheck = async () => {
    const slug = normalizeShortSlugFinal(form.shortSlug);
    if (!slug) {
      setSlugStatus("error");
      setSlugMessage(message("Short link is required.", "Link curto é obrigatório."));
      setCheckingSlug(false);
      return false;
    }
    if (slug.length < 3) {
      setSlugStatus("error");
      setSlugMessage("Use pelo menos 3 caracteres.");
      return false;
    }
    if (slug.includes("caramelinho")) {
      setSlugStatus("error");
      setSlugMessage('Não use "caramelinho" no link curto.');
      return false;
    }
    setCheckingSlug(true);
    const available = await isBusinessSlugAvailable(slug, isEditMode ? editingBusinessId : undefined);
    setCheckingSlug(false);
    if (!available) {
      setSlugStatus("error");
      setSlugMessage("Esse link já está em uso.");
      return false;
    }
    setSlugStatus("ok");
    setSlugMessage("Disponível.");
    return true;
  };

  useEffect(() => {
    let active = true;
    getAvailableLocations()
      .then((locations) => {
        if (active) setLocationCatalog(locations || []);
      })
      .catch(() => {
        if (active) setLocationCatalog([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (step !== 1) return;
    const slug = normalizeShortSlugFinal(form.shortSlug);
    if (!slug) {
      Promise.resolve().then(() => {
        setSlugStatus("idle");
        setSlugMessage(message("Enter a unique short link for your business.", "Digite um link curto único para seu negócio."));
        setCheckingSlug(false);
      });
      return;
    }
    if (slug.length < 3) {
      Promise.resolve().then(() => {
        setSlugStatus("error");
        setSlugMessage("Use pelo menos 3 caracteres.");
        setCheckingSlug(false);
      });
      return;
    }
    if (slug.includes("caramelinho")) {
      Promise.resolve().then(() => {
        setSlugStatus("error");
        setSlugMessage('Não use "caramelinho" no link curto.');
        setCheckingSlug(false);
      });
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      const available = await isBusinessSlugAvailable(slug, isEditMode ? editingBusinessId : undefined);
      if (cancelled) return;
      setCheckingSlug(false);
      if (available) {
        setSlugStatus("ok");
        setSlugMessage("Disponivel.");
      } else {
        setSlugStatus("error");
        setSlugMessage("Esse link ja esta em uso.");
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [editingBusinessId, form.shortSlug, isEditMode, message, step]);

  useEffect(() => {
    if (!session || !isEditMode) return;
    const editBusinessKey = `${session.userId}:${editingBusinessId}`;
    if (loadedEditBusinessKeyRef.current === editBusinessKey) return;

    let active = true;
    
    Promise.resolve().then(async () => {
      if (!active) return;
      setLoadingEditBusiness(true);
      try {
        const items = await getBusinessesByOwner(session.userId);
        if (!active) return;
        const biz = items.find((b) => b.id === editingBusinessId);
        if (!biz) {
          toast.error(isEnglish ? "Business not found for editing." : "Negócio não encontrado para edição.");
          navigate(toLocalePath("/perfil?tab=negocios"));
          return;
        }
        setEditingBusiness(biz);
        const existingShortSlug = (await getBusinessShortSlug(biz.id)) || biz.slug || "";
        if (!active) return;
        setForm({
          name: biz.name || "",
          shortSlug: existingShortSlug,
          category: getCategoryId(biz.category),
          primaryActivity: biz.primaryActivity || "",
          primaryActivityCustom: biz.primaryActivityCustom || "",
          description: biz.description || "",
          publishEnglishVersion: Boolean(stripRichTextHtml(biz.descriptionEn || "").trim()),
          descriptionEn: biz.descriptionEn || "",
          keywords: (biz.keywords || []).join(", "),
          services: "",
          phone: biz.phone || "",
          email: biz.email || "",
          website: biz.website || "",
          instagram: biz.instagram || "",
          facebook: biz.facebook || "",
          whatsapp: biz.whatsapp || "",
          street: biz.address.street || "",
          city: biz.address.city || "",
          cityPlaceId: "",
          state: biz.address.stateCode
            ? getStateDisplayName(biz.address.countryCode || biz.address.country, biz.address.stateCode, biz.address.state)
            : biz.address.state || "",
          stateCode: biz.address.stateCode || "",
          country: getCountryName(biz.address.countryCode || biz.address.country) || biz.address.country || "",
          countryCode: biz.address.countryCode || "",
          attendanceType: biz.attendanceType || "presencial",
          hasPhysicalAddress: biz.attendanceType !== "online",
          postalCode: biz.address.postalCode || "",
          lat: biz.address.lat || 0,
          lng: biz.address.lng || 0,
          isVeganFriendly: !!biz.isVeganFriendly,
          isVegetarianFriendly: !!biz.isVegetarianFriendly,
          isGlutenFreeFriendly: !!biz.isGlutenFreeFriendly,
        });
        setOnlineCityResolved(
          biz.attendanceType === "online"
            ? !!(biz.address.city && biz.address.stateCode && biz.address.countryCode)
            : false
        );
        setBusinessHours(parseBusinessHours(biz.openingHours || []));
        setBusinessHoursTouched((biz.openingHours || []).some((line) => String(line || "").trim().length > 0));
        setBusinessHoursEditorOpen(false);
        businessHoursEditSnapshotRef.current = null;
        setExistingLogoUrl(biz.logoUrl || "");
        setExistingHeroUrl(biz.heroImage || "");
        setLogoRemoved(false);
        setHeroRemoved(false);
        setExistingPhotos(biz.photos || []);
        setGalleryTouched(false);
        loadedEditBusinessKeyRef.current = editBusinessKey;
      } finally {
        if (active) setLoadingEditBusiness(false);
      }
    });

    return () => {
      active = false;
    };
  }, [session, isEditMode, editingBusinessId, isEnglish, navigate, toLocalePath]);

  const validateCurrentStep = async () => {
    if (step === 1) {
      if (!form.name.trim() || !form.shortSlug.trim() || !form.category) {
        if (!form.name.trim()) setNameError(message("Business name is required.", "Nome do negócio é obrigatório."));
        toast.error(message("Complete the name, short link and category.", "Preencha nome, link curto e categoria."));
        return false;
      }
      const primaryActivityMissing = !isEditMode && !form.primaryActivity.trim();
      if (primaryActivityMissing || !isPrimaryActivityValid(form.category, form.primaryActivity, form.primaryActivityCustom)) {
        toast.error(message("Select the primary business type. If you cannot find an option, choose Other type and describe it.", "Selecione o tipo principal do negócio. Se não encontrar uma opção, escolha Outro tipo e descreva."));
        return false;
      }
      setNameError("");
      return runSlugCheck();
    }
    if (step === 2) {
      if (!stripRichTextHtml(form.description).trim()) {
        toast.error(message("Complete the description.", "Preencha a descrição."));
        return false;
      }
      if (form.publishEnglishVersion && !stripRichTextHtml(form.descriptionEn).trim()) {
        toast.error(message("Complete the English description or turn off the English version.", "Preencha a descrição em inglês ou desative a versão em inglês."));
        return false;
      }
      return true;
    }
    if (step === 3) {
      const phoneProvided = form.phone.trim().length > 0;
      const emailProvided = form.email.trim().length > 0;
      const phoneDigits = (form.phone.match(/\d/g) || []).length;
      if (phoneProvided && phoneDigits < 8) {
        setContactErrors((prev) => ({ ...prev, phone: "Telefone inválido." }));
        toast.error(message("Enter a valid phone number.", "Informe um telefone válido."));
        return false;
      }
      if (emailProvided && !isValidEmail(form.email)) {
        setContactErrors((prev) => ({ ...prev, email: "Email inválido." }));
        toast.error(message("Enter a valid email address.", "Informe um email válido."));
        return false;
      }
      setContactErrors({
        phone: "",
        email: "",
        website: "",
        instagram: "",
        facebook: "",
        whatsapp: "",
      });
      if (form.hasPhysicalAddress && (!form.street.trim() || !form.city.trim() || !form.stateCode.trim())) {
        toast.error(message("Complete the business address.", "Complete o endereço do negócio."));
        return false;
      }
      if (!form.hasPhysicalAddress && !form.city.trim()) {
        toast.error(message("Select at least your business city for search location.", "Selecione ao menos a cidade do seu negócio para localização nas buscas."));
        return false;
      }
      if (!form.hasPhysicalAddress && (!form.stateCode.trim() || !form.countryCode.trim() || !onlineCityResolved)) {
        const normalizedCity = form.city.trim().toLowerCase();
        const matches: Array<{ countryCode: string; stateCode: string }> = [];

        for (const country of locationCatalog) {
          for (const state of country.states || []) {
            const hasCity = (state.cities || []).some((c) => (c || "").trim().toLowerCase() === normalizedCity);
            if (hasCity) {
              matches.push({
                countryCode: (country.countryCode || "").toLowerCase(),
                stateCode: (state.code || "").toLowerCase(),
              });
            }
          }
        }

        if (matches.length === 1) {
          const only = matches[0];
          updateField("countryCode", only.countryCode);
          updateField("country", getCountryName(only.countryCode));
          updateField("stateCode", only.stateCode);
          updateField("state", getStateDisplayName(only.countryCode, only.stateCode));
          setOnlineCityResolved(true);
          return true;
        }

        toast.error(message("Select the city from the suggestions to confirm country and state/province.", "Selecione a cidade na lista de sugestões para confirmar país e província/estado."));
        return false;
      }
      return true;
    }
    if (step === 4) return true;
    return true;
  };

  const goNext = async () => {
    if (isSaving || stepTransitionInProgressRef.current) return;

    stepTransitionInProgressRef.current = true;
    setIsChangingStep(true);

    try {
      const ok = await validateCurrentStep();
      if (!ok) return;
      if (step < TOTAL_STEPS) setStep((prev) => (prev + 1) as WizardStep);
    } finally {
      stepTransitionInProgressRef.current = false;
      setIsChangingStep(false);
    }
  };

  const goBack = () => {
    if (isSaving || stepTransitionInProgressRef.current) return;
    if (step > 1) setStep((prev) => (prev - 1) as WizardStep);
  };

  const handlePlaceSelected = (place: AddressResult) => {
    setForm((prev) => ({
      ...prev,
      street: place.formattedAddress || place.street || "",
      city: place.city || "",
      cityPlaceId: place.cityPlaceId || "",
      state: getStateDisplayName(place.countryCode || "", place.stateCode || "", place.state || ""),
      stateCode: place.stateCode || "",
      country: getCountryName(place.countryCode || place.country) || place.country || "",
      countryCode: place.countryCode || "",
      postalCode: place.postalCode || "",
      lat: place.lat || 0,
      lng: place.lng || 0,
    }));
  };

  const activateBusinessHoursEditor = () => {
    businessHoursEditSnapshotRef.current = {
      hours: businessHours.map((hour) => ({ ...hour })),
      touched: businessHoursTouched,
    };
    setBusinessHoursEditorOpen(true);
    setBusinessHoursTouched(true);
  };

  const cancelBusinessHoursEditing = () => {
    const snapshot = businessHoursEditSnapshotRef.current;
    if (snapshot) {
      setBusinessHours(snapshot.hours);
      setBusinessHoursTouched(snapshot.touched);
    }
    businessHoursEditSnapshotRef.current = null;
    setBusinessHoursEditorOpen(false);
  };
  const updateWizardBusinessHour = (
    day: string,
    changes: Partial<Pick<BusinessHour, "enabled" | "open" | "close">>
  ) => {
    setBusinessHoursEditorOpen(true);
    setBusinessHoursTouched(true);
    setBusinessHours((prev) =>
      prev.map((hour) => {
        if (hour.day !== day) return hour;
        const next = { ...hour, ...changes };
        if (!next.enabled) return next;
        if (!next.open) next.open = "09:00";
        if (!next.close) next.close = "18:00";
        return next;
      })
    );
  };

  const handleWizardImageChange = (event: React.ChangeEvent<HTMLInputElement>, type: "logo" | "hero") => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (type === "logo") {
      setLogoFile(file);
      if (file) setLogoRemoved(false);
    } else {
      setHeroFile(file);
      if (file) setHeroRemoved(false);
    }
  };

  const removeWizardImage = (type: "logo" | "hero") => {
    if (type === "logo") {
      setLogoFile(null);
      setExistingLogoUrl("");
      setLogoRemoved(true);
    } else {
      setHeroFile(null);
      setExistingHeroUrl("");
      setHeroRemoved(true);
    }
  };
  const removeGalleryPhotoAt = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingGalleryPhotoAt = (index: number) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
    setGalleryTouched(true);
  };

  const handleSave = async () => {
    if (!session) {
      toast.error(isEnglish ? "Sign in to list your business." : "Faça login para cadastrar seu negócio.");
      navigate(toLocalePath("/entrar"));
      return;
    }

    if (!form.name.trim()) {
      setNameError(message("Business name is required.", "Nome do negócio é obrigatório."));
      setStep(1);
      toast.error(message("Complete the business name.", "Preencha o nome do negócio."));
      return;
    }

    // State updates are asynchronous, so this blocks repeated clicks before the button re-renders disabled.
    if (saveInProgressRef.current) return;
    saveInProgressRef.current = true;
    setIsSaving(true);

    try {
      const slugOk = await runSlugCheck();
      if (!slugOk) return;

      const keywords = form.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const isUnchangedExistingLocation =
        !!editingBusiness &&
        form.city.trim().toLocaleLowerCase() === editingBusiness.address.city.trim().toLocaleLowerCase() &&
        form.countryCode.trim().toLowerCase() === editingBusiness.address.countryCode.trim().toLowerCase() &&
        form.stateCode.trim().toLowerCase() === editingBusiness.address.stateCode.trim().toLowerCase();

      const locationResolution = await resolveBusinessLocation({
        city: form.city.trim(),
        countryCode: form.countryCode.trim(),
        stateCode: form.stateCode.trim(),
        cityPlaceId: form.cityPlaceId,
        citySlug: isUnchangedExistingLocation ? editingBusiness?.address.citySlug : undefined,
      });

      const payload = {
        name: form.name.trim(),
        slug: normalizeShortSlugFinal(form.shortSlug || form.name),
        categoryId: form.category,
        primaryActivity: form.primaryActivity,
        primaryActivityCustom: normalizePrimaryActivityCustom(form.primaryActivityCustom),
        description: sanitizeRichTextHtml(form.description),
        descriptionEn: form.publishEnglishVersion ? sanitizeRichTextHtml(form.descriptionEn) : "",
        street: form.hasPhysicalAddress ? form.street.trim() : "",
        city: form.city.trim(),
        ...(locationResolution?.databaseReady ? { citySlug: locationResolution.citySlug, locationId: locationResolution.locationId } : {}),
        state: form.state.trim(),
        stateCode: form.stateCode.trim().toLowerCase(),
        country: form.country.trim() || getCountryName(form.countryCode.trim().toLowerCase()),
        countryCode: form.countryCode.trim().toLowerCase(),
        attendanceType: form.hasPhysicalAddress ? "presencial" : "online",
        postalCode: form.hasPhysicalAddress ? form.postalCode.trim() : "",
        lat: form.lat || 0,
        lng: form.lng || 0,
        services: [],
        ...(isEditMode && logoRemoved ? { logoUrl: "" } : {}),
        ...(isEditMode && heroRemoved ? { heroImage: "" } : {}),
        keywords,
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        instagram: buildInstagramUrl(form.instagram),
        facebook: buildFacebookUrl(form.facebook),
        whatsapp: form.whatsapp.trim(),
        isVeganFriendly: getCategoryId(form.category) === "food" ? !!form.isVeganFriendly : false,
        isVegetarianFriendly: getCategoryId(form.category) === "food" ? !!form.isVegetarianFriendly : false,
        isGlutenFreeFriendly: getCategoryId(form.category) === "food" ? !!form.isGlutenFreeFriendly : false,
        openingHours: businessHoursTouched ? serializeBusinessHours(businessHours) : [],
      };

      let targetBusinessId = editingBusiness?.id || "";
      if (isEditMode) {
        if (!targetBusinessId) {
          toast.error(message("Business not found for editing.", "Negócio não encontrado para edição."));
          return;
        }
        const updated = await updateBusiness(targetBusinessId, payload);
        if (!updated) {
          toast.error(message("Could not save the changes.", "Não foi possível salvar as alterações."));
          return;
        }
      } else {
        const created = await createBusiness(session.userId, { ...payload, photos: [] });
        if (!created) {
          toast.error(message("Could not create the business.", "Não foi possível criar o negócio."));
          return;
        }
        targetBusinessId = created.id;
      }

      const updates: Record<string, unknown> = {};

      if (logoFile && targetBusinessId) {
        const path = generateImagePath(targetBusinessId, "logo", logoFile.name);
        const url = await uploadImage("business-images", path, logoFile);
        if (url) updates.logoUrl = url;
      }

      if (heroFile && targetBusinessId) {
        const path = generateImagePath(targetBusinessId, "hero", heroFile.name);
        const url = await uploadImage("business-images", path, heroFile);
        if (url) updates.heroImage = url;
      }

      if ((photoFiles.length > 0 || (isEditMode && galleryTouched)) && targetBusinessId) {
        const uploaded: string[] = [];
        for (const file of photoFiles) {
          const path = generateImagePath(targetBusinessId, "photo", file.name);
          const url = await uploadImage("business-images", path, file);
          if (url) uploaded.push(url);
        }
        updates.photos = isEditMode ? [...existingPhotos, ...uploaded] : uploaded;
      }

      if (Object.keys(updates).length > 0 && targetBusinessId) {
        await updateBusiness(targetBusinessId, updates);
      }

      toast.success(isEnglish
        ? (isEditMode ? "Business updated successfully!" : "Business submitted for review. This process can take up to 24 hours.")
        : (isEditMode ? "Negócio atualizado com sucesso!" : "Negócio enviado para análise. Esse processo pode levar até 24 horas."));
      navigate(toLocalePath("/perfil?tab=negocios"));
    } finally {
      saveInProgressRef.current = false;
      setIsSaving(false);
    }
  };

  const canShowFoodToggles = getCategoryId(form.category) === "food";
  const sharedHeader = (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-24">
          <Link to={toLocalePath("/")} className="flex items-center gap-3 group">
            <div className="w-14 h-14 sm:w-[5.5rem] sm:h-[5.5rem] flex items-center justify-center">
              <img src="/logo.webp" alt="Caramelinho logo" className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-extrabold text-lg sm:text-2xl tracking-tight caramelo-text-gradient truncate">Caramelinho</div>
              <div className="text-[10px] sm:text-sm font-semibold text-foreground/75 whitespace-nowrap overflow-hidden text-ellipsis">{getSiteSlogan(locale)}</div>
            </div>
          </Link>
          <div className="hidden sm:flex">
            <SiteHeaderAuthActions className="flex items-center gap-3" compact />
          </div>
          <MobileHeaderMenu showLanguage={false} />
        </div>
      </div>
    </header>
  );

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        {sharedHeader}
        <main className="max-w-3xl mx-auto px-4 py-16">
          <Card className="p-8 text-center">
            <User className="w-10 h-10 mx-auto text-muted-foreground/60" />
            <h1 className="text-2xl font-bold mt-3">{isEnglish ? text!.signInRequired : "Entre para continuar"}</h1>
            <p className="text-muted-foreground mt-2">{isEnglish ? text!.signInDescription : "Você precisa estar logado para usar o cadastro guiado."}</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link to={toLocalePath("/entrar")}>
                <Button>{isEnglish ? text!.signIn : "Entrar"}</Button>
              </Link>
              <Link to={toLocalePath("/")}>
                <Button variant="outline">{isEnglish ? text!.backHome : "Voltar ao início"}</Button>
              </Link>
            </div>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (isEditMode && loadingEditBusiness) {
    return (
      <div className="min-h-screen bg-background">
        {sharedHeader}
        <main className="max-w-3xl mx-auto px-4 py-16">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold">{isEnglish ? text!.loadingEdit : "Carregando edição..."}</h1>
            <p className="text-muted-foreground mt-2">{isEnglish ? text!.loadingEditDescription : "Buscando os dados do negócio para preencher o wizard."}</p>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-background to-background">
      {sharedHeader}

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Card className="p-6 border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">{isEnglish ? text!.step : "Passo"} {step} {isEnglish ? "of" : "de"} {TOTAL_STEPS}</p>
              <h1 className="text-2xl font-bold">
                {isEnglish ? text!.steps[step - 1] : step === 1 ? "Dados principais" : step === 2 ? "Descrição e busca" : step === 3 ? "Contato e localização" : step === 4 ? "Horários" : step === 5 ? "Mídia" : "Revisão e confirmação"}
              </h1>
            </div>
            <StepIcon className="w-6 h-6 text-amber-500" />
          </div>

          <div className="h-2 rounded-full bg-secondary overflow-hidden mb-6">
            <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <div className="mb-6">
            <ProfileCompletionCard data={profileCompletionData} compact={step !== 6} />
          </div>

          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>{isEnglish ? `${text!.businessName} *` : "Nome do negócio *"}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={`mt-1.5 ${nameError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                {nameError ? <p className="mt-1 text-xs text-red-600">{nameError}</p> : null}
              </div>
              <div className="md:col-span-2">
                <Label>{isEnglish ? `${text!.shortLink} *` : "Link curto *"}</Label>
                <div className="mt-1.5 flex items-center rounded-md border border-input bg-background overflow-hidden">
                  <span className="px-3 py-2 text-sm text-muted-foreground bg-secondary/50 border-r border-input whitespace-nowrap">
                    caramelinho.com/go/
                  </span>
                  <input
                    value={form.shortSlug}
                    onChange={(e) => updateField("shortSlug", normalizeShortSlugTyping(e.target.value))}
                    onBlur={(e) => updateField("shortSlug", normalizeShortSlugFinal(e.target.value))}
                    placeholder="pizzaria-do-ze"
                    className="w-full h-10 px-3 bg-transparent text-sm outline-none"
                  />
                </div>
                <p className={`mt-1 text-xs ${slugStatus === "ok" ? "text-emerald-700" : slugStatus === "error" ? "text-red-600" : "text-muted-foreground"}`}>
                  {checkingSlug ? (isEnglish ? text!.checkingAvailability : "Verificando disponibilidade...") : slugMessage}
                </p>
              </div>
              <div className="md:col-span-2">
                <Label>{isEnglish ? `${text!.category} *` : "Categoria *"}</Label>
                <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue placeholder={isEnglish ? text!.chooseCategory : "Selecione uma categoria"} />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{categoryLabels.get(cat.id) || cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.category ? (
                <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50/60 p-4">
                  <Label>{isEnglish ? `${text!.primaryActivity}${!isEditMode ? " *" : ""}` : "Tipo principal de negócio" + (!isEditMode ? " *" : "")}</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isEnglish ? text!.primaryActivityDescription : "Define a atividade que melhor representa seu negócio. Os demais serviços podem ser informados na descrição e nas palavras-chave."}
                  </p>
                  <Select value={form.primaryActivity} onValueChange={(value) => updateField("primaryActivity", value)}>
                    <SelectTrigger className="mt-2 w-full bg-background"><SelectValue placeholder={isEnglish ? (isEditMode ? text!.selectPrimaryActivityOptional : text!.selectPrimaryActivity) : (isEditMode ? "Selecione o tipo principal (opcional)" : "Selecione o tipo principal")} /></SelectTrigger>
                    <SelectContent>{getPrimaryActivityOptions(form.category).map((activity) => (<SelectItem key={activity.id} value={activity.id}>{isEnglish ? getPrimaryActivityLabel(form.category, activity.id, undefined, "en") || activity.label : activity.label}</SelectItem>))}</SelectContent>
                  </Select>
                  {form.primaryActivity === OTHER_PRIMARY_ACTIVITY_ID ? (
                    <Input value={form.primaryActivityCustom} onChange={(event) => updateField("primaryActivityCustom", event.target.value.slice(0, 80))} placeholder={getPrimaryActivityCustomPlaceholder(form.category)} className="mt-2 bg-background" maxLength={80} />
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">{isEnglish ? (isEditMode ? text!.primaryActivityEditHint : text!.primaryActivityHint) : (isEditMode ? "Isso ajuda a construir um título de página mais fiel para buscas, sem substituir sua categoria." : "Obrigatório para novos negócios. Se não encontrar uma opção adequada, escolha Outro tipo e descreva a atividade.")}</p>
                </div>
              ) : null}
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>{isEnglish ? `${text!.description} *` : "Descrição *"}</Label>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {isEnglish ? text!.descriptionHint : "Esta é a informação mais importante da página do seu negócio. É ela que ajuda o cliente a entender rapidamente o que você oferece, seus diferenciais e por que deve escolher você. Escreva de forma clara, objetiva e humana: diga os principais serviços/produtos, o público atendido, região de atuação e pontos fortes (ex.: rapidez, qualidade, atendimento em português, experiência, especialidades)."}
                </p>
                <RichTextEditor
                  id="business-description"
                  value={form.description}
                  onChange={(value) => updateField("description", value)}
                  className="mt-1.5"
                  placeholder={isEnglish ? text!.descriptionPlaceholder : "Descreva claramente o que seu negocio oferece."}
                />
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.publishEnglishVersion}
                    onChange={(event) => updateField("publishEnglishVersion", event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="font-semibold text-sky-950">{isEnglish ? text!.publishEnglish : "Publicar também em inglês"}</span>
                    <span className="mt-1 block text-sm text-sky-900/80">{isEnglish ? text!.publishEnglishHint : "A versão em inglês ganha uma URL própria e aparece apenas quando a descrição em inglês estiver preenchida. Sem ela, seu negócio continua somente em português."}</span>
                  </span>
                </label>
                {form.publishEnglishVersion ? (
                  <div className="mt-4 space-y-4 border-t border-sky-200 pt-4">
                    <div>
                      <Label>{isEnglish ? `${text!.englishDescription} *` : "Descrição em inglês *"}</Label>
                      <p className="mt-1 text-sm text-muted-foreground">{isEnglish ? text!.englishDescriptionHint : "Escreva uma versão natural para clientes que pesquisam em inglês. Não publicamos traduções automáticas."}</p>
                      <RichTextEditor id="business-description-en" value={form.descriptionEn} onChange={(value) => updateField("descriptionEn", value)} className="mt-1.5 bg-white" placeholder="Describe your business, services and what makes it different." />
                    </div>
                  </div>
                ) : null}
              </div>
              <div>
                <Label>{isEnglish ? text!.keywords : "Palavras-chave"}</Label>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {isEnglish ? text!.keywordsHint : "Essas palavras ajudam seu negócio a aparecer quando alguém procura por produtos e serviços. Use termos reais que seus clientes digitam, incluindo variações e sinônimos. Exemplo: para mecânico, também use oficina, manutenção automotiva, troca de óleo. Para restaurante brasileiro, adicione comida brasileira, prato feito, almoço, jantar, delivery. Separe por vírgula e evite termos muito genéricos."}
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {isEnglish ? text!.keywordsLabel : "Palavras-chave (separadas por vírgula)"}
                </p>
                <Textarea
                  value={form.keywords}
                  onChange={(e) => updateField("keywords", e.target.value)}
                  className="mt-1.5 min-h-[96px]"
                  placeholder="Ex: coxinha, padaria brasileira, almoço"
                />
              </div>
              {canShowFoodToggles && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-medium text-emerald-900 mb-2">{isEnglish ? text!.audiences : "Públicos também atendidos"}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.isVeganFriendly} onChange={(e) => updateField("isVeganFriendly", e.target.checked)} />
                      {isEnglish ? text!.vegan : "Vegano"}
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.isVegetarianFriendly} onChange={(e) => updateField("isVegetarianFriendly", e.target.checked)} />
                      {isEnglish ? text!.vegetarian : "Vegetariano"}
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.isGlutenFreeFriendly} onChange={(e) => updateField("isGlutenFreeFriendly", e.target.checked)} />
                      {isEnglish ? text!.glutenFree : "Sem Glúten"}
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{isEnglish ? text!.phone : "Telefone (opcional)"}</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => updateStep3Field("phone", e.target.value)}
                  className={`mt-1.5 ${contactErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  placeholder="+1 (514) 555-1234"
                />
                {contactErrors.phone ? <p className="mt-1 text-xs text-red-600">{contactErrors.phone}</p> : null}
              </div>
              <div>
                <Label>{isEnglish ? text!.email : "Email (opcional)"}</Label>
                <Input
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => updateStep3Field("email", e.target.value)}
                  className={`mt-1.5 ${contactErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  placeholder="contato@seudominio.com"
                />
                {contactErrors.email ? <p className="mt-1 text-xs text-red-600">{contactErrors.email}</p> : null}
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => updateStep3Field("website", e.target.value)}
                  className="mt-1.5"
                  placeholder="https://seusite.com"
                />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input
                  value={form.instagram}
                  onChange={(e) => updateStep3Field("instagram", e.target.value)}
                  onBlur={() => updateField("instagram", buildInstagramUrl(form.instagram))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Facebook</Label>
                <Input
                  value={form.facebook}
                  onChange={(e) => updateStep3Field("facebook", e.target.value)}
                  onBlur={() => updateField("facebook", buildFacebookUrl(form.facebook))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={form.whatsapp}
                  onChange={(e) => updateStep3Field("whatsapp", e.target.value)}
                  className={`mt-1.5 ${contactErrors.whatsapp ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  placeholder="+1 (514) 555-1234"
                />
              </div>
              <div className="md:col-span-2">
                <Label>{isEnglish ? `${text!.physicalAddress} *` : "Seu negócio possui endereço físico? *"}</Label>
                <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateField("hasPhysicalAddress", true)}
                    className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                      form.hasPhysicalAddress
                        ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                        : "bg-background border-input text-foreground hover:bg-secondary"
                    }`}
                  >
                    {isEnglish ? text!.yesAddress : "Sim, possui endereço físico"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateField("hasPhysicalAddress", false);
                      updateField("street", "");
                      updateField("postalCode", "");
                      setOnlineCityResolved(!!(form.city && form.stateCode && form.countryCode));
                    }}
                    className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                      !form.hasPhysicalAddress
                        ? "bg-amber-50 border-amber-400 text-amber-800"
                        : "bg-background border-input text-foreground hover:bg-secondary"
                    }`}
                  >
                    {isEnglish ? text!.noAddress : "Não, atende sem endereço físico"}
                  </button>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>{form.hasPhysicalAddress ? (isEnglish ? "Address *" : "Endereço *") : (isEnglish ? "Base city for search *" : "Cidade base para busca *")}</Label>
                <div className="mt-1.5">
                  {!form.hasPhysicalAddress ? (
                    <div className="space-y-2">
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        {isEnglish ? "No physical address: select the main service city to appear in local search results." : "Sem endereço físico: selecione a cidade principal de atendimento para aparecer nas buscas locais."}
                      </div>
                      <AddressAutocomplete
                        mode="city"
                        value={form.city}
                        onChange={(v) => {
                          updateField("city", v);
                          updateField("state", "");
                          updateField("stateCode", "");
                          updateField("countryCode", "");
                          updateField("country", "");
                          updateField("lat", 0);
                          updateField("lng", 0);
                          setOnlineCityResolved(false);
                        }}
                        onPlaceSelected={(place) => {
                          const city = (place.city || place.formattedAddress || "").trim();
                          const resolvedStateCode = (place.stateCode || "").toLowerCase();
                          const resolvedCountryCode = (place.countryCode || "").toLowerCase();
                          updateField("city", city);
                          updateField("state", getStateDisplayName(resolvedCountryCode, resolvedStateCode, place.state || ""));
                          updateField("stateCode", resolvedStateCode);
                          updateField("countryCode", resolvedCountryCode);
                          updateField("country", getCountryName(resolvedCountryCode) || place.country || "");
                          updateField("lat", place.lat || 0);
                          updateField("lng", place.lng || 0);
                          updateField("street", "");
                          updateField("postalCode", "");
                          setOnlineCityResolved(!!(city && resolvedStateCode && resolvedCountryCode));
                        }}
                        placeholder={isEnglish ? "Type and select your city (e.g. Montreal)" : "Digite e selecione sua cidade (ex: Montreal)"}
                      />
                    </div>
                  ) : (
                    <AddressAutocomplete
                      value={form.street}
                      onChange={(v) => updateField("street", v)}
                      onPlaceSelected={handlePlaceSelected}
                    />
                  )}
                </div>
              </div>
              <div className="md:col-span-2 rounded-md border border-border p-3 text-sm">
                <p className="inline-flex items-center gap-2 font-medium">
                  <MapPin className="w-4 h-4" />
                  {isEnglish ? text!.addressSummary : "Resumo do endereço"}
                </p>
                <p className="text-muted-foreground mt-1">
                  {!form.hasPhysicalAddress
                    ? `${form.city?.trim() || (isEnglish ? text!.cityMissing : "Cidade não preenchida")}${form.countryCode ? `, ${getCountryName(form.countryCode)}` : ""}`
                    : (
                      <>
                        {form.street?.trim() || (isEnglish ? text!.addressMissing : "Endereço não preenchido")}<br />
                        {[
                          form.city?.trim(),
                          form.stateCode?.trim() ? getStateDisplayName(form.countryCode, form.stateCode, form.state) : "",
                          form.postalCode?.trim(),
                        ]
                          .filter(Boolean)
                          .join(" ") || (isEnglish ? text!.cityRegionMissing : "Cidade/UF não preenchidas")}
                      </>
                    )}
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-lg border border-border bg-secondary/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label>{isEnglish ? text!.openingHours : "Horários de funcionamento"}</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {businessHoursTouched
                        ? (isEnglish ? text!.hoursPublished : "Esses horários aparecerão na página pública do negócio.")
                        : (isEnglish ? text!.hoursMissing : "Horários ainda não informados.")}
                    </p>
                  </div>
                  {businessHoursEditorOpen ? (
                    <Button type="button" variant="ghost" onClick={cancelBusinessHoursEditing}>
                      {isEnglish ? text!.cancel : "Cancelar"}
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={activateBusinessHoursEditor}>
                      {businessHoursTouched ? (isEnglish ? text!.editHours : "Editar horários") : (isEnglish ? text!.addHours : "Adicionar horário")}
                    </Button>
                  )}
                </div>
                {businessHoursEditorOpen ? (
                  <div className="mt-3 space-y-2">
                    {businessHours.map((hour) => (
                      <div key={hour.day} className="grid grid-cols-1 sm:grid-cols-[110px_90px_1fr_1fr] gap-2 items-center">
                        <span className="text-sm font-medium">{displayBusinessDay(hour.day)}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant={hour.enabled ? "default" : "outline"}
                          onClick={() => updateWizardBusinessHour(hour.day, { enabled: !hour.enabled })}
                        >
                          {hour.enabled ? (isEnglish ? text!.open : "Aberto") : (isEnglish ? text!.closed : "Fechado")}
                        </Button>
                        <Input
                          type="time"
                          value={hour.open}
                          disabled={!hour.enabled}
                          onChange={(e) => updateWizardBusinessHour(hour.day, { open: e.target.value })}
                        />
                        <Input
                          type="time"
                          value={hour.close}
                          disabled={!hour.enabled}
                          onChange={(e) => updateWizardBusinessHour(hour.day, { close: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 space-y-2 rounded-md border border-border bg-background p-3">
                      {businessHours.map((hour) => (
                        <div key={hour.day} className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">{displayBusinessDay(hour.day)}</span>
                          <span className={businessHoursTouched ? "text-muted-foreground" : "text-amber-700"}>
                            {businessHoursTouched
                              ? hour.enabled
                                ? `${hour.open} - ${hour.close}`
                                : (isEnglish ? text!.closed : "Fechado")
                              : (isEnglish ? text!.notProvided : "Não informado")}
                          </span>
                        </div>
                      ))}
                    </div>
                    {!businessHoursTouched ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {isEnglish ? text!.hoursHint : "Clique em Adicionar horário para preencher os dias e ganhar pontos no perfil."}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          )}
          {step === 5 && (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>{isEnglish ? text!.logo : "Logo"}</Label>
                <div className="mt-1.5">
                  <label htmlFor="wizard-logo" className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium cursor-pointer hover:bg-secondary">
                    {isEnglish ? text!.chooseImage : "Escolher imagem"}
                  </label>
                </div>
                <Input id="wizard-logo" type="file" accept="image/*" className="hidden" onChange={(e) => handleWizardImageChange(e, "logo")} />
                <p className="mt-1 text-xs text-muted-foreground">{logoFile ? logoFile.name : existingLogoUrl ? (isEnglish ? text!.currentLogo : "Logo atual") : (isEnglish ? text!.noFile : "Nenhum arquivo selecionado")}</p>
                {logoFile ? (
                  <div className="mt-2">
                    <div className="relative w-20 h-20 rounded-md overflow-hidden border border-border">
                      <img src={URL.createObjectURL(logoFile)} alt={isEnglish ? text!.previewLogo : "Prévia da logo"} className="w-full h-full object-cover" />
                    </div>
                  </div>
                ) : existingLogoUrl ? (
                  <div className="mt-2">
                    <div className="relative w-20 h-20 rounded-md overflow-hidden border border-border">
                      <img src={existingLogoUrl} alt={isEnglish ? text!.currentLogo : "Logo atual"} className="w-full h-full object-cover" />
                    </div>
                  </div>
                ) : null}
                {logoFile || existingLogoUrl ? (
                  <Button type="button" size="sm" variant="outline" className="mt-2 text-destructive" onClick={() => removeWizardImage("logo")}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    {isEnglish ? text!.removeLogo : "Remover logo"}
                  </Button>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {isEnglish ? `${text!.imageFormats} Ideal size: 512x512 px. Maximum size: 5MB.` : "Formatos aceitos: JPG, PNG e WEBP. Resolução ideal: 512x512 px. Tamanho máximo: 5MB."}
                </p>
              </div>
              <div>
                <Label>{isEnglish ? text!.cover : "Capa (banner)"}</Label>
                <div className="mt-1.5">
                  <label htmlFor="wizard-hero" className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium cursor-pointer hover:bg-secondary">
                    {isEnglish ? text!.chooseImage : "Escolher imagem"}
                  </label>
                </div>
                <Input id="wizard-hero" type="file" accept="image/*" className="hidden" onChange={(e) => handleWizardImageChange(e, "hero")} />
                <p className="mt-1 text-xs text-muted-foreground">{heroFile ? heroFile.name : existingHeroUrl ? (isEnglish ? text!.currentCover : "Capa atual") : (isEnglish ? text!.noFile : "Nenhum arquivo selecionado")}</p>
                {heroFile ? (
                  <div className="mt-2">
                    <div className="relative w-44 h-20 rounded-md overflow-hidden border border-border">
                      <img src={URL.createObjectURL(heroFile)} alt={isEnglish ? text!.previewCover : "Prévia da capa"} className="w-full h-full object-cover" />
                    </div>
                  </div>
                ) : existingHeroUrl ? (
                  <div className="mt-2">
                    <div className="relative w-44 h-20 rounded-md overflow-hidden border border-border">
                      <img src={existingHeroUrl} alt={isEnglish ? text!.currentCover : "Capa atual"} className="w-full h-full object-cover" />
                    </div>
                  </div>
                ) : null}
                {heroFile || existingHeroUrl ? (
                  <Button type="button" size="sm" variant="outline" className="mt-2 text-destructive" onClick={() => removeWizardImage("hero")}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    {isEnglish ? text!.removeCover : "Remover capa"}
                  </Button>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {isEnglish ? `${text!.imageFormats} Ideal size: 1600x600 px. Maximum size: 8MB.` : "Formatos aceitos: JPG, PNG e WEBP. Resolução ideal: 1600x600 px. Tamanho máximo: 8MB."}
                </p>
              </div>
              <div>
                <Label>{isEnglish ? text!.gallery : "Galeria de fotos (até 8)"}</Label>
                <div className="mt-1.5">
                  <label htmlFor="wizard-photos" className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium cursor-pointer hover:bg-secondary">
                    {isEnglish ? text!.chooseImages : "Escolher imagens"}
                  </label>
                </div>
                <Input
                  id="wizard-photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const incoming = Array.from(e.target.files || []);
                    setPhotoFiles((prev) => {
                      const merged = [...prev];
                      for (const file of incoming) {
                        const exists = merged.some(
                          (f) =>
                            f.name === file.name &&
                            f.size === file.size &&
                            f.lastModified === file.lastModified
                        );
                        if (!exists) merged.push(file);
                        if (merged.length >= 8) break;
                      }
                      return merged.slice(0, 8);
                    });
                    e.currentTarget.value = "";
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isEnglish ? `${text!.imageFormats} Ideal size: 1280x720 px. Maximum size: 8MB per image.` : "Formatos aceitos: JPG, PNG e WEBP. Resolução ideal: 1280x720 px. Tamanho máximo: 8MB por imagem."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{photoFiles.length} {isEnglish ? text!.selectedFiles : "arquivo(s) selecionado(s)."}</p>
                {photoFiles.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {photoFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="relative w-full aspect-square rounded-md overflow-hidden border border-border group">
                        <img src={URL.createObjectURL(file)} alt={isEnglish ? text!.previewGallery : "Prévia da galeria"} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeGalleryPhotoAt(index)}
                          className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          aria-label={isEnglish ? text!.removePhoto : "Remover foto"}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {existingPhotos.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {existingPhotos.slice(0, 8).map((url, index) => (
                      <div key={`${url}-${index}`} className="relative w-full aspect-square rounded-md overflow-hidden border border-border group">
                        <img src={url} alt={isEnglish ? text!.currentPhoto : "Foto atual"} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeExistingGalleryPhotoAt(index)}
                          className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          aria-label={isEnglish ? text!.removePhoto : "Remover foto atual"}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="grid grid-cols-1 gap-4">
              <Card className="p-4 border-emerald-200 bg-emerald-50">
                <p className="inline-flex items-center gap-2 text-emerald-900 font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  {isEnglish ? text!.review : "Confira os dados antes de publicar"}
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <p><strong>{isEnglish ? text!.business : "Negócio"}:</strong> {form.name || "-"}</p>
                  <p><strong>{isEnglish ? text!.shortLink : "Link curto"}:</strong> caramelinho.com/go/{form.shortSlug || slugify(form.name) || "-"}</p>
                  <p><strong>{isEnglish ? text!.category : "Categoria"}:</strong> {categoryLabels.get(form.category) || BUSINESS_CATEGORY_OPTIONS.find((c) => c.id === form.category)?.label || "-"}</p>
                  <p><strong>{isEnglish ? text!.attendance : "Atendimento"}:</strong> {form.hasPhysicalAddress ? (isEnglish ? text!.withAddress : "Com endereço físico") : (isEnglish ? text!.withoutAddress : "Sem endereço físico")}</p>
                  <p>
                    <strong>{isEnglish ? text!.baseLocation : "Local base"}:</strong>{" "}
                    {form.city ? `${form.city}${form.stateCode ? ` (${getStateDisplayName(form.countryCode, form.stateCode, form.state)})` : ""}` : "-"}
                    {form.countryCode ? `, ${getCountryName(form.countryCode)}` : ""}
                  </p>
                  <p><strong>{isEnglish ? text!.contact : "Contato"}:</strong> {form.phone || "-"} / {form.email || "-"}</p>
                  <p><strong>{isEnglish ? text!.media : "Mídia"}:</strong> {logoFile ? "logo" : (isEnglish ? text!.noLogo : "sem logo")}, {heroFile ? (isEnglish ? "cover" : "capa") : (isEnglish ? text!.noCover : "sem capa")}, {photoFiles.length} {isEnglish ? "photo(s)" : "foto(s)"}</p>
                </div>
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {getCategoryId(form.category) === "food" ? (
                    <>
                      <p className="font-semibold">{isEnglish ? text!.nextMenu : "Próximo passo recomendado: Cardápio"}</p>
                      <p className="mt-1">
                        {isEnglish ? text!.menuHint : <>Após publicar, você poderá adicionar seu cardápio item a item (nome, descrição e preço opcional) ou enviar um cardápio completo em PDF. Isso facilita para o cliente encontrar pratos e produtos. Você encontra essa opção em <strong>Perfil &gt; Meus Negócios</strong>, no botão <strong>Cardápio</strong> do seu negócio.</>}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">{isEnglish ? text!.nextServices : "Próximo passo recomendado: Serviços"}</p>
                      <p className="mt-1">
                        {isEnglish ? text!.servicesHint : <>Após publicar, você poderá cadastrar seus serviços com nome, descrição e preço opcional. Isso melhora sua presença nas buscas e ajuda o cliente a entender o que seu negócio oferece. Você encontra essa opção em <strong>Perfil &gt; Meus Negócios</strong>, no botão <strong>Serviços</strong> do seu negócio.</>}
                      </p>
                    </>
                  )}
                </div>
              </Card>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={goBack} disabled={step === 1 || isSaving || isChangingStep} className="w-full sm:w-auto">
              <ChevronLeft className="w-4 h-4 mr-1" />
              {isEnglish ? text!.back : "Voltar"}
            </Button>

            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            {step < TOTAL_STEPS ? (
              <Button onClick={goNext} disabled={isSaving || isChangingStep} className="order-1 w-full sm:w-auto">
                {isEnglish ? text!.next : "Próximo"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={isSaving} className="order-2 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                {isSaving ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-pulse" />
                    {isEditMode ? (isEnglish ? text!.saving : "Salvando...") : (isEnglish ? text!.publishing : "Publicando...")}
                  </>
                ) : (
                  <>
                    <PawPrint className="w-4 h-4 mr-2" />
                    {isEditMode ? (isEnglish ? text!.saveChanges : "Salvar modificações") : (isEnglish ? text!.publish : "Confirmar e Publicar")}
                  </>
                )}
              </Button>
            )}
            {isEditMode && step < TOTAL_STEPS ? (
              <Button onClick={handleSave} disabled={isSaving} className="order-1 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                {isSaving ? (isEnglish ? text!.saving : "Salvando...") : (isEnglish ? text!.saveChanges : "Salvar modificações")}
              </Button>
            ) : null}
          </div>
          </div>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
