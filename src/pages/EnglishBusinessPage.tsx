import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Clock, Globe, Mail, MapPin, Phone, Star } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import SiteHeaderAuthActions from "@/components/SiteHeaderAuthActions";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotFound from "@/pages/NotFound";
import { getBusinessBySlug, getCountryName, getStateDisplayName } from "@/services/businesses";
import type { BusinessFrontend } from "@/types/database";
import { getEnglishBusinessContent, hasEnglishBusinessTranslation } from "@/lib/businessEnglish";
import { getCityDisplayName } from "@/lib/locationDisplay";
import { getRichTextBlockClassName, sanitizeRichTextHtml } from "@/lib/richText";
import { DEFAULT_BUSINESS_LOGO } from "@/lib/images";
import { getCountryDisplayName } from "@/lib/locales";

type EnglishBusinessPageProps = {
  initialBusiness?: BusinessFrontend | null;
};

const PHOTO_PREVIEW_LIMIT = 6;

function getLocationLabel(business: BusinessFrontend): string {
  const address = business.address;
  return [
    getCityDisplayName(address.cityDisplayName || address.city, address.countryCode || address.country),
    getStateDisplayName(address.countryCode || address.country, address.stateCode, address.state),
    getCountryDisplayName(address.countryCode || "", getCountryName(address.countryCode || address.country) || address.country, "en"),
  ].filter(Boolean).join(", ");
}

export default function EnglishBusinessPage({ initialBusiness = null }: EnglishBusinessPageProps) {
  const { countryCode = "", stateCode = "", city = "", businessName = "" } = useParams();
  const { pathname } = useLocation();
  const initialMatchesRoute = Boolean(
    initialBusiness
    && hasEnglishBusinessTranslation(initialBusiness)
    && pathname === `/en/${countryCode}/${stateCode}/${city}/${businessName}`,
  );
  const [business, setBusiness] = useState<BusinessFrontend | null>(initialMatchesRoute ? initialBusiness : null);
  const [loading, setLoading] = useState(!initialMatchesRoute);

  useEffect(() => {
    let cancelled = false;

    async function loadBusiness() {
      setLoading(true);
      try {
        const loaded = await getBusinessBySlug(countryCode, stateCode, city, businessName);
        if (!cancelled) setBusiness(loaded && hasEnglishBusinessTranslation(loaded) ? loaded : null);
      } catch {
        if (!cancelled) setBusiness(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!initialMatchesRoute) void loadBusiness();
    return () => { cancelled = true; };
  }, [businessName, city, countryCode, initialMatchesRoute, stateCode]);

  if (loading && !business) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading business...</div>;
  if (!business || !hasEnglishBusinessTranslation(business)) return <NotFound />;

  const englishBusiness = getEnglishBusinessContent(business);
  const galleryPhotos = Array.from(new Set([...(business.photos || []), business.heroImage].filter(Boolean)));
  const locationLabel = getLocationLabel(business);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-24 sm:px-6 lg:px-8">
          <Link to="/en" className="flex items-center gap-3">
            <img src="/logo.webp" alt="Caramelinho logo" className="h-14 w-14 object-contain sm:h-[5.5rem] sm:w-[5.5rem]" />
            <div className="leading-tight">
              <div className="text-lg font-extrabold tracking-tight caramelo-text-gradient sm:text-2xl">Caramelinho</div>
              <div className="text-[10px] font-semibold text-foreground/75 sm:text-sm">YOUR BRAZILIAN BUSINESS FINDER ABROAD</div>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <SiteHeaderAuthActions className="flex items-center gap-1.5 sm:gap-3" compact />
          </div>
        </div>
      </header>

      <section className="relative h-[320px] overflow-hidden bg-slate-900 sm:h-[440px]">
        <img src={business.heroImage || business.logoUrl || DEFAULT_BUSINESS_LOGO} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl items-end gap-4 px-4 pb-8 text-white sm:px-6 lg:px-8">
          <img src={business.logoUrl || DEFAULT_BUSINESS_LOGO} alt={`${englishBusiness.name} logo`} className="h-24 w-24 rounded-2xl border-4 border-white bg-white object-cover shadow-lg sm:h-32 sm:w-32" />
          <div className="min-w-0">
            <p className="mb-2 text-sm font-semibold text-amber-200">Brazilian business</p>
            <h1 className="break-words text-3xl font-extrabold tracking-tight sm:text-5xl">{englishBusiness.name}</h1>
            {locationLabel ? <p className="mt-2 flex items-center gap-2 text-sm text-white/90 sm:text-base"><MapPin className="h-4 w-4" />{locationLabel}</p> : null}
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_340px] sm:px-6 lg:px-8">
        <div className="min-w-0 space-y-8">
          <section id="about">
            <h2 className="mb-3 text-2xl font-bold text-foreground">About {englishBusiness.name}</h2>
            <div className={`min-w-0 max-w-full break-words whitespace-pre-wrap [overflow-wrap:anywhere] text-muted-foreground leading-relaxed ${getRichTextBlockClassName()}`} dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(englishBusiness.description) }} />
          </section>

          {galleryPhotos.length ? (
            <section id="photos">
              <h2 className="mb-4 text-2xl font-bold text-foreground">Photos</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {galleryPhotos.slice(0, PHOTO_PREVIEW_LIMIT).map((photo, index) => (
                  <img key={photo} src={photo} alt={`${englishBusiness.name} photo ${index + 1}`} loading="lazy" decoding="async" className="aspect-square w-full rounded-xl object-cover" />
                ))}
              </div>
              {galleryPhotos.length > PHOTO_PREVIEW_LIMIT ? <p className="mt-3 text-sm text-muted-foreground">View the Portuguese page to browse all {galleryPhotos.length} photos.</p> : null}
            </section>
          ) : null}

          <section id="reviews">
            <h2 className="mb-4 text-2xl font-bold text-foreground">Reviews</h2>
            {business.reviews.length ? (
              <div className="space-y-3">
                {business.reviews.slice(0, 5).map((review) => (
                  <article key={review.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{review.user_name}</p>
                      <p className="flex items-center gap-1 text-sm font-semibold text-amber-600"><Star className="h-4 w-4 fill-current" />{review.rating}/5</p>
                    </div>
                    {review.comment ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{review.comment}</p> : null}
                  </article>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">This business has no reviews yet.</p>}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-foreground">Contact information</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              {locationLabel ? <p className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{locationLabel}</p> : null}
              {business.phone ? <a className="flex gap-3 hover:text-primary" href={`tel:${business.phone}`}><Phone className="mt-0.5 h-4 w-4 shrink-0" />{business.phone}</a> : <p className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0" />Phone not provided.</p>}
              {business.email ? <a className="flex gap-3 hover:text-primary" href={`mailto:${business.email}`}><Mail className="mt-0.5 h-4 w-4 shrink-0" />{business.email}</a> : <p className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0" />Email not provided.</p>}
              {business.website ? <a className="flex gap-3 break-all hover:text-primary" href={business.website} target="_blank" rel="noreferrer"><Globe className="mt-0.5 h-4 w-4 shrink-0" />{business.website}</a> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground"><Clock className="h-5 w-5 text-amber-600" />Opening hours</h2>
            {business.openingHours.length ? business.openingHours.map((line) => <p key={line} className="py-1 text-sm text-muted-foreground">{line}</p>) : <p className="text-sm text-muted-foreground">Opening hours not provided.</p>}
          </section>

          <Link to={`/${business.address.countryCode}/${business.address.stateCode}/${business.address.citySlug || business.address.city}/${business.slug}`} className="block text-center text-sm font-semibold text-primary hover:underline">
            View original page in Portuguese
          </Link>
        </aside>
      </main>

      <SiteFooter />
    </div>
  );
}