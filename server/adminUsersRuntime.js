/**
 * @template T
 * @param {(start: number, end: number) => Promise<{ items: T[]; total: number }>} fetchPage
 * @param {number} [pageSize]
 * @returns {Promise<T[]>}
 */
export async function fetchAllPages(fetchPage, pageSize = 1000) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError("pageSize must be a positive integer");
  }

  const rows = [];
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

/**
 * @template {{ owner_id: string }} T
 * @param {T | null | undefined} business
 * @param {string} expectedOwnerId
 * @returns {T}
 */
export function requireTransferredBusinessOwner(business, expectedOwnerId) {
  if (!business) {
    throw new Error("O Supabase não confirmou a transferência do negócio.");
  }

  if (business.owner_id !== expectedOwnerId) {
    throw new Error("O Supabase retornou um proprietário diferente do destinatário.");
  }

  return business;
}
