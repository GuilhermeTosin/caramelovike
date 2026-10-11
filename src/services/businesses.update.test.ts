import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, updatePayload } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  updatePayload: { current: null as Record<string, unknown> | null },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: fromMock },
}));

import { isBusinessSlugAvailable, isBusinessUrlTombstoned, updateBusiness } from "./businesses";

function mockBusinessQueries(options?: {
  currentName?: string;
  conflictingSlugs?: string[];
  previousShortSlugs?: string[];
  reservedSlugs?: string[];
  retiredPaths?: string[];
}) {
  const currentName = options?.currentName ?? "Nome antigo";
  const conflictingSlugs = new Set(options?.conflictingSlugs ?? []);
  const previousShortSlugs = new Set(options?.previousShortSlugs ?? []);
  const reservedSlugs = new Set(options?.reservedSlugs ?? []);
  const retiredPaths = new Set(options?.retiredPaths ?? []);

  fromMock.mockImplementation((table: string) => {
    let selectedColumns = "";
    let requestedSlug = "";
    let requestedPath = "";
    let updateResult = false;
    const query: Record<string, any> = {};

    query.select = (columns: string) => {
      selectedColumns = columns;
      return query;
    };
    query.eq = (column: string, value: string) => {
      if (["slug", "old_business_slug", "old_short_slug", "reserved_slug"].includes(column)) requestedSlug = value;
      if (column === "route_path") requestedPath = value;
      return query;
    };
    query.neq = () => query;
    query.limit = () => query;
    query.maybeSingle = async () => ({
      data: table === "businesses"
        ? { name: currentName }
        : retiredPaths.has(requestedPath)
          ? { route_path: requestedPath }
          : null,
      error: null,
    });
    query.update = (payload: Record<string, unknown>) => {
      updatePayload.current = payload;
      updateResult = true;
      return query;
    };
    query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
      let result: unknown;
      if (updateResult) {
        result = { error: null };
      } else if (table === "businesses" && selectedColumns === "id") {
        result = { data: conflictingSlugs.has(requestedSlug) ? [{ id: "another-business" }] : [], error: null };
      } else if (table === "business_url_tombstones" && selectedColumns === "reserved_slug") {
        result = { data: reservedSlugs.has(requestedSlug) ? [{ reserved_slug: requestedSlug }] : [], error: null };
      } else if (table === "business_short_link_history" && selectedColumns === "business_id") {
        result = { data: previousShortSlugs.has(requestedSlug) ? [{ business_id: "another-business" }] : [], error: null };
      } else {
        result = { data: [], error: null };
      }
      return Promise.resolve(result).then(resolve, reject);
    };

    return query;
  });
}

describe("updateBusiness canonical URL", () => {
  beforeEach(() => {
    updatePayload.current = null;
    mockBusinessQueries();
  });

  it("updates the canonical slug when the business name changes", async () => {
    const updated = await updateBusiness("business-1", { name: "Café Aurora" });

    expect(updated).toBe(true);
    expect(updatePayload.current).toMatchObject({ name: "Café Aurora", slug: "cafe-aurora" });
  });

  it("preserves a custom canonical slug when the name is unchanged", async () => {
    mockBusinessQueries({ currentName: "Nome antigo" });

    const updated = await updateBusiness("business-1", { name: "Nome antigo", description: "Atualizado" });

    expect(updated).toBe(true);
    expect(updatePayload.current).toMatchObject({ name: "Nome antigo", description: "Atualizado" });
    expect(updatePayload.current).not.toHaveProperty("slug");
  });

  it("adds a numeric suffix when the new canonical slug is already taken", async () => {
    mockBusinessQueries({ conflictingSlugs: ["nova-marca"] });

    const updated = await updateBusiness("business-1", { name: "Nova Marca" });

    expect(updated).toBe(true);
    expect(updatePayload.current).toMatchObject({ slug: "nova-marca-2" });
  });

  it("does not reuse a slug reserved by a deleted business", async () => {
    mockBusinessQueries({ reservedSlugs: ["nova-marca"] });

    const updated = await updateBusiness("business-1", { name: "Nova Marca" });

    expect(updated).toBe(true);
    expect(updatePayload.current).toMatchObject({ slug: "nova-marca-2" });
  });

  it("normalizes a visited URL before checking whether it is retired", async () => {
    mockBusinessQueries({ retiredPaths: ["/ca/qc/mirabel/empresa-removida"] });

    await expect(isBusinessUrlTombstoned("/CA/QC/Mirabel/Empresa-Removida?utm_source=old-link"))
      .resolves.toBe(true);
  });

  it("keeps a previous short alias reserved while the business still exists", async () => {
    mockBusinessQueries({ previousShortSlugs: ["alias-antigo"] });

    await expect(isBusinessSlugAvailable("alias-antigo")).resolves.toBe(false);
  });
});
