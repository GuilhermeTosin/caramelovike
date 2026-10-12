const GOOGLE_ANALYTICS_MEASUREMENT_ID_PATTERN = /\bG-[A-Z0-9]{6,20}\b/gi;
export const GOOGLE_ANALYTICS_STATUS_EVENT = "caramelinho:google-analytics-status";
export const GOOGLE_ANALYTICS_CONFIG_EVENT = "caramelinho:google-analytics-config";

export type GoogleAnalyticsRuntimeState =
  | "checking"
  | "not_configured"
  | "config_error"
  | "loading_tag"
  | "ready"
  | "tag_error";

export type GoogleAnalyticsRuntimeStatus = {
  state: GoogleAnalyticsRuntimeState;
  measurementId: string;
  lastPageViewAt?: string;
  lastPageViewPath?: string;
  diagnosticSentAt?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __caramelinhoGoogleAnalyticsStatus?: GoogleAnalyticsRuntimeStatus;
    __caramelinhoGoogleAnalyticsConfiguredIds?: string[];
  }
}

export function getGoogleAnalyticsMeasurementId(value: unknown): string {
  const matches = Array.from(
    new Set(
      String(value || "")
        .match(GOOGLE_ANALYTICS_MEASUREMENT_ID_PATTERN)
        ?.map((match) => match.toUpperCase()) || [],
    ),
  );

  return matches.length === 1 ? matches[0] : "";
}

const SENSITIVE_QUERY_PARAMETER = /^(access_token|refresh_token|token|code|otp|email|password|authorization|state)$/i;

function sanitizeAnalyticsUrl(value: string, origin: string): URL {
  const url = new URL(value, origin);
  url.hash = "";
  for (const key of Array.from(url.searchParams.keys())) {
    if (SENSITIVE_QUERY_PARAMETER.test(key)) url.searchParams.delete(key);
  }
  return url;
}

export function buildGoogleAnalyticsPageViewPayload(
  path: string,
  origin: string,
  title: string,
  referrer = "",
): Record<string, string> {
  const pageUrl = sanitizeAnalyticsUrl(path, origin);
  const payload: Record<string, string> = {
    page_title: title,
    page_location: pageUrl.toString(),
  };

  if (referrer) payload.page_referrer = sanitizeAnalyticsUrl(referrer, origin).toString();
  return payload;
}

export function getGoogleAnalyticsRuntimeStatus(): GoogleAnalyticsRuntimeStatus | null {
  if (typeof window === "undefined") return null;
  return window.__caramelinhoGoogleAnalyticsStatus || null;
}

export function publishGoogleAnalyticsRuntimeStatus(status: GoogleAnalyticsRuntimeStatus): void {
  if (typeof window === "undefined") return;
  window.__caramelinhoGoogleAnalyticsStatus = status;
  window.dispatchEvent(new CustomEvent(GOOGLE_ANALYTICS_STATUS_EVENT, { detail: status }));
}

export function notifyGoogleAnalyticsConfigChanged(measurementId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(GOOGLE_ANALYTICS_CONFIG_EVENT, {
      detail: { measurementId: getGoogleAnalyticsMeasurementId(measurementId) },
    }),
  );
}

export function sendGoogleAnalyticsDiagnosticEvent(): boolean {
  if (typeof window === "undefined" || !window.gtag) return false;
  const status = getGoogleAnalyticsRuntimeStatus();
  if (!status || status.state !== "ready" || !status.measurementId) return false;

  window.gtag("event", "analytics_diagnostic", {
    send_to: status.measurementId,
    debug_mode: true,
    event_source: "admin_profile",
  });
  publishGoogleAnalyticsRuntimeStatus({ ...status, diagnosticSentAt: new Date().toISOString() });
  return true;
}
