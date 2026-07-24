import { utf8Fetch } from "@/lib/http/utf8";
import { supabase } from "@/lib/supabase";
import type { BusinessFrontend, OwnerClaimRequest } from "@/types/database";

export async function requestBusinessOwnership(
  businessId: string,
  message: string
): Promise<{ ok: boolean; requestId?: string; error?: string }> {
  const { data, error } = await supabase.rpc("request_business_ownership", {
    p_business_id: businessId,
    p_message: message,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, requestId: data as string };
}

export async function getMyOwnershipRequests(): Promise<OwnerClaimRequest[]> {
  const { data, error } = await supabase
    .from("owner_claim_requests")
    .select(`
      *,
      business:businesses(id, name, city, country_code, owner_id)
    `)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as OwnerClaimRequest[];
}

export async function getPendingOwnershipRequests(): Promise<OwnerClaimRequest[]> {
  const { data, error } = await supabase
    .from("owner_claim_requests")
    .select(`
      *,
      business:businesses(id, name, city, country_code, owner_id)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as OwnerClaimRequest[];
}

export async function approveOwnershipRequest(requestId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("approve_business_ownership_request", {
    p_request_id: requestId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function rejectOwnershipRequest(requestId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("reject_business_ownership_request", {
    p_request_id: requestId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function transferBusinessOwnershipByEmail(
  businessId: string,
  newOwnerEmail: string
): Promise<{ ok: boolean; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { ok: false, error: "Sess\u00e3o expirada. Fa\u00e7a login novamente." };
  }

  const response = await utf8Fetch("/api/admin-users", {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + session.access_token,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      action: "transfer_business_ownership",
      businessId,
      newOwnerEmail,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    return {
      ok: false,
      error: payload.error || "N\u00e3o foi poss\u00edvel transferir o neg\u00f3cio.",
    };
  }

  return { ok: true };
}

export function hasPendingClaimForBusiness(
  requests: OwnerClaimRequest[],
  business: BusinessFrontend
): boolean {
  return requests.some(
    (request) => request.business_id === business.id && request.status === "pending"
  );
}
