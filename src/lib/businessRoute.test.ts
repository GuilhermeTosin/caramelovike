import { describe, expect, it } from "vitest";
import { isBusinessRoutePath } from "./businessRoute";

describe("isBusinessRoutePath", () => {
  it.each([
    "/ca/qc/montreal/tapi-go",
    "/gb/eng/londres/elohim-sabor-brasileiro",
    "/fr/idf/paris/bref-design-art",
    "/au/nsw/sydney/business-name",
  ])("recognizes the full business route %s", (pathname) => {
    expect(isBusinessRoutePath(pathname)).toBe(true);
  });

  it("recognizes country-level and preview business routes", () => {
    expect(isBusinessRoutePath("/ca/tapi-go")).toBe(true);
    expect(isBusinessRoutePath("/preview/negocio/123")).toBe(true);
  });

  it.each([
    "/",
    "/negocios/gb/eng/londres",
    "/eventos/123",
    "/marketplace/ca/qc/montreal/listing",
    "/ca/qc/montreal",
    "/preview/negocio",
  ])("does not recognize a non-business route %s", (pathname) => {
    expect(isBusinessRoutePath(pathname)).toBe(false);
  });

  it("ignores a query string and trailing slash", () => {
    expect(isBusinessRoutePath("/gb/eng/londres/business-name/?ref=home")).toBe(true);
  });
});
