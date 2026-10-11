import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: fromMock },
}));

import {
  getBusinessByCountryAndSlug,
  getBusinessByHistoricalPath,
  getBusinessById,
  getBusinessByShortSlug,
  getBusinessBySlug,
  isBusinessUrlTombstoned,
} from "./businesses";

function mockSingleQuery(result: { data: unknown; error: unknown }) {
  const query: Record<string, any> = {};
  for (const method of ["select", "or", "eq", "order", "limit"]) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn().mockResolvedValue(result);
  fromMock.mockReturnValue(query);
}

describe("business lookup errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when a canonical business lookup succeeds with no row", async () => {
    mockSingleQuery({ data: null, error: null });

    await expect(getBusinessBySlug("ca", "qc", "montreal", "missing-business"))
      .resolves.toBeNull();
  });

  it.each([
    ["full canonical path", () => getBusinessBySlug("ca", "qc", "montreal", "tapi-go")],
    ["country-level path", () => getBusinessByCountryAndSlug("ca", "tapi-go")],
    ["business id", () => getBusinessById("business-id")],
    ["historical path", () => getBusinessByHistoricalPath("ca", "qc", "montreal", "old-name")],
    ["short link", () => getBusinessByShortSlug("tapi-go")],
    ["retired URL lookup", () => isBusinessUrlTombstoned("/ca/qc/montreal/tapi-go")],
  ])("propagates Supabase errors for %s", async (_label, lookup) => {
    const databaseError = { code: "503", message: "Service unavailable" };
    mockSingleQuery({ data: null, error: databaseError });

    await expect(lookup()).rejects.toBe(databaseError);
  });
});
