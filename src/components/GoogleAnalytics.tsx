import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  buildGoogleAnalyticsPageViewPayload,
  GOOGLE_ANALYTICS_CONFIG_EVENT,
  getGoogleAnalyticsMeasurementId,
  getGoogleAnalyticsRuntimeStatus,
  publishGoogleAnalyticsRuntimeStatus,
} from "@/lib/googleAnalytics";

function updateStatus(
  state: "checking" | "not_configured" | "config_error" | "loading_tag" | "ready" | "tag_error",
  measurementId = "",
  extra: Record<string, string | undefined> = {},
) {
  const previous = getGoogleAnalyticsRuntimeStatus();
  publishGoogleAnalyticsRuntimeStatus({
    ...previous,
    ...extra,
    state,
    measurementId,
  });
}

function enqueuePageView(measurementId: string, path: string, previousPath: string) {
  const referrer = previousPath
    ? new URL(previousPath, window.location.origin).toString()
    : document.referrer;

  window.gtag?.("event", "page_view", {
    send_to: measurementId,
    ...buildGoogleAnalyticsPageViewPayload(path, window.location.origin, document.title, referrer),
  });

  updateStatus(getGoogleAnalyticsRuntimeStatus()?.state || "loading_tag", measurementId, {
    lastPageViewAt: new Date().toISOString(),
    lastPageViewPath: new URL(path, window.location.origin).pathname,
  });
}

function installGoogleTag(measurementId: string) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  const configuredIds = window.__caramelinhoGoogleAnalyticsConfiguredIds || [];
  if (!configuredIds.includes(measurementId)) {
    if (configuredIds.length === 0) window.gtag("js", new Date());
    window.gtag("config", measurementId, { send_page_view: false });
    configuredIds.push(measurementId);
    window.__caramelinhoGoogleAnalyticsConfiguredIds = configuredIds;
  }

  const selector = `script[data-caramelinho-google-analytics="${measurementId}"]`;
  const existingScript = document.querySelector<HTMLScriptElement>(selector);
  if (existingScript?.dataset.loaded === "true") {
    updateStatus("ready", measurementId);
    return;
  }

  const script = existingScript || document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.caramelinhoGoogleAnalytics = measurementId;
  script.onload = () => {
    script.dataset.loaded = "true";
    updateStatus("ready", measurementId);
  };
  script.onerror = () => updateStatus("tag_error", measurementId);
  updateStatus("loading_tag", measurementId);
  if (!existingScript) document.head.appendChild(script);
}

export default function GoogleAnalytics() {
  const { pathname, search } = useLocation();
  const measurementIdRef = useRef("");
  const latestPathRef = useRef("");
  const lastTrackedPathRef = useRef("");
  const pendingPathsRef = useRef<string[]>([]);
  const currentPath = pathname + search;
  latestPathRef.current = currentPath;

  useEffect(() => {
    const measurementId = measurementIdRef.current;
    if (!measurementId) {
      const pendingPaths = pendingPathsRef.current;
      if (pendingPaths[pendingPaths.length - 1] !== currentPath) pendingPaths.push(currentPath);
      return;
    }
    if (lastTrackedPathRef.current === currentPath) return;

    enqueuePageView(measurementId, currentPath, lastTrackedPathRef.current);
    lastTrackedPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    updateStatus("checking");

    const activateMeasurementId = (measurementId: string, usePendingPaths = true) => {
      if (!measurementId) {
        measurementIdRef.current = "";
        lastTrackedPathRef.current = "";
        pendingPathsRef.current = [latestPathRef.current];
        updateStatus("not_configured");
        return;
      }
      if (measurementIdRef.current === measurementId) return;

      measurementIdRef.current = measurementId;
      if (!usePendingPaths) {
        pendingPathsRef.current = [latestPathRef.current];
        lastTrackedPathRef.current = "";
      }
      installGoogleTag(measurementId);

      const pendingPaths = pendingPathsRef.current.length
        ? pendingPathsRef.current
        : [latestPathRef.current];
      pendingPathsRef.current = [];
      for (const [index, path] of pendingPaths.entries()) {
        if (path === lastTrackedPathRef.current) continue;
        const previousPath = lastTrackedPathRef.current || (index > 0 ? pendingPaths[index - 1] : "");
        enqueuePageView(measurementId, path, previousPath);
        lastTrackedPathRef.current = path;
      }
    };

    const handleConfigChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ measurementId?: unknown }>).detail;
      activateMeasurementId(getGoogleAnalyticsMeasurementId(detail?.measurementId), false);
    };
    window.addEventListener(GOOGLE_ANALYTICS_CONFIG_EVENT, handleConfigChanged);

    const loadAnalytics = async () => {
      try {
        const response = await fetch("/api/google-analytics", {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          if (!cancelled) updateStatus("config_error");
          return;
        }

        const payload = (await response.json()) as { measurementId?: unknown };
        const measurementId = getGoogleAnalyticsMeasurementId(payload.measurementId);
        if (cancelled) return;
        activateMeasurementId(measurementId);
      } catch {
        if (!cancelled) updateStatus("config_error");
      }
    };

    void loadAnalytics();
    return () => {
      cancelled = true;
      controller.abort();
      window.removeEventListener(GOOGLE_ANALYTICS_CONFIG_EVENT, handleConfigChanged);
    };
  }, []);

  return null;
}
