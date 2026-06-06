import { Link } from "react-router-dom";
import { MessageCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type SiteHeaderAuthActionsProps = {
  className?: string;
  compact?: boolean;
};

export default function SiteHeaderAuthActions({
  className = "flex items-center gap-1.5 sm:gap-2",
  compact = false,
}: SiteHeaderAuthActionsProps) {
  const { session, unreadMessages, isLoading } = useAuth();

  const messageIconClassName = compact ? "w-4 h-4" : "w-5 h-5";
  const unreadBadgeClassName = compact ? "w-3.5 h-3.5 bg-primary text-[9px]" : "w-4 h-4 bg-primary text-[10px]";
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
        <div className="flex items-center gap-2 min-h-9">
          <div className="h-9 w-20 rounded-full bg-muted/70 animate-pulse" />
          <div className="h-9 w-24 rounded-full bg-muted/70 animate-pulse" />
        </div>
      ) : session ? (
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link to="/perfil?tab=mensagens" className="relative group">
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-secondary w-9 h-9 sm:w-10 sm:h-10">
              <MessageCircle className={messageIconClassName} />
              {unreadMessages > 0 && (
                <span
                  className={`absolute top-0 right-0 ${unreadBadgeClassName} text-white font-bold rounded-full flex items-center justify-center border-2 border-white`}
                >
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </Button>
          </Link>
          <Link to="/perfil">
            <Button variant="outline" size="sm" className="rounded-full border-border hover:bg-secondary gap-1.5 sm:gap-2 px-2.5 sm:px-4 h-9 sm:h-10">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-3 h-3 text-primary" />
              </div>
              <span className="font-medium max-w-[90px] sm:max-w-none truncate">{session.name.split(" ")[0]}</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link to="/entrar">
            <Button variant="ghost" size="sm" className={loginButtonClassName}>
              Entrar
            </Button>
          </Link>
          <Link to="/cadastro">
            <Button size="sm" className={signupButtonClassName} style={signupButtonStyle}>
              Cadastrar
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
