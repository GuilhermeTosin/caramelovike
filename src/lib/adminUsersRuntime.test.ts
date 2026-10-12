import { describe, expect, it, vi } from "vitest";
import {
  chunkValues,
  fetchAllPages,
  findBusinessOwnershipConflicts,
  normalizeBusinessIds,
  requireTransferredBusinessOwner,
  transferBusinessBatches,
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

  describe("bulk business transfer helpers", () => {
    const businessIds = [
      "1de5f5c9-5f77-4058-b66d-ae0bb180f7dc",
      "41dca940-cf92-4158-8e44-ad84c48449f8",
      "4c15c732-f536-4cab-8a20-30937b6b7680",
    ];

    it("validates UUID selections, removes surrounding whitespace, and chunks values", () => {
      expect(normalizeBusinessIds([` ${businessIds[0]} `, businessIds[1]])).toEqual([
        businessIds[0],
        businessIds[1],
      ]);
      expect(chunkValues(businessIds, 2)).toEqual([businessIds.slice(0, 2), businessIds.slice(2)]);
      expect(() => normalizeBusinessIds([])).toThrow("Selecione entre 1 e 500 negócios");
      expect(() => normalizeBusinessIds(["not-a-uuid"])).toThrow("identificador de negócio inválido");
      expect(() => normalizeBusinessIds([businessIds[0], businessIds[0]])).toThrow("duplicados");
      expect(() => chunkValues(businessIds, 0)).toThrow(RangeError);
    });

    it("distinguishes a prior transfer from missing or third-party ownership before starting", () => {
      expect(
        findBusinessOwnershipConflicts(
          businessIds,
          [
            { id: businessIds[0], owner_id: "editor-id" },
            { id: businessIds[1], owner_id: "admin-id" },
            { id: businessIds[2], owner_id: "other-owner" },
          ],
          "editor-id",
          "admin-id",
        ),
      ).toEqual([businessIds[2]]);
      expect(findBusinessOwnershipConflicts([businessIds[2]], [], "editor-id", "admin-id"))
        .toEqual([businessIds[2]]);
    });

    it("confirms every business when all batches transfer successfully", async () => {
      const transferBatch = vi.fn(async (ids: string[]) =>
        ids.map((id) => ({ id, owner_id: "admin-id" })),
      );
      const verifyBatch = vi.fn();

      await expect(
        transferBusinessBatches({
          businessIds,
          expectedOwnerId: "admin-id",
          batchSize: 2,
          transferBatch,
          verifyBatch,
        }),
      ).resolves.toEqual({
        transferredBusinessIds: businessIds,
        failedBusinessIds: [],
        error: null,
      });
      expect(transferBatch).toHaveBeenCalledTimes(2);
      expect(verifyBatch).not.toHaveBeenCalled();
    });

    it("processes a 400-business selection as ten bounded batches", async () => {
      const manyBusinessIds = Array.from({ length: 400 }, (_, index) =>
        `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      );
      const transferBatch = vi.fn(async (ids: string[]) =>
        ids.map((id) => ({ id, owner_id: "admin-id" })),
      );

      const result = await transferBusinessBatches({
        businessIds: normalizeBusinessIds(manyBusinessIds),
        expectedOwnerId: "admin-id",
        batchSize: 40,
        transferBatch,
        verifyBatch: async () => [],
      });

      expect(result.transferredBusinessIds).toHaveLength(400);
      expect(result.failedBusinessIds).toEqual([]);
      expect(transferBatch).toHaveBeenCalledTimes(10);
      expect(transferBatch.mock.calls.every(([ids]) => ids.length <= 40)).toBe(true);
    });

    it("reconciles a failed batch and reports confirmed and remaining businesses", async () => {
      const transferBatch = vi
        .fn()
        .mockResolvedValueOnce([{ id: businessIds[0], owner_id: "admin-id" }, { id: businessIds[1], owner_id: "admin-id" }])
        .mockRejectedValueOnce(new Error("network interrupted"));
      const verifyBatch = vi.fn(async () => [
        { id: businessIds[2], owner_id: "old-owner" },
      ]);

      await expect(
        transferBusinessBatches({
          businessIds,
          expectedOwnerId: "admin-id",
          batchSize: 2,
          transferBatch,
          verifyBatch,
        }),
      ).resolves.toEqual({
        transferredBusinessIds: businessIds.slice(0, 2),
        failedBusinessIds: [businessIds[2]],
        error: "A transferência foi interrompida após 2 de 3 negócios confirmados. Os demais continuam selecionados para nova tentativa.",
      });
      expect(verifyBatch).toHaveBeenCalledWith([businessIds[2]]);
    });

    it("recognizes a batch that committed before its response was lost", async () => {
      const transferBatch = vi.fn().mockRejectedValue(new Error("connection closed after commit"));
      const verifyBatch = vi.fn(async () => [
        { id: businessIds[0], owner_id: "admin-id" },
        { id: businessIds[1], owner_id: "old-owner" },
      ]);

      await expect(
        transferBusinessBatches({
          businessIds: businessIds.slice(0, 2),
          expectedOwnerId: "admin-id",
          batchSize: 2,
          transferBatch,
          verifyBatch,
        }),
      ).resolves.toMatchObject({
        transferredBusinessIds: [businessIds[0]],
        failedBusinessIds: [businessIds[1]],
      });
    });

    it("does not report an interruption when the lost response covered the final batch", async () => {
      await expect(
        transferBusinessBatches({
          businessIds: [businessIds[0]],
          expectedOwnerId: "admin-id",
          transferBatch: async () => { throw new Error("response lost after commit"); },
          verifyBatch: async () => [{ id: businessIds[0], owner_id: "admin-id" }],
        }),
      ).resolves.toEqual({
        transferredBusinessIds: [businessIds[0]],
        failedBusinessIds: [],
        error: null,
      });
    });
  });
});
