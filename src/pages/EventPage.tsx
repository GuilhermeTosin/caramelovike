import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, MapPin, Ticket, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SiteFooter from "@/components/SiteFooter";
import SiteHeaderAuthActions from "@/components/SiteHeaderAuthActions";
import MobileHeaderMenu from "@/components/MobileHeaderMenu";
import { getSiteSlogan } from "@/lib/locales";
import { getCommunityEventById } from "@/services/events";
import type { CommunityEvent } from "@/types/database";
import { setJsonLd, setSeoMeta } from "@/lib/seo";
import {
  buildEventBreadcrumbStructuredData,
  buildEventCanonicalUrl,
  buildEventSeoDescription,
  buildEventSeoTitle,
  buildEventStructuredData,
} from "@/lib/seo/eventMeta";
import { getExternalLinkProps } from "@/lib/seo/externalLinks";

type EventPageProps = {
  initialEvent?: CommunityEvent | null;
};

export default function EventPage({ initialEvent = null }: EventPageProps) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const text = {
        loading: "Carregando evento...",
        notFound: "Evento não encontrado",
        unavailable: "Esse evento não está disponível no momento.",
        backToSearch: "Voltar para busca",
        back: "Voltar",
        noDescription: "Sem descrição.",
        freeEntry: "Entrada franca",
        paidEvent: "Evento pago",
        publishedBy: "Publicado por membro da comunidade",
        buyTickets: "Comprar ingressos",
      };
  const hasMatchingInitialEvent = !!initialEvent && initialEvent.id === eventId;
  const [event, setEvent] = useState<CommunityEvent | null>(() => hasMatchingInitialEvent ? initialEvent : null);
  const [loading, setLoading] = useState(() => !hasMatchingInitialEvent);

  useEffect(() => {
    let active = true;

    if (!eventId) {
      setEvent(null);
      setLoading(false);
      return () => { active = false; };
    }

    if (initialEvent?.id === eventId) {
      setEvent(initialEvent);
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    void getCommunityEventById(eventId).then((data) => {
      if (!active) return;
      setEvent(data);
      setLoading(false);
    });

    return () => { active = false; };
  }, [eventId, initialEvent]);

  useEffect(() => {
    if (!event) {
      if (!loading) setSeoMeta("Evento | Caramelinho.com", "Detalhes de evento da comunidade.");
      return;
    }

    const canonicalUrl = buildEventCanonicalUrl(event.id);
    setSeoMeta(buildEventSeoTitle(event), buildEventSeoDescription(event));
    setJsonLd("event", buildEventStructuredData(event, canonicalUrl));
    setJsonLd("event-breadcrumb", buildEventBreadcrumbStructuredData(event, canonicalUrl));
  }, [event, loading]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">{text.loading}</div>;
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">{text.notFound}</h1>
          <p className="text-muted-foreground mt-2">{text.unavailable}</p>
          <Button className="mt-6" onClick={() => navigate("/buscar")}>{text.backToSearch}</Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-24 flex items-center justify-between">
          <Link to={"/"} className="flex items-center gap-3 group">
            <div className="w-14 h-14 sm:w-[5.5rem] sm:h-[5.5rem] flex items-center justify-center">
              <img src="/logo.webp" alt="Caramelinho logo" className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-extrabold text-lg sm:text-2xl tracking-tight caramelo-text-gradient truncate">Caramelinho</div>
              <div className="text-[10px] sm:text-sm font-semibold text-foreground/75 whitespace-nowrap overflow-hidden text-ellipsis">{getSiteSlogan()}</div>
            </div>
          </Link>
          <div className="hidden items-center gap-3 sm:flex">
            <SiteHeaderAuthActions className="flex items-center gap-3" compact />
          </div>
          <MobileHeaderMenu />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Card className="overflow-hidden border-border">
          <div className="aspect-[16/8] bg-muted">
            <img
              src={event.flyer_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80"}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold">{event.title}</h1>
            <p className="text-muted-foreground mt-3 whitespace-pre-line">{event.description || text.noDescription}</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2">
                <CalendarDays className="w-4 h-4 text-amber-600" />
                {new Date(`${event.date}T00:00:00`).toLocaleDateString("pt-BR")}
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                {...getExternalLinkProps()}
                className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 hover:bg-secondary/80"
              >
                <MapPin className="w-4 h-4 text-amber-600" />
                {event.location}
              </a>
              <div className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2">
                <Ticket className="w-4 h-4 text-amber-600" />
                {event.is_free ? text.freeEntry : (event.price || text.paidEvent)}
              </div>
              <div className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2">
                <User className="w-4 h-4 text-amber-600" />
                {text.publishedBy}
              </div>
            </div>

            {event.ticket_url ? (
              <div className="mt-6">
                <a href={event.ticket_url} {...getExternalLinkProps()}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                    {text.buyTickets}
                  </Button>
                </a>
              </div>
            ) : null}
          </div>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
