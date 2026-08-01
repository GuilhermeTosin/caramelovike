import { describe, expect, it } from "vitest";
import type { BusinessFrontend } from "@/types/database";
import { resolveInitialSearchBusinesses } from "@/lib/search/searchBusinessSnapshot";

const compactBusiness = { id: "compact", heroImage: "" } as BusinessFrontend;
const completeBusiness = { id: "complete", heroImage: "hero.webp" } as BusinessFrontend;

describe("search business snapshot", () => {
  it("ignora o indice compacto compartilhado por home e diretorio", () => {
    expect(resolveInitialSearchBusinesses({ initialBusinesses: [compactBusiness] })).toEqual([]);
  });

  it("aceita apenas o snapshot marcado como pronto para busca", () => {
    expect(resolveInitialSearchBusinesses({
      initialBusinesses: [completeBusiness],
      initialBusinessesAreSearchReady: true,
    })).toEqual([completeBusiness]);
  });

  it("prioriza os negocios completos enviados pela navegacao da home", () => {
    expect(resolveInitialSearchBusinesses({
      preloadedBusinesses: [completeBusiness],
      initialBusinesses: [compactBusiness],
    })).toEqual([completeBusiness]);
  });
});