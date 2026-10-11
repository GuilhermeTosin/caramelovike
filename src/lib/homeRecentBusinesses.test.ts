import { describe, expect, it } from "vitest";
import type { BusinessFrontend } from "@/types/database";
import { mergeRecentBusinesses } from "@/lib/homeRecentBusinesses";

function business(id: string, createdAt: string, updatedAt = createdAt) {
  return { id, createdAt, updatedAt } as unknown as BusinessFrontend;
}

describe("mergeRecentBusinesses", () => {
  it("orders global and regional results by creation date, not edit date", () => {
    const oldBusiness = business("old", "2024-01-01T00:00:00.000Z", "2026-10-10T00:00:00.000Z");
    const newBusiness = business("new", "2026-10-01T00:00:00.000Z");

    expect(mergeRecentBusinesses([newBusiness], [oldBusiness])).toEqual([newBusiness, oldBusiness]);
  });

  it("deduplicates businesses while retaining their first instance", () => {
    const existing = business("same", "2026-10-01T00:00:00.000Z");
    const duplicate = business("same", "2026-10-02T00:00:00.000Z");

    expect(mergeRecentBusinesses([existing], [duplicate])).toEqual([existing]);
  });

  it("keeps businesses without valid creation dates after dated entries", () => {
    const undated = business("undated", "");
    const dated = business("dated", "2026-10-01T00:00:00.000Z");

    expect(mergeRecentBusinesses([undated], [dated])).toEqual([dated, undated]);
  });
});
