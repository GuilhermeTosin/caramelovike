import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import { Calendar, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { getCurrencyPrefixForCountry } from "@/lib/currency";
import { getCountryName, getStateDisplayName } from "@/services/businesses";
import { formatIsoToBr, normalizeDateForInput } from "@/pages/user-profile/utils";
import type { CommunityEvent, BusinessFrontend } from "@/types/database";
import type { CommunityEventForm } from "@/pages/user-profile/types";
import { useSiteLocale } from "@/contexts/LocaleContext";
import { getCountryDisplayName } from "@/lib/locales";

type EventsTabProps = {
  editingCommunityEventId: string | null;
  communityEventForm: CommunityEventForm;
  communityEventFlyerFile: File | null;
  savingCommunityEvent: boolean;
  myCommunityEvents: CommunityEvent[];
  myBusinesses: BusinessFrontend[];
  communityEventDatePickerRef: RefObject<HTMLInputElement>;
  onSubmit: (e: FormEvent) => void;
  setCommunityEventForm: Dispatch<SetStateAction<CommunityEventForm>>;
  setCommunityEventFlyerFile: Dispatch<SetStateAction<File | null>>;
  onCancelEdit: () => void;
  onStartEditCommunityEvent: (event: CommunityEvent) => void;
  onDeleteCommunityEvent: (event: CommunityEvent) => void;
};

export default function EventsTab({
  editingCommunityEventId,
  communityEventForm,
  communityEventFlyerFile,
  savingCommunityEvent,
  myCommunityEvents,
  myBusinesses,
  communityEventDatePickerRef,
  onSubmit,
  setCommunityEventForm,
  setCommunityEventFlyerFile,
  onCancelEdit,
  onStartEditCommunityEvent,
  onDeleteCommunityEvent,
}: EventsTabProps) {
  const { locale } = useSiteLocale();
  const isEnglish = locale === "en";
  const text = isEnglish
    ? {
        title: "My events",
        edit: "Edit event",
        create: "Create a new event",
        eventTitle: "Event title *",
        titlePlaceholder: "Ex: Brazilian Samba Night",
        description: "Description",
        descriptionPlaceholder: "Event details, attractions and important information.",
        date: "Date *",
        location: "Location *",
        linkedBusiness: "Link to a business (optional)",
        selectBusiness: "Select a business",
        noBusiness: "No linked business",
        ticketType: "Ticket type",
        free: "Free entry",
        paid: "Paid event",
        price: "Price",
        ticketUrl: "Ticket link (optional)",
        flyer: "Event flyer (optional)",
        chooseImage: "Choose image",
        selectedFile: "Selected file:",
        flyerPreview: "Flyer preview",
        removeSelected: "Remove selected file",
        removeCurrent: "Remove current flyer",
        saving: "Saving...",
        publishing: "Publishing...",
        saveChanges: "Save changes",
        publish: "Publish event",
        cancelEdit: "Cancel editing",
        published: "Published events",
        empty: "You have not published any events yet.",
        linked: "Linked business:",
        notFound: "business not found",
        notLinked: "Not linked",
        editAction: "Edit",
        delete: "Delete",
      }
    : {
        title: "Meus Eventos",
        edit: "Editar evento",
        create: "Criar novo evento",
        eventTitle: "Título do evento *",
        titlePlaceholder: "Ex: Noite de Samba Brasileira",
        description: "Descrição",
        descriptionPlaceholder: "Detalhes do evento, atrações e informações importantes.",
        date: "Data *",
        location: "Local *",
        linkedBusiness: "Vincular a negócio (opcional)",
        selectBusiness: "Selecionar negócio",
        noBusiness: "Sem negócio vinculado",
        ticketType: "Tipo de entrada",
        free: "Entrada franca",
        paid: "Evento pago",
        price: "Preço",
        ticketUrl: "Link de ingressos (opcional)",
        flyer: "Flyer do evento (opcional)",
        chooseImage: "Escolher imagem",
        selectedFile: "Arquivo selecionado:",
        flyerPreview: "Preview do flyer",
        removeSelected: "Remover arquivo selecionado",
        removeCurrent: "Remover flyer atual",
        saving: "Salvando...",
        publishing: "Publicando...",
        saveChanges: "Salvar alterações",
        publish: "Publicar evento",
        cancelEdit: "Cancelar edição",
        published: "Eventos publicados",
        empty: "Você ainda não publicou eventos.",
        linked: "Negócio vinculado:",
        notFound: "negócio não encontrado",
        notLinked: "Não vinculado",
        editAction: "Editar",
        delete: "Excluir",
      };
  return (
    <TabsContent value="eventos" className="mt-0">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">{text.title}</h2>
        </div>

        <Card className="p-5 border-border">
          <h3 className="font-semibold mb-4">
            {editingCommunityEventId ? text.edit : text.create}
          </h3>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>{text.eventTitle}</Label>
              <Input
                className="mt-1.5"
                value={communityEventForm.title}
                onChange={(e) => setCommunityEventForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={text.titlePlaceholder}
              />
            </div>
            <div className="md:col-span-2">
              <Label>{text.description}</Label>
              <Textarea
                className="mt-1.5 min-h-[90px]"
                value={communityEventForm.description}
                onChange={(e) => setCommunityEventForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={text.descriptionPlaceholder}
              />
            </div>
            <div>
              <Label>{text.date}</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  value={communityEventForm.date}
                  onChange={(e) => setCommunityEventForm((prev) => ({ ...prev, date: e.target.value }))}
                  placeholder="dd-mm-yyyy"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const element = communityEventDatePickerRef.current as HTMLInputElement & { showPicker?: () => void };
                    if (!element) return;
                    if (typeof element.showPicker === "function") element.showPicker();
                    else element.click();
                  }}
                >
                  <Calendar className="w-4 h-4" />
                </Button>
                <input
                  ref={communityEventDatePickerRef}
                  type="date"
                  value={normalizeDateForInput(communityEventForm.date)}
                  onChange={(e) => setCommunityEventForm((prev) => ({ ...prev, date: formatIsoToBr(e.target.value) }))}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
            </div>
            <div>
              <Label>{text.location}</Label>
              <div className="mt-1.5">
                <AddressAutocomplete
                  value={communityEventForm.location}
                  onChange={(value) => setCommunityEventForm((prev) => ({ ...prev, location: value }))}
                  onPlaceSelected={(place) =>
                    setCommunityEventForm((prev) => ({
                      ...prev,
                      location: place.formattedAddress || prev.location,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>{text.linkedBusiness}</Label>
              <Select
                value={communityEventForm.businessId}
                onValueChange={(value) => {
                  const selectedBusiness = myBusinesses.find((business) => business.id === value);
                  const autoLocation =
                    value !== "none" && selectedBusiness
                      ? [
                          selectedBusiness.address.street,
                          selectedBusiness.address.city,
                          selectedBusiness.address.stateCode || selectedBusiness.address.state
                            ? getStateDisplayName(selectedBusiness.address.countryCode || selectedBusiness.address.country, selectedBusiness.address.stateCode || selectedBusiness.address.state, selectedBusiness.address.state)
                            : "",
                          isEnglish
                            ? getCountryDisplayName(selectedBusiness.address.countryCode || selectedBusiness.address.country, selectedBusiness.address.country, "en")
                            : getCountryName(selectedBusiness.address.countryCode || selectedBusiness.address.country),
                        ]
                          .filter(Boolean)
                          .join(", ")
                      : "";
                  const currencyPrefix =
                    value !== "none" && selectedBusiness
                      ? getCurrencyPrefixForCountry(selectedBusiness.address.countryCode || "")
                      : "";

                  setCommunityEventForm((prev) => ({
                    ...prev,
                    businessId: value,
                    location: value === "none" ? "" : autoLocation || prev.location,
                    price: value === "none" ? prev.price : (!prev.isFree && !prev.price.trim() ? currencyPrefix : prev.price),
                  }));
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={text.selectBusiness} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{text.noBusiness}</SelectItem>
                  {myBusinesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{text.ticketType}</Label>
              <Select
                value={communityEventForm.isFree ? "free" : "paid"}
                onValueChange={(value) =>
                  setCommunityEventForm((prev) => {
                    const nextIsFree = value === "free";
                    if (nextIsFree) {
                      return { ...prev, isFree: true, price: "" };
                    }
                    const selectedBusiness = myBusinesses.find((business) => business.id === prev.businessId);
                    const currencyPrefix = selectedBusiness
                      ? getCurrencyPrefixForCountry(selectedBusiness.address.countryCode || "")
                      : "";
                    return {
                      ...prev,
                      isFree: false,
                      price: prev.price.trim() ? prev.price : currencyPrefix,
                    };
                  })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">{text.free}</SelectItem>
                  <SelectItem value="paid">{text.paid}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!communityEventForm.isFree && (
              <div>
                <Label>{text.price}</Label>
                <Input
                  className="mt-1.5"
                  value={communityEventForm.price}
                  onChange={(e) => setCommunityEventForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="Ex: CAD$ 25"
                />
              </div>
            )}
            <div className="md:col-span-2">
              <Label>{text.ticketUrl}</Label>
              <Input
                className="mt-1.5"
                value={communityEventForm.ticketUrl}
                onChange={(e) => setCommunityEventForm((prev) => ({ ...prev, ticketUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="community-event-flyer">{text.flyer}</Label>
              <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                <label
                  htmlFor="community-event-flyer"
                  className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium cursor-pointer hover:bg-secondary"
                >
                  {text.chooseImage}
                </label>
                {communityEventFlyerFile ? (
                  <span className="text-xs text-emerald-700">
                    {text.selectedFile} <strong>{communityEventFlyerFile.name}</strong>
                  </span>
                ) : null}
              </div>
              <Input
                id="community-event-flyer"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setCommunityEventFlyerFile(e.target.files?.[0] || null)}
              />
              {(communityEventFlyerFile || communityEventForm.flyerUrl) && (
                <div className="mt-2 flex items-start gap-3">
                  <img
                    src={communityEventFlyerFile ? URL.createObjectURL(communityEventFlyerFile) : communityEventForm.flyerUrl}
                    alt={text.flyerPreview}
                    className="h-24 w-24 rounded-md object-cover border border-border"
                  />
                  <div className="flex flex-col gap-2">
                    {communityEventFlyerFile ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => setCommunityEventFlyerFile(null)}
                      >
                        {text.removeSelected}
                      </Button>
                    ) : null}
                    {communityEventForm.flyerUrl ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => setCommunityEventForm((prev) => ({ ...prev, flyerUrl: "" }))}
                      >
                        {text.removeCurrent}
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white border-0" disabled={savingCommunityEvent}>
                  {savingCommunityEvent
                    ? (editingCommunityEventId ? text.saving : text.publishing)
                    : (editingCommunityEventId ? text.saveChanges : text.publish)}
                </Button>
                {editingCommunityEventId && (
                  <Button type="button" variant="outline" onClick={onCancelEdit}>
                    {text.cancelEdit}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>

        <Card className="border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">{text.published}</h3>
          </div>
          {myCommunityEvents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">{text.empty}</div>
          ) : (
            <div className="divide-y divide-border">
              {myCommunityEvents.map((event) => (
                <div key={event.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{event.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(`${event.date}T00:00:00`).toLocaleDateString(isEnglish ? "en-US" : "pt-BR")} · {event.location}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {text.linked}{" "}
                      <strong>
                        {event.business_id
                          ? (myBusinesses.find((business) => business.id === event.business_id)?.name || text.notFound)
                          : text.notLinked}
                      </strong>
                    </p>
                    {event.description ? <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{event.description}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => onStartEditCommunityEvent(event)}>
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      {text.editAction}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => onDeleteCommunityEvent(event)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      {text.delete}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </TabsContent>
  );
}
