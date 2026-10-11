import { Link } from "react-router-dom";
import { MessageCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketplaceChat } from "@/contexts/MarketplaceChatContext";
type SiteHeaderAuthActionsProps = {
  className?: string;
  compact?: boolean;
};

export default function SiteHeaderAuthActions({
  className = "flex items-center gap-1.5 sm:gap-2",
  compact = false,
}: SiteHeaderAuthActionsProps) {
  const { session, unreadMessages, isLoading } = useAuth();
  const { openMarketplaceChatInbox } = useMarketplaceChat();

  const messageIconClassName = compact ? "h-5 w-5" : "h-6 w-6";
  const unreadBadgeClassName = compact
    ? "h-5 min-w-5 px-1 text-[10px]"
    : "h-6 min-w-6 px-1.5 text-xs";
  const loginButtonClassName = compact
    ? "rounded-full"
    : "rounded-full text-muted-foreground hover:text-foreground";
  const signupButtonClassName = compact
    ? "rounded-full px-5 caramelo-gradient text-white border-0"
    : "px-6 caramelo-gradient text-white border-0";
  const signupButtonStyle = compact ? undefined : { borderRadius: "12px" };

  return (
    <div className={className}>
      {isLoading ? (
        <div className="flex min-h-10 w-48 items-center justify-end gap-1.5" aria-label={"Carregando ações da conta"}>
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted/70" />
          <div className="h-10 w-28 animate-pulse rounded-full bg-muted/70" />
        </div>
      ) : session ? (
        <div className="flex w-48 items-center justify-end gap-1.5">
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void openMarketplaceChatInbox()}
              aria-label={unreadMessages > 0 ? `Abrir mensagens, ${unreadMessages} não lidas` : "Abrir mensagens"}
              className={`relative rounded-full transition-colors w-10 h-10 sm:w-11 sm:h-11 ${unreadMessages > 0
                ? "bg-[#fff1df] text-[#8f3e12] shadow-sm ring-1 ring-[#e4a66f] hover:bg-[#ffe5c8]"
                : "text-muted-foreground hover:bg-secondary"}`}
            >
              <MessageCircle className={messageIconClassName} strokeWidth={2.4} aria-hidden="true" />
              {unreadMessages > 0 && (
                <span aria-hidden="true" className={`absolute -right-1 -top-1 ${unreadBadgeClassName} flex items-center justify-center rounded-full border-2 border-white bg-[#b55518] font-extrabold leading-none text-white shadow-md`}>
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </Button>
          </div>
          <Link to={"/perfil"}>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full border-border px-3 hover:bg-secondary sm:h-10 sm:gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="w-3 h-3 text-primary" />
              </div>
              <span className="max-w-[90px] truncate font-medium">{session.name.split(" ")[0]}</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link to={"/entrar"}>
            <Button variant="ghost" size="sm" className={loginButtonClassName}>
              {"Entrar"}
            </Button>
          </Link>
          <Link to={"/cadastro"}>
            <Button size="sm" className={signupButtonClassName} style={signupButtonStyle}>
              {"Cadastrar"}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
