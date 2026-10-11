import { stripRichTextHtml } from "@/lib/richText";
import type { BusinessFrontend } from "@/types/database";

export const SHORT_DESCRIPTION_MIN_LENGTH = 120;

type BusinessQualityIssue = {
  business: BusinessFrontend;
  descriptionLength?: number;
};

export type BusinessQualityAudit = {
  shortDescriptions: BusinessQualityIssue[];
  legacyHours: BusinessQualityIssue[];
};

function normalizeHourLine(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function buildHoursSignature(hours: string[]): string {
  return hours.map(normalizeHourLine).filter(Boolean).sort().join("|");
}

const LEGACY_HOURS_SIGNATURES = new Set([
  buildHoursSignature([
    "Segunda: 09:00-18:00",
    "Terça: 09:00-18:00",
    "Quarta: 09:00-18:00",
    "Quinta: 09:00-18:00",
    "Sexta: 09:00-18:00",
    "Sábado: 10:00-14:00",
    "Domingo: fechado",
  ]),
  buildHoursSignature([
    "Segunda: 09:00-18:00",
    "Terça: 09:00-18:00",
    "Quarta: 09:00-18:00",
    "Quinta: 09:00-18:00",
    "Sexta: 09:00-18:00",
    "Sábado: fechado",
    "Domingo: fechado",
  ]),
]);

export function getDescriptionLength(description: string): number {
  return stripRichTextHtml(description).replace(/\s+/g, " ").trim().length;
}

export function hasLegacyOpeningHours(hours: string[]): boolean {
  return hours.length > 0 && LEGACY_HOURS_SIGNATURES.has(buildHoursSignature(hours));
}

export function getBusinessQualityAudit(businesses: BusinessFrontend[]): BusinessQualityAudit {
  const visibleBusinesses = businesses.filter((business) => business.moderationStatus !== "rejected");

  return {
    shortDescriptions: visibleBusinesses
      .map((business) => ({ business, descriptionLength: getDescriptionLength(business.description) }))
      .filter((issue) => (issue.descriptionLength || 0) < SHORT_DESCRIPTION_MIN_LENGTH)
      .sort((left, right) => (left.descriptionLength || 0) - (right.descriptionLength || 0)),
    legacyHours: visibleBusinesses
      .filter((business) => hasLegacyOpeningHours(business.openingHours))
      .map((business) => ({ business })),
  };
}
