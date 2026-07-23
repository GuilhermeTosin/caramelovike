import { describe, expect, it } from "vitest";
import { getBusinessProfileScore, getProfileScoreItems } from "./profileCompleteness";

describe("business profile completeness", () => {
  it("starts at zero when no business data was supplied", () => {
    expect(getBusinessProfileScore({})).toBe(0);
  });

  it("awards description points progressively from the first text", () => {
    const scoreFor = (description: string) =>
      getProfileScoreItems({ description }).find((item) => item.id === "description")?.earned;

    expect(scoreFor("Breve descricao")).toBe(4);
    expect(scoreFor("a".repeat(40))).toBe(12);
    expect(scoreFor("a".repeat(120))).toBe(20);
    expect(scoreFor("a".repeat(250))).toBe(28);
  });

  it("gives 30 points to complete contact information from step 3", () => {
    const items = getProfileScoreItems({
      phone: "+1 416 555 1234",
      email: "contato@exemplo.com",
      website: "https://exemplo.com",
      whatsapp: "+1 416 555 1234",
      instagram: "@exemplo",
    });

    const contactPoints = items
      .filter((item) => ["phone", "email", "website", "whatsapp", "social"].includes(item.id))
      .reduce((total, item) => total + item.earned, 0);

    expect(contactPoints).toBe(30);
  });
});