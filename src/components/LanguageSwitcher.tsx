import { Link, useLocation } from "react-router-dom";
import { getPortuguesePath, getSiteLocale, localizePath } from "@/lib/locales";

export default function LanguageSwitcher() {
  const { pathname, search } = useLocation();
  const locale = getSiteLocale(pathname);
  const target = locale === "en" ? getPortuguesePath(pathname) : localizePath(pathname, "en");
  const label = locale === "en" ? "Português" : "English";

  return (
    <Link
      to={`${target}${search}`}
      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      aria-label={locale === "en" ? "Switch to Portuguese" : "Switch to English"}
    >
      {label}
    </Link>
  );
}