import { useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Building2, CalendarDays, Edit3, MapPin, RefreshCw, Search, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import Pagination from "@/components/Pagination";
import type { BulkBusinessOwnershipTransferResult } from "@/services/ownership";
import type {
  AdminUserProfileUpdates,
  AdminUserRecord,
} from "@/pages/user-profile/hooks/useAdminUsers";

type AdminUsersTabProps = {
  users: AdminUserRecord[];
  search: string;
  page: number;
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  adminUserId?: string;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onSaveUser: (userId: string, updates: AdminUserProfileUpdates) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onTransferBusinessOwnership: (businessId: string) => Promise<void>;
  onTransferBusinessOwnershipBulk: (
    sourceOwnerId: string,
    businessIds: string[],
  ) => Promise<BulkBusinessOwnershipTransferResult>;
};

function formatDate(value: string) {
  if (!value) return "Não informado";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Não informado" : date.toLocaleString("pt-BR");
}

function formatLocation(user: AdminUserRecord) {
  const businessLocation = user.businesses.find((business) => business.city || business.country);
  if (user.location) return user.location;
  if (!businessLocation) return "Localização não informada";
  return [businessLocation.city, businessLocation.state, businessLocation.country].filter(Boolean).join(", ");
}

export default function AdminUsersTab({
  users,
  search,
  page,
  total,
  totalPages,
  loading,
  error,
  adminUserId,
  onSearchChange,
  onPageChange,
  onRefresh,
  onSaveUser,
  onDeleteUser,
  onTransferBusinessOwnership,
  onTransferBusinessOwnershipBulk,
}: AdminUsersTabProps) {
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [editForm, setEditForm] = useState<AdminUserProfileUpdates>({});
  const [saving, setSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [transferringBusinessId, setTransferringBusinessId] = useState<string | null>(null);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<Set<string>>(() => new Set());
  const [transferringBulk, setTransferringBulk] = useState(false);


  const handleTransferBusiness = async (businessId: string, businessName: string) => {
    if (!selectedUser || selectedUser.id === adminUserId) return;

    const confirmed = window.confirm(
      "Transferir " + businessName + " para a sua conta? O usuário atual perderá o acesso de proprietário. As conversas antigas serão encerradas e o histórico não será compartilhado com o novo responsável.",
    );
    if (!confirmed) return;

    setTransferringBusinessId(businessId);
    try {
      await onTransferBusinessOwnership(businessId);
      setSelectedUser((current) =>
        current
          ? { ...current, businesses: current.businesses.filter((business) => business.id !== businessId) }
          : current,
      );
      setSelectedBusinessIds((current) => {
        const next = new Set(current);
        next.delete(businessId);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível transferir o negócio.");
    } finally {
      setTransferringBusinessId(null);
    }
  };

  const handleBulkTransfer = async () => {
    if (!selectedUser || selectedUser.id === adminUserId || transferringBulk) return;
    const businessIds = selectedUser.businesses
      .filter((business) => selectedBusinessIds.has(business.id))
      .map((business) => business.id);
    if (businessIds.length === 0) return;

    const confirmed = window.confirm(
      `Transferir ${businessIds.length} negócios de ${selectedUser.name || selectedUser.email} para sua conta? O usuário atual perderá o acesso de proprietário. Os chats antigos serão encerrados e seus históricos não serão compartilhados. Se houver uma interrupção, os negócios confirmados serão removidos da seleção e os restantes poderão ser tentados novamente.`,
    );
    if (!confirmed) return;

    setTransferringBulk(true);
    try {
      const result = await onTransferBusinessOwnershipBulk(selectedUser.id, businessIds);
      const transferredIds = new Set(result.transferredBusinessIds);
      const conflictingIds = new Set(result.conflictingBusinessIds || []);
      const removedIds = new Set([...transferredIds, ...conflictingIds]);
      if (removedIds.size > 0) {
        setSelectedUser((current) => current
          ? { ...current, businesses: current.businesses.filter((business) => !removedIds.has(business.id)) }
          : current);
        setSelectedBusinessIds((current) => new Set(
          [...current].filter((businessId) => !removedIds.has(businessId)),
        ));
      }

      if (result.ok) {
        toast.success(`${transferredIds.size} negócios transferidos para sua conta.`);
      } else if (transferredIds.size > 0) {
        toast.error(result.error || `Transferência parcial: ${transferredIds.size} negócios confirmados; os demais continuam selecionados.`);
      } else {
        toast.error(result.error || "Nenhum negócio foi transferido.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível transferir os negócios selecionados.");
    } finally {
      setTransferringBulk(false);
    }
  };

  const startEditing = (user: AdminUserRecord) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      bio: user.bio,
      phone: user.phone,
      location: user.location,
      role: user.role,
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    if (!String(editForm.name || "").trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSaveUser(editingUser.id, editForm);
      setEditingUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o usuário.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: AdminUserRecord) => {
    const confirmed = window.confirm(
      "Excluir " + (user.name || user.email) + "? Esta ação removerá a conta e os dados vinculados a ela.",
    );
    if (!confirmed) return;

    setDeletingUserId(user.id);
    try {
      await onDeleteUser(user.id);
      if (selectedUser?.id === user.id) setSelectedUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o usuário.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const openUserDetails = (user: AdminUserRecord) => {
    setSelectedBusinessIds(new Set());
    setSelectedUser(user);
  };

  return (
    <>
      <TabsContent value="usuarios" className="mt-0">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Usuários</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {total} usuário{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={"mr-2 h-4 w-4" + (loading ? " animate-spin" : "")} />
              Atualizar
            </Button>
          </div>

          <Card className="border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar por nome, e-mail, telefone, localização, país ou negócio"
                className="pl-9"
              />
            </div>
          </Card>

          {error ? (
            <Card className="border-destructive/30 p-6 text-center">
              <p className="font-medium text-destructive">Não foi possível carregar os usuários.</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <Button type="button" variant="outline" className="mt-4" onClick={onRefresh}>Tentar novamente</Button>
            </Card>
          ) : loading ? (
            <Card className="border-border p-10 text-center text-muted-foreground">Carregando usuários...</Card>
          ) : users.length === 0 ? (
            <Card className="border-border p-10 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.id} className="border-border p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Users className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-foreground">{user.name || "Sem nome"}</h3>
                          <Badge variant={user.role === "admin" ? "default" : user.role === "editor" ? "outline" : "secondary"}>
                            {user.role === "admin" ? "Administrador" : user.role === "editor" ? "Editor" : "Usuário"}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{user.email || "E-mail não informado"}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {formatLocation(user)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center text-xs text-muted-foreground lg:w-[200px]">
                      <div className="rounded-lg bg-secondary/60 p-2">
                        <Building2 className="mx-auto mb-1 h-4 w-4 text-primary" />
                        <strong className="block text-base text-foreground">{user.businesses.length}</strong>
                        negócios
                      </div>
                      <div className="rounded-lg bg-secondary/60 p-2">
                        <CalendarDays className="mx-auto mb-1 h-4 w-4 text-primary" />
                        <strong className="block text-base text-foreground">{user.events.length}</strong>
                        eventos
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button type="button" size="sm" variant="outline" onClick={() => openUserDetails(user)}>
                        Ver detalhes
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => startEditing(user)}>
                        <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => void handleDelete(user)}
                        disabled={deletingUserId === user.id}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        {deletingUserId === user.id ? "Excluindo..." : "Excluir"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {totalPages > 1 ? (
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
              ) : null}
            </div>
          )}
        </div>
      </TabsContent>

      <Dialog
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null);
            setSelectedBusinessIds(new Set());
          }
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          {selectedUser ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedUser.name || "Usuário sem nome"}</DialogTitle>
                <DialogDescription>{selectedUser.email || "E-mail não informado"}</DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <section className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
                  <div><span className="text-xs text-muted-foreground">Telefone</span><p>{selectedUser.phone || "Não informado"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Localização</span><p>{selectedUser.location || "Não informada"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Cadastro</span><p>{formatDate(selectedUser.createdAt)}</p></div>
                  <div><span className="text-xs text-muted-foreground">Último acesso</span><p>{formatDate(selectedUser.auth.lastSignInAt)}</p></div>
                  <div className="sm:col-span-2"><span className="text-xs text-muted-foreground">Bio</span><p className="whitespace-pre-wrap">{selectedUser.bio || "Não informada"}</p></div>
                </section>

                <section>
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold">Negócios ({selectedUser.businesses.length})</h3>
                    {selectedUser.businesses.length > 0 && selectedUser.id !== adminUserId ? (
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selectedUser.businesses.every((business) => selectedBusinessIds.has(business.id))}
                          disabled={transferringBulk || Boolean(transferringBusinessId)}
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setSelectedBusinessIds((current) => {
                              const next = new Set(current);
                              for (const business of selectedUser.businesses) {
                                if (checked) next.add(business.id);
                                else next.delete(business.id);
                              }
                              return next;
                            });
                          }}
                          aria-label="Selecionar todos os negócios deste usuário"
                        />
                        Selecionar todos
                      </label>
                    ) : null}
                  </div>

                  {selectedBusinessIds.size > 0 && selectedUser.id !== adminUserId ? (
                    <div className="mb-3 flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {selectedBusinessIds.size} negócio{selectedBusinessIds.size === 1 ? "" : "s"} selecionado{selectedBusinessIds.size === 1 ? "" : "s"}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleBulkTransfer()}
                        disabled={transferringBulk || Boolean(transferringBusinessId)}
                      >
                        <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                        {transferringBulk
                          ? `Transferindo ${selectedBusinessIds.size} negócios...`
                          : "Transferir selecionados para mim"}
                      </Button>
                    </div>
                  ) : null}

                  {selectedUser.businesses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum negócio vinculado.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedUser.businesses.map((business) => (
                        <div key={business.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                          {selectedUser.id !== adminUserId ? (
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 shrink-0 accent-primary"
                              checked={selectedBusinessIds.has(business.id)}
                              disabled={transferringBulk || Boolean(transferringBusinessId)}
                              onChange={(event) => {
                                const checked = event.currentTarget.checked;
                                setSelectedBusinessIds((current) => {
                                  const next = new Set(current);
                                  if (checked) next.add(business.id);
                                  else next.delete(business.id);
                                  return next;
                                });
                              }}
                              aria-label={`Selecionar ${business.name} para transferência`}
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{business.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {[business.city, business.state, business.country].filter(Boolean).join(", ") || "Localização não informada"}
                            </p>
                            {business.moderation_status ? <Badge variant="secondary" className="mt-2">{business.moderation_status}</Badge> : null}
                            <div className="mt-3 flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void handleTransferBusiness(business.id, business.name)}
                                disabled={selectedUser.id === adminUserId || transferringBulk || Boolean(transferringBusinessId)}
                                title={selectedUser.id === adminUserId ? "Este negócio já pertence a você." : "Transferir este negócio para você"}
                              >
                                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                                {transferringBusinessId === business.id
                                  ? "Transferindo..."
                                  : selectedUser.id === adminUserId
                                    ? "Já é meu"
                                    : "Transferir para mim"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="mb-2 font-semibold">Eventos ({selectedUser.events.length})</h3>
                  {selectedUser.events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum evento vinculado.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedUser.events.map((event) => (
                        <div key={event.id} className="rounded-lg border border-border p-3">
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">{event.date} · {event.location}</p>
                          <Badge variant="secondary" className="mt-2">{event.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>{editingUser?.email || ""}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-user-name">Nome</Label>
              <Input
                id="admin-user-name"
                className="mt-1.5"
                value={editForm.name || ""}
                onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="admin-user-phone">Telefone</Label>
              <Input
                id="admin-user-phone"
                className="mt-1.5"
                value={editForm.phone || ""}
                onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="admin-user-location">Localização</Label>
              <Input
                id="admin-user-location"
                className="mt-1.5"
                value={editForm.location || ""}
                onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="admin-user-bio">Bio</Label>
              <Textarea
                id="admin-user-bio"
                className="mt-1.5 min-h-24"
                value={editForm.bio || ""}
                onChange={(event) => setEditForm((current) => ({ ...current, bio: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="admin-user-role">Função</Label>
              <select
                id="admin-user-role"
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editForm.role || "user"}
                onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value as AdminUserProfileUpdates["role"] }))}
                disabled={saving || editingUser?.id === adminUserId}
              >
                <option value="user">Usuário</option>
                <option value="editor">Editor</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {editingUser?.id === adminUserId
                  ? "A conta administradora não pode ser rebaixada."
                  : "Editores podem cadastrar e gerenciar vários negócios, mas não acessam funções administrativas."}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingUser(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving || !String(editForm.name || "").trim()}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
