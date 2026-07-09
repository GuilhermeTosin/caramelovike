import { describe, expect, it } from "vitest";
import { getCountryName, getStateDisplayName, getStateName } from "./businesses";

describe("location display names", () => {
  it("renders country names in pt-BR from ISO codes", () => {
    expect(getCountryName("de")).toBe("Alemanha");
    expect(getCountryName("fr")).toBe("França");
    expect(getCountryName("gb")).toBe("Reino Unido");
  });

  it("renders supported state names", () => {
    expect(getStateName("de", "by")).toBe("Baviera");
    expect(getStateName("br", "pr")).toBe("Paraná");
  });

  it("prefers a readable fallback when no mapping exists", () => {
    expect(getStateDisplayName("xx", "zz", "Nome Completo")).toBe("Nome Completo");
  });
});