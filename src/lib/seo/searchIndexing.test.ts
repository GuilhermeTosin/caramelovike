import { describe, expect, it } from "vitest";
import {
  getInternalSearchCanonicalPath,
  getInternalSearchRobots,
  isInternalSearchPath,
} from "./searchIndexing";

describe("internal search indexing", () => {
  it("keeps every search variant out of the index", () => {
    expect(isInternalSearchPath("/buscar")).toBe(true);
    expect(getInternalSearchRobots("/buscar")).toBe("noindex,follow,max-image-preview:large");
    expect(getInternalSearchCanonicalPath("/buscar")).toBe("/buscar");
  });

  it("does not affect public directory pages", () => {
    expect(isInternalSearchPath("/negocios/ca/qc/montreal")).toBe(false);
    expect(getInternalSearchRobots("/negocios/ca/qc/montreal")).toBeNull();
    expect(getInternalSearchCanonicalPath("/negocios/ca/qc/montreal")).toBe("/negocios/ca/qc/montreal");
  });
});
