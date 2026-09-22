import { useState, useEffect, useMemo, useRef, useCallback, type CSSProperties } from "react";
import { Input } from "./ui/input";
import { Search, MapPin, X, Loader2 } from "lucide-react";
import { isMapsApiAvailable, loadGoogleMapsApi } from "@/lib/google-maps";
import GoogleMapsAttribution from "@/components/GoogleMapsAttribution";

export type LocationSuggestionMeta = {
  lat?: number;
  lng?: number;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  placeId?: string;
  formattedAddress?: string;
};

interface SearchInputWithSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  icon: "search" | "location";
  onSubmit?: (
    value?: string,
    meta?: LocationSuggestionMeta
  ) => void;
  className?: string;
  inputClassName?: string;
  useGooglePlaces?: boolean;
  locationBias?: { lat: number; lng: number } | null;
  disableLocalSuggestions?: boolean;
  maxSuggestions?: number;
  portalSuggestions?: boolean;
  onUseCurrentLocation?: () => void | Promise<void>;
  isLoading?: boolean;
  currentLocationLabel?: string;
}

function extractCityFromPlace(place: google.maps.places.Place): string {
  const components = place.addressComponents || [];

  const byType = (type: string) =>
    components.find((component) => component.types.includes(type))?.longText || "";

  return (
    byType("locality") ||
    byType("postal_town") ||
    byType("administrative_area_level_2") ||
    byType("sublocality") ||
    byType("sublocality_level_1") ||
    place.displayName ||
    ""
  ).trim();
}

function normalizeForMatch(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function SearchInputWithSuggestions({
  value,
  onChange,
  suggestions,
  placeholder,
  icon,
  onSubmit,
  className = "",
  inputClassName = "",
  useGooglePlaces = false,
  locationBias = null,
  disableLocalSuggestions = false,
  maxSuggestions = 6,
  portalSuggestions = false,
  onUseCurrentLocation,
  isLoading = false,
  currentLocationLabel = "Usar minha localização",
}: SearchInputWithSuggestionsProps) {
  const suggestionsDisabled = disableLocalSuggestions;
  const [isOpen, setIsOpen] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesAutocompleteUnavailable, setPlacesAutocompleteUnavailable] = useState(false);
  const [portalStyle, setPortalStyle] = useState<CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteSessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const locateActionLockRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    onChangeRef.current = onChange;
    onSubmitRef.current = onSubmit;
  }, [onChange, onSubmit, value]);

  const canUseGooglePlaces =
    !suggestionsDisabled &&
    useGooglePlaces &&
    icon === "location" &&
    isMapsApiAvailable();

  const filteredSuggestions = useMemo(() => {
    if (suggestionsDisabled) return [];
    if (canUseGooglePlaces && !placesAutocompleteUnavailable) return [];
    if (value.length < 2) return [];

    const query = normalizeForMatch(value);
    return suggestions
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .filter((s) => normalizeForMatch(s).includes(query))
      .slice(0, maxSuggestions);
  }, [suggestions, value, canUseGooglePlaces, placesAutocompleteUnavailable, suggestionsDisabled, maxSuggestions]);

  const showLocateAction = icon === "location" && typeof onUseCurrentLocation === "function";
  const showSuggestions = isOpen &&
    (placeSuggestions.length > 0 || filteredSuggestions.length > 0 || showLocateAction);

  const syncPortalPosition = useCallback(() => {
    if (typeof window === "undefined") return;

    const node = containerRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const width = Math.max(0, Math.min(rect.width, window.innerWidth - 16));
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const top = rect.bottom + 8;
    const maxHeight = Math.max(160, window.innerHeight - top - 16);

    setPortalStyle({
      position: "fixed",
      top,
      left,
      width,
      maxHeight,
      overflowY: "auto",
      zIndex: 10000,
    });
  }, []);

  useEffect(() => {
    if (!showSuggestions || !portalSuggestions) {
      setPortalStyle(null);
      return;
    }

    syncPortalPosition();

    const handleResize = () => {
      syncPortalPosition();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [showSuggestions, portalSuggestions, syncPortalPosition]);

  useEffect(() => {
    if (!showSuggestions || !portalSuggestions) return;

    const closeOnScroll = () => {
      setIsOpen(false);
      setPortalStyle(null);
    };

    window.addEventListener("scroll", closeOnScroll, true);
    document.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("wheel", closeOnScroll, { passive: true, capture: true });
    window.addEventListener("touchmove", closeOnScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener("scroll", closeOnScroll, true);
      document.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("wheel", closeOnScroll, true);
      window.removeEventListener("touchmove", closeOnScroll, true);
    };
  }, [showSuggestions, portalSuggestions]);

  useEffect(() => {
    if (!canUseGooglePlaces) {
      setPlaceSuggestions([]);
      setPlacesLoading(false);
      return;
    }

    const query = value.trim();
    if (query.length < 2) {
      setPlaceSuggestions([]);
      setPlacesLoading(false);
      if (!query) autocompleteSessionTokenRef.current = null;
      return;
    }

    let mounted = true;
    const timeout = window.setTimeout(() => {
      setPlacesLoading(true);
      void (async () => {
        try {
          const maps = await loadGoogleMapsApi();
          const places = await maps.importLibrary("places");
          if (!mounted) return;

          const sessionToken = autocompleteSessionTokenRef.current ?? new places.AutocompleteSessionToken();
          autocompleteSessionTokenRef.current = sessionToken;
          const request: google.maps.places.AutocompleteRequest = {
            input: query,
            includedPrimaryTypes: ["(cities)"],
            language: "pt-BR",
            sessionToken,
          };
          if (locationBias) {
            request.locationBias = new maps.LatLngBounds(
              new maps.LatLng(locationBias.lat - 2, locationBias.lng - 2),
              new maps.LatLng(locationBias.lat + 2, locationBias.lng + 2),
            );
          }

          const { suggestions: results } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
          if (!mounted) return;
          setPlaceSuggestions(results.flatMap((result) => result.placePrediction ? [result.placePrediction] : []));
          setPlacesAutocompleteUnavailable(false);
        } catch {
          if (!mounted) return;
          setPlaceSuggestions([]);
          setPlacesAutocompleteUnavailable(true);
        } finally {
          if (mounted) setPlacesLoading(false);
        }
      })();
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
    };
  }, [canUseGooglePlaces, value, locationBias]);

  const handleSelectPlace = async (prediction: google.maps.places.PlacePrediction) => {
    const fallbackLabel = prediction.text.text;
    setIsOpen(false);
    setPlaceSuggestions([]);

    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["formattedAddress", "addressComponents", "location", "id", "displayName"],
      });
      const extractedCity = extractCityFromPlace(place);
      const formattedAddress = (place.formattedAddress || "").trim();
      const selected = formattedAddress || extractedCity || fallbackLabel;
      const components = place.addressComponents || [];
      const stateCode = components.find((component) => component.types.includes("administrative_area_level_1"))?.shortText || "";
      const countryCode = components.find((component) => component.types.includes("country"))?.shortText || "";

      autocompleteSessionTokenRef.current = null;
      onChangeRef.current(selected);
      inputRef.current?.blur();
      onSubmitRef.current?.(selected, {
        lat: place.location?.lat(),
        lng: place.location?.lng(),
        city: extractedCity,
        stateCode: stateCode.toLowerCase(),
        countryCode: countryCode.toLowerCase(),
        placeId: place.id || prediction.placeId,
        formattedAddress,
      });
    } catch {
      autocompleteSessionTokenRef.current = null;
      onChangeRef.current(fallbackLabel);
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(portalRef.current && portalRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    if (inputRef.current) {
      inputRef.current.blur();
    } else if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsOpen(false);
    if (onSubmit) onSubmit(suggestion);
  };

  const triggerUseCurrentLocation = () => {
    if (locateActionLockRef.current) return;
    locateActionLockRef.current = true;

    if (inputRef.current) {
      inputRef.current.blur();
    } else if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    window.setTimeout(() => setIsOpen(false), 0);
    void Promise.resolve(onUseCurrentLocation?.()).finally(() => {
      window.setTimeout(() => {
        locateActionLockRef.current = false;
      }, 120);
    });
  };

  const suggestionList = (
    <ul
      className="py-2"
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          filteredSuggestions.length === 1 &&
          !showLocateAction
        ) {
          e.preventDefault();
          handleSelect(filteredSuggestions[0]);
        }
      }}
    >
      {showLocateAction && (
        <li onMouseDown={(e) => e.preventDefault()}>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              triggerUseCurrentLocation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="w-full min-h-12 text-left px-5 py-3 hover:bg-secondary flex items-center gap-3 transition-colors"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-foreground font-semibold text-xs lg:text-[11px] whitespace-nowrap">
              {currentLocationLabel}
            </span>
          </button>
        </li>
      )}
      {filteredSuggestions.map((suggestion, index) => (
        <li key={index} onMouseDown={(e) => e.preventDefault()}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect(suggestion);
            }}
            onClick={() => handleSelect(suggestion)}
            className="w-full min-h-12 text-left px-5 py-3 hover:bg-secondary flex items-center gap-3 transition-colors"
          >
            {icon === "search" ? (
              <Search className="w-4 h-4 text-muted-foreground" />
            ) : (
              <MapPin className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-foreground font-medium">{suggestion}</span>
          </button>
        </li>
      ))}
      {placeSuggestions.map((suggestion) => (
        <li key={suggestion.placeId} onMouseDown={(event) => event.preventDefault()}>
          <button
            type="button"
            onClick={() => void handleSelectPlace(suggestion)}
            className="w-full min-h-12 text-left px-5 py-3 hover:bg-secondary flex items-center gap-3 transition-colors"
          >
            <MapPin className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block truncate text-foreground font-medium">
                {suggestion.mainText?.text || suggestion.text.text}
              </span>
              {suggestion.secondaryText?.text ? (
                <span className="block truncate text-xs text-muted-foreground">
                  {suggestion.secondaryText.text}
                </span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
      {placeSuggestions.length > 0 ? (
        <li>
          <GoogleMapsAttribution />
        </li>
      ) : null}
    </ul>
  );

  return (
    <div ref={containerRef} className={"relative flex-1 " + className}>
      {icon === "search" ? (
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60" />
      ) : (
        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60" />
      )}

      <Input
        ref={inputRef}
        value={value}
        autoComplete="off"
        spellCheck={false}
        onKeyDown={(e) => {
          if (canUseGooglePlaces && placeSuggestions.length > 0 && e.key === "Enter") {
            e.preventDefault();
            void handleSelectPlace(placeSuggestions[0]);
            return;
          }
          if (e.key === "Enter" && !canUseGooglePlaces && filteredSuggestions.length > 0) {
            e.preventDefault();
            handleSelect(filteredSuggestions[0]);
          }
        }}
        onChange={(e) => {
          const nextValue = e.target.value;
          onChange(nextValue);
          if (canUseGooglePlaces) {
            if (portalSuggestions && !nextValue.trim()) {
              syncPortalPosition();
            }
            setIsOpen(showLocateAction || nextValue.trim().length >= 2);
            return;
          }
          if (portalSuggestions) {
            syncPortalPosition();
          }
          setIsOpen(showLocateAction || nextValue.length >= 2);
        }}
        onFocus={() => {
          if (canUseGooglePlaces) {
            if (showLocateAction && !value.trim()) {
              if (portalSuggestions) {
                syncPortalPosition();
              }
              setIsOpen(true);
            } else if (placeSuggestions.length > 0 || filteredSuggestions.length > 0) {
              setIsOpen(true);
            }
            return;
          }
          if (showLocateAction || (value.length >= 2 && filteredSuggestions.length > 0)) {
            if (portalSuggestions) {
              syncPortalPosition();
            }
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        className={"h-full pl-14 pr-12 py-1 text-lg border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/85 w-full " + inputClassName}
      />

      {(isLoading || placesLoading) && icon === "location" ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-xs text-muted-foreground pointer-events-none">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </div>
      ) : value ? (
        <button
          type="button"
          aria-label={icon === "location" ? "Limpar localiza\u00e7\u00e3o" : "Limpar busca"}
          title={icon === "location" ? "Limpar localiza\u00e7\u00e3o" : "Limpar busca"}
          onClick={() => {
            onChange("");
            autocompleteSessionTokenRef.current = null;
            setPlaceSuggestions([]);
            setIsOpen(false);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}

      {showSuggestions &&
        (portalSuggestions ? (
          portalStyle ? (
            <div
              ref={portalRef}
              className="bg-popover border border-border shadow-2xl rounded-2xl overflow-hidden z-[10000] animate-in fade-in slide-in-from-top-2 duration-200"
              style={portalStyle}
            >
              {suggestionList}
            </div>
          ) : null
        ) : (
          <div
            ref={portalRef}
            className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border shadow-2xl rounded-2xl overflow-hidden z-[10000] animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {suggestionList}
          </div>
        ))}
    </div>
  );
}
