import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Store, LogIn, FileText, ScrollText, Info, Mail, Facebook } from "lucide-react";
import { DEFAULT_GEO_FALLBACK, buildNearbyBusinessSearchPath, getApproxGeoByIp } from "@/lib/utils/geo";
import { useSiteLocale } from "@/contexts/LocaleContext";

export default function SiteFooter() {
  const navigate = useNavigate();
  const { locale, toLocalePath } = useSiteLocale();
  const isEnglish = locale === "en";
  const [isLocatingSearch, setIsLocatingSearch] = useState(false);

  const handleNearbySearch = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (isLocatingSearch) return;

    setIsLocatingSearch(true);
    const geo = await getApproxGeoByIp({
      timeoutMs: 3000,
      maxAgeMs: 24 * 60 * 60 * 1000,
      fallback: DEFAULT_GEO_FALLBACK,
    });
    setIsLocatingSearch(false);
    navigate(toLocalePath(buildNearbyBusinessSearchPath(geo || DEFAULT_GEO_FALLBACK)));
  };

  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-950 text-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <div className="group flex items-center gap-2">
              <div className="w-12 h-12 flex items-center justify-center">
                <img
                  src="/logo-64.webp"
                  srcSet="/logo-64.webp 64w, /logo-112.webp 112w"
                  sizes="48px"
                  alt="Caramelinho logo"
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
                />
              </div>
              <div className="leading-tight">
                <div className="font-extrabold text-base tracking-tight caramelo-text-gradient">Caramelinho</div>
                <div className="text-[11px] font-semibold tracking-wide text-amber-200">{isEnglish ? "YOUR BRAZILIAN BUSINESS FINDER ABROAD" : "O SEU FARO FORA DO BRASIL"}</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300 max-w-md leading-relaxed">
              {isEnglish ? "Find Brazilian businesses wherever you are. Local search, direct contact and reliable information in one place." : "Encontre negócios brasileiros onde você estiver. Busca local, contato direto e informações confiáveis em um só lugar."}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-3">{isEnglish ? "Navigation" : "Navegação"}</h2>
            <div className="space-y-2 text-sm">
              <Link
                to={toLocalePath("/buscar")}
                onClick={handleNearbySearch}
                aria-busy={isLocatingSearch}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                <MapPin className="w-4 h-4" />
                {isLocatingSearch ? (isEnglish ? "Finding your location..." : "Localizando...") : (isEnglish ? "Search businesses" : "Buscar negócios")}
              </Link>
              <Link to={toLocalePath("/negocios")} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <Store className="w-4 h-4" />
                {isEnglish ? "All businesses" : "Todos os negócios"}
              </Link>
              <Link to="/cadastro" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <Store className="w-4 h-4" />
                {isEnglish ? "List a business" : "Cadastrar negócio"}
              </Link>
              <Link to="/entrar" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <LogIn className="w-4 h-4" />
                {isEnglish ? "Sign in" : "Entrar na conta"}
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-3">{isEnglish ? "About" : "Institucional"}</h2>
            <div className="space-y-2 text-sm">
              <Link to={toLocalePath("/sobre")} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <Info className="w-4 h-4" />
                {isEnglish ? "About" : "Sobre"}
              </Link>
              <Link to={toLocalePath("/contato")} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                {isEnglish ? "Contact" : "Contato"}
              </Link>
              <Link to={toLocalePath("/privacidade")} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
                {isEnglish ? "Privacy" : "Privacidade"}
              </Link>
              <Link to={toLocalePath("/termos")} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <ScrollText className="w-4 h-4" />
                {isEnglish ? "Terms and conditions" : "Termos e Condições"}
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-3">{isEnglish ? "Follow us" : "Siga-nos"}</h2>
            <div className="space-y-2 text-sm">
              <a href="https://www.facebook.com/people/Caramelinhocom/61591992668311/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors" aria-label="Facebook">
                <Facebook className="w-4 h-4" />
                Facebook
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p>{isEnglish ? "© 2026 Caramelinho.com. All rights reserved." : "© 2026 Caramelinho.com. Todos os direitos reservados."}</p>
          <p>{isEnglish ? "Made to make life abroad easier." : "Feito para facilitar a vida de quem mora fora."}</p>
        </div>
      </div>
    </footer>
  );
}
