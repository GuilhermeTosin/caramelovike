import { useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { AlertTriangle, Calendar, Plus, Trash2, X } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/RichTextEditor";
import ProfileCompletionCard from "@/components/ProfileCompletionCard";
import { getPrimaryActivityCustomPlaceholder, getPrimaryActivityLabel, getPrimaryActivityOptions, OTHER_PRIMARY_ACTIVITY_ID } from "@/lib/businessActivities";
import { getHomeContent } from "@/data/homeContent";
import { useSiteLocale } from "@/contexts/LocaleContext";
import type { AddressResult } from "@/components/AddressAutocomplete";
import type { BusinessFrontend, BusinessEvent, Promotion } from "@/types/database";
import type { BusinessHour } from "@/pages/user-profile/types";

type BusinessCategoryOption = {
  id: string;
  label: string;
};

type BusinessFormData = {
  name: string;
  shortSlug: string;
  category: string;
  primaryActivity: string;
  primaryActivityCustom: string;
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

type VerificationBusinessLike = BusinessFrontend | null;

type UserProfileDialogsProps = {
  businessCategoryOptions: BusinessCategoryOption[];
  creatingBusiness: boolean;
  editingBusiness: BusinessFrontend | null;
  closeBusinessEditor: () => void;
  editFormData: BusinessFormData;
  setEditFormData: Dispatch<SetStateAction<BusinessFormData>>;
  handleEditInputChange: (field: string, value: string) => void;
  normalizeShortSlugFinal: (value: string) => string;
  shortSlugStatus: "idle" | "checking" | "available" | "taken" | "invalid";
  shortSlugMessage: string;
  getCategoryId: (value: string) => string;
  editBusinessHours: BusinessHour[];
  editBusinessHoursTouched: boolean;
  updateBusinessHour: (day: string, changes: Partial<BusinessHour>) => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>, type: "logo" | "hero", isEdit: boolean) => void;
  editLogoFile: File | null;
  editHeroFile: File | null;
  existingPhotos: string[];
  editPhotoFiles: File[];
  handleRemoveExistingPhoto: (index: number) => void;
  handleRemoveNewPhoto: (index: number, isEdit: boolean) => void;
  handlePhotosChange: (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => void;
  handleEditPlaceSelected: (place: AddressResult) => void;
  savingBusiness: boolean;
  handleSaveBusiness: () => void;
  couponBusiness: BusinessFrontend | null;
  setCouponBusiness: Dispatch<SetStateAction<BusinessFrontend | null>>;
  couponItems: Promotion[];
  couponForm: Promotion;
  setCouponForm: Dispatch<SetStateAction<Promotion>>;
  handleRemoveCoupon: (index: number) => void;
  handleAddCoupon: () => void;
  handleSaveCoupon: () => void;
  savingCoupon: boolean;
  formatIsoToBr: (value: string) => string;
  normalizeDateForInput: (value: string) => string;
  menuBusiness: BusinessFrontend | null;
  setMenuBusiness: Dispatch<SetStateAction<BusinessFrontend | null>>;
  menuItems: { name: string; description: string; price: string }[];
  setMenuItems: Dispatch<SetStateAction<{ name: string; description: string; price: string }[]>>;
  menuNameErrors: Record<number, boolean>;
  getCurrencyPrefixForCountry: (countryCode: string) => string;
  menuPdfFile: File | null;
  setMenuPdfFile: Dispatch<SetStateAction<File | null>>;
  menuPdfUrl: string;
  setMenuPdfUrl: Dispatch<SetStateAction<string>>;
  handleOpenPdfPrivately: (pdfUrl: string) => Promise<void>;
  handleSaveMenu: () => void;
  savingMenu: boolean;
  serviceBusiness: BusinessFrontend | null;
  setServiceBusiness: Dispatch<SetStateAction<BusinessFrontend | null>>;
  serviceItems: { name: string; description: string; price: string }[];
  setServiceItems: Dispatch<SetStateAction<{ name: string; description: string; price: string }[]>>;
  serviceNameErrors: Record<number, boolean>;
  handleSaveServices: () => void;
  savingServices: boolean;
  eventsBusiness: BusinessFrontend | null;
  setEventsBusiness: Dispatch<SetStateAction<BusinessFrontend | null>>;
  eventItems: BusinessEvent[];
  setEventItems: Dispatch<SetStateAction<BusinessEvent[]>>;
  eventDatePickerRefs: MutableRefObject<Record<number, HTMLInputElement | null>>;
  eventFlyerFiles: Record<number, File>;
  setEventFlyerFiles: Dispatch<SetStateAction<Record<number, File>>>;
  handleAddEvent: () => void;
  handleRemoveEvent: (index: number) => void;
  handleSaveEvents: () => void;
  savingEvents: boolean;
  verificationBusiness: VerificationBusinessLike;
  setVerificationBusiness: Dispatch<SetStateAction<BusinessFrontend | null>>;
  verificationSubmitting: boolean;
  instagramPostUrl: string;
  setInstagramPostUrl: Dispatch<SetStateAction<string>>;
  handleSubmitVerificationRequest: () => void;
  deleteTarget: BusinessFrontend | null;
  setDeleteTarget: Dispatch<SetStateAction<BusinessFrontend | null>>;
  handleConfirmDeleteMyBusiness: () => void;
};

export default function UserProfileDialogs({
  businessCategoryOptions,
  creatingBusiness,
  editingBusiness,
  closeBusinessEditor,
  editFormData,
  setEditFormData,
  handleEditInputChange,
  normalizeShortSlugFinal,
  shortSlugStatus,
  shortSlugMessage,
  getCategoryId,
  editBusinessHours,
  editBusinessHoursTouched,
  updateBusinessHour,
  handleFileChange,
  editLogoFile,
  editHeroFile,
  existingPhotos,
  editPhotoFiles,
  handleRemoveExistingPhoto,
  handleRemoveNewPhoto,
  handlePhotosChange,
  handleEditPlaceSelected,
  savingBusiness,
  handleSaveBusiness,
  couponBusiness,
  setCouponBusiness,
  couponItems,
  couponForm,
  setCouponForm,
  handleRemoveCoupon,
  handleAddCoupon,
  handleSaveCoupon,
  savingCoupon,
  formatIsoToBr,
  normalizeDateForInput,
  menuBusiness,
  setMenuBusiness,
  menuItems,
  setMenuItems,
  menuNameErrors,
  getCurrencyPrefixForCountry,
  menuPdfFile,
  setMenuPdfFile,
  menuPdfUrl,
  setMenuPdfUrl,
  handleOpenPdfPrivately,
  handleSaveMenu,
  savingMenu,
  serviceBusiness,
  setServiceBusiness,
  serviceItems,
  setServiceItems,
  serviceNameErrors,
  handleSaveServices,
  savingServices,
  eventsBusiness,
  setEventsBusiness,
  eventItems,
  setEventItems,
  eventDatePickerRefs,
  eventFlyerFiles,
  setEventFlyerFiles,
  handleAddEvent,
  handleRemoveEvent,
  handleSaveEvents,
  savingEvents,
  verificationBusiness,
  setVerificationBusiness,
  verificationSubmitting,
  instagramPostUrl,
  setInstagramPostUrl,
  handleSubmitVerificationRequest,
  deleteTarget,
  setDeleteTarget,
  handleConfirmDeleteMyBusiness,
}: UserProfileDialogsProps) {
  const businessCouponDatePickerRef = useRef<HTMLInputElement>(null);
  const { locale } = useSiteLocale();
  const isEnglish = locale === "en";
  const ui = (english: string, portuguese: string) => (isEnglish ? english : portuguese);
  const editProfileCompletionData = {
    name: editFormData.name,
    category: editFormData.category,
    primaryActivity: editFormData.primaryActivity || editFormData.primaryActivityCustom,
    description: editFormData.description,
    city: editFormData.city,
    stateCode: editFormData.stateCode,
    countryCode: editFormData.countryCode,
    street: editFormData.street,
    logoUrl: editLogoFile?.name || editingBusiness?.logoUrl || "",
    heroImage: editHeroFile?.name || editingBusiness?.heroImage || "",
    photos: [...(editingBusiness?.photos || []), ...editPhotoFiles.map((file) => file.name)],
    phone: editFormData.phone,
    email: editFormData.email,
    website: editFormData.website,
    whatsapp: editFormData.whatsapp,
    instagram: editFormData.instagram,
    facebook: editFormData.facebook,
    services: editFormData.services.split("\n").map((item) => item.trim()).filter(Boolean),
    menu: editFormData.menu,
    keywords: editFormData.keywords.split(",").map((item) => item.trim()).filter(Boolean),
    openingHours: editBusinessHoursTouched ? editBusinessHours.map((hour) => `${hour.day}: ${hour.enabled ? `${hour.open}-${hour.close}` : "Fechado"}`) : [],
    attendanceType: editingBusiness?.attendanceType,
  };
  return (
    <>
      <Dialog
        open={creatingBusiness || !!editingBusiness}
        onOpenChange={(open) => {
          if (!open) closeBusinessEditor();
        }}
      >
        <DialogContent
          className="max-w-2xl h-[85vh] flex flex-col overflow-hidden"
          onPointerDownOutside={(event) => {
            const target = event.target as HTMLElement;
            if (target?.closest(".pac-container")) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            const target = event.target as HTMLElement;
            if (target?.closest(".pac-container")) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {creatingBusiness ? ui("Add a new business", "Adicionar novo negócio") : `${ui("Edit", "Editar")} ${editFormData.name || ui("business", "negócio")}`}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-5 py-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <ProfileCompletionCard data={editProfileCompletionData} compact />
              </div>
              <div className="sm:col-span-2 border-b border-border pb-2">
                <h3 className="text-base font-semibold">{ui("Basic information", "Dados principais")}</h3>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="edit-name">{ui("Business name *", "Nome do negócio *")}</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(event) => handleEditInputChange("name", event.target.value)}
                  placeholder="Ex: Brasil Tropical Bakery"
                  className="mt-1.5"
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="edit-short-slug">{ui("Business short link", "Link curto do negócio")}</Label>
                <div className="mt-1.5 flex items-center overflow-hidden rounded-md border border-input bg-background">
                  <span className="whitespace-nowrap border-r border-input bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
                    caramelinho.com/go/
                  </span>
                  <input
                    id="edit-short-slug"
                    value={editFormData.shortSlug}
                    onChange={(event) => handleEditInputChange("shortSlug", event.target.value)}
                    onBlur={(event) => handleEditInputChange("shortSlug", normalizeShortSlugFinal(event.target.value))}
                    placeholder="pizzaria-do-ze"
                    className="h-10 w-full bg-transparent px-3 text-sm outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ui("This is the simple link for sharing your business on social media, WhatsApp and business cards.", "Este é o link simples para compartilhar seu negócio em redes sociais, WhatsApp e cartões.")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ui("Example", "Exemplo")}: caramelinho.com/go/{editFormData.shortSlug || "pizzaria-do-ze"}
                </p>
                <p
                  className={`mt-1 text-xs ${
                    shortSlugStatus === "available"
                      ? "text-emerald-700"
                      : shortSlugStatus === "taken" || shortSlugStatus === "invalid"
                        ? "text-red-600"
                        : "text-muted-foreground"
                  }`}
                >
                  {shortSlugMessage}
                </p>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="edit-category">{ui("Category *", "Categoria *")}</Label>
                <Select value={editFormData.category} onValueChange={(value) => handleEditInputChange("category", value)}>
                  <SelectTrigger id="edit-category" className="mt-1.5 w-full">
                    <SelectValue placeholder={ui("Select", "Selecione")} />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                    {businessCategoryOptions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {isEnglish ? getHomeContent("en").categories.find((item) => item.id === category.id)?.name || category.label : category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editFormData.category ? (
                <div className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50/60 p-4">
                  <Label>{ui("Primary business type", "Tipo principal de negócio") + (creatingBusiness ? " *" : "")}</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{ui("Choose the activity that best represents your business. Other services can be added in the description and keywords.", "Define a atividade que melhor representa seu negócio. Os demais serviços podem ser informados na descrição e nas palavras-chave.")}</p>
                  <Select value={editFormData.primaryActivity} onValueChange={(value) => handleEditInputChange("primaryActivity", value)}>
                    <SelectTrigger className="mt-2 w-full bg-background"><SelectValue placeholder={creatingBusiness ? ui("Select the primary type", "Selecione o tipo principal") : ui("Select the primary type (optional)", "Selecione o tipo principal (opcional)" )} /></SelectTrigger>
                    <SelectContent>{getPrimaryActivityOptions(editFormData.category).map((activity) => (<SelectItem key={activity.id} value={activity.id}>{isEnglish ? getPrimaryActivityLabel(editFormData.category, activity.id, undefined, "en") || activity.label : activity.label}</SelectItem>))}</SelectContent>
                  </Select>
                  {editFormData.primaryActivity === OTHER_PRIMARY_ACTIVITY_ID ? (
                    <Input value={editFormData.primaryActivityCustom} onChange={(event) => handleEditInputChange("primaryActivityCustom", event.target.value.slice(0, 80))} placeholder={isEnglish ? "Ex: Specialized local service" : getPrimaryActivityCustomPlaceholder(editFormData.category)} className="mt-2 bg-background" maxLength={80} />
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">{creatingBusiness ? ui("Required for new businesses. If no option fits, choose Other type and describe the activity.", "Obrigatório para novos negócios. Se não encontrar uma opção adequada, escolha Outro tipo e descreva a atividade.") : ui("This helps create a more accurate page title for searches without replacing your category.", "Isso ajuda a construir um título de página mais fiel para buscas, sem substituir sua categoria.")}</p>
                </div>
              ) : null}

              <div className="sm:col-span-2">
                <Label htmlFor="edit-description">{ui("Description *", "Descrição *")}</Label>
                <div className="mt-1 rounded-md border border-amber-300/70 bg-amber-50/70 px-3 py-2">
                  <p className="text-sm leading-relaxed text-amber-900/90">
                    {ui("This is the most important information on your business page. Clearly explain what you offer, your differentiators, audience and service area.", "Esta é a informação mais importante da página do seu negócio. Explique com clareza o que você oferece, seus diferenciais, público atendido e região de atuação.")}
                  </p>
                </div>
                <RichTextEditor
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(value) => handleEditInputChange("description", value)}
                  placeholder={ui("Describe your business...", "Descreva seu negocio...")}
                  className="mt-1.5"
                />
              </div>

              {getCategoryId(editFormData.category) === "food" ? (
                <div className="sm:col-span-2 rounded-lg border border-emerald-300/70 bg-emerald-50/70 p-4">
                  <h3 className="text-base font-semibold text-emerald-900">{ui("Additional audiences served", "Públicos também atendidos")}</h3>
                  <p className="mt-1 text-sm text-emerald-900/80">
                    {ui("Select the badges your business supports. They appear on the card and business page and are also used in search.", "Marque os selos que seu negócio atende. Isso aparece no card, na página do negócio e também entra como critério de busca.")}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={!!editFormData.isVeganFriendly}
                        onChange={(event) =>
                          setEditFormData((prev) => ({ ...prev, isVeganFriendly: event.target.checked }))
                        }
                      />
                      {ui("Vegan", "Vegano")}
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={!!editFormData.isVegetarianFriendly}
                        onChange={(event) =>
                          setEditFormData((prev) => ({ ...prev, isVegetarianFriendly: event.target.checked }))
                        }
                      />
                      {ui("Vegetarian", "Vegetariano")}
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={!!editFormData.isGlutenFreeFriendly}
                        onChange={(event) =>
                          setEditFormData((prev) => ({ ...prev, isGlutenFreeFriendly: event.target.checked }))
                        }
                      />
                      {ui("Gluten-free", "Sem glúten")}
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="sm:col-span-2 border-b border-border pb-2 pt-1">
                <h3 className="text-base font-semibold">{ui("Offer and content", "Oferta e conteúdo")}</h3>
              </div>

              <div className="sm:col-span-2 rounded-lg border border-amber-300/70 bg-amber-50/70 p-4">
                <h3 className="text-base font-semibold text-amber-900">{ui("Search keywords", "Palavras-chave para busca")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
                  {ui("Use real terms your customers search for, including variations and synonyms. Separate them with commas and avoid overly generic terms.", "Use termos reais que seus clientes digitam, incluindo variações e sinônimos. Separe por vírgula e evite termos muito genéricos.")}
                </p>
                <Label htmlFor="edit-keywords" className="mt-3 block">
                  {ui("Keywords (comma-separated)", "Palavras-chave (separadas por vírgula)")}
                </Label>
                <Textarea
                  id="edit-keywords"
                  value={editFormData.keywords}
                  onChange={(event) => handleEditInputChange("keywords", event.target.value)}
                  placeholder="Ex: dentista, clareamento, odontologia, aparelhos"
                  className="mt-1.5 bg-white"
                  rows={3}
                />
              </div>

              <div className="sm:col-span-2 border-b border-border pb-2 pt-1">
                <h3 className="text-base font-semibold">{ui("Contact and social media", "Contato e redes")}</h3>
              </div>

              <div>
                <Label htmlFor="edit-phone">{ui("Phone (optional)", "Telefone (opcional)")}</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.phone}
                  onChange={(event) => handleEditInputChange("phone", event.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">{ui("Email (optional)", "Email (opcional)")}</Label>
                <Input
                  id="edit-email"
                  value={editFormData.email}
                  onChange={(event) => handleEditInputChange("email", event.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  value={editFormData.website}
                  onChange={(event) => handleEditInputChange("website", event.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit-instagram">Instagram</Label>
                <Input
                  id="edit-instagram"
                  value={editFormData.instagram}
                  onChange={(event) => handleEditInputChange("instagram", event.target.value)}
                  placeholder="@seuinstagram"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit-facebook">Facebook</Label>
                <Input
                  id="edit-facebook"
                  value={editFormData.facebook}
                  onChange={(event) => handleEditInputChange("facebook", event.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                <Input
                  id="edit-whatsapp"
                  value={editFormData.whatsapp}
                  onChange={(event) => handleEditInputChange("whatsapp", event.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="mt-1.5"
                />
              </div>

              <div className="sm:col-span-2 border-b border-border pb-2 pt-1">
                <h3 className="text-base font-semibold">{ui("Hours", "Horários")}</h3>
              </div>

              <div className="sm:col-span-2 rounded-lg border border-border bg-secondary/10 p-4">
                <Label>{ui("Opening hours", "Horários de funcionamento")}</Label>
                <div className="mt-3 space-y-2">
                  {editBusinessHours.map((hour) => (
                    <div key={hour.day} className="grid grid-cols-[120px_90px_1fr_1fr] items-center gap-2">
                      <span className="text-sm font-medium">{hour.day}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant={hour.enabled ? "default" : "outline"}
                        onClick={() => updateBusinessHour(hour.day, { enabled: !hour.enabled })}
                      >
                        {hour.enabled ? ui("Open", "Aberto") : ui("Closed", "Fechado")}
                      </Button>
                      <Input
                        type="time"
                        value={hour.open}
                        disabled={!hour.enabled}
                        onChange={(event) => updateBusinessHour(hour.day, { open: event.target.value })}
                      />
                      <Input
                        type="time"
                        value={hour.close}
                        disabled={!hour.enabled}
                        onChange={(event) => updateBusinessHour(hour.day, { close: event.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 border-b border-border pb-2 pt-1">
                <h3 className="text-base font-semibold">{ui("Media", "Mídia")}</h3>
              </div>

              <div>
                <Label htmlFor="edit-logo">{ui("Change logo", "Alterar logo")}</Label>
                <div className="mt-1.5">
                  <label
                    htmlFor="edit-logo"
                    className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    {ui("Choose image", "Escolher imagem")}
                  </label>
                </div>
                <Input id="edit-logo" type="file" accept="image/*" onChange={(event) => handleFileChange(event, "logo", true)} className="hidden" />
                {editingBusiness?.logoUrl ? (
                  <div className="mt-2">
                    <div className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
                      <img src={editingBusiness.logoUrl} alt={ui("Current logo", "Logo atual")} className="h-full w-full object-cover" />
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <Label htmlFor="edit-hero">{ui("Change cover image", "Alterar capa")}</Label>
                <div className="mt-1.5">
                  <label
                    htmlFor="edit-hero"
                    className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    {ui("Choose image", "Escolher imagem")}
                  </label>
                </div>
                <Input id="edit-hero" type="file" accept="image/*" onChange={(event) => handleFileChange(event, "hero", true)} className="hidden" />
                {editingBusiness?.heroImage ? (
                  <div className="mt-2">
                    <div className="relative h-20 w-32 overflow-hidden rounded-md border border-border">
                      <img src={editingBusiness.heroImage} alt={ui("Current cover image", "Capa atual")} className="h-full w-full object-cover" />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="sm:col-span-2 border-b border-border pb-2 pt-1">
                <h3 className="text-base font-semibold">{ui("Gallery", "Galeria")}</h3>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="edit-photos">{ui("Add new gallery photos", "Adicionar novas fotos na galeria")}</Label>
                <div className="mt-1.5">
                  <label
                    htmlFor="edit-photos"
                    className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    {ui("Choose files", "Escolher arquivos")}
                  </label>
                </div>
                <Input
                  id="edit-photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => handlePhotosChange(event, true)}
                  className="hidden"
                />
                <div className="mb-2 mt-1 text-xs text-muted-foreground">
                  {ui("Existing", "Existentes")}: {existingPhotos.length}/8 | {ui("New selected", "Novas selecionadas")}: {editPhotoFiles.length}
                </div>
                {existingPhotos.length > 0 || editPhotoFiles.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {existingPhotos.map((url, index) => (
                      <div key={`existing-${index}`} className="group relative h-20 w-20 overflow-hidden rounded-md border border-border">
                        <img src={url} alt={ui("Preview", "Prévia")} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingPhoto(index)}
                          className="absolute right-1 top-1 rounded-full bg-red-500/80 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {editPhotoFiles.map((file, index) => (
                      <div key={`new-${index}`} className="group relative h-20 w-20 overflow-hidden rounded-md border border-primary/50">
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{ui("NEW", "NOVA")}</span>
                        </div>
                        <img src={URL.createObjectURL(file)} alt={ui("Preview", "Prévia")} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewPhoto(index, true)}
                          className="absolute right-1 top-1 z-20 rounded-full bg-red-500/80 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="sm:col-span-2 border-b border-border pb-2 pt-1">
                <h3 className="text-base font-semibold">{ui("Location", "Localização")}</h3>
              </div>
              <div className="sm:col-span-2">
                <Label>{ui("Address", "Endereço")}</Label>
                <div className="mt-1.5">
                  <AddressAutocomplete
                    key={creatingBusiness ? "new-business-address" : editingBusiness?.id}
                    value={editFormData.street}
                    onChange={(value) => handleEditInputChange("street", value)}
                    onPlaceSelected={handleEditPlaceSelected}
                  />
                </div>
                {editFormData.street ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {editFormData.street}, {editFormData.city}, {editFormData.stateCode?.toUpperCase()}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-border bg-white px-1 pb-1 pt-3">
            <Button variant="outline" onClick={closeBusinessEditor} disabled={savingBusiness}>
              {ui("Cancel", "Cancelar")}
            </Button>
            <Button
              className="border-0 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleSaveBusiness}
              disabled={savingBusiness}
            >
              {savingBusiness ? ui("Uploading images...", "Enviando imagens...") : creatingBusiness ? ui("Create business", "Criar negócio") : ui("Save changes", "Salvar alterações")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!couponBusiness} onOpenChange={(open) => !open && setCouponBusiness(null)}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{ui("Promotions", "Promoções")} - {couponBusiness?.name || ui("business", "negócio")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-5 py-4">
              <div className="space-y-3">
                <Label>{ui("Saved promotions", "Cupons cadastrados")}</Label>
                {couponItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{ui("No promotions saved yet.", "Nenhuma promoção cadastrada ainda.")}</p>
                ) : (
                  <div className="space-y-2">
                    {couponItems.map((item, index) => (
                      <div
                        key={`${item.code}-${index}`}
                        className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                          <p className="mt-1 text-xs">
                            <span className="font-medium">{ui("Code:", "Cupom:")}</span> {item.code} ·{" "}
                            <span className="font-medium">{ui("Expires:", "Validade:")}</span>{" "}
                            {new Date(`${item.expiresAt}T00:00:00`).toLocaleDateString(isEnglish ? "en-US" : "pt-BR")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveCoupon(index)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          {ui("Delete", "Excluir")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="profile-coupon-title">{ui("Promotion title", "Título da promoção")}</Label>
                <Input
                  id="profile-coupon-title"
                  className="mt-1.5"
                  value={couponForm.title}
                  onChange={(event) => setCouponForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="profile-coupon-description">{ui("Promotion description", "Descrição da promoção")}</Label>
                <Textarea
                  id="profile-coupon-description"
                  className="mt-1.5 min-h-[120px]"
                  value={couponForm.description}
                  onChange={(event) => setCouponForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="profile-coupon-code">{ui("Promotion code", "Código promocional")}</Label>
                <Input
                  id="profile-coupon-code"
                  className="mt-1.5"
                  value={couponForm.code}
                  onChange={(event) => setCouponForm((prev) => ({ ...prev, code: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="profile-coupon-expiry">{ui("Promotion expiration date", "Data limite da promoção")}</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    id="profile-coupon-expiry"
                    type="text"
                    value={formatIsoToBr(couponForm.expiresAt)}
                    onChange={(event) => setCouponForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                    placeholder="dd-mm-yyyy"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const element = businessCouponDatePickerRef.current as
                        | (HTMLInputElement & { showPicker?: () => void })
                        | null;
                      if (!element) return;
                      if (typeof element.showPicker === "function") element.showPicker();
                      else element.click();
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <input
                    ref={businessCouponDatePickerRef}
                    type="date"
                    value={normalizeDateForInput(couponForm.expiresAt)}
                    onChange={(event) =>
                      setCouponForm((prev) => ({ ...prev, expiresAt: formatIsoToBr(event.target.value) }))
                    }
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div>
                <Button type="button" variant="outline" onClick={handleAddCoupon}>
                  <Plus className="mr-2 h-4 w-4" />
                  {ui("Add promotion", "Adicionar promoção")}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-border bg-white px-1 pb-1 pt-3">
            <Button variant="outline" onClick={() => setCouponBusiness(null)} disabled={savingCoupon}>
              {ui("Cancel", "Cancelar")}
            </Button>
            <Button className="border-0 bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleSaveCoupon} disabled={savingCoupon}>
              {savingCoupon ? ui("Saving...", "Salvando...") : ui("Save promotion", "Salvar promoção")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!menuBusiness} onOpenChange={(open) => !open && setMenuBusiness(null)}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{ui("Menu", "Cardápio")} - {menuBusiness?.name || ui("business", "negócio")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-5 py-4">
              <div className="space-y-4 rounded-lg border border-emerald-300/70 bg-emerald-50/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-emerald-900">{ui("Menu items", "Itens do cardápio")}</Label>
                    <p className="mt-1 text-sm text-emerald-900/80">
                      {ui("Add items with a name, description and price to make your business easier to find and choose.", "Adicione itens com nome, descrição e preço para facilitar a busca e conversão.")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() =>
                      setMenuItems((prev) => [
                        ...prev,
                        {
                          name: "",
                          description: "",
                          price: getCurrencyPrefixForCountry(menuBusiness?.address.countryCode || ""),
                        },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {ui("Add item", "Adicionar item")}
                  </Button>
                </div>
                <div className="space-y-3">
                  {menuItems.map((item, index) => (
                    <div key={index} className="group relative space-y-3 rounded-lg border border-border bg-white p-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => setMenuItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <Label className="text-xs">{ui("Item name", "Nome do item")}</Label>
                          <Input
                            value={item.name}
                            onChange={(event) =>
                              setMenuItems((prev) => {
                                const next = [...prev];
                                next[index].name = event.target.value;
                                return next;
                              })
                            }
                            className={`mt-1 h-8 text-sm ${menuNameErrors[index] ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{ui("Price (optional)", "Preço (opcional)")}</Label>
                          <Input
                            value={item.price}
                            onChange={(event) =>
                              setMenuItems((prev) => {
                                const next = [...prev];
                                next[index].price = event.target.value;
                                return next;
                              })
                            }
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">{ui("Description", "Descrição")}</Label>
                        <Input
                          value={item.description}
                          onChange={(event) =>
                            setMenuItems((prev) => {
                              const next = [...prev];
                              next[index].description = event.target.value;
                              return next;
                            })
                          }
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                  {menuItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-white py-6 text-center">
                      <p className="text-xs text-muted-foreground">{ui("No menu items yet. Add the first one.", "Nenhum item no cardápio. Adicione o primeiro.")}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="menu-modal-pdf">{ui("Full menu (PDF, optional)", "Cardápio completo (PDF, opcional)")}</Label>
                <div className="mt-1.5">
                  <label
                    htmlFor="menu-modal-pdf"
                    className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    {ui("Choose PDF file", "Escolher arquivo PDF")}
                  </label>
                </div>
                <Input
                  id="menu-modal-pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (!file) {
                      setMenuPdfFile(null);
                      return;
                    }
                    if (file.type !== "application/pdf") {
                      return;
                    }
                    setMenuPdfFile(file);
                  }}
                  className="hidden"
                />
                {menuPdfFile ? (
                  <p className="text-xs text-emerald-700">
                    {ui("Selected file:", "Arquivo selecionado:")} <strong>{menuPdfFile.name}</strong> ({(menuPdfFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                ) : null}
                {menuPdfUrl ? (
                  <div className="flex items-center gap-3">
                    <button type="button" className="text-xs text-primary underline" onClick={() => void handleOpenPdfPrivately(menuPdfUrl)}>
                      {ui("View current PDF", "Ver PDF atual")}
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-destructive/30 px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setMenuPdfUrl("");
                        setMenuPdfFile(null);
                      }}
                    >
                      {ui("Remove PDF", "Remover PDF")}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-border bg-white px-1 pb-1 pt-3">
            <Button variant="outline" onClick={() => setMenuBusiness(null)} disabled={savingMenu}>
              {ui("Cancel", "Cancelar")}
            </Button>
            <Button className="border-0 bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleSaveMenu} disabled={savingMenu}>
              {savingMenu ? ui("Saving...", "Salvando...") : ui("Save menu", "Salvar cardápio")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!serviceBusiness} onOpenChange={(open) => !open && setServiceBusiness(null)}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{ui("Services", "Serviços")} - {serviceBusiness?.name || ui("business", "negócio")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-5 py-4">
              <div className="space-y-4 rounded-lg border border-sky-300/70 bg-sky-50/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sky-900">{ui("Service items", "Itens de serviço")}</Label>
                    <p className="mt-1 text-sm text-sky-900/80">
                      {ui("Add the name, description and optional price for each service.", "Cadastre nome, descrição e preço opcional de cada serviço.")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-sky-300 text-sky-700 hover:bg-sky-50"
                    onClick={() =>
                      setServiceItems((prev) => [
                        ...prev,
                        {
                          name: "",
                          description: "",
                          price: getCurrencyPrefixForCountry(serviceBusiness?.address.countryCode || ""),
                        },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {ui("Add service", "Adicionar serviço")}
                  </Button>
                </div>
                <div className="space-y-3">
                  {serviceItems.map((item, index) => (
                    <div key={index} className="group relative space-y-3 rounded-lg border border-border bg-white p-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => setServiceItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <Label className="text-xs">{ui("Service name", "Nome do serviço")}</Label>
                          <Input
                            value={item.name}
                            onChange={(event) =>
                              setServiceItems((prev) => {
                                const next = [...prev];
                                next[index].name = event.target.value;
                                return next;
                              })
                            }
                            className={`mt-1 h-8 text-sm ${serviceNameErrors[index] ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{ui("Price (optional)", "Preço (opcional)")}</Label>
                          <Input
                            value={item.price}
                            onChange={(event) =>
                              setServiceItems((prev) => {
                                const next = [...prev];
                                next[index].price = event.target.value;
                                return next;
                              })
                            }
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">{ui("Description", "Descrição")}</Label>
                        <Input
                          value={item.description}
                          onChange={(event) =>
                            setServiceItems((prev) => {
                              const next = [...prev];
                              next[index].description = event.target.value;
                              return next;
                            })
                          }
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                  {serviceItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-white py-6 text-center">
                      <p className="text-xs text-muted-foreground">{ui("No services saved yet.", "Nenhum serviço cadastrado ainda.")}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-border bg-white px-1 pb-1 pt-3">
            <Button variant="outline" onClick={() => setServiceBusiness(null)} disabled={savingServices}>
              {ui("Cancel", "Cancelar")}
            </Button>
            <Button className="border-0 bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleSaveServices} disabled={savingServices}>
              {savingServices ? ui("Saving...", "Salvando...") : ui("Save services", "Salvar serviços")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!eventsBusiness} onOpenChange={(open) => !open && setEventsBusiness(null)}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{ui("Events", "Eventos")} - {eventsBusiness?.name || ui("business", "negócio")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-5 py-4">
              <div className="space-y-4 rounded-lg border border-violet-300/70 bg-violet-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-violet-900">{ui("Event calendar", "Agenda de eventos")}</h3>
                    <p className="mt-1 text-sm text-violet-900/80">
                      {ui("Share dates, location, flyer and price to attract more people.", "Divulgue datas, local, flyer e preço para atrair mais público.")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-violet-300 text-violet-700 hover:bg-violet-50"
                    onClick={handleAddEvent}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {ui("Add event", "Adicionar evento")}
                  </Button>
                </div>
                {eventItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-violet-300 bg-white/70 py-6 text-center">
                    <p className="text-sm text-muted-foreground">{ui("No events saved.", "Nenhum evento cadastrado.")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eventItems.map((event, index) => {
                      const businessAddress = [
                        eventsBusiness?.address.street,
                        eventsBusiness?.address.city,
                        eventsBusiness?.address.stateCode?.toUpperCase(),
                      ]
                        .filter(Boolean)
                        .join(", ");
                      const isAtBusiness = businessAddress.length > 0 && (event.location || "").trim() === businessAddress;
                      return (
                        <div key={index} className="relative space-y-3 rounded-lg border border-violet-200 bg-white p-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 h-7 w-7"
                            onClick={() => handleRemoveEvent(index)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <Label className="text-xs">{ui("Event title *", "Título do evento *")}</Label>
                              <Input
                                className="mt-1"
                                value={event.title}
                                onChange={(evt) =>
                                  setEventItems((prev) => {
                                    const next = [...prev];
                                    next[index] = { ...next[index], title: evt.target.value };
                                    return next;
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-xs">{ui("Date *", "Data *")}</Label>
                              <div className="mt-1 flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={formatIsoToBr(event.date)}
                                  onChange={(evt) =>
                                    setEventItems((prev) => {
                                      const next = [...prev];
                                      next[index] = { ...next[index], date: evt.target.value };
                                      return next;
                                    })
                                  }
                                  placeholder="dd-mm-yyyy"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const element = eventDatePickerRefs.current[index] as
                                      | (HTMLInputElement & { showPicker?: () => void })
                                      | undefined;
                                    if (!element) return;
                                    if (typeof element.showPicker === "function") element.showPicker();
                                    else element.click();
                                  }}
                                >
                                  <Calendar className="h-4 w-4" />
                                </Button>
                                <input
                                  ref={(element) => {
                                    eventDatePickerRefs.current[index] = element;
                                  }}
                                  type="date"
                                  value={normalizeDateForInput(event.date)}
                                  onChange={(evt) =>
                                    setEventItems((prev) => {
                                      const next = [...prev];
                                      next[index] = { ...next[index], date: formatIsoToBr(evt.target.value) };
                                      return next;
                                    })
                                  }
                                  className="sr-only"
                                  tabIndex={-1}
                                  aria-hidden="true"
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">{ui("Location *", "Local *")}</Label>
                            {businessAddress ? (
                              <div className="mb-1 mt-1">
                                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                  <input
                                    type="checkbox"
                                    checked={isAtBusiness}
                                    onChange={(evt) =>
                                      setEventItems((prev) => {
                                        const next = [...prev];
                                        next[index] = {
                                          ...next[index],
                                          location: evt.target.checked ? businessAddress : "",
                                        };
                                        return next;
                                      })
                                    }
                                  />
                                  {ui("At the business location", "No próprio estabelecimento")}
                                </label>
                              </div>
                            ) : null}
                            <Input
                              className="mt-2"
                              value={event.location}
                              onChange={(evt) =>
                                setEventItems((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], location: evt.target.value };
                                  return next;
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{ui("Description", "Descrição")}</Label>
                            <Textarea
                              className="mt-1"
                              rows={2}
                              value={event.description}
                              onChange={(evt) =>
                                setEventItems((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], description: evt.target.value };
                                  return next;
                                })
                              }
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs">{ui("Ticket type", "Entrada")}</Label>
                              <Select
                                value={event.isFree ? "free" : "paid"}
                                onValueChange={(value) =>
                                  setEventItems((prev) => {
                                    const next = [...prev];
                                    const isFree = value === "free";
                                    const currentPrice = (next[index].price || "").trim();
                                    const hasNumber = /\d/.test(currentPrice);
                                    next[index] = {
                                      ...next[index],
                                      isFree,
                                      price: isFree
                                        ? ""
                                        : hasNumber
                                          ? next[index].price
                                          : getCurrencyPrefixForCountry(eventsBusiness?.address.countryCode || ""),
                                    };
                                    return next;
                                  })
                                }
                              >
                                <SelectTrigger className="mt-1 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">{ui("Free entry", "Entrada franca")}</SelectItem>
                                  <SelectItem value="paid">{ui("Paid event", "Evento pago")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {!event.isFree ? (
                              <div>
                              <Label className="text-xs">{ui("Price", "Preço")}</Label>
                                <Input
                                  className="mt-1"
                                  value={event.price}
                                  onChange={(evt) =>
                                    setEventItems((prev) => {
                                      const next = [...prev];
                                      next[index] = { ...next[index], price: evt.target.value };
                                      return next;
                                    })
                                  }
                                  placeholder="Ex: CA$ 25"
                                />
                              </div>
                            ) : null}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">{ui("Event flyer", "Flyer do evento")}</Label>
                            <div className="mt-1">
                              <label
                                htmlFor={`events-flyer-${index}`}
                                className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-secondary"
                              >
                                {ui("Choose flyer image", "Escolher imagem do flyer")}
                              </label>
                            </div>
                            <Input
                              id={`events-flyer-${index}`}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(evt) => {
                                const file = evt.target.files?.[0];
                                if (!file) return;
                                if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
                                if (file.size > 5 * 1024 * 1024) return;
                                setEventFlyerFiles((prev) => ({ ...prev, [index]: file }));
                              }}
                            />
                            {event.flyerUrl || eventFlyerFiles[index] ? (
                              <img
                                src={eventFlyerFiles[index] ? URL.createObjectURL(eventFlyerFiles[index]) : event.flyerUrl || ""}
                                alt={ui("Flyer preview", "Preview do flyer")}
                                className="mt-2 h-24 w-24 rounded-md border border-border object-cover"
                              />
                            ) : null}
                          </div>
                          <div>
                            <Label className="text-xs">{ui("Ticket purchase link (optional)", "Link para compra de ingressos (opcional)")}</Label>
                            <Input
                              className="mt-1"
                              value={event.ticketUrl || ""}
                              onChange={(evt) =>
                                setEventItems((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], ticketUrl: evt.target.value };
                                  return next;
                                })
                              }
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-border bg-white px-1 pb-1 pt-3">
            <Button variant="outline" onClick={() => setEventsBusiness(null)} disabled={savingEvents}>
              {ui("Cancel", "Cancelar")}
            </Button>
            <Button className="border-0 bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleSaveEvents} disabled={savingEvents}>
              {savingEvents ? ui("Saving...", "Salvando...") : ui("Save events", "Salvar eventos")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!verificationBusiness} onOpenChange={(open) => !open && setVerificationBusiness(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{ui("Request business verification", "Solicitar verificação do negócio")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">{ui("Before sending your request", "Antes de enviar sua solicitação")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>{ui("Have at least 5 reviews and the business Instagram configured.", "Tenha pelo menos 5 avaliações e o Instagram do negócio cadastrado.")}</li>
                <li>{ui("Post about Caramelinho on Instagram and tag our profile.", "Publique sobre o Caramelinho no Instagram e marque nosso perfil.")}</li>
              </ul>
              <p className="mt-2 text-xs leading-relaxed">{ui("Our team reviews the criteria and submitted post before activating the badge.", "A equipe analisa os critérios e o post enviado antes de ativar o selo.")}</p>
            </div>
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
              <p className="font-semibold">{ui("Badge validity", "Validade do selo")}</p>
              <p className="mt-1 leading-relaxed">
                {ui("Once approved, the badge is valid for 12 months. After that, we ask for a new confirmation so the directory contains only active businesses with up-to-date service and contact information.", "Após aprovado, o selo é válido por 12 meses. Depois desse período, pedimos uma nova confirmação para manter no diretório apenas negócios ativos, com atendimento e informações de contato atualizados.")}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {ui("Business:", "Negócio:")} <strong>{verificationBusiness?.name}</strong>
              <br />
              {ui("Current reviews:", "Avaliações atuais:")} <strong>{verificationBusiness?.reviews.length || 0}</strong>
              <br />
              {ui("Instagram configured:", "Instagram cadastrado:")} <strong>{verificationBusiness?.instagram ? ui("Yes", "Sim") : ui("No", "Não")}</strong>
            </div>
            <div>
              <Label htmlFor="verification-instagram-post">{ui("Public Instagram post link tagging Caramelinho *", "Link do post público no Instagram marcando o Caramelinho *")}</Label>
              <Input
                id="verification-instagram-post"
                className="mt-1.5"
                value={instagramPostUrl}
                onChange={(event) => setInstagramPostUrl(event.target.value)}
                placeholder="https://www.instagram.com/p/..."
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {ui("Share the link to the post used to request verification.", "Envie o link da publicação usada para solicitar a verificação.")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerificationBusiness(null)} disabled={verificationSubmitting}>
              {ui("Cancel", "Cancelar")}
            </Button>
            <Button onClick={handleSubmitVerificationRequest} disabled={verificationSubmitting}>
              {verificationSubmitting ? ui("Sending...", "Enviando...") : ui("Submit for review", "Enviar para análise")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {ui("WARNING", "ATENÇÃO")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              {ui("You are about to", "Você está prestes a")} <strong>{ui("PERMANENTLY DELETE", "APAGAR DEFINITIVAMENTE")}</strong> {ui("the business", "o negócio")} <strong>"{deleteTarget?.name}"</strong>.
            </p>
            <p className="font-semibold text-red-600">
              {ui("This action cannot be undone and all related data will be lost.", "Esta ação é irreversível e todos os dados relacionados serão perdidos.")}
            </p>
            <p>{ui("Do you want to continue?", "Deseja continuar mesmo assim?")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {ui("Cancel", "Cancelar")}
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleConfirmDeleteMyBusiness}>
              {ui("Yes, delete business", "Sim, apagar negócio")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
