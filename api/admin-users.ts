import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import {
  chunkValues,
  fetchAllPages,
  findBusinessOwnershipConflicts,
  normalizeBusinessIds,
  requireTransferredBusinessOwner,
  transferBusinessBatches,
} from "../server/adminUsersRuntime.js";

const ADMIN_EMAIL = "contact@guilhermetosin.com";
const AUTH_PAGE_SIZE = 1000;
const MAX_AUTH_PAGES = 50;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const REST_PAGE_SIZE = 1000;
const BULK_TRANSFER_BATCH_SIZE = 40;
const MAX_BULK_TRANSFER_BUSINESSES = 500;

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
  authAdminKey: string;
};

type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  user_metadata?: Record<string, unknown>;
};

type UserRelationBusiness = {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  country_code: string | null;
  state_code: string | null;
  moderation_status?: string | null;
  created_at: string;
};

type UserRelationEvent = {
  id: string;
  owner_id: string;
  business_id: string | null;
  title: string;
  description: string;
  date: string;
  location: string;
  is_free: boolean;
  price: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  name: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  avatar: string | null;
  role: string | null;
  created_at: string;
};

type UserRole = "user" | "editor" | "admin";

type OwnerClaimRequestRow = {
  id: string;
};

function getConfig(): SupabaseConfig | null {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const secretKey = String(process.env.SUPABASE_SECRET_KEY || "").trim();
  const legacyServiceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const serviceRoleKey = secretKey || legacyServiceRoleKey;
  const authAdminKey = legacyServiceRoleKey || secretKey;

  if (!url || !serviceRoleKey || !authAdminKey) return null;
  return { url, serviceRoleKey, authAdminKey };
}

function getServerApiHeaders(key: string, includeOpaqueBearer = false): Record<string, string> {
  const headers: Record<string, string> = { apikey: key };
  if (!key.startsWith("sb_") || includeOpaqueBearer) {
    headers.Authorization = "Bearer " + key;
  }
  return headers;
}

function getServerKeyType(key: string): string {
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.startsWith("sb_")) return "opaque";
  return "jwt";
}

function createAdminSupabaseClient(config: SupabaseConfig) {
  return createClient(config.url, config.authAdminKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getBearerToken(req: VercelRequest): string {
  const value = String(req.headers.authorization || "");
  return value.replace(/^Bearer\s+/i, "").trim();
}

function getQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

function normalizeSearchValue(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeRole(value: unknown): UserRole {
  const role = String(value || "").trim().toLowerCase();
  if (role === "admin" || role === "editor") return role;
  return "user";
}

function jsonError(res: VercelResponse, status: number, error: string) {
  return res.status(status).json({ ok: false, error });
}

async function fetchResponse(
  config: SupabaseConfig,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const request = (includeOpaqueBearer: boolean) =>
    fetch(config.url + path, {
      ...init,
      headers: {
        ...getServerApiHeaders(config.serviceRoleKey, includeOpaqueBearer),
        Accept: "application/json; charset=utf-8",
        ...(init.headers || {}),
      },
    });

  let response = await request(false);
  let message = response.ok ? "" : await response.text();

  if (
    !response.ok &&
    config.serviceRoleKey.startsWith("sb_") &&
    (response.status === 401 || response.status === 403) &&
    /bad_jwt|invalid JWT|unrecognized JWT kid/i.test(message)
  ) {
    response = await request(true);
    message = response.ok ? "" : await response.text();
  }

  if (!response.ok) {
    const endpoint = path.split("?")[0];
    throw new Error(
      "Supabase " +
        response.status +
        " em " +
        endpoint +
        " (server-key=" +
        getServerKeyType(config.serviceRoleKey) +
        "): " +
        message.slice(0, 240),
    );
  }

  return response;
}

async function fetchJson<T>(
  config: SupabaseConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetchResponse(config, path, init);
  return (await response.json()) as T;
}

async function fetchAllRestRows<T>(config: SupabaseConfig, path: string): Promise<T[]> {
  return fetchAllPages(async (start, end) => {
    const response = await fetchResponse(config, path, {
      headers: {
        "Range-Unit": "items",
        Range: `${start}-${end}`,
        Prefer: "count=exact",
      },
    });
    const contentRange = response.headers.get("content-range") || "";
    const totalSeparator = contentRange.lastIndexOf("/");
    const totalValue = totalSeparator >= 0 ? contentRange.slice(totalSeparator + 1).trim() : "";
    const total = totalValue ? Number(totalValue) : Number.NaN;
    if (!Number.isSafeInteger(total) || total < 0) {
      throw new Error("Supabase não informou o total de negócios na resposta paginada.");
    }

    const items = await response.json();
    if (!Array.isArray(items)) {
      throw new Error("Supabase retornou uma página de negócios em formato inválido.");
    }
    return { items: items as T[], total };
  }, REST_PAGE_SIZE);
}

async function getAuthenticatedUser(config: SupabaseConfig, token: string): Promise<AuthUser | null> {
  if (!token) return null;

  const response = await fetch(config.url + "/auth/v1/user", {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;
  return (await response.json()) as AuthUser;
}

async function requireAdmin(req: VercelRequest): Promise<{ config: SupabaseConfig; user: AuthUser } | null> {
  const config = getConfig();
  if (!config) return null;

  const user = await getAuthenticatedUser(config, getBearerToken(req));
  if (!user || String(user.email || "").trim().toLowerCase() !== ADMIN_EMAIL) return null;

  const profileRows = await fetchJson<ProfileRow[]>(
    config,
    "/rest/v1/profiles?select=id,role&id=eq." + encodeURIComponent(user.id) + "&limit=1",
  );

  if (String(profileRows[0]?.role || "").toLowerCase() !== "admin") return null;
  return { config, user };
}

async function listAuthUsers(config: SupabaseConfig): Promise<AuthUser[]> {
  const users: AuthUser[] = [];
  const adminClient = createAdminSupabaseClient(config);

  for (let page = 1; page <= MAX_AUTH_PAGES; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });
    if (error) {
      throw new Error(
        "Supabase Auth Admin (auth-key=" +
          getServerKeyType(config.authAdminKey) +
          "): " +
          error.message,
      );
    }

    const pageUsers = data.users as AuthUser[];
    users.push(...pageUsers);
    if (pageUsers.length < AUTH_PAGE_SIZE) break;
  }

  return users;
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    const current = grouped.get(groupKey) || [];
    current.push(item);
    grouped.set(groupKey, current);
  }
  return grouped;
}

async function loadUserRecords(config: SupabaseConfig) {
  const [authUsers, profiles, businesses, events] = await Promise.all([
    listAuthUsers(config),
    fetchJson<ProfileRow[]>(config, "/rest/v1/profiles?select=*&limit=10000"),
    fetchAllRestRows<UserRelationBusiness>(
      config,
      "/rest/v1/businesses?select=id,owner_id,name,slug,city,state,country,country_code,state_code,moderation_status,created_at&order=created_at.desc,id.asc",
    ),
    fetchJson<UserRelationEvent[]>(
      config,
      "/rest/v1/events?select=id,owner_id,business_id,title,description,date,location,is_free,price,status,created_at,updated_at&limit=10000&order=created_at.desc",
    ),
  ]);

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const businessesByOwner = groupBy(businesses, (business) => business.owner_id);
  const eventsByOwner = groupBy(events, (event) => event.owner_id);

  return authUsers.map((authUser) => {
    const profile = profilesById.get(authUser.id);
    const userBusinesses = businessesByOwner.get(authUser.id) || [];
    const userEvents = eventsByOwner.get(authUser.id) || [];
    const metadata = authUser.user_metadata || {};

    const record = {
      id: authUser.id,
      email: authUser.email || "",
      name: profile?.name || String(metadata.name || ""),
      bio: profile?.bio || "",
      phone: profile?.phone || authUser.phone || "",
      location: profile?.location || "",
      avatar: profile?.avatar || "",
      role: normalizeRole(profile?.role),
      createdAt: profile?.created_at || authUser.created_at || "",
      auth: {
        createdAt: authUser.created_at || "",
        updatedAt: authUser.updated_at || "",
        lastSignInAt: authUser.last_sign_in_at || "",
        emailConfirmedAt: authUser.email_confirmed_at || "",
      },
      businesses: userBusinesses,
      events: userEvents,
    };

    const searchable = normalizeSearchValue(
      [
        record.email,
        record.name,
        record.bio,
        record.phone,
        record.location,
        ...userBusinesses.flatMap((business) => [
          business.name,
          business.city,
          business.state,
          business.country,
          business.country_code,
          business.state_code,
        ]),
        ...userEvents.flatMap((event) => [event.title, event.description, event.location, event.status]),
      ].join(" "),
    );

    return { record, searchable };
  });
}

function parseBody(req: VercelRequest): Record<string, unknown> {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (req.body || {}) as Record<string, unknown>;
}

async function updateProfile(config: SupabaseConfig, userId: string, body: Record<string, unknown>) {
  const allowedFields = ["name", "bio", "phone", "location", "avatar"];
  const updates: Record<string, string> = {};

  for (const field of allowedFields) {
    if (typeof body[field] === "string") {
      updates[field] = String(body[field]).trim();
    }
  }

  if (typeof body.role === "string") {
    const role = body.role.trim().toLowerCase();
    if (!["user", "editor", "admin"].includes(role)) {
      throw new Error("Função de usuário inválida.");
    }
    updates.role = role;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("Nenhuma informação válida foi enviada.");
  }

  return fetchJson<ProfileRow[]>(
    config,
    "/rest/v1/profiles?on_conflict=id",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({ id: userId, ...updates }),
    },
  );
}

async function transferBusinessOwnership(
  config: SupabaseConfig,
  adminUserId: string,
  businessId: string,
  newOwnerEmail: string,
) {
  const normalizedEmail = newOwnerEmail.trim().toLowerCase();
  const authUsers = await listAuthUsers(config);
  const newOwner = authUsers.find(
    (user) => String(user.email || "").trim().toLowerCase() === normalizedEmail,
  );

  if (!newOwner) throw new Error("Nenhum usu\u00e1rio encontrado com este e-mail.");

  const businesses = await fetchJson<UserRelationBusiness[]>(
    config,
    "/rest/v1/businesses?select=id,owner_id,name&id=eq." +
      encodeURIComponent(businessId) +
      "&limit=1",
  );
  if (!businesses[0]) throw new Error("Neg\u00f3cio n\u00e3o encontrado.");

  const updated = await fetchJson<UserRelationBusiness[]>(
    config,
    "/rest/v1/businesses?id=eq." + encodeURIComponent(businessId),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ owner_id: newOwner.id }),
    },
  );
  const updatedBusiness = requireTransferredBusinessOwner(updated[0], newOwner.id);

  const reviewedAt = new Date().toISOString();
  const syncTasks: Promise<unknown>[] = [
    fetchJson<OwnerClaimRequestRow[]>(
      config,
      "/rest/v1/owner_claim_requests?business_id=eq." +
        encodeURIComponent(businessId) +
        "&requested_by=eq." +
        encodeURIComponent(newOwner.id) +
        "&status=eq.pending",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          status: "approved",
          reviewed_by: adminUserId,
          reviewed_at: reviewedAt,
        }),
      },
    ),
    fetchJson<OwnerClaimRequestRow[]>(
      config,
      "/rest/v1/owner_claim_requests?business_id=eq." +
        encodeURIComponent(businessId) +
        "&requested_by=neq." +
        encodeURIComponent(newOwner.id) +
        "&status=eq.pending",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          status: "rejected",
          reviewed_by: adminUserId,
          reviewed_at: reviewedAt,
        }),
      },
    ),
  ];

  const syncResults = await Promise.allSettled(syncTasks);
  for (const result of syncResults) {
    if (result.status === "rejected") {
      console.error("[admin-users] ownership metadata sync failed:", result.reason);
    }
  }

  return updatedBusiness;
}

function businessIdsQuery(ids: string[], select: string) {
  const params = new URLSearchParams({
    select,
    id: "in.(" + ids.join(",") + ")",
  });
  return "/rest/v1/businesses?" + params.toString();
}

async function syncOwnershipRequests(
  config: SupabaseConfig,
  adminUserId: string,
  businessIds: string[],
) {
  const reviewedAt = new Date().toISOString();
  const businessFilter = "in.(" + businessIds.join(",") + ")";
  const requests = [
    fetchJson<OwnerClaimRequestRow[]>(
      config,
      "/rest/v1/owner_claim_requests?" + new URLSearchParams({
        business_id: businessFilter,
        requested_by: "eq." + adminUserId,
        status: "eq.pending",
      }).toString(),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ status: "approved", reviewed_by: adminUserId, reviewed_at: reviewedAt }),
      },
    ),
    fetchJson<OwnerClaimRequestRow[]>(
      config,
      "/rest/v1/owner_claim_requests?" + new URLSearchParams({
        business_id: businessFilter,
        requested_by: "neq." + adminUserId,
        status: "eq.pending",
      }).toString(),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ status: "rejected", reviewed_by: adminUserId, reviewed_at: reviewedAt }),
      },
    ),
  ];

  const results = await Promise.allSettled(requests);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[admin-users] bulk ownership metadata sync failed:", result.reason);
    }
  }
}

async function transferBusinessOwnershipBulk(
  config: SupabaseConfig,
  adminUserId: string,
  sourceOwnerId: string,
  businessIds: string[],
) {
  const batches = chunkValues(businessIds, BULK_TRANSFER_BATCH_SIZE);
  const ownershipRows = await Promise.all(
    batches.map((ids) =>
      fetchJson<Array<Pick<UserRelationBusiness, "id" | "owner_id">>>(
        config,
        businessIdsQuery(ids, "id,owner_id"),
      ),
    ),
  );
  const currentBusinessRows = ownershipRows.flat();
  const currentOwners = new Map(currentBusinessRows.map((business) => [business.id, business.owner_id]));
  const alreadyTransferredBusinessIds = businessIds.filter((id) => currentOwners.get(id) === adminUserId);
  const conflicts = findBusinessOwnershipConflicts(
    businessIds,
    currentBusinessRows,
    sourceOwnerId,
    adminUserId,
  );
  if (conflicts.length > 0) {
    return {
      ok: false,
      conflict: true,
      transferredBusinessIds: alreadyTransferredBusinessIds,
      failedBusinessIds: businessIds.filter((id) => !alreadyTransferredBusinessIds.includes(id)),
      conflictingBusinessIds: conflicts,
      error: "A transferência não foi iniciada: alguns negócios não pertencem mais a este usuário. Revise a lista e tente novamente.",
    };
  }

  const businessIdsToTransfer = businessIds.filter((id) => currentOwners.get(id) === sourceOwnerId);
  const result = await transferBusinessBatches({
    businessIds: businessIdsToTransfer,
    expectedOwnerId: adminUserId,
    batchSize: BULK_TRANSFER_BATCH_SIZE,
    transferBatch: (ids) =>
      fetchJson<Array<Pick<UserRelationBusiness, "id" | "owner_id">>>(
        config,
        businessIdsQuery(ids, "id,owner_id") + "&owner_id=eq." + encodeURIComponent(sourceOwnerId),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify({ owner_id: adminUserId }),
        },
      ),
    verifyBatch: (ids) =>
      fetchJson<Array<Pick<UserRelationBusiness, "id" | "owner_id">>>(
        config,
        businessIdsQuery(ids, "id,owner_id"),
      ),
  });

  for (const ids of chunkValues(result.transferredBusinessIds, BULK_TRANSFER_BATCH_SIZE)) {
    await syncOwnershipRequests(config, adminUserId, ids);
  }

  const transferredSet = new Set([
    ...alreadyTransferredBusinessIds,
    ...result.transferredBusinessIds,
  ]);
  const transferredBusinessIds = businessIds.filter((id) => transferredSet.has(id));
  const failedBusinessIds = businessIds.filter((id) => !transferredSet.has(id));
  return {
    ok: failedBusinessIds.length === 0,
    conflict: false,
    transferredBusinessIds,
    failedBusinessIds,
    error: result.error,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  try {
    if (!getConfig()) {
      return jsonError(
        res,
        503,
        "API administrativa sem credenciais de servidor. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) no .env.local; nunca use uma chave VITE_ para esta função.",
      );
    }
    const admin = await requireAdmin(req);
    if (!admin) return jsonError(res, 403, "Acesso restrito ao administrador autorizado.");

    if (req.method === "GET") {
      const search = normalizeSearchValue(getQueryValue(req.query.search));
      const rawPage = Number(getQueryValue(req.query.page));
      const rawPageSize = Number(getQueryValue(req.query.pageSize));
      const pageSize = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, Number.isFinite(rawPageSize) ? Math.floor(rawPageSize) : DEFAULT_PAGE_SIZE),
      );
      const requestedPage = Math.max(1, Number.isFinite(rawPage) ? Math.floor(rawPage) : 1);
      const records = await loadUserRecords(admin.config);
      const filtered = search ? records.filter((item) => item.searchable.includes(search)) : records;
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(requestedPage, totalPages);
      const start = (page - 1) * pageSize;

      return res.status(200).json({
        ok: true,
        page,
        pageSize,
        total,
        totalPages,
        users: filtered.slice(start, start + pageSize).map((item) => item.record),
      });
    }

    if (req.method === "PATCH") {
      const body = parseBody(req);

      if (body.action === "transfer_business_ownership") {
        const businessId = String(body.businessId || "").trim();
        const newOwnerEmail = String(body.newOwnerEmail || "").trim();
        if (!businessId || !newOwnerEmail) {
          return jsonError(
            res,
            400,
            "Neg\u00f3cio e novo propriet\u00e1rio s\u00e3o obrigat\u00f3rios.",
          );
        }

        const business = await transferBusinessOwnership(
          admin.config,
          admin.user.id,
          businessId,
          newOwnerEmail,
        );
        return res.status(200).json({ ok: true, business });
      }

      if (body.action === "transfer_business_ownership_bulk") {
        let businessIds: string[];
        let sourceOwnerId: string;
        try {
          businessIds = normalizeBusinessIds(body.businessIds, MAX_BULK_TRANSFER_BUSINESSES);
          sourceOwnerId = normalizeBusinessIds([body.sourceOwnerId], 1)[0];
        } catch (error) {
          return jsonError(res, 400, error instanceof Error ? error.message : "Seleção de negócios inválida.");
        }
        if (sourceOwnerId === admin.user.id) {
          return jsonError(res, 400, "Os negócios selecionados já pertencem à sua conta.");
        }

        const result = await transferBusinessOwnershipBulk(
          admin.config,
          admin.user.id,
          sourceOwnerId,
          businessIds,
        );
        const status = result.conflict ? 409 : result.ok ? 200 : 207;
        return res.status(status).json(result);
      }

      const userId = String(body.userId || "").trim();
      if (!userId) return jsonError(res, 400, "Usuário inválido.");

      if (userId === admin.user.id && typeof body.role === "string" && normalizeRole(body.role) !== "admin") {
        return jsonError(res, 400, "A conta administradora precisa manter a função de administrador.");
      }

      const updated = await updateProfile(admin.config, userId, body);
      return res.status(200).json({ ok: true, profile: updated[0] || null });
    }

    if (req.method === "DELETE") {
      const userId = getQueryValue(req.query.id).trim();
      if (!userId) return jsonError(res, 400, "Usuário inválido.");
      if (userId === admin.user.id) return jsonError(res, 400, "A conta administradora não pode ser excluída.");

      const adminClient = createAdminSupabaseClient(admin.config);
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) return jsonError(res, error.status || 500, error.message);

      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PATCH, DELETE");
    return jsonError(res, 405, "Método não permitido.");
  } catch (error) {
    console.error("[admin-users]", error);
    return jsonError(res, 500, error instanceof Error ? error.message : "Erro ao carregar usuários.");
  }
}
