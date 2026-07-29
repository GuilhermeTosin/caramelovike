import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import {
  buildBusinessUrl,
  getAllBusinesses,
  getCountryName,
  getStateDisplayName,
  resolveCanonicalLocationSlug,
  slugify,
} from "@/services/businesses";
import { preloadBusinessPageAssets } from "@/pages/BusinessPagePrefetch";
import type { BusinessFrontend } from "@/types/database";
import { setSeoMeta, upsertMetaTag } from "@/lib/seo";
import { getDirectoryPageMeta } from "@/lib/seo/directoryMeta";
import { getCityDisplayName } from "@/lib/locationDisplay";
import { getDirectoryInsights, type DirectoryInsights } from "@/lib/directoryInsights";
import { DEFAULT_BUSINESS_LOGO } from "@/lib/images";
import {
  DIRECTORY_CATEGORY_MINIMUM_BUSINESSES,
  DIRECTORY_PAGE_SIZE,
  getDirectoryBusinessCitySlug,
  getDirectoryCategoryBusinesses,
  getDirectoryCategoryBySlug,
} from "@/lib/directoryCategories";
import Pagination from "@/components/Pagination";

type BusinessDirectoryPageProps = {
  businesses?: BusinessFrontend[];
};

type DirectoryLevel = "countries" | "states" | "cities" | "businesses" | "categoryBusinesses";

function normalizeCode(value?: string) {
  return (value || "").trim().toLowerCase();
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
  return parts.join(", ") || "Localiza\u00e7\u00e3o n\u00e3o informada";
}

function sortBusinesses(a: BusinessFrontend, b: BusinessFrontend) {
  const countryCompare = (a.address.country || a.address.countryCode || "").localeCompare(
    b.address.country || b.address.countryCode || "",
    "pt-BR",
  );
  if (countryCompare !== 0) return countryCompare;

  const stateCompare = (a.address.state || a.address.stateCode || "").localeCompare(
    b.address.state || b.address.stateCode || "",
    "pt-BR",
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
  const categorySlug = slugify(params.categorySlug || "");
  const category = getDirectoryCategoryBySlug(categorySlug);
  const page = Math.max(1, Number(params.page || "1"));

  const countryBusinesses = countryCode
    ? businesses.filter((business) => normalizeCode(business.address.countryCode) === countryCode)
    : businesses;
  const stateBusinesses = stateCode
    ? countryBusinesses.filter((business) => normalizeCode(business.address.stateCode) === stateCode)
    : countryBusinesses;
  const cityBusinesses = citySlug
    ? stateBusinesses.filter((business) => getDirectoryBusinessCitySlug(business) === citySlug)
    : stateBusinesses;

  const level: DirectoryLevel = categorySlug
    ? "categoryBusinesses"
    : !countryCode
      ? "countries"
      : !stateCode
        ? "states"
        : !citySlug
          ? "cities"
          : "businesses";

  const currentList =
    level === "categoryBusinesses" && category
      ? getDirectoryCategoryBusinesses(businesses, countryCode, stateCode, citySlug, category)
      : level === "businesses"
        ? cityBusinesses
        : [];

  return {
    countryCode,
    stateCode,
    citySlug,
    categorySlug,
    category,
    page,
    level,
    countryBusinesses,
    stateBusinesses,
    cityBusinesses,
    currentList,
  };
}

function buildCityPagePath(countryCode: string, stateCode: string, citySlug: string, page: number) {
  const base = "/negocios/" + countryCode + "/" + stateCode + "/" + citySlug;
  return page <= 1 ? base : base + "/pagina/" + page;
}

function buildCategoryPagePath(
  countryCode: string,
  stateCode: string,
  citySlug: string,
  categorySlug: string,
  page: number,
) {
  const base = buildCityPagePath(countryCode, stateCode, citySlug, 1) + "/" + categorySlug;
  return page <= 1 ? base : base + "/pagina/" + page;
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
            {"Buscar neg\u00f3cios"}
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
        if (!active && businesses.length > 0) return;
        if (businesses.length === 0) setDirectoryBusinesses([]);
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
    categorySlug,
    category,
    page,
    level,
    countryBusinesses,
    stateBusinesses,
    cityBusinesses,
    currentList,
  } = getDirectoryContext(sortedBusinesses, params);

  const countryCounts = countBy(
    sortedBusinesses.map((business) => normalizeCode(business.address.countryCode)).filter(Boolean),
  );
  const stateCounts = countBy(
    countryBusinesses.map((business) => normalizeCode(business.address.stateCode)).filter(Boolean),
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

  const cityCounts = countBy(stateBusinesses.map((business) => getDirectoryBusinessCitySlug(business)).filter(Boolean));
  const cityNameBySlug = new Map(
    stateBusinesses.map((business) => [
      getDirectoryBusinessCitySlug(business),
      getCityDisplayName(
        business.address.cityDisplayName || business.address.city,
        business.address.countryCode || business.address.country,
      ) || "Cidade",
    ]),
  );

  const currentStateLabel = stateCode
    ? stateNameByCode.get(stateCode) || getStateDisplayName(countryCode, stateCode)
    : "";
  const currentCityLabel = cityNameBySlug.get(citySlug) || citySlug;
  const directoryInsights = level === "categoryBusinesses"
    ? null
    : getDirectoryInsights(sortedBusinesses, { countryCode, stateCode, citySlug });
  const relatedCities = level === "businesses"
    ? Array.from(cityCounts.entries())
      .filter(([slug]) => slug !== citySlug)
      .map(([slug, count]) => ({
        label: cityNameBySlug.get(slug) || slug,
        href: buildCityPagePath(countryCode, stateCode, slug, 1),
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
      .slice(0, 6)
    : [];
  const totalPages = Math.max(1, Math.ceil(currentList.length / DIRECTORY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageBusinesses = currentList.slice((safePage - 1) * DIRECTORY_PAGE_SIZE, safePage * DIRECTORY_PAGE_SIZE);

  useEffect(() => {
    if (!countryCode || !stateCode || !citySlug) return;
    let active = true;

    void resolveCanonicalLocationSlug(countryCode, stateCode, citySlug).then((canonicalCitySlug) => {
      if (!active || !canonicalCitySlug || canonicalCitySlug === citySlug) return;
      if (categorySlug) {
        navigate(buildCategoryPagePath(countryCode, stateCode, canonicalCitySlug, categorySlug, page), { replace: true });
      } else {
        navigate(buildCityPagePath(countryCode, stateCode, canonicalCitySlug, page), { replace: true });
      }
    });

    return () => {
      active = false;
    };
  }, [countryCode, stateCode, citySlug, categorySlug, page, navigate]);

  const pageMeta = useMemo(
    () => getDirectoryPageMeta(pathname, sortedBusinesses),
    [pathname, sortedBusinesses],
  );
  const title = pageMeta?.heading || "Neg\u00f3cios brasileiros no exterior por pa\u00eds";
  const categoryNotFound = !!categorySlug && (!category || (!loadingBusinesses && currentList.length < DIRECTORY_CATEGORY_MINIMUM_BUSINESSES));

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
        <div className="max-w-4xl">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {"Voltar para in\u00edcio"}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4">{title}</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            {category
              ? "Encontre " + category.label.toLocaleLowerCase("pt-BR") + " com endere\u00e7os, hor\u00e1rios, contatos e avalia\u00e7\u00f5es em " + currentCityLabel + "."
              : getDirectoryIntro(level, directoryInsights, {
                country: getCountryName(countryCode) || countryCode.toUpperCase(),
                state: currentStateLabel,
                city: currentCityLabel,
              })}
          </p>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2 text-sm" aria-label={"Navega\u00e7\u00e3o do diret\u00f3rio"}>
          <Link className="text-primary hover:underline" to="/negocios">{"Neg\u00f3cios"}</Link>
          {countryCode && (
            <>
              <span className="text-muted-foreground">/</span>
              <Link className="text-primary hover:underline" to={"/negocios/" + countryCode}>
                {getCountryName(countryCode) || countryCode.toUpperCase()}
              </Link>
            </>
          )}
          {countryCode && stateCode && (
            <>
              <span className="text-muted-foreground">/</span>
              <Link className="text-primary hover:underline" to={"/negocios/" + countryCode + "/" + stateCode}>
                {currentStateLabel || getStateDisplayName(countryCode, stateCode) || stateCode.toUpperCase()}
              </Link>
            </>
          )}
          {countryCode && stateCode && citySlug && (
            <>
              <span className="text-muted-foreground">/</span>
              <Link className="text-primary hover:underline" to={buildCityPagePath(countryCode, stateCode, citySlug, 1)}>
                {currentCityLabel}
              </Link>
            </>
          )}
          {category && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground">{category.label}</span>
            </>
          )}
        </nav>

        {!loadingBusinesses && directoryInsights && (
          <>
            <DirectorySummary insights={directoryInsights} />
            {level === "businesses" && (
              <DirectoryCategoryOverview
                title={"Categorias com página própria em " + currentCityLabel}
                insights={directoryInsights}
                getCategoryHref={(item) =>
                  buildCategoryPagePath(countryCode, stateCode, citySlug, item.slug || "", 1)
                }
              />
            )}
          </>
        )}

        {loadingBusinesses && directoryBusinesses.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-border bg-white p-6">
            <p className="text-sm text-muted-foreground">{"Carregando pa\u00edses com neg\u00f3cios publicados..."}</p>
          </section>
        ) : null}

        {categoryNotFound && !loadingBusinesses && (
          <section className="mt-8 rounded-2xl border border-border bg-white p-6">
            <h2 className="text-xl font-bold">{"P\u00e1gina n\u00e3o encontrada"}</h2>
            <p className="mt-2 text-muted-foreground">
              {"Esta categoria ainda n\u00e3o tem neg\u00f3cios suficientes publicados nesta cidade."}
            </p>
            <Link className="mt-4 inline-block text-primary hover:underline" to={buildCityPagePath(countryCode, stateCode, citySlug, 1)}>
              {"Ver todos os neg\u00f3cios da cidade"}
            </Link>
          </section>
        )}

        {level === "countries" && !loadingBusinesses && (
          <DirectoryGrid
            title={"Pa\u00edses"}
            items={Array.from(countryCounts.entries()).map(([code, count]) => ({
              label: getCountryName(code) || code.toUpperCase(),
              href: "/negocios/" + code,
              count,
            }))}
          />
        )}

        {level === "states" && !loadingBusinesses && (
          <DirectoryGrid
            title={"Estados e regi\u00f5es"}
            items={Array.from(stateCounts.entries()).map(([code, count]) => ({
              label: stateNameByCode.get(code) || getStateDisplayName(countryCode, code) || code.toUpperCase(),
              href: "/negocios/" + countryCode + "/" + code,
              count,
            }))}
          />
        )}

        {level === "cities" && !loadingBusinesses && (
          <DirectoryGrid
            title="Cidades"
            items={Array.from(cityCounts.entries()).map(([slug, count]) => ({
              label: cityNameBySlug.get(slug) || slug,
              href: "/negocios/" + countryCode + "/" + stateCode + "/" + slug,
              count,
            }))}
          />
        )}


        {level === "businesses" && !loadingBusinesses && relatedCities.length > 0 && (
          <DirectoryGrid title={"Outras cidades em " + currentStateLabel} items={relatedCities} />
        )}

        {(level === "businesses" || level === "categoryBusinesses") && !loadingBusinesses && !categoryNotFound && (
          <section className="mt-8 rounded-2xl border border-border bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <h2 className="font-bold text-foreground">
                {category ? category.label + " em " + currentCityLabel : "Neg\u00f3cios em " + currentCityLabel}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentList.length} {currentList.length === 1 ? "neg\u00f3cio publicado" : "neg\u00f3cios publicados"}
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
                  getPageHref={(pageNumber) =>
                    category
                      ? buildCategoryPagePath(countryCode, stateCode, citySlug, category.slug, pageNumber)
                      : buildCityPagePath(countryCode, stateCode, citySlug, pageNumber)
                  }
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

function formatDirectoryDate(value?: string) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "Sem registros";
  return new Intl.DateTimeFormat("pt-BR", {
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
function DirectorySummary({ insights }: { insights: DirectoryInsights }) {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-5">
      <h2 className="text-xl font-bold text-foreground">{"Panorama do diret\u00f3rio"}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-muted-foreground">{"Neg\u00f3cios publicados"}</dt>
          <dd className="mt-1 text-2xl font-extrabold text-foreground">{insights.totalBusinesses}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{"Tipos de neg\u00f3cio"}</dt>
          <dd className="mt-1 text-2xl font-extrabold text-foreground">{insights.totalActivities}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{"Neg\u00f3cios verificados"}</dt>
          <dd className="mt-1 text-2xl font-extrabold text-foreground">{insights.verifiedBusinesses}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{"\u00daltimo cadastro"}</dt>
          <dd className="mt-1 text-sm font-bold text-foreground">{formatDirectoryDate(insights.latestCreatedAt)}</dd>
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
              {item.count} {item.count === 1 ? "neg\u00f3cio" : "neg\u00f3cios"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
