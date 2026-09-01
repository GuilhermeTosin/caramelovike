import { describe, expect, it } from "vitest";
import { getHomeContent } from "@/data/homeContent";

describe("home quick search tags", () => {
  it("uses Portuguese quick-search labels and queries", () => {
    const homeContent = getHomeContent();
    expect(homeContent.searchModes.businesses.quickTags[3].label).toBe("Advogado");
    expect(homeContent.searchModes.businesses.quickTags[3].query).toBe("Advogado");
  });
});
