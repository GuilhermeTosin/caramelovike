import type { BusinessFrontend } from "@/types/database";

export function mergeRecentBusinesses(
  current: BusinessFrontend[],
  additions: BusinessFrontend[],
): BusinessFrontend[] {
  const byId = new Map<string, BusinessFrontend>();
  [...current, ...additions].forEach((business) => {
    if (business.id && !byId.has(business.id)) byId.set(business.id, business);
  });

  return [...byId.values()].sort((a, b) => {
    const aCreatedAt = Date.parse(a.createdAt);
    const bCreatedAt = Date.parse(b.createdAt);
    const aHasValidDate = Number.isFinite(aCreatedAt);
    const bHasValidDate = Number.isFinite(bCreatedAt);

    if (aHasValidDate && bHasValidDate) return bCreatedAt - aCreatedAt;
    if (aHasValidDate) return -1;
    if (bHasValidDate) return 1;
    return 0;
  });
}
