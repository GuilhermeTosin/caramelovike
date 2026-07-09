import { describe, expect, it } from "vitest";
import { getCountryName, getStateName } from "./businesses";

describe("location display names", () => {
  it("renders country names in pt-BR from ISO codes", () => {
    expect(getCountryName("de")).toBe("Alemanha");
    expect(getCountryName("fr")).toBe("França");
    expect(getCountryName("gb")).toBe("Reino Unido");
  });

  it("renders supported state names", () => {
    expect(getStateName("de", "by")).toBe("Baviera");
  });
});
