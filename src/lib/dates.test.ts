import { describe, expect, it } from "vitest";
import { getMeaningfulUpdatedAt } from "./dates";

describe("getMeaningfulUpdatedAt", () => {
  it("hides the migration baseline when it matches the creation date", () => {
    expect(getMeaningfulUpdatedAt("2026-07-01T12:00:00.000Z", "2026-07-01T12:00:00.000Z")).toBeUndefined();
  });

  it("returns a date only after a real profile edit", () => {
    expect(getMeaningfulUpdatedAt("2026-07-02T12:00:00.000Z", "2026-07-01T12:00:00.000Z")).toBe("2026-07-02T12:00:00.000Z");
  });

  it("rejects invalid timestamps", () => {
    expect(getMeaningfulUpdatedAt("not-a-date", "2026-07-01T12:00:00.000Z")).toBeUndefined();
  });
});