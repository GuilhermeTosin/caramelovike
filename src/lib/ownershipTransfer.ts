export function requireTransferredBusinessOwner<T extends { owner_id: string }>(
  business: T | null | undefined,
  expectedOwnerId: string,
): T {
  if (!business) {
    throw new Error("O Supabase não confirmou a transferência do negócio.");
  }

  if (business.owner_id !== expectedOwnerId) {
    throw new Error("O Supabase retornou um proprietário diferente do destinatário.");
  }

  return business;
}
