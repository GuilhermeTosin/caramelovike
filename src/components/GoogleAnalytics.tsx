import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getGoogleAnalyticsMeasurementId } from "@/lib/googleAnalytics";

type GoogleTag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GoogleTag;
  }
}

function trackPageView(measurementId: string, pagePath: string) {
  window.gtag?.("config", measurementId, { page_path: pagePath });
}

function installGoogleTag(measurementId: string, pagePath: string) {
  if (document.querySelector(`script[data-caramelinho-google-analytics="${measurementId}"]`)) {
    trackPageView(measurementId, pagePath);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  window.gtag("js", new Date());
  trackPageView(measurementId, pagePath);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.caramelinhoGoogleAnalytics = measurementId;
  document.head.appendChild(script);
}

export default function GoogleAnalytics() {
  const { pathname, search } = useLocation();
  const measurementIdRef = useRef("");
  const latestPathRef = useRef("");
  const lastTrackedPathRef = useRef("");
  const currentPath = pathname + search;
  latestPathRef.current = currentPath;

  useEffect(() => {
    const measurementId = measurementIdRef.current;
    if (!measurementId || lastTrackedPathRef.current === currentPath) return;
    trackPageView(measurementId, currentPath);
    lastTrackedPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/google-analytics", {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok || cancelled) return;

        const payload = (await response.json()) as { measurementId?: unknown };
        const measurementId = getGoogleAnalyticsMeasurementId(payload.measurementId);
        if (!measurementId) return;
        measurementIdRef.current = measurementId;
        installGoogleTag(measurementId, latestPathRef.current);
        lastTrackedPathRef.current = latestPathRef.current;
      } catch {
        // Analytics must never interfere with the public site.
      }
    }, 1200);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
