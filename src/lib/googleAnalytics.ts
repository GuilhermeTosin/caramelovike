const GOOGLE_ANALYTICS_MEASUREMENT_ID_PATTERN = /\bG-[A-Z0-9]{6,20}\b/gi;

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
