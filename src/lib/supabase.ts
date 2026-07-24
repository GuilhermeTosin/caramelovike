import { createClient } from "@supabase/supabase-js";
import { utf8Fetch } from "@/lib/http/utf8";
import { getPublicEnv } from "@/lib/publicRuntimeEnv";

const supabaseUrl = getPublicEnv("VITE_SUPABASE_URL");
const supabaseAnonKey = getPublicEnv("VITE_SUPABASE_ANON_KEY");
const resolvedSupabaseUrl = supabaseUrl || "https://placeholder.supabase.co";
const resolvedSupabaseAnonKey = supabaseAnonKey || "placeholder-anon-key";

function getAuthStorageKey(url: string): string | null {
  try {
    return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  } catch {
    return null;
  }
}

function hasMalformedEs256AccessToken(value: unknown): boolean {
  if (typeof value !== "string") return false;

  const [encodedHeader, , signature] = value.split(".");
  if (!encodedHeader || !signature) return false;

  try {
    const normalizedHeader = encodedHeader.replace(/-/g, "+").replace(/_/g, "/");
    const paddedHeader = normalizedHeader.padEnd(Math.ceil(normalizedHeader.length / 4) * 4, "=");
    const header = JSON.parse(atob(paddedHeader)) as { alg?: string; kid?: string };
    return header.alg === "ES256" && !header.kid;
  } catch {
    return false;
  }
}

function clearMalformedPersistedSession() {
  if (typeof window === "undefined") return;

  const storageKey = getAuthStorageKey(supabaseUrl);
  if (!storageKey) return;

  try {
    const storedSession = JSON.parse(window.localStorage.getItem(storageKey) || "null") as { access_token?: unknown } | null;
    if (hasMalformedEs256AccessToken(storedSession?.access_token)) {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // Ignore an unreadable persisted session; Supabase will handle it normally.
  }
}

clearMalformedPersistedSession();
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env"
  );
}

export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    fetch: utf8Fetch,
  },
});

export function isInvalidJwtError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const authError = error as { code?: string; message?: string };
  return (
    authError.code === "bad_jwt" ||
    /invalid JWT|unrecognized JWT kid/i.test(authError.message || "")
  );
}

export async function getValidatedSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (isInvalidJwtError(error) || (!error && !user)) {
    await supabase.auth.signOut({ scope: "local" });
    return null;
  }

  return session;
}

export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function getCurrentSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
