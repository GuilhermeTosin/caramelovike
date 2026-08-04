import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import {
  getAllBusinesses,
  getCountryName,
  getStateDisplayName,
  resolveCanonicalLocationSlug,
} from "@/services/businesses";
import { preloadBusinessPageAssets } from "@/pages/BusinessPagePrefetch";
import type { BusinessFrontend } from "@/types/database";
import { setSeoMeta, upsertMetaTag } from "@/lib/seo";
import { getCityDisplayName } from "@/lib/locationDisplay";
import { type DirectoryInsights } from "@/lib/directoryInsights";
import { DEFAULT_BUSINESS_LOGO } from "@/lib/images";
import { DIRECTORY_CATEGORY_MINIMUM_BUSINESSES } from "@/lib/directoryCategories";
import {
  buildDirectoryPagePath,
  buildDirectoryPageSnapshot,
  type DirectoryLevel,
  type DirectoryPageSnapshot,
} from "@/lib/directorySnapshot";
import Pagination from "@/components/Pagination";
import { useSiteLocale } from "@/contexts/LocaleContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLocalizedDirectoryIntro, getLocalizedDirectoryMeta } from "@/lib/directoryLocale";
import { getHomeContent } from "@/data/homeContent";
import { getCountryDisplayName } from "@/lib/locales";
import { buildBusinessUrlForLocale } from "@/lib/businessEnglish";

type BusinessDirectoryPageProps = {
  initialDirectorySnapshot?: DirectoryPageSnapshot;
};

function getLocationLabel(business: BusinessFrontend, locale: "pt-BR" | "en" = "pt-BR") {
  const parts = [
    getCityDisplayName(business.address.cityDisplayName || business.address.city, business.address.countryCode || business.address.country),
    getStateDisplayName(business.address.countryCode || business.address.country, business.address.stateCode, business.address.state),
    getCountryDisplayName(business.address.countryCode || business.address.country, getCountryName(business.address.countryCode || business.address.country), locale),
  ].filter(Boolean);
  return parts.join(", ") || (locale === "en" ? "Location not provided" : "Localização não informada");
}

function Header() {
  const { locale, toLocalePath } = useSiteLocale();
  const isEnglish = locale === "en";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-24">
          <Link to={toLocalePath("/")} className="flex items-center gap-3 group">
            <div className="w-14 h-14 sm:w-[5.5rem] sm:h-[5.5rem] flex items-center justify-center">
              <img src="/logo.webp" alt="Caramelinho logo" className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-extrabold text-lg sm:text-2xl tracking-tight caramelo-text-gradient truncate">Caramelinho</div>
              <div className="text-[10px] sm:text-sm font-semibold text-foreground/75 whitespace-nowrap overflow-hidden text-ellipsis">
                {isEnglish ? "YOUR BRAZILIAN BUSINESS FINDER ABROAD" : "O SEU FARO FORA DO BRASIL"}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/buscar" className="text-sm font-semibold text-primary hover:text-primary/80">
              {isEnglish ? "Search businesses" : "Buscar negócios"}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function BusinessDirectoryPage({ initialDirectorySnapshot }: BusinessDirectoryPageProps) {
  const { pathname } = useLocation();
  const { locale, toLocalePath } = useSiteLocale();
  const isEnglish = locale === "en";
  const navigate = useNavigate();
  const [directoryBusinesses, setDirectoryBusinesses] = useState<BusinessFrontend[]>([]);
  const [loadedDirectory, setLoadedDirectory] = useState(false);

  useEffect(() => {
    let active = true;
    void getAllBusinesses()
      .then((rows) => {
        if (active) setDirectoryBusinesses(rows);
      })
      .catch(() => {
        if (active) setDirectoryBusinesses([]);
      })
      .finally(() => {
        if (active) setLoadedDirectory(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const liveSnapshot = useMemo(
    () => directoryBusinesses.length > 0 ? buildDirectoryPageSnapshot(pathname, directoryBusinesses) : null,
    [directoryBusinesses, pathname],
  );
  const initialSnapshotMatchesPath = initialDirectorySnapshot?.pathname === pathname;
  const snapshot = liveSnapshot || (initialSnapshotMatchesPath ? initialDirectorySnapshot : null);
  const loadingBusinesses = !snapshot && !loadedDirectory;

  useEffect(() => {
    if (!snapshot) return;
    const meta = getLocalizedDirectoryMeta(snapshot, locale);
    setSeoMeta(meta.title, meta.description);
    upsertMetaTag("property", "og:title", meta.title);
    upsertMetaTag("property", "og:description", meta.description);
    upsertMetaTag("name", "twitter:title", meta.title);
    upsertMetaTag("name", "twitter:description", meta.description);
  }, [locale, snapshot]);

  useEffect(() => {
    if (!snapshot?.route.countryCode || !snapshot.route.stateCode || !snapshot.route.citySlug) return;
    let active = true;
    void resolveCanonicalLocationSlug(
      snapshot.route.countryCode,
      snapshot.route.stateCode,
      snapshot.route.citySlug,
    ).then((canonicalCitySlug) => {
      if (!active || !canonicalCitySlug || canonicalCitySlug === snapshot.route.citySlug) return;
      navigate(buildDirectoryPagePath({ ...snapshot.route, citySlug: canonicalCitySlug }), { replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate, snapshot]);

  const directoryMeta = snapshot ? getLocalizedDirectoryMeta(snapshot, locale) : null;
  const title = directoryMeta?.heading || (isEnglish ? "Brazilian businesses abroad by country" : "Negócios brasileiros no exterior por país");
  const categoryNotFound = !!snapshot?.route.categorySlug && (
    !snapshot.category || snapshot.totalBusinesses < DIRECTORY_CATEGORY_MINIMUM_BUSINESSES
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-4xl">
          <Link to={toLocalePath("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {isEnglish ? "Back to home" : "Voltar para início"}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4">{title}</h1>
          {snapshot && (
            <p className="mt-3 text-muted-foreground leading-relaxed">
              {isEnglish
                ? getLocalizedDirectoryIntro(snapshot, locale)
                : snapshot.category
                  ? "Encontre " + snapshot.category.label.toLocaleLowerCase("pt-BR") + " com endereços, horários, contatos e avaliações em " + snapshot.labels.city + "."
                  : getDirectoryIntro(snapshot.level, snapshot.insights, snapshot.labels)}
            </p>
          )}
        </div>

        {snapshot && (
          <nav className="mt-5 flex flex-wrap gap-2 text-sm" aria-label={isEnglish ? "Business directory navigation" : "Navegação do diretório"}>
            <Link className="text-primary hover:underline" to={toLocalePath("/negocios")}>{isEnglish ? "Businesses" : "Negócios"}</Link>
            {snapshot.route.countryCode && (
              <>
                <span className="text-muted-foreground">/</span>
                <Link className="text-primary hover:underline" to={buildDirectoryPagePath({ ...snapshot.route, stateCode: "", citySlug: "", categorySlug: "", page: 1 })}>
                  {getCountryDisplayName(snapshot.route.countryCode, snapshot.labels.country, locale)}
                </Link>
              </>
            )}
            {snapshot.route.countryCode && snapshot.route.stateCode && (
              <>
                <span className="text-muted-foreground">/</span>
                <Link className="text-primary hover:underline" to={buildDirectoryPagePath({ ...snapshot.route, citySlug: "", categorySlug: "", page: 1 })}>
                  {snapshot.labels.state}
                </Link>
              </>
            )}
            {snapshot.route.countryCode && snapshot.route.stateCode && snapshot.route.citySlug && (
              <>
                <span className="text-muted-foreground">/</span>
                <Link className="text-primary hover:underline" to={buildDirectoryPagePath({ ...snapshot.route, categorySlug: "", page: 1 })}>
                  {snapshot.labels.city}
                </Link>
              </>
            )}
            {snapshot.category && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground">{snapshot.category.label}</span>
              </>
            )}
          </nav>
        )}

        {snapshot?.insights && (
          <>
            <DirectorySummary insights={snapshot.insights} locale={locale} />
            {!isEnglish && snapshot.level === "businesses" && (
              <DirectoryCategoryOverview
                title={`Categorias com página própria em ${snapshot.labels.city}`}
                insights={snapshot.insights}
                getCategoryHref={(item) =>
                  buildDirectoryPagePath({ ...snapshot.route, categorySlug: item.slug || "", page: 1 })
                }
              />
            )}
          </>
        )}

        {loadingBusinesses && (
          <section className="mt-8 rounded-2xl border border-border bg-white p-6">
            <p className="text-sm text-muted-foreground">{isEnglish ? "Loading countries with published businesses..." : "Carregando países com negócios publicados..."}</p>
          </section>
        )}

        {!loadingBusinesses && !snapshot && (
          <section className="mt-8 rounded-2xl border border-border bg-white p-6">
            <h2 className="text-xl font-bold">{isEnglish ? "Page not found" : "Página não encontrada"}</h2>
            <p className="mt-2 text-muted-foreground">{isEnglish ? "This page is not available in the public directory." : "Não encontramos esta página no diretório público."}</p>
          </section>
        )}

        {categoryNotFound && snapshot && (
          <section className="mt-8 rounded-2xl border border-border bg-white p-6">
            <h2 className="text-xl font-bold">{isEnglish ? "Page not found" : "Página não encontrada"}</h2>
            <p className="mt-2 text-muted-foreground">
              {isEnglish ? "This category does not have enough published businesses in this city yet." : "Esta categoria ainda não tem negócios suficientes publicados nesta cidade."}
            </p>
            <Link className="mt-4 inline-block text-primary hover:underline" to={buildDirectoryPagePath({ ...snapshot.route, categorySlug: "", page: 1 })}>
              {isEnglish ? "View all businesses in this city" : "Ver todos os negócios da cidade"}
            </Link>
          </section>
        )}

        {snapshot && !categoryNotFound && ["countries", "states", "cities"].includes(snapshot.level) && (
          <DirectoryGrid
            title={snapshot.level === "countries" ? (isEnglish ? "Countries" : "Países") : snapshot.level === "states" ? (isEnglish ? "States and regions" : "Estados e regiões") : "Cities"}
            items={snapshot.gridItems}
            locale={locale}
          />
        )}

        {snapshot?.level === "businesses" && snapshot.relatedCities.length > 0 && (
          <DirectoryGrid title={isEnglish ? `Other cities in ${snapshot.labels.state}` : `Outras cidades em ${snapshot.labels.state}`} items={snapshot.relatedCities} locale={locale} />
        )}

        {snapshot && (snapshot.level === "businesses" || snapshot.level === "categoryBusinesses") && !categoryNotFound && (
          <section className="mt-8 rounded-2xl border border-border bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <h2 className="font-bold text-foreground">
                {snapshot.category ? `${snapshot.category.label} ${isEnglish ? "in" : "em"} ${snapshot.labels.city}` : (isEnglish ? `Businesses in ${snapshot.labels.city}` : `Negócios em ${snapshot.labels.city}`)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {snapshot.totalBusinesses} {isEnglish ? (snapshot.totalBusinesses === 1 ? "published business" : "published businesses") : (snapshot.totalBusinesses === 1 ? "negócio publicado" : "negócios publicados")}
              </p>
            </div>

            <div className="divide-y divide-border">
              {snapshot.pageBusinesses.map((business) => (
                <Link
                  key={business.id}
                  to={buildBusinessUrlForLocale(business, locale)}
                  state={{ preloadedBusiness: business }}
                  onMouseEnter={() => preloadBusinessPageAssets(business)}
                  onFocus={() => preloadBusinessPageAssets(business)}
                  onPointerDown={() => preloadBusinessPageAssets(business)}
                  className="block px-5 py-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={business.logoUrl || DEFAULT_BUSINESS_LOGO}
                      alt=""
                      loading="lazy"
                      className="h-11 w-11 shrink-0 rounded-full border border-border bg-muted object-cover"
                      onError={(event) => {
                        if (event.currentTarget.getAttribute("src") === DEFAULT_BUSINESS_LOGO) return;
                        event.currentTarget.src = DEFAULT_BUSINESS_LOGO;
                      }}
                    />
                    <h3 className="min-w-0 text-base font-bold text-foreground">{business.name}</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{getLocationLabel(business, locale)}</p>
                  <p className="mt-1 text-sm text-primary">{isEnglish ? getHomeContent(locale).categories.find((category) => category.id === business.categoryId)?.name || business.category : business.category}</p>
                </Link>
              ))}
            </div>

            {snapshot.totalPages > 1 && (
              <div className="px-5 py-4 border-t border-border">
                <Pagination
                  currentPage={snapshot.route.page}
                  totalPages={snapshot.totalPages}
                  getPageHref={(pageNumber) => buildDirectoryPagePath(snapshot.route, pageNumber)}
                  previousLabel={isEnglish ? "Previous" : undefined}
                  nextLabel={isEnglish ? "Next" : undefined}
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
function pluralize(count: number, singular: string, plural: string) {
  return count + " " + (count === 1 ? singular : plural);
}

function formatDirectoryDate(value?: string, locale: "pt-BR" | "en" = "pt-BR") {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "Sem registros";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function getDirectoryIntro(
  level: DirectoryLevel,
  insights: DirectoryInsights | null,
  location: { country: string; state: string; city: string },
) {
  if (!insights) return "Explore os neg\u00f3cios publicados nesta localidade.";

  const businesses = pluralize(insights.totalBusinesses, "neg\u00f3cio publicado", "neg\u00f3cios publicados");
  const activities = pluralize(insights.totalActivities, "tipo de neg\u00f3cio", "tipos de neg\u00f3cio");
  const distribution = insights.totalBusinesses === 1 ? "distribu\u00eddo" : "distribu\u00eddos";

  if (level === "countries") {
    return "Explore " + businesses + " no diret\u00f3rio, " + distribution + " em " + activities + " e com links para pa\u00edses, estados e cidades.";
  }
  if (level === "states") {
    return "Este diret\u00f3rio re\u00fane " + businesses + " no " + location.country + ", " + distribution + " em " + activities + ".";
  }
  if (level === "cities") {
    return "Este diret\u00f3rio re\u00fane " + businesses + " em " + location.state + ", " + location.country + ", " + distribution + " em " + activities + ".";
  }
  return "Em " + location.city + ", " + location.state + ", h\u00e1 " + businesses + " " + distribution + " em " + activities + ".";
}
function DirectorySummary({ insights, locale }: { insights: DirectoryInsights; locale: "pt-BR" | "en" }) {
  const isEnglish = locale === "en";
  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-5">
      <h2 className="text-xl font-bold text-foreground">{isEnglish ? "Directory overview" : "Panorama do diret\u00f3rio"}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-muted-foreground">{isEnglish ? "Published businesses" : "Neg\u00f3cios publicados"}</dt>
          <dd className="mt-1 text-2xl font-extrabold text-foreground">{insights.totalBusinesses}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{isEnglish ? "Business types" : "Tipos de neg\u00f3cio"}</dt>
          <dd className="mt-1 text-2xl font-extrabold text-foreground">{insights.totalActivities}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{isEnglish ? "Verified businesses" : "Neg\u00f3cios verificados"}</dt>
          <dd className="mt-1 text-2xl font-extrabold text-foreground">{insights.verifiedBusinesses}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{isEnglish ? "Latest listing" : "\u00daltimo cadastro"}</dt>
          <dd className="mt-1 text-sm font-bold text-foreground">{formatDirectoryDate(insights.latestCreatedAt, locale)}</dd>
        </div>
      </dl>
    </section>
  );
}

function DirectoryCategoryOverview({
  title,
  insights,
  getCategoryHref,
}: {
  title: string;
  insights: DirectoryInsights;
  getCategoryHref: (category: DirectoryInsights["categories"][number]) => string;
}) {
  const indexableCategories = insights.categories.filter((category) => category.isIndexable && category.slug);
  if (indexableCategories.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {"Exibimos apenas categorias com pelo menos " + DIRECTORY_CATEGORY_MINIMUM_BUSINESSES + " neg\u00f3cios publicados."}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {indexableCategories.map((category) => {
          const href = getCategoryHref(category);
          const content = (
            <>
              <h3 className="font-bold text-foreground">{category.label}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {pluralize(category.count, "neg\u00f3cio", "neg\u00f3cios")}
              </p>
              {href ? <p className="mt-3 text-sm font-semibold text-primary">{"Ver neg\u00f3cios"}</p> : null}
            </>
          );

          return href ? (
            <Link
              key={category.key}
              to={href}
              className="rounded-2xl border border-border bg-white p-5 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              {content}
            </Link>
          ) : (
            <div key={category.key} className="rounded-2xl border border-border bg-white p-5">
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getDirectoryItemLabel(item: { label: string; href: string }, locale: "pt-BR" | "en") {
  if (locale !== "en") return item.label;
  const parts = item.href.split("/").filter(Boolean);
  const countryCode = parts[0] === "en" && parts[1] === "businesses" && parts.length === 3 ? parts[2] : "";
  return countryCode ? getCountryDisplayName(countryCode, item.label, locale) : item.label;
}
function DirectoryGrid({
  title,
  items,
  locale,
}: {
  title: string;
  items: Array<{ label: string; href: string; count: number }>;
  locale: "pt-BR" | "en";
}) {
  const sortedItems = [...items].sort((a, b) => a.label.localeCompare(b.label, locale));

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
            <h3 className="font-bold text-foreground">{getDirectoryItemLabel(item, locale)}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.count} {locale === "en" ? (item.count === 1 ? "business" : "businesses") : (item.count === 1 ? "neg\u00f3cio" : "neg\u00f3cios")}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
