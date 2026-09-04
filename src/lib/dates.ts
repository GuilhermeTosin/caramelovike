const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateForDisplay(value: string | Date): Date {
  if (value instanceof Date) return value;
  const normalized = value.trim();
  return DATE_ONLY_PATTERN.test(normalized)
    ? new Date(`${normalized}T00:00:00.000Z`)
    : new Date(normalized);
}

// Server-rendered public pages must format dates in the same timezone as the browser.
export function formatDatePtBr(value: string | Date): string {
  const date = parseDateForDisplay(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Existing records receive their creation date as a baseline during the migration.
// Only expose a public "updated" date once the profile was actually edited later.
export function getMeaningfulUpdatedAt(updatedAt?: string, createdAt?: string): string | undefined {
  if (!updatedAt) return undefined;

  const updatedTime = Date.parse(updatedAt);
  if (Number.isNaN(updatedTime)) return undefined;

  const createdTime = createdAt ? Date.parse(createdAt) : Number.NaN;
  if (!Number.isNaN(createdTime) && updatedTime <= createdTime) return undefined;

  return updatedAt;
}
