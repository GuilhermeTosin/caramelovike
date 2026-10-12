import { describe, expect, it } from "vitest";
import { getAdminApiErrorMessage } from "@/lib/adminApiError";

describe("getAdminApiErrorMessage", () => {
  it("returns a string error as-is", () => {
    expect(getAdminApiErrorMessage("Falha ao carregar dados.")).toBe("Falha ao carregar dados.");
  });

  it("extracts a nested server error message and code", () => {
    expect(
      getAdminApiErrorMessage({
        error: { code: "42501", message: "Permissão negada." },
      }),
    ).toBe("Permissão negada. (42501)");
  });

  it("serializes an object without message fields instead of showing [object Object]", () => {
    expect(getAdminApiErrorMessage({ status: 500 })).toBe('{"status":500}');
  });

  it("handles empty and non-string error values", () => {
    expect(getAdminApiErrorMessage(null)).toBeNull();
    expect(getAdminApiErrorMessage(503)).toBe("503");
  });
});
