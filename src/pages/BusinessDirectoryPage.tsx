import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import { buildBusinessUrl, getAllBusinesses, getCountryName, getStateDisplayName, resolveCanonicalLocationSlug, slugify } from "@/services/businesses";
import { preloadBusinessPageAssets } from "@/pages/BusinessPagePrefetch";
import type { BusinessFrontend } from "@/types/database";
import { setSeoMeta, upsertMetaTag } from "@/lib/seo";
import { getDirectoryPageMeta } from "@/lib/seo/directoryMeta";
import { getCanonicalCitySlug, getCityDisplayName } from "@/lib/locationDisplay";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 100;

type BusinessDirectoryPageProps = {
  businesses?: BusinessFrontend[];
};

type DirectoryLevel = "countries" | "states" | "cities" | "businesses";

function normalizeCode(value?: string) {
  return (value || "").trim().toLowerCase();
}

function getCitySlug(business: BusinessFrontend) {
  return getCanonicalCitySlug(business.address.city, business.address.countryCode) || business.address.citySlug;
}
function isCodeLikeStateLabel(value: string, stateCode: string) {
  const label = (value || "").trim();
  const code = (stateCode || "").trim();
  return !!label && !!code && label.toLowerCase() === code.toLowerCase();
}

function preferStateLabel(current: string, candidate: string, stateCode: string) {
  const currentLabel = (current || "").trim();
  const candidateLabel = (candidate || "").trim();
  if (!candidateLabel) return currentLabel;
  if (!currentLabel) return candidateLabel;

  const currentCodeLike = isCodeLikeStateLabel(currentLabel, stateCode);
  const candidateCodeLike = isCodeLikeStateLabel(candidateLabel, stateCode);
  if (currentCodeLike && !candidateCodeLike) return candidateLabel;
  if (!currentCodeLike && candidateCodeLike) return currentLabel;
  if (candidateLabel.length > currentLabel.length && !candidateCodeLike) return candidateLabel;
  return currentLabel;
}

function getLocationLabel(business: BusinessFrontend) {
  const parts = [
    getCityDisplayName(business.address.cityDisplayName || business.address.city, business.address.countryCode || business.address.country),
    getStateDisplayName(business.address.countryCode || business.address.country, business.address.stateCode, business.address.state),
    getCountryName(business.address.countryCode || business.address.country),
  ].filter(Boolean);
  return parts.join(", ") || "Localização não informada";
}

function sortBusinesses(a: BusinessFrontend, b: BusinessFrontend) {
  const countryCompare = (a.address.country || a.address.countryCode || "").localeCompare(
    b.address.country || b.address.countryCode || "",
    "pt-BR"
  );
  if (countryCompare !== 0) return countryCompare;

  const stateCompare = (a.address.state || a.address.stateCode || "").localeCompare(
    b.address.state || b.address.stateCode || "",
    "pt-BR"
  );
  if (stateCompare !== 0) return stateCompare;

  const cityCompare = (a.address.city || "").localeCompare(b.address.city || "", "pt-BR");
  if (cityCompare !== 0) return cityCompare;

  return a.name.localeCompare(b.name, "pt-BR");
}

function countBy<T extends string>(values: T[]) {
  return values.reduce((acc, value) => {
    acc.set(value, (acc.get(value) || 0) + 1);
    return acc;
  }, new Map<T, number>());
}

function getDirectoryContext(businesses: BusinessFrontend[], params: Record<string, string | undefined>) {
  const countryCode = normalizeCode(params.countryCode);
  const stateCode = normalizeCode(params.stateCode);
  const citySlug = slugify(params.citySlug || "");
  const page = Math.max(1, Number(params.page || "1"));

  const countryBusinesses = countryCode
    ? businesses.filter((business) => normalizeCode(business.address.countryCode) === countryCode)
    : businesses;
  const stateBusinesses = stateCode
    ? countryBusinesses.filter((business) => normalizeCode(business.address.stateCode) === stateCode)
    : countryBusinesses;
  const cityBusinesses = citySlug
    ? stateBusinesses.filter((business) => getCitySlug(business) === citySlug)
    : stateBusinesses;

  const level: DirectoryLevel = !countryCode
    ? "countries"
    : !stateCode
      ? "states"
      : !citySlug
        ? "cities"
        : "businesses";

  return {
    countryCode,
    stateCode,
    citySlug,
    page,
    level,
    countryBusinesses,
    stateBusinesses,
    cityBusinesses,
  };
}

function buildPagePath(countryCode: string, stateCode: string, citySlug: string, page: number) {
  const base = `/negocios/${countryCode}/${stateCode}/${citySlug}`;
  return page <= 1 ? base : `${base}/pagina/${page}`;
}

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-24">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-14 h-14 sm:w-[5.5rem] sm:h-[5.5rem] flex items-center justify-center">
              <img
                src="/logo.webp"
                alt="Caramelinho logo"
                className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
              />
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-extrabold text-lg sm:text-2xl tracking-tight caramelo-text-gradient truncate">
                Caramelinho
              </div>
              <div className="text-[10px] sm:text-sm font-semibold text-foreground/75 whitespace-nowrap overflow-hidden text-ellipsis">
                O SEU FARO FORA DO BRASIL
              </div>
            </div>
          </Link>
          <Link to="/buscar" className="text-sm font-semibold text-primary hover:text-primary/80">
            Buscar negócios
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function BusinessDirectoryPage({ businesses = [] }: BusinessDirectoryPageProps) {
  const params = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [directoryBusinesses, setDirectoryBusinesses] = useState<BusinessFrontend[]>(businesses);
  const [loadingBusinesses, setLoadingBusinesses] = useState(businesses.length === 0);

  useEffect(() => {
    let active = true;

    setDirectoryBusinesses(businesses);
    setLoadingBusinesses(businesses.length === 0);

    void getAllBusinesses()
      .then((rows) => {
        if (!active) return;
        setDirectoryBusinesses(rows);
      })
      .catch(() => {
        if (!active) return;
        if (businesses.length === 0) {
          setDirectoryBusinesses([]);
        }
      })
      .finally(() => {
        if (!active) return;
        setLoadingBusinesses(false);
      });

    return () => {
      active = false;
    };
  }, [businesses]);

  const sortedBusinesses = useMemo(() => [...directoryBusinesses].sort(sortBusinesses), [directoryBusinesses]);
  const {
    countryCode,
    stateCode,
    citySlug,
    page,
    level,
    countryBusinesses,
    stateBusinesses,
    cityBusinesses,
  } = getDirectoryContext(sortedBusinesses, params);

  const countryCounts = countBy(
    sortedBusinesses.map((business) => normalizeCode(business.address.countryCode)).filter(Boolean)
  );
  const stateCounts = countBy(
    countryBusinesses.map((business) => normalizeCode(business.address.stateCode)).filter(Boolean)
  );
  const stateNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    countryBusinesses.forEach((business) => {
      const code = normalizeCode(business.address.stateCode);
      if (!code) return;
      const candidate = getStateDisplayName(countryCode, code, business.address.state);
      map.set(code, preferStateLabel(map.get(code) || "", candidate, code));
    });
    return map;
  }, [countryBusinesses, countryCode]);

  const cityCounts = countBy(
    stateBusinesses.map((business) => getCitySlug(business)).filter(Boolean)
  );
  const cityNameBySlug = new Map(
    stateBusinesses.map((business) => [getCitySlug(business), getCityDisplayName(business.address.cityDisplayName || business.address.city, business.address.countryCode || business.address.country) || "Cidade"])
  );

  const currentStateLabel = stateCode ? stateNameByCode.get(stateCode) || getStateDisplayName(countryCode, stateCode) : "";

  const currentList = level === "businesses" ? cityBusinesses : [];
  const totalPages = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageBusinesses = currentList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  useEffect(() => {
    if (!countryCode || !stateCode || !citySlug) return;
    let active = true;

    void resolveCanonicalLocationSlug(countryCode, stateCode, citySlug).then((canonicalCitySlug) => {
      if (!active || !canonicalCitySlug || canonicalCitySlug === citySlug) return;
      navigate(buildPagePath(countryCode, stateCode, canonicalCitySlug, page), { replace: true });
    });

    return () => {
      active = false;
    };
  }, [countryCode, stateCode, citySlug, page, navigate]);

  const pageMeta = useMemo(
    () => getDirectoryPageMeta(pathname, sortedBusinesses, "pt-BR"),
    [pathname, sortedBusinesses],
  );
  const title = pageMeta?.heading || "Neg\u00f3cios brasileiros no exterior por pa\u00eds";

  useEffect(() => {
    if (!pageMeta) return;
    setSeoMeta(pageMeta.title, pageMeta.description);
    upsertMetaTag("property", "og:title", pageMeta.title);
    upsertMetaTag("property", "og:description", pageMeta.description);
    upsertMetaTag("name", "twitter:title", pageMeta.title);
    upsertMetaTag("name", "twitter:description", pageMeta.description);
  }, [pageMeta]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-3xl">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Voltar para início
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4">{title}</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Diretório público organizado por país, estado e cidade para facilitar a descoberta das páginas de negócios.
          </p>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2 text-sm" aria-label="Navegação do diretório">
          <Link className="text-primary hover:underline" to="/negocios">Negócios</Link>
          {countryCode && (
            <>
              <span className="text-muted-foreground">/</span>
              <Link className="text-primary hover:underline" to={`/negocios/${countryCode}`}>
                {getCountryName(countryCode) || countryCode.toUpperCase()}
              </Link>
            </>
          )}
          {countryCode && stateCode && (
            <>
              <span className="text-muted-foreground">/</span>
              <Link className="text-primary hover:underline" to={`/negocios/${countryCode}/${stateCode}`}>
                {currentStateLabel || getStateDisplayName(countryCode, stateCode) || stateCode.toUpperCase()}
              </Link>
            </>
          )}
        </nav>

        {loadingBusinesses && directoryBusinesses.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-border bg-white p-6">
            <p className="text-sm text-muted-foreground">Carregando países com negócios publicados...</p>
          </section>
        ) : null}

        {level === "countries" && !loadingBusinesses && (
          <DirectoryGrid
            title="Países"
            items={Array.from(countryCounts.entries()).map(([code, count]) => ({
              label: getCountryName(code) || code.toUpperCase(),
              href: `/negocios/${code}`,
              count,
            }))}
          />
        )}

        {level === "states" && !loadingBusinesses && (
          <DirectoryGrid
            title="Estados e regiões"
            items={Array.from(stateCounts.entries()).map(([code, count]) => ({
              label: stateNameByCode.get(code) || getStateDisplayName(countryCode, code) || code.toUpperCase(),
              href: `/negocios/${countryCode}/${code}`,
              count,
            }))}
          />
        )}

        {level === "cities" && !loadingBusinesses && (
          <DirectoryGrid
            title="Cidades"
            items={Array.from(cityCounts.entries()).map(([slug, count]) => ({
              label: cityNameBySlug.get(slug) || slug,
              href: `/negocios/${countryCode}/${stateCode}/${slug}`,
              count,
            }))}
          />
        )}

        {level === "businesses" && !loadingBusinesses && (
          <section className="mt-8 rounded-2xl border border-border bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">
                {currentList.length} negócios publicados nesta cidade
              </p>
            </div>

            <div className="divide-y divide-border">
              {pageBusinesses.map((business) => (
                <Link
                  key={business.id}
                  to={buildBusinessUrl(business)}
                  state={{ preloadedBusiness: business }}
                  onMouseEnter={() => preloadBusinessPageAssets(business)}
                  onFocus={() => preloadBusinessPageAssets(business)}
                  onPointerDown={() => preloadBusinessPageAssets(business)}
                  className="block px-5 py-4 hover:bg-muted/40 transition-colors"
                >
                  <h2 className="text-base font-bold text-foreground">{business.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{getLocationLabel(business)}</p>
                  <p className="mt-1 text-sm text-primary">{business.category}</p>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-border">
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  getPageHref={(pageNumber) => buildPagePath(countryCode, stateCode, citySlug, pageNumber)}
                />
              </div>
            )}
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function DirectoryGrid({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; href: string; count: number }>;
}) {
  const sortedItems = [...items].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="rounded-2xl border border-border bg-white p-5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <h3 className="font-bold text-foreground">{item.label}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.count} {item.count === 1 ? "negócio" : "negócios"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
