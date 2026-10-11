import { describe, expect, it } from "vitest";
import { getCountryName, getStateDisplayName, getStateName, toFrontend } from "./businesses";
import type { Business } from "@/types/database";

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

describe("business owner data serialization", () => {
  const row = {
    id: "business-1",
    owner_id: "owner-1",
    name: "Negócio de teste",
    slug: "negocio-de-teste",
    category_id: "other",
    description: "Descrição",
  } as Business;

  it("omits owner details from business DTOs by default", () => {
    const result = toFrontend(row, "Nome privado");

    expect(result).not.toHaveProperty("ownerId");
    expect(result).not.toHaveProperty("ownerName");
  });

  it("keeps owner details available to explicitly authorized internal views", () => {
    const result = toFrontend(row, "Nome interno", { includeOwnerDetails: true });

    expect(result.ownerId).toBe("owner-1");
    expect(result.ownerName).toBe("Nome interno");
  });
});
