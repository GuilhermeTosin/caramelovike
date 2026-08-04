import { describe, expect, it } from "vitest";
import { getPortuguesePath, localizePath } from "@/lib/locales";

describe("site locale paths", () => {
  it("maps public pages and internal search to English", () => {
    expect(localizePath("/", "en")).toBe("/en");
    expect(localizePath("/buscar?cidade=Montreal&raio=50", "en")).toBe("/en/search?cidade=Montreal&raio=50");
    expect(localizePath("/sobre", "en")).toBe("/en/about");
    expect(localizePath("/negocios/ca/qc/montreal", "en")).toBe("/en/businesses/ca/qc/montreal");
  });

  it("maps English public routes back to Portuguese", () => {
    expect(getPortuguesePath("/en/search")).toBe("/buscar");
    expect(getPortuguesePath("/en/privacy")).toBe("/privacidade");
  });
});