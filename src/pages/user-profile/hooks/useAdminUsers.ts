export const USER_MANAGEMENT_ADMIN_EMAIL = "contact@guilhermetosin.com";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { utf8Fetch } from "@/lib/http/utf8";

export type AdminUserBusiness = {
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

export type AdminUserFind = {
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

export type AdminUserEvent = {
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

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string;
  bio: string;
  phone: string;
  location: string;
  avatar: string;
  role: "user" | "admin";
  createdAt: string;
  auth: {
    createdAt: string;
    updatedAt: string;
    lastSignInAt: string;
    emailConfirmedAt: string;
  };
  businesses: AdminUserBusiness[];
  achadinhos: AdminUserFind[];
  events: AdminUserEvent[];
};

export type AdminUserProfileUpdates = {
  name?: string;
  bio?: string;
  phone?: string;
  location?: string;
  avatar?: string;
};

type AdminUsersResponse = {
  ok: boolean;
  users: AdminUserRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  error?: string;
};

async function adminRequest(path: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const response = await utf8Fetch(path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: "Bearer " + session.access_token,
      Accept: "application/json; charset=utf-8",
      "Content-Type": "application/json; charset=utf-8",
    },
  });

  const raw = await response.text();
  let payload: { error?: string } & Partial<AdminUsersResponse>;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error(response.ok
      ? "A API administrativa não está disponível neste servidor local. Use vercel dev ou configure o adaptador local."
      : "Resposta inválida da API administrativa.");
  }

  if (!response.ok) {
    throw new Error(payload.error || "Não foi possível concluir a operação.");
  }

  return payload;
}

type UseAdminUsersOptions = {
  enabled: boolean;
};

export function useAdminUsers({ enabled }: UseAdminUsersOptions) {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "10",
          search: search.trim(),
        });
        const payload = (await adminRequest("/api/admin-users?" + params.toString())) as AdminUsersResponse;
        if (!active) return;
        setUsers(payload.users || []);
        setTotal(Number(payload.total || 0));
        setTotalPages(Math.max(1, Number(payload.totalPages || 1)));
        if (payload.page && payload.page !== page) setPage(payload.page);
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : "Erro ao carregar usuários.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, search.trim() ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [enabled, page, reloadToken, search]);

  const saveUser = async (userId: string, updates: AdminUserProfileUpdates) => {
    await adminRequest("/api/admin-users", {
      method: "PATCH",
      body: JSON.stringify({ userId, ...updates }),
    });
    toast.success("Usuário atualizado.");
    setReloadToken((value) => value + 1);
  };

  const deleteUser = async (userId: string) => {
    await adminRequest("/api/admin-users?id=" + encodeURIComponent(userId), {
      method: "DELETE",
    });
    toast.success("Usuário excluído.");
    setReloadToken((value) => value + 1);
  };

  const refresh = () => setReloadToken((value) => value + 1);

  return {
    users,
    search,
    page,
    total,
    totalPages,
    loading,
    error,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    setPage,
    saveUser,
    deleteUser,
    refresh,
  };
}
