import { AlertTriangle, BarChart3, Calendar, Flag, LogOut, MapPin, Megaphone, MessageCircle, Search, ShieldCheck, Star, Store, User, BadgeCheck, ClipboardCheck, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CommunityFind } from "@/types/database";

type UserProfileNavigationProps = {
  activeTab: string;
  isAdmin: boolean;
  canManageUsers: boolean;
  unreadMessages: number;
  myCommunityFinds: CommunityFind[];
  onTabChange: (value: string) => void;
  onLogout: () => void;
};

export default function UserProfileNavigation({
  activeTab,
  isAdmin,
  canManageUsers,
  unreadMessages,
  myCommunityFinds,
  onTabChange,
  onLogout,
}: UserProfileNavigationProps) {
  const locale = "pt-BR";

  const text = {
    navigation: "Navegação do perfil", select: "Selecione uma seção", profile: "Meu Perfil", businesses: "Meus negócios", events: "Meus Eventos", finds: "Achadinhos", verifications: "Verificações", businessReview: "Análise de negócios", allBusinesses: "Todos os negócios", users: "Usuários", reports: "Denúncias", highlights: "Destaques", search: "Busca", quality: "Qualidade", reviews: "Avaliações", messages: "Mensagens", signOut: "Sair",
  };
  const hasCommunityFindAlerts = myCommunityFinds.some((find) => (find.upvotes || 0) - (find.downvotes || 0) <= -2);

  return (
    <>
      <div className="md:hidden mb-4">
        <Card className="p-3 border border-border bg-card">
          <Label htmlFor="perfil-mobile-nav" className="text-xs text-muted-foreground">
            {text.navigation}
          </Label>
          <Select
            value={activeTab}
            onValueChange={(value) => {
              if (value === "__logout__") {
                onLogout();
                return;
              }
              onTabChange(value);
            }}
          >
            <SelectTrigger id="perfil-mobile-nav" className="mt-2">
            <SelectValue placeholder={text.select} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="perfil">{text.profile}</SelectItem>
              <SelectItem value="negocios">{text.businesses}</SelectItem>
              <SelectItem value="eventos">{text.events}</SelectItem>
              <SelectItem value="achadinhos">{text.finds}</SelectItem>
              {isAdmin && <SelectItem value="verificacoes">{text.verifications}</SelectItem>}
              {isAdmin && <SelectItem value="analise-negocios">{text.businessReview}</SelectItem>}
              {isAdmin && <SelectItem value="todos-negocios">{text.allBusinesses}</SelectItem>}
              {canManageUsers && <SelectItem value="usuarios">{text.users}</SelectItem>}
              {isAdmin && <SelectItem value="ownership">Ownership</SelectItem>}
              {isAdmin && <SelectItem value="denuncias">{text.reports}</SelectItem>}
              {isAdmin && <SelectItem value="destaques">{text.highlights}</SelectItem>}
              {isAdmin && <SelectItem value="busca">{text.search}</SelectItem>}
              {isAdmin && <SelectItem value="qualidade">{text.quality}</SelectItem>}
              {canManageUsers && <SelectItem value="analytics">Google Analytics</SelectItem>}
              <SelectItem value="avaliacoes">{text.reviews}</SelectItem>
              <SelectItem value="mensagens">{text.messages}</SelectItem>
              <SelectItem value="__logout__">{text.signOut}</SelectItem>
            </SelectContent>
          </Select>
        </Card>
      </div>

      <aside className="hidden md:block w-full md:w-64 lg:w-72 shrink-0">
        <div className="sticky top-24">
          <Card className="p-2 border border-border bg-card">
            <TabsList className="flex flex-col h-auto bg-transparent gap-1">
              <TabsTrigger value="perfil" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                <User className="w-4 h-4" />
                {text.profile}
              </TabsTrigger>
              <TabsTrigger value="negocios" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                <Store className="w-4 h-4" />
                {text.businesses}
              </TabsTrigger>
              <TabsTrigger value="eventos" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                <Calendar className="w-4 h-4" />
                {text.events}
              </TabsTrigger>
              <TabsTrigger value="achadinhos" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                <MapPin className="w-4 h-4" />
                {text.finds}
                {hasCommunityFindAlerts ? (
                  <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    !
                  </span>
                ) : null}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="verificacoes" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                  <BadgeCheck className="w-4 h-4" />
                  {text.verifications}
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="analise-negocios" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                  <ClipboardCheck className="w-4 h-4" />
                  {text.businessReview}
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="todos-negocios" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                  <Store className="w-4 h-4" />
                  {text.allBusinesses}
                </TabsTrigger>
              )}
              {canManageUsers && (
                <TabsTrigger value="usuarios" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                  <Users className="w-4 h-4" />
                  {text.users}
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="ownership" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                  <ShieldCheck className="w-4 h-4" />
                  Ownership
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="denuncias" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                  <Flag className="w-4 h-4" />
                  {text.reports}
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="destaques" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                  <Megaphone className="w-4 h-4" />
                  {text.highlights}
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="busca" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                  <Search className="w-4 h-4" />
                  {text.search}
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="qualidade" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                  <AlertTriangle className="w-4 h-4" />
                  {text.quality}
                </TabsTrigger>
              )}
              {canManageUsers && (
                <TabsTrigger value="analytics" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                  <BarChart3 className="w-4 h-4" />
                  Google Analytics
                </TabsTrigger>
              )}
              <TabsTrigger value="avaliacoes" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                <Star className="w-4 h-4" />
                {text.reviews}
              </TabsTrigger>
              <TabsTrigger value="mensagens" className="justify-start gap-3 px-4 py-3 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-primary transition-all w-full">
                <div className="relative">
                  <MessageCircle className="w-4 h-4" />
                  {unreadMessages > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />}
                </div>
                {text.messages}
              </TabsTrigger>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center justify-start gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-primary transition-all w-full"
              >
                <LogOut className="w-4 h-4" />
                {text.signOut}
              </button>
            </TabsList>
          </Card>
        </div>
      </aside>
    </>
  );
}
