import { useEffect, useRef } from "react";
import { ChevronRight, LogIn, Menu, MessageCircle, Search, Store, User, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { buildMarketplaceSearchPath, useSearchLocation } from "@/contexts/SearchLocationContext";

type MobileHeaderMenuProps = {
  showSearchLink?: boolean;
};

export default function MobileHeaderMenu({ showSearchLink = false }: MobileHeaderMenuProps) {
  const { session, unreadMessages, isLoading } = useAuth();
  const { searchLocation } = useSearchLocation();
  const { pathname, search } = useLocation();
  const menuRef = useRef<HTMLDetailsElement>(null);


  useEffect(() => {
    menuRef.current?.removeAttribute("open");
  }, [pathname, search]);

  const closeMenu = () => menuRef.current?.removeAttribute("open");
  const profileName = session?.name?.split(" ")[0] || "";
  const marketplaceHref = buildMarketplaceSearchPath(searchLocation);

  return (
    <details ref={menuRef} className="group relative lg:hidden">
      <summary
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-[12px] border border-input bg-background text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        aria-label={"Abrir menu"}
      >
        <Menu className="h-4 w-4 group-open:hidden" aria-hidden="true" />
        <X className="hidden h-4 w-4 group-open:block" aria-hidden="true" />
      </summary>

      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-64 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl">
        {showSearchLink ? (
          <>
            <Link
              to="/buscar"
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <span>{"Buscar negócios"}</span>
            </Link>
            <div className="my-1 h-px bg-border" />
          </>
        ) : null}

        <Link
          to={marketplaceHref}
          onClick={closeMenu}
          className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <Store className="h-4 w-4 text-muted-foreground" />
          <span>Marketplace</span>
        </Link>
        <div className="my-1 h-px bg-border" />

        {isLoading ? (
          <div className="space-y-2 p-2.5">
            <div className="h-10 rounded-lg bg-secondary animate-pulse" />
            <div className="h-10 rounded-lg bg-secondary animate-pulse" />
          </div>
        ) : session ? (
          <div className="space-y-1">
            <Link
              to={"/perfil"}
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{profileName}</span>
                <span className="block text-xs text-muted-foreground">{"Ver perfil"}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </Link>
            <Link
              to={"/perfil?tab=mensagens"}
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span className="relative grid h-8 w-8 place-items-center rounded-full bg-secondary">
                <MessageCircle className="h-4 w-4 text-foreground" />
                {unreadMessages > 0 ? (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] font-bold leading-4 text-primary-foreground">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                ) : null}
              </span>
              <span className="flex-1 text-sm font-medium">{"Mensagens"}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            <Link
              to={"/entrar"}
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <LogIn className="h-4 w-4 text-muted-foreground" />
              <span>{"Entrar"}</span>
            </Link>
            <Link
              to={"/cadastro"}
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-lg bg-primary px-2.5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Store className="h-4 w-4" />
              <span>{"Cadastrar negócio"}</span>
            </Link>
          </div>
        )}
      </div>
    </details>
  );
}
