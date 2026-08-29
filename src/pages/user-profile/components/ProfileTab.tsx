import { Clock, Edit3, Lock, Mail, MapPin, Phone, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { UserProfileUser } from "@/pages/user-profile/types";
import { useSiteLocale } from "@/contexts/LocaleContext";

type ProfileTabProps = {
  user: UserProfileUser;
  isEditing: boolean;
  isUploading: boolean;
  editName: string;
  editBio: string;
  editPhone: string;
  editLocation: string;
  avatarFile: File | null;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isChangingPassword: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onAvatarFileChange: (file: File | null) => void;
  onEditNameChange: (value: string) => void;
  onEditBioChange: (value: string) => void;
  onEditPhoneChange: (value: string) => void;
  onEditLocationChange: (value: string) => void;
  onSaveProfile: () => void;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onChangePassword: () => void;
};

export default function ProfileTab({
  user,
  isEditing,
  isUploading,
  editName,
  editBio,
  editPhone,
  editLocation,
  avatarFile,
  currentPassword,
  newPassword,
  confirmPassword,
  isChangingPassword,
  onStartEdit,
  onCancelEdit,
  onAvatarFileChange,
  onEditNameChange,
  onEditBioChange,
  onEditPhoneChange,
  onEditLocationChange,
  onSaveProfile,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onChangePassword,
}: ProfileTabProps) {
  const { locale } = useSiteLocale();
  const isEnglish = locale === "en";
  const text = isEnglish ? {
    edit: "Edit", preview: "Preview", profilePhoto: "Profile photo", chooseImage: "Choose image", formats: "Accepted formats: JPG, PNG and WEBP. Recommended size: 512x512 px. Maximum size: 5MB.", name: "Name", bio: "Bio", phone: "Phone", location: "Location", cancel: "Cancel", saving: "Saving...", saveChanges: "Save changes", memberSince: "Member since", security: "Account security", securityHint: "Update your password whenever you need.", currentPassword: "Current password", currentPlaceholder: "Enter your current password", newPassword: "New password", newPlaceholder: "Create a new password", confirmPassword: "Confirm new password", confirmPlaceholder: "Repeat your new password", updating: "Updating...", changePassword: "Change password",
  } : null;
  return (
    <TabsContent value="perfil" className="mt-0">
      <Card className="p-6 border-border max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{user.name}</h1>
              <p className="text-sm text-muted-foreground break-all sm:break-normal">{user.email}</p>
            </div>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={onStartEdit} className="self-start sm:self-auto">
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              {isEnglish ? text!.edit : "Editar"}
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-secondary/20 rounded-xl border border-border/50">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                {avatarFile ? (
                  <img src={URL.createObjectURL(avatarFile)} alt={isEnglish ? text!.preview : "Preview"} className="w-full h-full object-cover" />
                ) : user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="avatar" className="text-sm font-medium">{isEnglish ? text!.profilePhoto : "Foto de Perfil"}</Label>
                <div className="mt-1.5">
                  <label htmlFor="avatar" className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium cursor-pointer hover:bg-secondary">
                    {isEnglish ? text!.chooseImage : "Escolher imagem"}
                  </label>
                </div>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => onAvatarFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                  {isEnglish ? text!.formats : "Formatos aceitos: JPG, PNG e WEBP. Tamanho recomendado: 512x512 px. Tamanho máximo: 5MB."}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="editName">{isEnglish ? text!.name : "Nome"}</Label>
              <Input id="editName" value={editName} onChange={(e) => onEditNameChange(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="editBio">{isEnglish ? text!.bio : "Biografia"}</Label>
              <Textarea id="editBio" value={editBio} onChange={(e) => onEditBioChange(e.target.value)} className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editPhone">{isEnglish ? text!.phone : "Telefone"}</Label>
                <Input id="editPhone" value={editPhone} onChange={(e) => onEditPhoneChange(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="editLocation">{isEnglish ? text!.location : "Localização"}</Label>
                <Input id="editLocation" value={editLocation} onChange={(e) => onEditLocationChange(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-3 pt-4 justify-end">
              <Button variant="ghost" onClick={onCancelEdit} disabled={isUploading}>
                {isEnglish ? text!.cancel : "Cancelar"}
              </Button>
              <Button onClick={onSaveProfile} className="caramelo-gradient text-white border-0" disabled={isUploading}>
                <Save className="w-4 h-4 mr-2" />
                {isUploading ? (isEnglish ? text!.saving : "Salvando...") : (isEnglish ? text!.saveChanges : "Salvar Alterações")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{user.phone}</span>
              </div>
            )}
            {user.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{user.location}</span>
              </div>
            )}
            {user.bio && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">{isEnglish ? text!.bio : "Biografia"}</span>
                <p className="text-foreground">{user.bio}</p>
              </div>
            )}
            <div className="pt-4 text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {isEnglish ? text!.memberSince : "Membro desde"} {new Date(user.createdAt).toLocaleDateString(isEnglish ? "en-US" : "pt-BR", { year: "numeric", month: "long" })}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 border-border max-w-2xl mt-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{isEnglish ? text!.security : "Segurança da conta"}</h2>
            <p className="text-sm text-muted-foreground">{isEnglish ? text!.securityHint : "Atualize sua senha de acesso quando quiser."}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="currentPassword">{isEnglish ? text!.currentPassword : "Senha atual"}</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => onCurrentPasswordChange(e.target.value)}
              autoComplete="current-password"
              className="mt-1"
              placeholder={isEnglish ? text!.currentPlaceholder : "Digite sua senha atual"}
            />
          </div>
          <div>
            <Label htmlFor="newPassword">{isEnglish ? text!.newPassword : "Nova senha"}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              autoComplete="new-password"
              className="mt-1"
              placeholder={isEnglish ? text!.newPlaceholder : "Crie uma nova senha"}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">{isEnglish ? text!.confirmPassword : "Confirmar nova senha"}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              autoComplete="new-password"
              className="mt-1"
              placeholder={isEnglish ? text!.confirmPlaceholder : "Repita a nova senha"}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={onChangePassword}
            className="caramelo-gradient text-white border-0"
            disabled={isChangingPassword}
          >
            <Lock className="w-4 h-4 mr-2" />
            {isChangingPassword ? (isEnglish ? text!.updating : "Atualizando...") : (isEnglish ? text!.changePassword : "Alterar senha")}
          </Button>
        </div>
      </Card>
    </TabsContent>
  );
}
