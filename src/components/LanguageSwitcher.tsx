import { useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getPortuguesePath, getSiteLocale, localizePath, type SiteLocale } from "@/lib/locales";

const LANGUAGE_OPTIONS: Record<SiteLocale, { flag: "brazil" | "unitedStates"; label: string }> = {
  "pt-BR": { flag: "brazil", label: "Português" },
  en: { flag: "unitedStates", label: "English" },
};

function LanguageFlag({ flag, className = "" }: { flag: "brazil" | "unitedStates"; className?: string }) {
  if (flag === "brazil") {
    return (
      <svg viewBox="0 0 24 16" className={`overflow-hidden rounded-[2px] ${className}`} aria-hidden="true">
        <rect width="24" height="16" fill="#009B3A" />
        <path d="M12 1.25 22 8 12 14.75 2 8Z" fill="#FFDF00" />
        <circle cx="12" cy="8" r="3.6" fill="#002776" />
        <path d="M8.8 7.15c1.8-.75 4.55-.42 6.3.78" fill="none" stroke="#fff" strokeWidth=".7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 16" className={`overflow-hidden rounded-[2px] ${className}`} aria-hidden="true">
      <rect width="24" height="16" fill="#fff" />
      <path d="M0 0h24v1.24H0zm0 2.46h24v1.24H0zm0 2.46h24v1.24H0zm0 2.46h24v1.24H0zm0 2.46h24v1.24H0zm0 2.46h24v1.24H0zm0 2.46h24V16H0z" fill="#B22234" />
      <rect width="10.5" height="8.6" fill="#3C3B6E" />
      <path d="M1.35 1.45h.55v.55h-.55zm2 0h.55v.55h-.55zm2 0h.55v.55h-.55zm2 0h.55v.55h-.55zM2.35 3.1h.55v.55h-.55zm2 0h.55v.55h-.55zm2 0h.55v.55h-.55zM1.35 4.75h.55v.55h-.55zm2 0h.55v.55h-.55zm2 0h.55v.55h-.55zm2 0h.55v.55h-.55zM2.35 6.4h.55v.55h-.55zm2 0h.55v.55h-.55zm2 0h.55v.55h-.55z" fill="#fff" />
    </svg>
  );
}

export default function LanguageSwitcher() {
  const { pathname, search } = useLocation();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const locale = getSiteLocale(pathname);
  const isEnglish = locale === "en";
  const currentLanguage = LANGUAGE_OPTIONS[locale];

  const pathForLocale = (targetLocale: SiteLocale) => {
    const targetPath = targetLocale === "en" ? localizePath(pathname, "en") : getPortuguesePath(pathname);
    return `${targetPath}${search}`;
  };

  const closeMenu = () => menuRef.current?.removeAttribute("open");

  return (
    <details ref={menuRef} className="group relative shrink-0">
      <summary
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-[12px] border border-input bg-background p-0 text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:h-10 sm:w-[64px] sm:gap-1.5 sm:px-2.5 [&::-webkit-details-marker]:hidden"
        aria-label={isEnglish ? "Select language" : "Selecionar idioma"}
      >
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10">
          <LanguageFlag flag={currentLanguage.flag} className="h-3.5 w-5 shadow-sm" />
        </span>
        <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 sm:block" aria-hidden="true" />
      </summary>

      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-48 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl">
        <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {isEnglish ? "Language" : "Idioma"}
        </p>
        {(Object.entries(LANGUAGE_OPTIONS) as Array<[SiteLocale, (typeof LANGUAGE_OPTIONS)[SiteLocale]]>).map(([value, option]) => {
          const active = value === locale;
          const optionContent = (
            <>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary">
                <LanguageFlag flag={option.flag} className="h-3.5 w-5 shadow-sm" />
              </span>
              <span className="flex-1 text-sm font-medium">{option.label}</span>
              {active ? <Check className="h-4 w-4 text-emerald-600" aria-label={isEnglish ? "Current language" : "Idioma atual"} /> : null}
            </>
          );

          return active ? (
            <span key={value} className="flex h-10 items-center gap-2.5 rounded-lg bg-amber-50 px-2.5 text-foreground">
              {optionContent}
            </span>
          ) : (
            <Link
              key={value}
              to={pathForLocale(value)}
              onClick={closeMenu}
              className="flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {optionContent}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
