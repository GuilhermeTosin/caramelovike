import { describe, expect, it, vi } from "vitest";
import { fetchInFilterBatches } from "@/lib/supabaseBatches";

describe("fetchInFilterBatches", () => {
  it("deduplicates values and keeps Supabase in filters below the safe limit", async () => {
    const values = Array.from({ length: 160 }, (_, index) => `id-${index}`);
    values.push("id-0", "id-80");
    const batches: string[][] = [];

    const rows = await fetchInFilterBatches(
      values,
      async (batch) => {
        batches.push(batch);
        return {
          data: batch.map((id) => ({ id })),
          error: null,
        };
      },
      "test",
    );

    expect(batches.map((batch) => batch.length)).toEqual([75, 75, 10]);
    expect(rows).toHaveLength(160);
    expect(new Set(rows.map((row) => row.id)).size).toBe(160);
  });

  it("returns successful batches when one batch fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const values = Array.from({ length: 80 }, (_, index) => `id-${index}`);

    const rows = await fetchInFilterBatches(
      values,
      async (batch) => batch[0] === "id-75"
        ? { data: null, error: { message: "request failed" } }
        : { data: batch.map((id) => ({ id })), error: null },
      "test",
    );

    expect(rows).toHaveLength(75);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
