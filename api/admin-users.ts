import type { VercelRequest, VercelResponse } from "@vercel/node";

const ADMIN_EMAIL = "contact@guilhermetosin.com";
const AUTH_PAGE_SIZE = 1000;
const MAX_AUTH_PAGES = 50;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
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

type UserRelationFind = {
  id: string;
  user_id: string;
  product_name: string;
  location_name: string;
  category: string;
  upvotes: number;
  downvotes: number;
  expires_at: string;
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

function getConfig(): SupabaseConfig | null {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "",
  ).trim();

  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
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

function jsonError(res: VercelResponse, status: number, error: string) {
  return res.status(status).json({ ok: false, error });
}

async function fetchJson<T>(
  config: SupabaseConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(config.url + path, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: "Bearer " + config.serviceRoleKey,
      Accept: "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error("Supabase " + response.status + ": " + message.slice(0, 240));
  }

  return (await response.json()) as T;
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

  for (let page = 1; page <= MAX_AUTH_PAGES; page += 1) {
    const result = await fetchJson<{ users?: AuthUser[] }>(
      config,
      "/auth/v1/admin/users?page=" + page + "&per_page=" + AUTH_PAGE_SIZE,
    );
    const pageUsers = result.users || [];
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
  const [authUsers, profiles, businesses, finds, events] = await Promise.all([
    listAuthUsers(config),
    fetchJson<ProfileRow[]>(config, "/rest/v1/profiles?select=*&limit=10000"),
    fetchJson<UserRelationBusiness[]>(
      config,
      "/rest/v1/businesses?select=id,owner_id,name,slug,city,state,country,country_code,state_code,moderation_status,created_at&limit=10000&order=created_at.desc",
    ),
    fetchJson<UserRelationFind[]>(
      config,
      "/rest/v1/community_finds?select=id,user_id,product_name,location_name,category,upvotes,downvotes,expires_at,created_at&limit=10000&order=created_at.desc",
    ),
    fetchJson<UserRelationEvent[]>(
      config,
      "/rest/v1/events?select=id,owner_id,business_id,title,description,date,location,is_free,price,status,created_at,updated_at&limit=10000&order=created_at.desc",
    ),
  ]);

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const businessesByOwner = groupBy(businesses, (business) => business.owner_id);
  const findsByOwner = groupBy(finds, (find) => find.user_id);
  const eventsByOwner = groupBy(events, (event) => event.owner_id);

  return authUsers.map((authUser) => {
    const profile = profilesById.get(authUser.id);
    const userBusinesses = businessesByOwner.get(authUser.id) || [];
    const userFinds = findsByOwner.get(authUser.id) || [];
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
      role: String(profile?.role || "").trim().toLowerCase() === "admin" ? "admin" : "user",
      createdAt: profile?.created_at || authUser.created_at || "",
      auth: {
        createdAt: authUser.created_at || "",
        updatedAt: authUser.updated_at || "",
        lastSignInAt: authUser.last_sign_in_at || "",
        emailConfirmedAt: authUser.email_confirmed_at || "",
      },
      businesses: userBusinesses,
      achadinhos: userFinds,
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
        ...userFinds.flatMap((find) => [find.product_name, find.location_name, find.category]),
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  try {
    if (!getConfig()) return jsonError(res, 503, "API administrativa sem credenciais de servidor neste ambiente.");
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
      const userId = String(body.userId || "").trim();
      if (!userId) return jsonError(res, 400, "Usuário inválido.");

      const updated = await updateProfile(admin.config, userId, body);
      return res.status(200).json({ ok: true, profile: updated[0] || null });
    }

    if (req.method === "DELETE") {
      const userId = getQueryValue(req.query.id).trim();
      if (!userId) return jsonError(res, 400, "Usuário inválido.");
      if (userId === admin.user.id) return jsonError(res, 400, "A conta administradora não pode ser excluída.");

      const response = await fetch(
        admin.config.url + "/auth/v1/admin/users/" + encodeURIComponent(userId),
        {
          method: "DELETE",
          headers: {
            apikey: admin.config.serviceRoleKey,
            Authorization: "Bearer " + admin.config.serviceRoleKey,
          },
        },
      );

      if (!response.ok) {
        const message = await response.text();
        return jsonError(res, response.status, message || "Não foi possível excluir o usuário.");
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PATCH, DELETE");
    return jsonError(res, 405, "Método não permitido.");
  } catch (error) {
    console.error("[admin-users]", error);
    return jsonError(res, 500, error instanceof Error ? error.message : "Erro ao carregar usuários.");
  }
}
