import type { FeaturedPlacementFrontend } from "@/types/database";
import { getCountryName } from "@/services/businesses";
import type { BusinessHour } from "@/pages/user-profile/types";

export function createDefaultBusinessHours(): BusinessHour[] {
  return [
    { day: "Segunda", enabled: true, open: "09:00", close: "18:00" },
    { day: "Terça", enabled: true, open: "09:00", close: "18:00" },
    { day: "Quarta", enabled: true, open: "09:00", close: "18:00" },
    { day: "Quinta", enabled: true, open: "09:00", close: "18:00" },
    { day: "Sexta", enabled: true, open: "09:00", close: "18:00" },
    { day: "Sábado", enabled: false, open: "10:00", close: "14:00" },
    { day: "Domingo", enabled: false, open: "10:00", close: "14:00" },
  ];
}

export function serializeBusinessHours(hours: BusinessHour[]) {
  return hours.map((hour) =>
    hour.enabled ? `${hour.day}: ${hour.open}-${hour.close}` : `${hour.day}: fechado`
  );
}

export function parseBusinessHours(lines: string[] = []) {
  const defaults = createDefaultBusinessHours();
  const byDay = new Map(defaults.map((item) => [item.day.toLowerCase(), item]));
  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) continue;
    const rawDay = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!rawDay || !rawValue) continue;
    const entry = byDay.get(rawDay.trim().toLowerCase());
    if (!entry) continue;
    const normalized = rawValue.toLowerCase();
    if (normalized.includes("fechado")) {
      entry.enabled = false;
      continue;
    }
    const match = normalized.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (match) {
      entry.enabled = true;
      entry.open = match[1];
      entry.close = match[2];
    }
  }
  return defaults;
}

export function getDateInputDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatFeaturedScope(placement: FeaturedPlacementFrontend): string {
  if (placement.scopeType === "global") return "Global";
  if (placement.scopeType === "country") return `Pa?s: ${getCountryName(placement.countryCode)}`;
  if (placement.scopeType === "state") {
    return `${getCountryName(placement.countryCode)}/${placement.stateCode.toUpperCase()}`;
  }
  return `${placement.city}, ${placement.stateCode.toUpperCase()}`;
}

export function parseBrDateToIso(value: string): string | null {
  const v = (value || "").trim().replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeDateForInput(value: string): string {
  return parseBrDateToIso(value) || "";
}

export function formatIsoToBr(value: string): string {
  const v = (value || "").trim();
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return v;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
