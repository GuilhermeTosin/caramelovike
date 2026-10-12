export async function fetchAllPages<T>(
  fetchPage: (
    start: number,
    end: number,
  ) => Promise<{ items: T[]; total: number }>,
  pageSize = 1000,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError("pageSize must be a positive integer");
  }

  const rows: T[] = [];

  let start = 0;
  while (true) {
    const page = await fetchPage(start, start + pageSize - 1);
    if (!Number.isSafeInteger(page.total) || page.total < 0) {
      throw new Error("A paginated response must include a valid total");
    }
    if (page.items.length > pageSize) {
      throw new Error("A paginated response exceeded the requested page size");
    }

    if (page.items.length === 0) {
      if (start < page.total) {
        throw new Error("Pagination ended before all rows were received");
      }
      return rows;
    }

    rows.push(...page.items);
    start += page.items.length;
    if (start >= page.total) return rows;
  }
}
