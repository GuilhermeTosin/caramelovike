import { useState, useEffect, type ReactNode } from "react";
import { useParams, useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  Clock,
  MapPin,
  Car,
  Star,
  Phone,
  Mail,
  Globe,
  PawPrint,
  ThumbsUp,
  Send,
  MessageCircle,
  Instagram,
  Facebook,
  Share2,
  Link2,
  CalendarDays,
  Ticket,
  Leaf,
  WheatOff,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { getSimilarBusinessesForBusiness, getBusinessBySlug, getBusinessByCountryAndSlug, getBusinessById, getCountryName, getStateDisplayName, addReview, updateReview, deleteReview, buildBusinessUrl, getCategoryId, getCategoryLabel } from "@/services/businesses";
import { getOrCreateConversation } from "@/services/messages";
import { getMyOwnershipRequests, hasPendingClaimForBusiness, requestBusinessOwnership } from "@/services/ownership";
import { trackBusinessClick } from "@/services/analytics";
import { createBusinessReport } from "@/services/reports";
import type { BusinessFrontend } from "@/types/database";
import { getRichTextBlockClassName, sanitizeRichTextHtml, stripRichTextHtml } from "@/lib/richText";
import { useAuth } from "@/contexts/AuthContext";
import SiteHeaderAuthActions from "@/components/SiteHeaderAuthActions";
import { Store } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import { setSeoMeta, setCanonical, setJsonLd, setRobots } from "@/lib/seo";
import { buildBusinessSeoDescription, buildBusinessSeoTitle } from "@/lib/seo/businessMeta";
import { getExternalLinkProps } from "@/lib/seo/externalLinks";
import { DEFAULT_BUSINESS_LOGO, getOptimizedImageSrcSet, getOptimizedImageUrl } from "@/lib/images";
import { calculateDistance } from "@/lib/utils/geo";
import NotFound from "@/pages/NotFound";
import { getSimilarBusinesses } from "@/lib/businessSimilar";
import { getCityDisplayName } from "@/lib/locationDisplay";
import { preloadBusinessPageAssets } from "@/pages/BusinessPagePrefetch";
import { formatDatePtBr, getMeaningfulUpdatedAt } from "@/lib/dates";
import {
  buildBusinessOfferCatalog,
  buildOpeningHoursSpecification,
  buildReviewStructuredData,
  getBusinessMenuUrl,
  getBusinessStructuredDataType,
} from "@/lib/seo/businessStructuredData";

type BusinessPageProps = {
  initialBusiness?: BusinessFrontend | null;
  initialBusinesses?: BusinessFrontend[];
  initialSimilarBusinesses?: BusinessFrontend[];
  previewMode?: boolean;
};

const SERVICE_PREVIEW_LIMIT = 6;
const MENU_PREVIEW_LIMIT = 6;
const REVIEWS_PER_PAGE = 5;
const PHOTO_PREVIEW_LIMIT = 6;

const BUSINESS_SECTION_IDS: Record<string, string> = {
  about: "sobre",
  services: "servicos",
  menu: "cardapio",
  photos: "fotos",
  promotions: "promocoes",
  events: "eventos",
  reviews: "avaliacoes",
};
type BusinessPageLocationState = {
  preloadedBusiness?: BusinessFrontend | null;
  preloadedSimilarBusinesses?: BusinessFrontend[];
} | null;

function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? <>{children}</> : null;
}


type BusinessPrimaryInfoProps = {
  business: BusinessFrontend;
  businessCityDisplayName: string;
  onWhatsApp: () => void;
  onSendMessage: () => void;
  onRoute: () => void;
  onExternalClick: (type: "phone" | "email" | "website") => void;
};

function BusinessPrimaryInfo({
  business,
  businessCityDisplayName,
  onWhatsApp,
  onSendMessage,
  onRoute,
  onExternalClick,
}: BusinessPrimaryInfoProps) {
  const country = getCountryName(business.address.countryCode || business.address.country);
  const state = business.address.stateCode || business.address.state
    ? getStateDisplayName(business.address.countryCode || business.address.country, business.address.stateCode || business.address.state, business.address.state)
    : "";

  return (
    <div className="space-y-6">
      {business.ownerVerified ? (
        <Card className="border-emerald-200 bg-emerald-50 p-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-help items-center gap-2">
                  <div className="rounded-full bg-emerald-100 p-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-semibold text-emerald-900">Negócio verificado</h3>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-sm leading-relaxed">
                Selo de autenticidade: este negócio foi validado pela equipe Caramelinho. Verificamos sua presença real e suas informações para oferecer uma experiência mais segura.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Card>
      ) : null}

      <Card className="border-border p-5">
        <h3 className="mb-4 font-semibold">Informações de contato</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="text-sm">
              {business.address.street ? <p>{business.address.street}</p> : null}
              <p className="text-muted-foreground">{businessCityDisplayName}{state ? `, ${state}` : ""}</p>
              <p className="text-muted-foreground">{country}{business.address.postalCode ? ` — ${business.address.postalCode}` : ""}</p>
            </div>
          </div>
          {business.phone ? (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a href={`tel:${business.phone}`} onClick={() => onExternalClick("phone")} className="text-sm text-primary hover:underline">{business.phone}</a>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Telefone não informado.</span>
            </div>
          )}
          {business.email ? (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a href={`mailto:${business.email}`} onClick={() => onExternalClick("email")} className="truncate text-sm text-primary hover:underline">{business.email}</a>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>E-mail não informado.</span>
            </div>
          )}
          {business.website ? (
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a
                href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                {...getExternalLinkProps({ allowFollow: business.allowFollowExternalLinks })}
                onClick={() => onExternalClick("website")}
                className="truncate text-sm text-primary hover:underline"
              >
                {business.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          ) : null}
        </div>

        <div className="mt-5 space-y-3 border-t border-border pt-5">
          {business.whatsapp ? (
            <Button onClick={onWhatsApp} className="h-11 w-full gap-2 border-0 bg-[#25D366] font-bold text-white hover:bg-[#20bd5a]">
              <MessageCircle className="h-5 w-5 fill-current" />
              WhatsApp
            </Button>
          ) : null}
          <Button onClick={onSendMessage} className="h-11 w-full gap-2 border-0 bg-amber-500 font-bold text-white hover:bg-amber-400">
            <Send className="h-4 w-4" />
            Enviar mensagem
          </Button>
          <Button onClick={onRoute} variant="outline" className="h-11 w-full gap-2 border-border hover:bg-secondary">
            <Car className="h-4 w-4" />
            Ver rota
          </Button>
        </div>
      </Card>

      <Card className="border-border p-5">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
          Horários
        </h3>
        {business.openingHours.length > 0 ? (
          <div className="space-y-2">
            {business.openingHours.map((line) => <p key={line} className="text-sm text-muted-foreground">{line}</p>)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Horários ainda não informados.</p>
        )}
      </Card>

    </div>
  );
}

export default function BusinessPage({ initialBusiness = null, initialBusinesses = [], initialSimilarBusinesses, previewMode = false }: BusinessPageProps = {}) {
  const { countryCode, stateCode, city, businessName, businessId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, user, refreshUnread } = useAuth();

  const routeState = location.state as BusinessPageLocationState;
  const currentPathname = location.pathname;
  const initialBusinessMatchesRoute =
    !!initialBusiness &&
    !previewMode &&
    buildBusinessUrl(initialBusiness) === currentPathname;
  // Browser history can retain a lightweight preloaded business after a full reload.
  // Prefer the SSR payload for this route so the first client render matches the HTML.
  const seededBusiness = initialBusinessMatchesRoute ? initialBusiness : routeState?.preloadedBusiness || null;
  const hasServerSimilarBusinesses = initialBusinessMatchesRoute && Array.isArray(initialSimilarBusinesses);
  const hasPreloadedSimilarBusinesses = !initialBusinessMatchesRoute && (routeState?.preloadedSimilarBusinesses?.length ?? 0) > 0;
  const hasInitialBusinessPool = !initialBusinessMatchesRoute && !!routeState?.preloadedBusiness && initialBusinesses.length > 0;
  const currentBusinessIsInPool = !!seededBusiness && initialBusinesses.some((item) => item.id === seededBusiness.id);
  const pooledSimilarBusinesses = hasInitialBusinessPool && currentBusinessIsInPool && seededBusiness
    ? getSimilarBusinesses(seededBusiness, initialBusinesses)
    : [];
  const hasUsableBusinessPool = currentBusinessIsInPool && pooledSimilarBusinesses.length > 0;
  const hasInitialSimilarBusinesses = hasServerSimilarBusinesses || hasPreloadedSimilarBusinesses || hasUsableBusinessPool;
  const seededSimilarBusinesses = hasServerSimilarBusinesses
    ? initialSimilarBusinesses || []
    : hasPreloadedSimilarBusinesses
      ? routeState?.preloadedSimilarBusinesses || []
      : hasUsableBusinessPool
        ? pooledSimilarBusinesses
        : [];

  const [business, setBusiness] = useState<BusinessFrontend | null>(seededBusiness);
  const [loading, setLoading] = useState(!seededBusiness);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(-1);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState("");
  const [sendingReview, setSendingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editComment, setEditComment] = useState("");
  const [savingEditReview, setSavingEditReview] = useState(false);
  const [hasPendingOwnershipRequest, setHasPendingOwnershipRequest] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllMenuItems, setShowAllMenuItems] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);

  const businessCityDisplayName = getCityDisplayName(
    business?.address.cityDisplayName || business?.address.city,
    business?.address.countryCode || business?.address.country,
  );
  const isOnlineOnly = business?.attendanceType === "online";
  const [requestingOwnership, setRequestingOwnership] = useState(false);
  const [similarBusinesses, setSimilarBusinesses] = useState<BusinessFrontend[]>(seededSimilarBusinesses);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<"fake" | "difamacao" | "golpe" | "conteudo_ofensivo" | "outro">("fake");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const [canUseNativeShare, setCanUseNativeShare] = useState(false);
  const activePromotions = (business?.promotions || []).filter((promotion) => {
    if (!promotion?.expiresAt) return false;
    return promotion.expiresAt >= new Date().toISOString().slice(0, 10);
  });
  const hasServiceItems =
    !!business &&
    (
      (business.serviceItems && business.serviceItems.length > 0) ||
      (business.services && business.services.length > 0)
    );
  const upcomingEvents = (business?.events || [])
    .filter((evt) => {
      if (!evt?.date) return false;
      return evt.date >= new Date().toISOString().slice(0, 10);
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const requestedTab = searchParams.get("tab");
  const hasSearchLocationContext =
    !!searchParams.get("origem_lat") ||
    !!searchParams.get("origem_lng") ||
    !!searchParams.get("lat") ||
    !!searchParams.get("lng") ||
    !!searchParams.get("cidade") ||
    !!searchParams.get("local");
  const galleryPhotos = (business?.photos || []).slice(0, 8);
  const heroImageSource = business?.heroImage || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80";
  const heroImagePreviewUrl = getOptimizedImageUrl(heroImageSource, { width: 96, quality: 35, format: "webp" });
  const heroImageUrl = getOptimizedImageUrl(heroImageSource, { width: 960, quality: 72, format: "webp" });
  const heroImageSrcSet = getOptimizedImageSrcSet(heroImageSource, [480, 640, 800, 960], 72);
  const serviceEntries = business
    ? (business.serviceItems?.length
        ? business.serviceItems
        : business.services.map((name) => ({ name, description: "", price: "" })))
    : [];
  const menuEntries = business?.menu || [];
  const reviewPageCount = Math.max(1, Math.ceil((business?.reviews.length || 0) / REVIEWS_PER_PAGE));
  const currentReviewPage = Math.min(reviewPage, reviewPageCount);
  const visibleReviews = (business?.reviews || []).slice(
    (currentReviewPage - 1) * REVIEWS_PER_PAGE,
    currentReviewPage * REVIEWS_PER_PAGE,
  );

  const loadBusiness = async () => {
    let biz: BusinessFrontend | null = null;
    if (previewMode && businessId) {
      biz = await getBusinessById(businessId, { includeUnapproved: true });
    } else if (countryCode && stateCode && city && businessName) {
      biz = await getBusinessBySlug(countryCode, stateCode, city, businessName);
    } else if (countryCode && businessName) {
      biz = await getBusinessByCountryAndSlug(countryCode, businessName);
    }
    setBusiness((current) => {
      if (!biz) return null;
      if (current?.id === biz.id && current.reviews.length > biz.reviews.length) {
        return { ...biz, reviews: current.reviews, averageRating: current.averageRating };
      }
      return biz;
    });
    setLoading(false);
    if (biz && !hasInitialSimilarBusinesses) {
      setSimilarBusinesses(await getSimilarBusinessesForBusiness(biz));
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setBusiness(seededBusiness);
    setLoading(!seededBusiness);
    setSelectedPhoto(null);
    setSelectedPhotoIndex(-1);
    setSimilarBusinesses(seededSimilarBusinesses);
    setShowAllServices(false);
    setShowAllMenuItems(false);
    setShowAllPhotos(false);
    setReviewPage(1);
    let active = true;
    // The SSR payload is the source of truth during hydration. Refetching it
    // immediately can return a differently-permitted review set and break the
    // server/client markup before the page becomes interactive.
    if (!initialBusinessMatchesRoute) {
      Promise.resolve().then(() => {
        if (active) void loadBusiness();
      });
    }
    return () => {
      active = false;
    };
  }, [previewMode, businessId, countryCode, stateCode, city, businessName, initialBusinesses, initialSimilarBusinesses]);

  useEffect(() => {
    setCanUseNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!business || !requestedTab) return;
    const sectionId = BUSINESS_SECTION_IDS[requestedTab];
    if (!sectionId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [business?.id, requestedTab]);

  useEffect(() => {
    if (!business || previewMode) return;
    const canonicalPath = buildBusinessUrl(business);
    if (location.pathname !== canonicalPath) {
      navigate(`${canonicalPath}${location.search}`, { replace: true });
    }
  }, [business, previewMode, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!business) {
      setSeoMeta(
        "Negócio brasileiro",
        "Encontre negócios perto de você."
      );
      return;
    }
    setSeoMeta(
      buildBusinessSeoTitle(business),
      buildBusinessSeoDescription(business)
    );
  }, [business, isOnlineOnly]);

  useEffect(() => {
    if (!selectedPhoto || !business) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPhoto(null);
        setSelectedPhotoIndex(-1);
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const photos = (business.photos || []).slice(0, 8);
      if (!photos.length) return;
      event.preventDefault();
      const current = selectedPhotoIndex >= 0 ? selectedPhotoIndex : photos.findIndex((p) => p === selectedPhoto);
      const safeCurrent = current >= 0 ? current : 0;
      const nextIndex =
        event.key === "ArrowRight"
          ? (safeCurrent + 1) % photos.length
          : (safeCurrent - 1 + photos.length) % photos.length;
      setSelectedPhotoIndex(nextIndex);
      setSelectedPhoto(photos[nextIndex]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPhoto, selectedPhotoIndex, business]);

  useEffect(() => {
    if (!business) return;

    const canonicalUrl = `${window.location.origin}${buildBusinessUrl(business)}`;
    setCanonical(canonicalUrl);
    setRobots("index,follow,max-image-preview:large");

    const structuredReviews = buildReviewStructuredData(business.reviews);
    const openingHoursSpecification = buildOpeningHoursSpecification(business.openingHours);
    const localBusinessJsonLd = {
      "@context": "https://schema.org",
      "@type": getBusinessStructuredDataType(business),
      name: business.name,
      description: stripRichTextHtml(business.description) || undefined,
      image: [business.heroImage, business.logoUrl, ...(business.photos || []).slice(0, 8)].filter(Boolean),
      menu: getBusinessMenuUrl(business.menuPdfUrl),
      hasOfferCatalog: buildBusinessOfferCatalog(business),
      url: canonicalUrl,
      telephone: business.phone || undefined,
      email: business.email || undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: business.address.street || undefined,
        addressLocality: business.address.city || undefined,
        addressRegion: business.address.state || undefined,
        postalCode: business.address.postalCode || undefined,
        addressCountry: business.address.countryCode?.toUpperCase() || undefined,
      },
      geo:
        Number.isFinite(business.address.lat) && Number.isFinite(business.address.lng)
          ? {
              "@type": "GeoCoordinates",
              latitude: business.address.lat,
              longitude: business.address.lng,
            }
          : undefined,
      sameAs: [business.instagram, business.facebook, business.website].filter(Boolean),
      aggregateRating:
        business.reviews.length > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: Number(business.averageRating.toFixed(1)),
              reviewCount: business.reviews.length,
            }
          : undefined,
      review: structuredReviews.length ? structuredReviews : undefined,
      openingHoursSpecification: openingHoursSpecification.length ? openingHoursSpecification : undefined,
      areaServed: business.address.countryCode || business.address.country
        ? {
            "@type": "Country",
            name: getCountryName(business.address.countryCode || business.address.country),
          }
        : undefined,
    };

    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Início",
          item: `${window.location.origin}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Buscar",
          item: `${window.location.origin}/buscar`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: business.name,
          item: canonicalUrl,
        },
      ],
    };

    setJsonLd("business-local", localBusinessJsonLd);
    setJsonLd("business-breadcrumb", breadcrumbJsonLd);
  }, [business, location.pathname]);

  useEffect(() => {
    if (!previewMode) return;
    setCanonical(`${window.location.origin}${location.pathname}`);
    setRobots("noindex,nofollow,noarchive");
  }, [previewMode, location.pathname]);

  useEffect(() => {
    if (!session || !business || session.userId === business.ownerId) {
      return;
    }

    getMyOwnershipRequests().then((requests) => {
      setHasPendingOwnershipRequest(hasPendingClaimForBusiness(requests, business));
    });
  }, [business, session]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewRating === 0) {
      toast.error("Selecione uma avaliação de 1 a 5 estrelas");
      return;
    }
    if (!business || !session) {
      toast.error("Faça login para avaliar");
      navigate(`/entrar?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    if ((business.reviews || []).some((r) => r.user_id === session.userId)) {
      toast.error("Você já avaliou este negócio. Edite sua avaliação existente.");
      return;
    }

    setSendingReview(true);

    const reviewData = {
      userId: session.userId,
      userName: session.name,
      rating: reviewRating as 1 | 2 | 3 | 4 | 5,
      comment: reviewComment,
    };

    const success = await addReview(business.id, reviewData);
    if (success) {
      // Recarregar o negócio para mostrar a nova avaliação
      await loadBusiness();
      toast.success("Avaliação enviada com sucesso!");
    } else {
      toast.error("Erro ao enviar avaliação.");
    }

    setSendingReview(false);
    setReviewRating(0);
    setReviewComment("");
  };

  const handleSendMessage = async () => {
    if (!session) {
      toast.info("Faça login para enviar mensagem");
      navigate(`/entrar?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    if (!business) return;
    trackBusinessClick(business.id, "internal_message", session.userId);
    
    if (session.userId === business.ownerId) {
      toast.info("Este é o seu próprio negócio!");
      navigate("/perfil?tab=mensagens");
      return;
    }

    const conv = await getOrCreateConversation(
      session.userId,
      business.ownerId,
      business.id,
      business.name
    );
    if (conv) {
      refreshUnread();
      navigate("/perfil?tab=mensagens");
      toast.success(`Conversa com ${business.ownerName} iniciada!`);
    } else {
      toast.error("Erro ao iniciar conversa.");
    }
  };

  const startEditReview = (review: BusinessFrontend["reviews"][0]) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditComment("");
  };

  const handleSaveEditReview = async () => {
    if (!editingReviewId) return;
    if (editRating === 0) {
      toast.error("Selecione uma avaliação de 1 a 5 estrelas");
      return;
    }
    setSavingEditReview(true);
    const ok = await updateReview(editingReviewId, {
      rating: editRating as 1 | 2 | 3 | 4 | 5,
      comment: editComment,
    });
    if (ok) {
      await loadBusiness();
      toast.success("Avaliação atualizada!");
      cancelEditReview();
    } else {
      toast.error("Erro ao atualizar avaliação.");
    }
    setSavingEditReview(false);
  };

  const handleDeleteOwnReview = async (reviewId: string) => {
    if (!confirm("Tem certeza que deseja remover sua avaliação?")) return;
    const ok = await deleteReview(reviewId);
    if (ok) {
      await loadBusiness();
      toast.success("Avaliação removida!");
      if (editingReviewId === reviewId) cancelEditReview();
    } else {
      toast.error("Erro ao remover avaliação.");
    }
  };

  const handleWhatsApp = () => {
    if (!business?.whatsapp) return;
    trackBusinessClick(business.id, "whatsapp", session?.userId);
    const wpp = business.whatsapp.replace(/\s+/g, "").replace(/[^0-9]/g, "");
    const text = encodeURIComponent(`Olá! Vi seu negócio no Caramelinho.com: ${business.name}`);
    window.open(`https://wa.me/${wpp}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleRoute = () => {
    if (!business) return;
    if (isOnlineOnly) {
      toast.info("Este negócio atende somente online.");
      return;
    }
    trackBusinessClick(business.id, "route", session?.userId);
    const query = business.address.lat && business.address.lng
      ? `${business.address.lat},${business.address.lng}`
      : [business.address.street, business.address.city, getCountryName(business.address.countryCode || business.address.country)].filter(Boolean).join(", ");
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleExternalClick = (type: "phone" | "email" | "website") => {
    if (!business) return;
    trackBusinessClick(business.id, type, session?.userId);
  };

  const handleOpenPdfPrivately = async (pdfUrl: string) => {
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("Falha ao carregar PDF");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      console.error("Erro ao abrir PDF privado:", error);
      toast.error("Não foi possível abrir o PDF agora.");
    }
  };

  const handleRequestOwnership = async () => {
    if (!session) {
      toast.info("Crie uma conta ou entre para reivindicar este negócio.");
      navigate(`/entrar?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    if (!business || session.userId === business.ownerId) return;

    setRequestingOwnership(true);
    const result = await requestBusinessOwnership(
      business.id,
      `Solicitação enviada pela página pública do negócio ${business.name}.`
    );
    setRequestingOwnership(false);

    if (result.ok) {
      setHasPendingOwnershipRequest(true);
      toast.success("Solicitação enviada. Vamos revisar e transferir o negócio quando confirmado.");
    } else {
      toast.error(result.error || "Não foi possível enviar a solicitação.");
    }
  };

  const pageOrigin = typeof window !== "undefined" ? window.location.origin : "https://www.caramelinho.com";
  const shareUrl = business ? `${pageOrigin}${buildBusinessUrl(business)}` : "";

  const handleCopyLink = async () => {
    if (!business) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleNativeShare = async () => {
    if (!canUseNativeShare || !business) return;
    try {
      await navigator.share({
        title: business.name,
        text: `Confira este negócio no Caramelinho: ${business.name}`,
        url: shareUrl,
      });
    } catch {
      // cancelado pelo usuário
    }
  };

  const handleSubmitReport = async () => {
    if (!business) return;
    setReporting(true);
    const result = await createBusinessReport({
      businessId: business.id,
      reason: reportReason,
      details: reportDetails,
    });
    setReporting(false);
    if (!result.ok) {
      toast.error(result.error || "Não foi possível enviar denúncia.");
      return;
    }
    toast.success("Denúncia enviada para análise.");
    setReportDetails("");
    setReportReason("fake");
    setReportOpen(false);
  };

  const canRequestOwnership =
    !!business &&
    (!session || session.userId !== business.ownerId);
  const reviewBreakdown = getReviewBreakdown(business?.reviews || []);
  const hasUserReview =
    !!session?.userId &&
    (business?.reviews || []).some((r) => r.user_id === session.userId);

  if (loading && !business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <PawPrint className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return <NotFound />;
  }

  const meaningfulUpdatedAt = getMeaningfulUpdatedAt(business.updatedAt, business.createdAt);
  const businessActivityDate = meaningfulUpdatedAt || business.createdAt;
  const businessActivityLabel = meaningfulUpdatedAt ? "Informações atualizadas em" : "Perfil publicado em";


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-24">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-14 h-14 sm:w-[5.5rem] sm:h-[5.5rem] flex items-center justify-center">
                <img src="/logo.webp" alt="Caramelinho logo" className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="font-extrabold text-lg sm:text-2xl tracking-tight caramelo-text-gradient truncate">Caramelinho</div>
                <div className="text-[10px] sm:text-sm font-semibold text-foreground/75 whitespace-nowrap overflow-hidden text-ellipsis">{"O SEU FARO FORA DO BRASIL"}</div>
              </div>
            </Link>
            <SiteHeaderAuthActions className="flex items-center gap-1.5 sm:gap-3" compact />
          </div>
        </div>
      </header>

      <div className="relative h-[400px] sm:h-[500px] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
        <img
          src={heroImagePreviewUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 z-0 w-full h-full object-cover scale-110 blur-2xl opacity-85 pointer-events-none"
          loading="eager"
          fetchpriority="low"
          decoding="async"
        />
        <img
          key={business.id}
          src={heroImageUrl}
          srcSet={heroImageSrcSet || undefined}
          sizes="100vw"
          alt={business.name}
          className="absolute inset-0 z-10 w-full h-full object-cover pointer-events-none"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 z-30 p-6 sm:p-10">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-end gap-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-white bg-white shrink-0">
              <img src={business.logoUrl || DEFAULT_BUSINESS_LOGO} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-white mb-2">
              <Badge className="mb-3 bg-white/20 text-white border-0 hover:bg-white/30 rounded-lg px-3 py-1">
                {getCategoryLabel(business.category)}
              </Badge>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-2">{business.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base text-white/90">
                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full border border-white/10">
                  <MapPin className="w-4 h-4 text-primary" />
                  {`${businessCityDisplayName}${getCountryName(business.address.countryCode || business.address.country) ? `, ${getCountryName(business.address.countryCode || business.address.country)}` : ""}`}
                </div>
                {business.averageRating > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-500 px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold">{business.averageRating.toFixed(1)}</span>
                    <span className="text-white/80 font-normal">({business.reviews.length} {business.reviews.length === 1 ? "avaliação" : "avaliações"})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 min-w-0">
            <div className="w-full">
              <div className="sticky top-16 z-30 sm:top-24 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur sm:mx-0 sm:px-0">
                <div className="overflow-x-auto scrollbar-hide">
              <nav aria-label="Seções do negócio" className="flex w-max min-w-full items-center justify-start bg-transparent">
                <a href="#sobre" className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-amber-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                  Sobre
                </a>
                <a href="#fotos" className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-amber-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                  Fotos
                </a>


              {getCategoryId(business.category) !== "food" && hasServiceItems && (
                  <a href="#servicos" className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-amber-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                    Serviços
                  </a>
                )}
                {(business.menu && business.menu.length > 0) || !!business.menuPdfUrl ? (
                  <a href="#cardapio" className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-amber-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                    Cardápio
                  </a>
                ) : null}

                {activePromotions.length > 0 && (
                  <a href="#promocoes" className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-amber-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                    Promoções
                  </a>
                )}
                {upcomingEvents.length > 0 && (
                  <a href="#eventos" className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-amber-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-amber-600" />
                      Eventos
                      <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                        Novo
                      </span>
                    </span>
                  </a>
                )}
                <a href="#avaliacoes" className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-amber-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                  Avaliações
                </a>
              </nav>
                </div>
                <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
              </div>

              <section id="sobre" className="scroll-mt-32 border-b sm:scroll-mt-40 border-border/70 py-8 first:pt-6 last:border-b-0">
                <h2 className="text-xl font-bold text-foreground mb-3">Sobre {business.name}</h2>
                {business.categoryId === "food" && (business.isVeganFriendly || business.isVegetarianFriendly || business.isGlutenFreeFriendly) ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {business.isVeganFriendly ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        <Leaf className="w-3.5 h-3.5" />
                        Vegano
                      </span>
                    ) : null}
                    {business.isVegetarianFriendly ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-lime-100 text-lime-800">
                        <Leaf className="w-3.5 h-3.5" />
                        Vegetariano
                      </span>
                    ) : null}
                    {business.isGlutenFreeFriendly ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                        <WheatOff className="w-3.5 h-3.5" />
                        Sem Glúten
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div
                  className={
                    "min-w-0 max-w-full break-words whitespace-pre-wrap [overflow-wrap:anywhere] text-muted-foreground leading-relaxed " +
                    getRichTextBlockClassName()
                  }
                  dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(business.description) }}
                />

                <div className="mt-6 lg:hidden">
                  <BusinessPrimaryInfo
                    business={business}
                    businessCityDisplayName={businessCityDisplayName}
                    onWhatsApp={handleWhatsApp}
                    onSendMessage={handleSendMessage}
                    onRoute={handleRoute}
                    onExternalClick={handleExternalClick}
                  />
                </div>

              </section>

              <section id="fotos" className="scroll-mt-32 border-b sm:scroll-mt-40 border-border/70 py-8">
                <h2 className="mb-4 text-xl font-bold text-foreground">Fotos</h2>
                {galleryPhotos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma foto disponível.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {galleryPhotos.slice(0, showAllPhotos ? galleryPhotos.length : PHOTO_PREVIEW_LIMIT).map((photo, index) => (
                        <button
                          key={photo}
                          type="button"
                          onClick={() => {
                            setSelectedPhoto(photo);
                            setSelectedPhotoIndex(index);
                          }}
                          className="group relative aspect-square overflow-hidden rounded-lg"
                        >
                          <img
                            src={photo}
                            alt={`Foto de ${business.name}`}
                            width={640}
                            height={640}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                        </button>
                      ))}
                    </div>
                    {galleryPhotos.length > PHOTO_PREVIEW_LIMIT && !showAllPhotos ? (
                      <div className="relative mt-3 h-20 overflow-hidden rounded-lg border border-border bg-secondary/30">
                        <div aria-hidden="true" className="grid grid-cols-2 gap-3 p-1.5 opacity-60 blur-[1.5px] sm:grid-cols-3">
                          {galleryPhotos.slice(PHOTO_PREVIEW_LIMIT).map((photo) => (
                            <img key={photo} src={photo} alt="" loading="lazy" decoding="async" className="aspect-square w-full scale-105 object-cover" />
                          ))}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-background/20 via-background/65 to-background/95">
                          <Button type="button" size="sm" variant="secondary" className="shadow-sm" onClick={() => setShowAllPhotos(true)}>
                            Ver todas as {galleryPhotos.length} fotos
                          </Button>
                        </div>
                      </div>
                    ) : galleryPhotos.length > PHOTO_PREVIEW_LIMIT ? (
                      <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => setShowAllPhotos(false)}>
                        Mostrar menos fotos
                      </Button>
                    ) : null}
                  </>
                )}
              </section>

              {getCategoryId(business.category) !== "food" && hasServiceItems && (
                <section id="servicos" className="scroll-mt-32 border-b sm:scroll-mt-40 border-border/70 py-8 first:pt-6 last:border-b-0">
                  <h2 className="text-xl font-bold text-foreground mb-4">Serviços</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {serviceEntries.map((service, idx) => (
                      <div key={`${service.name}-${idx}`} className={`${!showAllServices && idx >= SERVICE_PREVIEW_LIMIT ? "hidden" : ""} p-3 rounded-lg bg-secondary/50 border border-border`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <ThumbsUp className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">{service.name}</p>
                              {service.description ? (
                                <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                              ) : null}
                            </div>
                          </div>
                          {hasMeaningfulPrice(service.price) ? (
                            <span className="text-sm font-bold text-primary">{service.price}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  {serviceEntries.length > SERVICE_PREVIEW_LIMIT ? (
                    <Button type="button" variant="outline" size="sm" className="mt-4" aria-expanded={showAllServices} onClick={() => setShowAllServices((current) => !current)}>
                      {showAllServices ? "Mostrar menos" : `Ver todos os ${serviceEntries.length} serviços`}
                    </Button>
                  ) : null}
                </section>
              )}

              {(business.menu && business.menu.length > 0) || !!business.menuPdfUrl ? (
                <section id="cardapio" className="scroll-mt-32 border-b sm:scroll-mt-40 border-border/70 py-8 first:pt-6 last:border-b-0">
                  <h2 className="text-xl font-bold text-foreground mb-4">Cardápio</h2>
                  {business.menuPdfUrl && (
                    <div className="mb-4">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenPdfPrivately(business.menuPdfUrl!)}
                      >
                        Acessar cardápio completo
                      </Button>
                    </div>
                  )}
                  {business.menu && business.menu.length > 0 ? (
                    <div className="space-y-2">
                      {menuEntries.map((item, idx) => (
                        <div key={`${item.name}-${idx}`} className={`${!showAllMenuItems && idx >= MENU_PREVIEW_LIMIT ? "hidden" : ""} flex items-start justify-between p-3 rounded-lg border border-border bg-card`}>
                          <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          </div>
                          {hasMeaningfulPrice(item.price) ? (
                            <span className="font-bold text-primary ml-4 flex-shrink-0">{item.price}</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {menuEntries.length > MENU_PREVIEW_LIMIT ? (
                    <Button type="button" variant="outline" size="sm" className="mt-4" aria-expanded={showAllMenuItems} onClick={() => setShowAllMenuItems((current) => !current)}>
                      {showAllMenuItems ? "Mostrar menos" : `Ver todos os ${menuEntries.length} itens`}
                    </Button>
                  ) : null}
                </section>
              ) : null}

              {activePromotions.length > 0 && (
                <section id="promocoes" className="scroll-mt-32 border-b sm:scroll-mt-40 border-border/70 py-8 first:pt-6 last:border-b-0">
                  <h2 className="text-xl font-bold text-foreground mb-4">Promoções</h2>
                  <div className="space-y-2">
                    {activePromotions.map((promotion, idx) => (
                      <Card key={`${promotion.code}-${idx}`} className="p-5 border-border">
                        <h3 className="font-semibold text-lg">{promotion.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{promotion.description}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {promotion.code?.trim() ? (
                            <span className="inline-flex items-center rounded-md bg-amber-100 text-amber-900 px-3 py-1 text-sm font-bold">
                              Cupom: {promotion.code}
                            </span>
                          ) : null}
                          <span className="text-sm text-muted-foreground">
                            Válido até: {formatDatePtBr(promotion.expiresAt)}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {upcomingEvents.length > 0 && (
                <section id="eventos" className="scroll-mt-32 border-b sm:scroll-mt-40 border-border/70 py-8 first:pt-6 last:border-b-0">
                  <h2 className="text-xl font-bold text-foreground mb-4">Próximos eventos</h2>
                  <div className="space-y-4">
                    {upcomingEvents.map((event, idx) => (
                      <Card key={`${event.title}-${event.date}-${idx}`} className="p-5 border-border">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {event.flyerUrl ? (
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto(event.flyerUrl || null)}
                              title="Abrir flyer em tamanho real"
                              className="block"
                            >
                              <img
                                src={event.flyerUrl}
                                alt={`Flyer do evento ${event.title}`}
                                className="w-full sm:w-40 h-32 rounded-lg object-cover border border-border cursor-zoom-in"
                              />
                            </button>
                          ) : null}
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            {event.description ? (
                              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{event.description}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-3 text-sm">
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 text-amber-900 px-2.5 py-1">
                                <CalendarDays className="w-4 h-4" />
                                {formatDatePtBr(event.date)}
                              </span>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                                {...getExternalLinkProps()}
                                className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 hover:bg-secondary/80"
                                title="Abrir no Google Maps"
                              >
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </a>
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 text-emerald-900 px-2.5 py-1 font-medium">
                                <Ticket className="w-4 h-4" />
                                {event.isFree ? "Entrada franca" : (event.price || "Evento pago")}
                              </span>
                              {event.ticketUrl?.trim() ? (
                                <a
                                  href={event.ticketUrl}
                                  {...getExternalLinkProps()}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-2.5 py-1 font-medium hover:opacity-90"
                                >
                                  <Ticket className="w-4 h-4" />
                                  Comprar ingressos
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              <section id="avaliacoes" className="scroll-mt-32 border-b sm:scroll-mt-40 border-border/70 py-8 first:pt-6 last:border-b-0">
                <h2 className="text-xl font-bold text-foreground mb-6">Avaliações</h2>
                <Card className="p-5 mb-6 border-border">
                  <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
                    <div className="text-center sm:w-32">
                      <div className="text-4xl font-bold">{business.averageRating.toFixed(1)}</div>
                      <div className="flex justify-center text-amber-500 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < Math.round(business.averageRating) ? "fill-current" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{business.reviews.length} {business.reviews.length === 1 ? "avaliação" : "avaliações"}</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="flex items-center gap-2 text-xs">
                          <span className="w-16 flex items-center gap-1 whitespace-nowrap">
                            <span className="w-2 text-right tabular-nums">{rating}</span>
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          </span>
                          <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full bg-amber-500"
                              style={{ width: `${business.reviews.length ? (reviewBreakdown[rating] / business.reviews.length) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="w-5 text-right text-muted-foreground">{reviewBreakdown[rating]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <ClientOnly>
                  <Card className="p-5 mb-6 border-border bg-secondary/30">
                  <h3 className="font-semibold text-sm mb-3">Deixe sua avaliação</h3>
                  {hasUserReview && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Você já avaliou este negócio. Para alterar, use "Editar minha avaliação" na sua avaliação abaixo.
                    </p>
                  )}
                  <form onSubmit={handleReviewSubmit}>
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          disabled={hasUserReview}
                          className={`p-1 transition-colors ${
                            star <= reviewRating ? "text-amber-500" : "text-muted-foreground/30"
                          } hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed`}
                          aria-label={`${star} estrelas`}
                        >
                          <Star className="w-6 h-6 fill-current" />
                        </button>
                      ))}
                      {reviewRating > 0 && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          {reviewRating} de 5 estrelas
                        </span>
                      )}
                    </div>
                    <Textarea
                      placeholder="Conte sua experiência..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="mb-3 min-h-[80px]"
                      disabled={hasUserReview}
                    />
                    <Button type="submit" size="sm" className="caramelo-gradient text-white border-0" disabled={sendingReview || hasUserReview}>
                      {sendingReview ? "Enviando..." : "Enviar Avaliação"}
                    </Button>
                    </form>
                  </Card>
                </ClientOnly>

                <div className="space-y-4">
                  {business.reviews.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhuma avaliação ainda. Seja o primeiro!</p>
                  ) : (
                    visibleReviews.map((review) => (
                      <div key={review.id} className="p-4 rounded-lg border border-border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                              {review.user_avatar || (review.user_id === session?.userId && user?.avatar) ? (
                                <img
                                  src={review.user_avatar || user?.avatar || ""}
                                  alt={review.user_name}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                review.user_name.charAt(0)
                              )}
                            </div>
                            <div>
                              <span className="font-medium text-sm">{review.user_name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatDatePtBr(review.created_at || (review as any).createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center text-amber-500 text-sm">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < review.rating ? "fill-current" : "text-muted-foreground/20"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {editingReviewId === review.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setEditRating(star)}
                                  className={`p-1 transition-colors ${
                                    star <= editRating ? "text-amber-500" : "text-muted-foreground/30"
                                  } hover:text-amber-400`}
                                  aria-label={`${star} estrelas`}
                                >
                                  <Star className="w-5 h-5 fill-current" />
                                </button>
                              ))}
                            </div>
                            <Textarea
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              className="min-h-[80px]"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveEditReview} disabled={savingEditReview}>
                                {savingEditReview ? "Salvando..." : "Salvar"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditReview} disabled={savingEditReview}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">{review.comment}</p>
                            {session?.userId && review.user_id === session.userId && (
                              <div className="mt-3 flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => startEditReview(review)}>
                                  Editar minha avaliação
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => handleDeleteOwnReview(review.id)}
                                >
                                  Remover minha avaliação
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {reviewPageCount > 1 ? (
                  <nav aria-label="Paginação das avaliações" className="mt-5 flex items-center justify-center gap-3">
                    <Button type="button" variant="outline" size="sm" disabled={currentReviewPage === 1} onClick={() => setReviewPage((page) => Math.max(1, page - 1))}>
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground" aria-live="polite">
                      Página {currentReviewPage} de {reviewPageCount}
                    </span>
                    <Button type="button" variant="outline" size="sm" disabled={currentReviewPage === reviewPageCount} onClick={() => setReviewPage((page) => Math.min(reviewPageCount, page + 1))}>
                      Próxima
                    </Button>
                  </nav>
                ) : null}
              </section>
            </div>

            {selectedPhoto && (
              <div
                className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                onClick={() => {
                  setSelectedPhoto(null);
                  setSelectedPhotoIndex(-1);
                }}
              >
                {galleryPhotos.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const current = selectedPhotoIndex >= 0 ? selectedPhotoIndex : galleryPhotos.findIndex((p) => p === selectedPhoto);
                      const safeCurrent = current >= 0 ? current : 0;
                      const nextIndex = (safeCurrent - 1 + galleryPhotos.length) % galleryPhotos.length;
                      setSelectedPhotoIndex(nextIndex);
                      setSelectedPhoto(galleryPhotos[nextIndex]);
                    }}
                    className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/70 border border-white/35 hover:bg-black/85 hover:border-white/70 hover:scale-110 text-white p-3 shadow-lg transition-all duration-200"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="w-7 h-7" />
                  </button>
                )}
                <img
                  src={selectedPhoto}
                  alt="Imagem ampliada"
                  className="max-w-full max-h-full rounded-lg object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                {galleryPhotos.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const current = selectedPhotoIndex >= 0 ? selectedPhotoIndex : galleryPhotos.findIndex((p) => p === selectedPhoto);
                      const safeCurrent = current >= 0 ? current : 0;
                      const nextIndex = (safeCurrent + 1) % galleryPhotos.length;
                      setSelectedPhotoIndex(nextIndex);
                      setSelectedPhoto(galleryPhotos[nextIndex]);
                    }}
                    className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/70 border border-white/35 hover:bg-black/85 hover:border-white/70 hover:scale-110 text-white p-3 shadow-lg transition-all duration-200"
                    aria-label="Próxima foto"
                  >
                    <ChevronRight className="w-7 h-7" />
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="space-y-6 lg:sticky lg:top-24">
              <div className="hidden lg:block">
                <BusinessPrimaryInfo
                  business={business}
                  businessCityDisplayName={businessCityDisplayName}
                  onWhatsApp={handleWhatsApp}
                  onSendMessage={handleSendMessage}
                  onRoute={handleRoute}
                  onExternalClick={handleExternalClick}
                />
              </div>

              {/* Social Media */}
              {(business.instagram || business.facebook) && (
                <Card className="p-5 border-border">
                  <h3 className="font-semibold mb-4">Redes Sociais</h3>
                  <div className="space-y-2">
                    {business.instagram && (
                      <a
                        href={buildInstagramUrl(business.instagram)}
                        {...getExternalLinkProps({ allowFollow: business.allowFollowExternalLinks })}
                        className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Instagram className="w-4 h-4 text-pink-600" />
                        {formatInstagramDisplay(business.instagram)}
                      </a>
                    )}
                    {business.facebook && (
                      <a
                        href={buildFacebookUrl(business.facebook)}
                        {...getExternalLinkProps({ allowFollow: business.allowFollowExternalLinks })}
                        className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Facebook className="w-4 h-4 text-blue-600" />
                        {formatFacebookDisplay(business.facebook)}
                      </a>
                    )}
                  </div>
                </Card>
              )}


              <Card className="p-5 border-border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-primary" />
                  Compartilhar página
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      const text = encodeURIComponent(`Confira ${business.name} no Caramelinho: ${shareUrl}`);
                      window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      const url = encodeURIComponent(shareUrl);
                      window.open(
                        `https://www.facebook.com/sharer/sharer.php?u=${url}`,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                  >
                    <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                    Facebook
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={handleCopyLink}>
                    <Link2 className="w-4 h-4 mr-2" />
                    Copiar link
                  </Button>
                  {canUseNativeShare && (
                    <Button variant="ghost" className="justify-start text-muted-foreground" onClick={handleNativeShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Mais opções
                    </Button>
                  )}
                </div>
              </Card>

              {canRequestOwnership && (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={handleRequestOwnership}
                    disabled={requestingOwnership || hasPendingOwnershipRequest}
                  >
                    <Store className="w-4 h-4 mr-2" />
                    {hasPendingOwnershipRequest
                      ? "Solicitação de ownership enviada"
                      : requestingOwnership
                        ? "Enviando solicitação..."
                        : "Sou dono deste negócio"}
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setReportOpen(true)}
              >
                Denunciar anúncio
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/80">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {`${businessActivityLabel} ${formatDatePtBr(businessActivityDate)}`}
              </p>
            </div>
          </aside>
        </div>

        {similarBusinesses.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-bold mb-6">
              {businessCityDisplayName
                ? `Negócios brasileiros similares na região de ${businessCityDisplayName}`
                : "Negócios brasileiros similares"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {similarBusinesses.map((item, index) => {
                const prioritizeImage = index < 2;
                return (
                <Link
                  key={item.id}
                  to={buildBusinessUrl(item)}
                  state={{
                    preloadedBusiness: item,
                    preloadedSimilarBusinesses: similarBusinesses.filter((candidate) => candidate.id !== item.id),
                  }}
                  onMouseEnter={() => preloadBusinessPageAssets(item)}
                  onFocus={() => preloadBusinessPageAssets(item)}
                  onPointerDown={() => preloadBusinessPageAssets(item)}
                  className="group"
                >
                  <Card className="overflow-hidden border-border h-full">
                    <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                      <img
                        src={getOptimizedImageUrl(
                          item.heroImage || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
                          { width: 768, quality: 80, format: "webp" }
                        )}
                        srcSet={
                          getOptimizedImageSrcSet(
                            item.heroImage || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
                            [480, 768, 1024],
                            80
                          ) || undefined
                        }
                        sizes="(max-width: 640px) 92vw, 30vw"
                        alt={item.name}
                        loading={prioritizeImage ? "eager" : "lazy"}
                        fetchpriority={prioritizeImage ? "high" : "low"}
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                      <Badge className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground border-0">
                        {item.category.split("(")[0].trim()}
                      </Badge>
                      {item.averageRating > 0 && (
                        <Badge className="absolute top-3 right-3 bg-amber-500 text-white border-0 gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          {item.averageRating.toFixed(1)}
                        </Badge>
                      )}
                      {hasSearchLocationContext &&
                        business &&
                        typeof business.address.lat === "number" &&
                        typeof business.address.lng === "number" &&
                        Number.isFinite(business.address.lat) &&
                        Number.isFinite(business.address.lng) &&
                        typeof item.address.lat === "number" &&
                        typeof item.address.lng === "number" &&
                        Number.isFinite(item.address.lat) &&
                        Number.isFinite(item.address.lng) && (
                          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {(() => {
                              const distance = calculateDistance(
                                business.address.lat,
                                business.address.lng,
                                item.address.lat,
                                item.address.lng,
                              );
                              return `${distance.toFixed(distance < 10 ? 1 : 0)} km`;
                            })()}
                          </div>
                        )}
                      {item.ownerVerified ? (
                        <div className="absolute bottom-3 right-3 bg-emerald-600/95 text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Verificado
                        </div>
                      ) : null}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        {item.logoUrl ? (
                          <img src={item.logoUrl} alt="" loading="lazy" className="w-11 h-11 rounded-full object-cover ring-2 ring-border" />
                        ) : null}
                        <div className="min-w-0">
                          <h3 className="font-bold text-foreground text-lg truncate group-hover:text-primary transition-colors leading-tight">
                            <span className="truncate">{item.name}</span>
                          </h3>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {`${getCityDisplayName(item.address.cityDisplayName || item.address.city, item.address.countryCode || item.address.country)}, ${getCountryName(item.address.countryCode || item.address.country)}`}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">{stripRichTextHtml(item.description)}</p>
                      {item.categoryId === "food" && (item.isVeganFriendly || item.isVegetarianFriendly || item.isGlutenFreeFriendly) ? (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {item.isVeganFriendly ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              <Leaf className="w-3 h-3" />
                              Vegano
                            </span>
                          ) : null}
                          {item.isVegetarianFriendly ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-lime-100 text-lime-800">
                              <Leaf className="w-3 h-3" />
                              Vegetariano
                            </span>
                          ) : null}
                          {item.isGlutenFreeFriendly ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              <WheatOff className="w-3 h-3" />
                              Sem Glúten
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {item.services.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {item.services.slice(0, 3).map((svc) => (
                            <span key={svc} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                              {svc}
                            </span>
                          ))}
                          {item.services.length > 3 && (
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center">+ {item.services.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    </Card>
                </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Denunciar anúncio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Sua denúncia é 100% anônima. Nenhum dado pessoal é exibido ao anúncio denunciado.
            </div>
            <div>
              <Label>Motivo</Label>
              <Select value={reportReason} onValueChange={(v: any) => setReportReason(v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fake">Conta/perfil falso</SelectItem>
                  <SelectItem value="difamacao">Difamação</SelectItem>
                  <SelectItem value="golpe">Golpe/fraude</SelectItem>
                  <SelectItem value="conteudo_ofensivo">Conteúdo ofensivo</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Detalhes (opcional)</Label>
              <Textarea
                className="mt-1.5"
                rows={4}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Descreva rapidamente o problema."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReportOpen(false)} disabled={reporting}>Cancelar</Button>
              <Button onClick={handleSubmitReport} disabled={reporting}>
                {reporting ? "Enviando..." : "Enviar denúncia"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}

function getReviewBreakdown(reviews: BusinessFrontend["reviews"]): Record<number, number> {
  return reviews.reduce<Record<number, number>>(
    (acc, review) => {
      acc[review.rating] = (acc[review.rating] || 0) + 1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  );
}

function hasMeaningfulPrice(value: string | null | undefined): boolean {
  const v = (value || "").trim();
  if (!v) return false;
  return /\d/.test(v);
}

function normalizeSocialValue(value: string): string {
  const v = (value || "").trim();
  return v
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^facebook\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
}

function buildInstagramUrl(value: string): string {
  return `https://instagram.com/${normalizeSocialValue(value)}`;
}

function buildFacebookUrl(value: string): string {
  return `https://facebook.com/${normalizeSocialValue(value)}`;
}

function formatInstagramDisplay(value: string): string {
  const handle = normalizeSocialValue(value);
  return handle ? `@${handle}` : value;
}

function formatFacebookDisplay(value: string): string {
  return normalizeSocialValue(value) || value;
}
