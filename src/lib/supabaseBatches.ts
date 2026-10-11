const SUPABASE_IN_FILTER_BATCH_SIZE = 75;

type InFilterBatchResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function fetchInFilterBatches<T>(
  values: readonly string[],
  queryBatch: (batch: string[]) => PromiseLike<InFilterBatchResult<T>>,
  context: string,
): Promise<T[]> {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));
  if (uniqueValues.length === 0) return [];

  const batches: string[][] = [];
  for (let index = 0; index < uniqueValues.length; index += SUPABASE_IN_FILTER_BATCH_SIZE) {
    batches.push(uniqueValues.slice(index, index + SUPABASE_IN_FILTER_BATCH_SIZE));
  }

  const results = await Promise.all(batches.map((batch) => queryBatch(batch)));
  const errors = results.flatMap((result) => (result.error ? [result.error] : []));

  if (errors.length > 0) {
    console.warn(`[${context}] ${errors.length} lote(s) falharam: ${errors[0].message}`);
  }

  return results.flatMap((result) => result.data || []);
}
