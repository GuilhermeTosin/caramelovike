import { describe, expect, it } from "vitest";
import { requireTransferredBusinessOwner } from "@/lib/ownershipTransfer";

describe("requireTransferredBusinessOwner", () => {
  it("returns the business when Supabase confirms the new owner", () => {
    const business = { id: "business-1", owner_id: "new-owner" };

    expect(requireTransferredBusinessOwner(business, "new-owner")).toBe(business);
  });

  it("rejects an empty update result instead of reporting success", () => {
    expect(() => requireTransferredBusinessOwner(null, "new-owner")).toThrow(
      "O Supabase não confirmou a transferência do negócio.",
    );
  });

  it("rejects a result owned by a different user", () => {
    expect(() =>
      requireTransferredBusinessOwner({ id: "business-1", owner_id: "old-owner" }, "new-owner"),
    ).toThrow("O Supabase retornou um proprietário diferente do destinatário.");
  });
});
