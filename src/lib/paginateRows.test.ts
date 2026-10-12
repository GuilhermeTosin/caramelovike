import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "@/lib/paginateRows";

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

    await expect(fetchAllPages(fetchPage, 2)).resolves.toEqual([
      "first",
      "second",
      "third",
      "fourth",
    ]);
    expect(fetchPage.mock.calls).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it("rejects invalid page sizes", async () => {
    await expect(fetchAllPages(async () => ({ items: [], total: 0 }), 0)).rejects.toThrow(
      RangeError,
    );
  });

  it("does not silently accept an incomplete response", async () => {
    await expect(
      fetchAllPages(async () => ({ items: [], total: 1 }), 2),
    ).rejects.toThrow("Pagination ended before all rows were received");
  });

  it("rejects responses without a valid exact total", async () => {
    await expect(
      fetchAllPages(async () => ({ items: ["row"], total: Number.NaN }), 2),
    ).rejects.toThrow("A paginated response must include a valid total");
  });
});
