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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @param {number} [maxItems]
 * @returns {string[]}
 */
export function normalizeBusinessIds(value, maxItems = 500) {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) {
    throw new Error(`Selecione entre 1 e ${maxItems} negócios para transferir.`);
  }

  const ids = value.map((id) => (typeof id === "string" ? id.trim() : ""));
  if (ids.some((id) => !UUID_PATTERN.test(id))) {
    throw new Error("A seleção contém um identificador de negócio inválido.");
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error("A seleção contém negócios duplicados. Atualize a página e tente novamente.");
  }

  return ids;
}

/**
 * @template T
 * @param {T[]} values
 * @param {number} size
 * @returns {T[][]}
 */
export function chunkValues(values, size) {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError("chunk size must be a positive integer");
  }

  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

/**
 * @param {string[]} businessIds
 * @param {Array<{ id: string; owner_id: string }>} currentRows
 * @param {string} expectedOwnerId
 * @param {string} [alreadyTransferredOwnerId]
 * @returns {string[]}
 */
export function findBusinessOwnershipConflicts(
  businessIds,
  currentRows,
  expectedOwnerId,
  alreadyTransferredOwnerId,
) {
  const ownersById = new Map(currentRows.map((business) => [business.id, business.owner_id]));
  return businessIds.filter((id) => {
    const ownerId = ownersById.get(id);
    return ownerId !== expectedOwnerId
      && (!alreadyTransferredOwnerId || ownerId !== alreadyTransferredOwnerId);
  });
}

/**
 * @param {{
 *   businessIds: string[];
 *   expectedOwnerId: string;
 *   batchSize?: number;
 *   transferBatch: (ids: string[]) => Promise<Array<{ id: string; owner_id: string }>>;
 *   verifyBatch: (ids: string[]) => Promise<Array<{ id: string; owner_id: string }>>;
 * }} options
 * @returns {Promise<{ transferredBusinessIds: string[]; failedBusinessIds: string[]; error: string | null }>}
 */
export async function transferBusinessBatches({
  businessIds,
  expectedOwnerId,
  batchSize = 40,
  transferBatch,
  verifyBatch,
}) {
  const transferredBusinessIds = [];

  for (const batch of chunkValues(businessIds, batchSize)) {
    try {
      const updated = await transferBatch(batch);
      const ownersById = new Map(updated.map((business) => [business.id, business.owner_id]));
      if (!batch.every((id) => ownersById.get(id) === expectedOwnerId)) {
        throw new Error("O Supabase não confirmou todos os negócios deste lote.");
      }
      transferredBusinessIds.push(...batch);
    } catch {
      let currentRows = [];
      try {
        currentRows = await verifyBatch(batch);
      } catch {
        // Preserve only transfers whose ownership can be confirmed.
      }

      const currentOwners = new Map(currentRows.map((business) => [business.id, business.owner_id]));
      transferredBusinessIds.push(
        ...batch.filter((id) => currentOwners.get(id) === expectedOwnerId),
      );
      const transferredSet = new Set(transferredBusinessIds);
      const failedBusinessIds = businessIds.filter((id) => !transferredSet.has(id));
      const error = failedBusinessIds.length === 0
        ? null
        : `A transferência foi interrompida após ${transferredBusinessIds.length} de ${businessIds.length} negócios confirmados. Os demais continuam selecionados para nova tentativa.`;

      return {
        transferredBusinessIds,
        failedBusinessIds,
        error,
      };
    }
  }

  return { transferredBusinessIds, failedBusinessIds: [], error: null };
}
