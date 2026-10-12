import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: fromMock },
}));

import { getCommunityEventById } from "./events";

function mockEventLookup(result: { data: unknown; error: unknown }) {
  const query: Record<string, any> = {};
  for (const method of ["select", "eq"]) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn().mockResolvedValue(result);
  fromMock.mockReturnValue(query);
  return query;
}

describe("getCommunityEventById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null only when the published-event lookup succeeds without a row", async () => {
    const query = mockEventLookup({ data: null, error: null });

    await expect(getCommunityEventById("event-id")).resolves.toBeNull();

    expect(fromMock).toHaveBeenCalledWith("events");
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", "event-id");
    expect(query.eq).toHaveBeenNthCalledWith(2, "status", "published");
  });

  it("propagates database errors so SSR can return an unavailable response", async () => {
    const databaseError = { code: "503", message: "Service unavailable" };
    mockEventLookup({ data: null, error: databaseError });

    await expect(getCommunityEventById("event-id")).rejects.toBe(databaseError);
  });
});
