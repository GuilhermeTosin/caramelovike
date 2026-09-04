import { useEffect, useMemo, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { buildBusinessUrl } from "@/services/businesses";
import type { BusinessFrontend, CommunityFindWithVote } from "@/types/database";
import { MapPin, Loader2, AlertCircle, AtSign, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MapViewProps {
  businesses: BusinessFrontend[];
  communityFinds?: CommunityFindWithVote[];
  center?: { lat: number; lng: number };
  zoom?: number;
}

type MapPoint = { lat: number; lng: number };

type ApproximateBusinessGroup = {
  key: string;
  city: string;
  position: MapPoint;
  businesses: BusinessFrontend[];
};

export default function MapView({ businesses, communityFinds = [], center, zoom = 11 }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<GoogleMapMarker[]>([]);
  const navigate = useNavigate();
  const { maps, loading, error, available } = useGoogleMaps();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedApproximateGroupKey, setSelectedApproximateGroupKey] = useState<string | null>(null);

  const exactBusinesses = useMemo(
    () => businesses.filter((business) => hasExactMapLocation(business)),
    [businesses],
  );

  const approximateBusinessGroups = useMemo(
    () => groupApproximateBusinesses(businesses),
    [businesses],
  );

  const mapPoints = useMemo<MapPoint[]>(
    () => [
      ...exactBusinesses.map((business) => ({ lat: business.address.lat, lng: business.address.lng })),
      ...approximateBusinessGroups.map((group) => group.position),
      ...communityFinds
        .filter((find) => hasValidCoordinates(find.lat, find.lng))
        .map((find) => ({ lat: find.lat, lng: find.lng })),
    ],
    [approximateBusinessGroups, communityFinds, exactBusinesses],
  );

  const autoCenter = useMemo<MapPoint>(() => {
    if (center) return center;
    if (mapPoints.length === 0) return { lat: 45.5017, lng: -73.5673 };
    return {
      lat: mapPoints.reduce((sum, point) => sum + point.lat, 0) / mapPoints.length,
      lng: mapPoints.reduce((sum, point) => sum + point.lng, 0) / mapPoints.length,
    };
  }, [center, mapPoints]);

  const selectedApproximateGroup = useMemo(
    () => approximateBusinessGroups.find((group) => group.key === selectedApproximateGroupKey) || null,
    [approximateBusinessGroups, selectedApproximateGroupKey],
  );

  const mappableBusinessCount = useMemo(
    () => exactBusinesses.length + approximateBusinessGroups.reduce((sum, group) => sum + group.businesses.length, 0),
    [approximateBusinessGroups, exactBusinesses],
  );
  const businessPointCount = exactBusinesses.length + approximateBusinessGroups.length;
  const unmappableBusinessCount = Math.max(0, businesses.length - mappableBusinessCount);

  useEffect(() => {
    if (!maps || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new maps.Map(mapRef.current, {
      center: autoCenter,
      zoom,
      mapId: "caramelinho_map",
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: true,
    });

    return () => {
      mapInstanceRef.current = null;
    };
  }, [autoCenter, maps, zoom]);

  useEffect(() => {
    if (!maps || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    markersRef.current.forEach(clearMarker);
    markersRef.current = [];


    if (!maps.marker?.AdvancedMarkerElement) {
      exactBusinesses.forEach((business) => {
        const marker = new maps.Marker({
          position: { lat: business.address.lat, lng: business.address.lng },
          map,
          title: business.name,
          animation: google.maps.Animation.DROP,
          icon: {
            url: svgToDataUrl(getBrazilFlagPinSvg(false)),
            scaledSize: new google.maps.Size(44, 54),
            anchor: new google.maps.Point(22, 52),
          },
        });
        marker.addListener("click", () => navigate(buildMarkerUrl(business)));
        markersRef.current.push(marker);
      });

      approximateBusinessGroups.forEach((group) => {
        const marker = new maps.Marker({
          position: group.position,
          map,
          title: getApproximateGroupTitle(group),
          icon: {
            url: svgToDataUrl(getApproximateGroupPinSvg(group.businesses.length)),
            scaledSize: new google.maps.Size(48, 54),
            anchor: new google.maps.Point(24, 52),
          },
        });
        marker.addListener("click", () => setSelectedApproximateGroupKey(group.key));
        markersRef.current.push(marker);
      });

      communityFinds.forEach((find) => {
        if (!hasValidCoordinates(find.lat, find.lng)) return;
        const marker = new maps.Marker({
          position: { lat: find.lat, lng: find.lng },
          map,
          title: `${find.product_name} - ${find.location_name}`,
          icon: {
            url: svgToDataUrl(getCommunityFindPinSvg()),
            scaledSize: new google.maps.Size(34, 42),
            anchor: new google.maps.Point(17, 41),
          },
        });
        markersRef.current.push(marker);
      });

      fitMapToPoints(map, maps, mapPoints);
      return undefined;
    }

    exactBusinesses.forEach((business) => {
      const pinElement = document.createElement("div");
      pinElement.className = "cursor-pointer transition-transform hover:scale-110";
      const isSelected = selectedId === business.id;
      pinElement.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3));">
          ${getBrazilFlagPinSvg(isSelected)}
          <div style="
            margin-top:-4px;background:white;color:#1f2937;padding:2px 8px;border-radius:10px;
            font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.15);
            border:1px solid rgba(0,0,0,0.08);max-width:120px;overflow:hidden;text-overflow:ellipsis;
            position:relative;z-index:1;
          ">
            ${escapeHtml(business.name.length > 18 ? business.name.slice(0, 16) + "..." : business.name)}
          </div>
        </div>
      `;

      const marker = new maps.marker.AdvancedMarkerElement({
        position: { lat: business.address.lat, lng: business.address.lng },
        map,
        content: pinElement,
        title: business.name,
      });

      const handleMarkerClick = () => {
        setSelectedId(business.id);
        navigate(buildMarkerUrl(business));
      };
      addMarkerClickListeners(marker, pinElement, handleMarkerClick);
      markersRef.current.push(marker);
    });

    approximateBusinessGroups.forEach((group) => {
      const pinElement = document.createElement("button");
      pinElement.type = "button";
      pinElement.className = "cursor-pointer rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2";
      pinElement.setAttribute("aria-label", getApproximateGroupTitle(group));
      pinElement.innerHTML = getApproximateGroupPinSvg(group.businesses.length);

      const marker = new maps.marker.AdvancedMarkerElement({
        position: group.position,
        map,
        content: pinElement,
        title: getApproximateGroupTitle(group),
      });
      addMarkerClickListeners(marker, pinElement, () => setSelectedApproximateGroupKey(group.key));
      markersRef.current.push(marker);
    });

    communityFinds.forEach((find) => {
      if (!hasValidCoordinates(find.lat, find.lng)) return;

      const pinElement = document.createElement("div");
      pinElement.className = "cursor-default";
      pinElement.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.25));">
          ${getCommunityFindPinSvg()}
          <div style="
            margin-top:-2px;background:white;color:#1f2937;padding:2px 8px;border-radius:10px;
            font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.15);
            border:1px solid rgba(0,0,0,0.08);max-width:140px;overflow:hidden;text-overflow:ellipsis;
          ">
            ${escapeHtml(find.product_name.length > 20 ? find.product_name.slice(0, 18) + "..." : find.product_name)}
          </div>
        </div>
      `;

      const marker = new maps.marker.AdvancedMarkerElement({
        position: { lat: find.lat, lng: find.lng },
        map,
        content: pinElement,
        title: `${find.product_name} - ${find.location_name}`,
      });
      markersRef.current.push(marker);
    });

    fitMapToPoints(map, maps, mapPoints);
    return undefined;
  }, [approximateBusinessGroups, communityFinds, exactBusinesses, mapPoints, maps, navigate, selectedId]);

  if (!available) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center p-8">
        <div className="text-center">
          <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">{"Mapa indispon\u00edvel"}</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {"Configure a chave da API Google Maps nas vari\u00e1veis de ambiente para ativar o mapa."}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-xl bg-secondary/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{"Carregando mapa\u2026"}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-xl bg-destructive/5 border border-destructive/20 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-destructive/60 mx-auto mb-3" />
          <p className="text-destructive font-medium">Erro ao carregar mapa</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden">
      <div ref={mapRef} className="w-full h-full min-h-[400px]" />
      {businesses.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-lg border border-border bg-background/95 px-3 py-2 shadow-md backdrop-blur">
          <p className="text-xs font-semibold text-foreground">
            {mappableBusinessCount} {mappableBusinessCount === 1 ? "negócio representado" : "negócios representados"} em {businessPointCount} {businessPointCount === 1 ? "ponto" : "pontos"}
          </p>
          {unmappableBusinessCount > 0 && (
            <p className="mt-0.5 text-[11px] text-amber-800">
              {unmappableBusinessCount} {unmappableBusinessCount === 1 ? "negócio não pôde ser posicionado" : "negócios não puderam ser posicionados"} por falta de localização.
            </p>
          )}
        </div>
      )}
      {selectedApproximateGroup && (
        <aside
          className="absolute inset-x-3 top-3 z-10 max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-xl border border-amber-200 bg-background/95 p-4 shadow-xl backdrop-blur sm:left-3 sm:right-auto sm:w-80"
          aria-label={`Neg\u00f3cios sem endere\u00e7o f\u00edsico em ${selectedApproximateGroup.city}`}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-100 p-2 text-amber-800">
              <AtSign className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {selectedApproximateGroup.businesses.length}{" "}
                {selectedApproximateGroup.businesses.length === 1 ? "neg\u00f3cio atende" : "neg\u00f3cios atendem"}{" "}
                em {selectedApproximateGroup.city}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {"Localiza\u00e7\u00e3o aproximada: estes neg\u00f3cios informaram a cidade de atendimento, mas n\u00e3o um endere\u00e7o f\u00edsico."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedApproximateGroupKey(null)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label={"Fechar lista de neg\u00f3cios"}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {selectedApproximateGroup.businesses.map((business) => (
              <button
                key={business.id}
                type="button"
                onClick={() => {
                  setSelectedApproximateGroupKey(null);
                  navigate(buildMarkerUrl(business));
                }}
                className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-amber-300 hover:bg-amber-50"
              >
                <span className="block truncate text-sm font-semibold text-foreground">{business.name}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{business.category}</span>
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

function hasValidCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

function hasExactMapLocation(business: BusinessFrontend): boolean {
  return (
    business.attendanceType !== "online" &&
    Boolean(business.address.street?.trim()) &&
    hasValidCoordinates(business.address.lat, business.address.lng)
  );
}

function groupApproximateBusinesses(businesses: BusinessFrontend[]): ApproximateBusinessGroup[] {
  const groups = new Map<string, ApproximateBusinessGroup>();

  businesses.forEach((business) => {
    if (hasExactMapLocation(business) || !hasValidCoordinates(business.address.lat, business.address.lng)) return;

    const city = business.address.cityDisplayName || business.address.city || "Cidade informada";
    const key = [business.address.countryCode, business.address.stateCode, city]
      .map((value) => value.trim().toLowerCase())
      .join("|");
    const existing = groups.get(key);

    if (existing) {
      existing.businesses.push(business);
      return;
    }

    groups.set(key, {
      key,
      city,
      position: { lat: business.address.lat, lng: business.address.lng },
      businesses: [business],
    });
  });

  return [...groups.values()];
}

function fitMapToPoints(map: google.maps.Map, maps: typeof google.maps, points: MapPoint[]) {
  if (points.length === 0) return;
  if (points.length === 1) {
    map.setCenter(points[0]);
    map.setZoom(12);
    return;
  }

  const bounds = new maps.LatLngBounds();
  points.forEach((point) => bounds.extend(point));
  map.fitBounds(bounds, 50);
}

function getApproximateGroupTitle(group: ApproximateBusinessGroup): string {
  const count = group.businesses.length;
  return `${count} ${count === 1 ? "neg\u00f3cio atende" : "neg\u00f3cios atendem"} em ${group.city} sem endere\u00e7o f\u00edsico`;
}

function addMarkerClickListeners(
  marker: google.maps.marker.AdvancedMarkerElement,
  element: HTMLElement,
  onClick: () => void,
) {
  if (typeof marker.addEventListener === "function") {
    marker.addEventListener("gmp-click", onClick);
  }
  const legacyMarker = marker as unknown as { addListener?: (event: string, handler: () => void) => void };
  if (typeof legacyMarker.addListener === "function") {
    legacyMarker.addListener("click", onClick);
  }
  element.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
}

function buildMarkerUrl(business: BusinessFrontend): string {
  return buildBusinessUrl(business);
}

type GoogleMapMarker = google.maps.marker.AdvancedMarkerElement | google.maps.Marker;

function clearMarker(marker: GoogleMapMarker): void {
  if ("setMap" in marker) {
    marker.setMap(null);
    return;
  }

  marker.map = null;
}

function getBrazilFlagPinSvg(isSelected: boolean): string {
  const outerFill = isSelected ? "#0f4f9f" : "#2563eb";
  const rimFill = isSelected ? "#dbeafe" : "#f8fafc";

  return `
    <svg width="44" height="54" viewBox="0 0 44 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M22 2C11.5 2 3 10.2 3 20.3c0 13.4 16.1 29.5 18.2 31.5.5.5 1.1.5 1.6 0C24.9 49.8 41 33.7 41 20.3 41 10.2 32.5 2 22 2Z" fill="${outerFill}" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="22" cy="20" r="14.8" fill="${rimFill}"/>
      <circle cx="22" cy="20" r="12.6" fill="#009739"/>
      <path d="M22 9.6 34.4 20 22 30.4 9.6 20 22 9.6Z" fill="#FEDD00"/>
      <circle cx="22" cy="20" r="6.3" fill="#002776"/>
      <path d="M16.8 18.7c3.8-1.3 7.4-.6 10.6 2.1" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="20.2" cy="16.8" r="0.9" fill="#ffffff"/>
      <circle cx="24.8" cy="17.7" r="0.8" fill="#ffffff"/>
      <circle cx="18.8" cy="21.5" r="0.75" fill="#ffffff"/>
      <circle cx="23" cy="23.4" r="0.7" fill="#ffffff"/>
      <circle cx="26.1" cy="21.3" r="0.65" fill="#ffffff"/>
    </svg>
  `;
}

function getApproximateGroupPinSvg(count: number): string {
  const label = count > 99 ? "99+" : String(count);
  return `
    <svg width="48" height="54" viewBox="0 0 48 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M24 2C13.2 2 4.5 10.6 4.5 21.2c0 13.6 16.4 28.8 18.3 30.6.7.6 1.7.6 2.4 0 1.9-1.8 18.3-17 18.3-30.6C43.5 10.6 34.8 2 24 2Z" fill="#d97706" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="24" cy="20.5" r="13.5" fill="#fff7ed"/>
      <text x="24" y="26" text-anchor="middle" fill="#9a3412" font-family="Arial, sans-serif" font-size="19" font-weight="700">@</text>
      <rect x="14" y="29" width="20" height="14" rx="7" fill="#7c2d12" stroke="#ffffff" stroke-width="2"/>
      <text x="24" y="39.3" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="11" font-weight="700">${label}</text>
    </svg>
  `;
}

function getCommunityFindPinSvg(): string {
  return `
    <svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M17 1.8C9.1 1.8 2.7 8 2.7 15.6c0 9.7 11.7 21.4 13.2 22.8.4.4.9.4 1.3 0 1.5-1.4 13.2-13.1 13.2-22.8 0-7.6-6.4-13.8-14.4-13.8Z" fill="#16a34a" stroke="#fff" stroke-width="2"/>
      <circle cx="17" cy="15.5" r="8.8" fill="#f59e0b"/>
      <circle cx="17" cy="15.5" r="4.2" fill="#fff"/>
    </svg>
  `;
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
