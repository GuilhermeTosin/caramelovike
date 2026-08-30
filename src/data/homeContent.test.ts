import { describe, expect, it } from "vitest";
import { getHomeContent } from "@/data/homeContent";

describe("home quick search tags", () => {
  it("uses the same Portuguese search query in every locale", () => {
    const portuguese = getHomeContent("pt-BR");
    const english = getHomeContent("en");

    for (const mode of ["businesses", "events", "achadinhos"] as const) {
      expect(english.searchModes[mode].quickTags.map((tag) => tag.query)).toEqual(
        portuguese.searchModes[mode].quickTags.map((tag) => tag.query),
      );
    }
  });

  it("keeps the visible labels localized", () => {
    expect(getHomeContent("pt-BR").searchModes.businesses.quickTags[3].label).toBe("Advogado");
    expect(getHomeContent("en").searchModes.businesses.quickTags[3].label).toBe("Lawyer");
    expect(getHomeContent("en").searchModes.businesses.quickTags[3].query).toBe("Advogado");
  });
});
