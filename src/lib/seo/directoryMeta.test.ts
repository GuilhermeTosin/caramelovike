import { describe, expect, it } from "vitest";
import type { BusinessFrontend } from "@/types/database";
import { getDirectoryPageMeta } from "./directoryMeta";

const businesses = [
  {
    address: {
      countryCode: "ca",
      country: "Canad\u00e1",
      stateCode: "qc",
      state: "Quebec",
      city: "Chambly",
    },
  },
] as BusinessFrontend[];

describe("getDirectoryPageMeta", () => {
  it("creates metadata for the directory root", () => {
    expect(getDirectoryPageMeta("/negocios", businesses)).toEqual({
      heading: "Neg\u00f3cios brasileiros no exterior por pa\u00eds",
      title: "Neg\u00f3cios brasileiros no exterior por pa\u00eds | Caramelinho.com",
      description: "Encontre neg\u00f3cios brasileiros no exterior por pa\u00eds, estado e cidade. Descubra empresas, profissionais, restaurantes, lojas e servi\u00e7os da comunidade brasileira.",
    });
  });

  it.each([
    ["/negocios/ca", "Neg\u00f3cios brasileiros no Canad\u00e1"],
    ["/negocios/ca/qc", "Neg\u00f3cios brasileiros em Quebec, Canad\u00e1"],
    ["/negocios/ca/qc/chambly", "Neg\u00f3cios brasileiros em Chambly, Quebec, Canad\u00e1"],
  ])("creates geographic metadata for %s", (pathname, heading) => {
    const meta = getDirectoryPageMeta(pathname, businesses);
    expect(meta?.heading).toBe(heading);
    expect(meta?.title).toBe(`${heading} | Caramelinho.com`);
    expect(meta?.description).toContain(heading.replace("Neg\u00f3cios", "neg\u00f3cios"));
  });

  it("identifies paginated city pages in the title and description", () => {
    const meta = getDirectoryPageMeta("/negocios/ca/qc/chambly/pagina/2", businesses);
    expect(meta?.title).toBe("Neg\u00f3cios brasileiros em Chambly, Quebec, Canad\u00e1 - P\u00e1gina 2 | Caramelinho.com");
    expect(meta?.description).toContain("P\u00e1gina 2 do diret\u00f3rio.");
  });
});
