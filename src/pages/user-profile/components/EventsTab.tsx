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
import { formatIsoToBr, normalizeDateForInput } from "@/pages/user-profile/utils";
import type { CommunityEvent, BusinessFrontend } from "@/types/database";
import type { CommunityEventForm } from "@/pages/user-profile/types";

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
  return (
    <TabsContent value="eventos" className="mt-0">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Meus Eventos</h2>
        </div>

        <Card className="p-5 border-border">
          <h3 className="font-semibold mb-4">
            {editingCommunityEventId ? "Editar evento" : "Criar novo evento"}
          </h3>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Título do evento *</Label>
              <Input
                className="mt-1.5"
                value={communityEventForm.title}
                onChange={(e) => setCommunityEventForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Noite de Samba Brasileira"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                className="mt-1.5 min-h-[90px]"
                value={communityEventForm.description}
                onChange={(e) => setCommunityEventForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Detalhes do evento, atrações e informações importantes."
              />
            </div>
            <div>
              <Label>Data *</Label>
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
              <Label>Local *</Label>
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
              <Label>Vincular a negócio (opcional)</Label>
              <Select
                value={communityEventForm.businessId}
                onValueChange={(value) => {
                  const selectedBusiness = myBusinesses.find((business) => business.id === value);
                  const autoLocation =
                    value !== "none" && selectedBusiness
                      ? [
                          selectedBusiness.address.street,
                          selectedBusiness.address.city,
                          selectedBusiness.address.state,
                          selectedBusiness.address.country,
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
                  <SelectValue placeholder="Selecionar negócio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem negócio vinculado</SelectItem>
                  {myBusinesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de entrada</Label>
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
                  <SelectItem value="free">Entrada franca</SelectItem>
                  <SelectItem value="paid">Evento pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!communityEventForm.isFree && (
              <div>
                <Label>Preço</Label>
                <Input
                  className="mt-1.5"
                  value={communityEventForm.price}
                  onChange={(e) => setCommunityEventForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="Ex: CAD$ 25"
                />
              </div>
            )}
            <div className="md:col-span-2">
              <Label>Link de ingressos (opcional)</Label>
              <Input
                className="mt-1.5"
                value={communityEventForm.ticketUrl}
                onChange={(e) => setCommunityEventForm((prev) => ({ ...prev, ticketUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="community-event-flyer">Flyer do evento (opcional)</Label>
              <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                <label
                  htmlFor="community-event-flyer"
                  className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium cursor-pointer hover:bg-secondary"
                >
                  Escolher imagem
                </label>
                {communityEventFlyerFile ? (
                  <span className="text-xs text-emerald-700">
                    Arquivo selecionado: <strong>{communityEventFlyerFile.name}</strong>
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
                    alt="Preview do flyer"
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
                        Remover arquivo selecionado
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
                        Remover flyer atual
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
                    ? (editingCommunityEventId ? "Salvando..." : "Publicando...")
                    : (editingCommunityEventId ? "Salvar alterações" : "Publicar evento")}
                </Button>
                {editingCommunityEventId && (
                  <Button type="button" variant="outline" onClick={onCancelEdit}>
                    Cancelar edição
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>

        <Card className="border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">Eventos publicados</h3>
          </div>
          {myCommunityEvents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Você ainda não publicou eventos.</div>
          ) : (
            <div className="divide-y divide-border">
              {myCommunityEvents.map((event) => (
                <div key={event.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{event.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(`${event.date}T00:00:00`).toLocaleDateString("pt-BR")} · {event.location}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Negócio vinculado:{" "}
                      <strong>
                        {event.business_id
                          ? (myBusinesses.find((business) => business.id === event.business_id)?.name || "negócio não encontrado")
                          : "Não vinculado"}
                      </strong>
                    </p>
                    {event.description ? <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{event.description}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => onStartEditCommunityEvent(event)}>
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => onDeleteCommunityEvent(event)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Excluir
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
