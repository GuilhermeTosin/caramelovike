import { describe, expect, it, vi } from "vitest";
import {
  fetchAllPages,
  requireTransferredBusinessOwner,
} from "../../server/adminUsersRuntime.js";

describe("admin users runtime helpers", () => {
  describe("fetchAllPages", () => {
    it("continues when the server caps each response below the requested range", async () => {
      const fetchPage = vi.fn(async (start: number) => {
        const all = ["first", "second", "third", "fourth", "fifth"];
        return { items: all.slice(start, start + 2), total: all.length };
      });

      await expect(fetchAllPages(fetchPage, 4)).resolves.toEqual([
        "first",
        "second",
        "third",
        "fourth",
        "fifth",
      ]);
      expect(fetchPage.mock.calls).toEqual([
        [0, 3],
        [2, 5],
        [4, 7],
      ]);
    });

    it("stops without an extra request when the total is an exact page multiple", async () => {
      const all = ["first", "second", "third", "fourth"];
      const fetchPage = vi.fn(async (start: number, end: number) => ({
        items: all.slice(start, end + 1),
        total: all.length,
      }));

      await expect(fetchAllPages(fetchPage, 2)).resolves.toEqual(all);
      expect(fetchPage.mock.calls).toEqual([
        [0, 1],
        [2, 3],
      ]);
    });

    it("rejects invalid page sizes and incomplete or invalid responses", async () => {
      await expect(fetchAllPages(async () => ({ items: [], total: 0 }), 0)).rejects.toThrow(
        RangeError,
      );
      await expect(fetchAllPages(async () => ({ items: [], total: 1 }), 2)).rejects.toThrow(
        "Pagination ended before all rows were received",
      );
      await expect(
        fetchAllPages(async () => ({ items: ["row"], total: Number.NaN }), 2),
      ).rejects.toThrow("A paginated response must include a valid total");
    });
  });

  describe("requireTransferredBusinessOwner", () => {
    it("accepts only a transfer confirmed for the expected owner", () => {
      const business = { id: "business-1", owner_id: "new-owner" };
      expect(requireTransferredBusinessOwner(business, "new-owner")).toBe(business);
    });

    it("rejects an empty or mismatched update result", () => {
      expect(() => requireTransferredBusinessOwner(null, "new-owner")).toThrow(
        "O Supabase não confirmou a transferência do negócio.",
      );
      expect(() =>
        requireTransferredBusinessOwner({ id: "business-1", owner_id: "old-owner" }, "new-owner"),
      ).toThrow("O Supabase retornou um proprietário diferente do destinatário.");
    });
  });
});
