import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { getValidatedSession, supabase } from "@/lib/supabase";
import { getProfileById, updateProfile } from "@/services/profiles";
import { getUnreadCount } from "@/services/messages";
import type { UserFrontend, AuthSessionFrontend } from "@/types/database";
import type { Session } from "@supabase/supabase-js";

const PASSWORD_RECOVERY_STORAGE_KEY = "caramelinho:password-recovery";
const PASSWORD_RECOVERY_MAX_AGE_MS = 30 * 60 * 1000;

function hasPasswordRecoveryUrl() {
  if (typeof window === "undefined") return false;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return (
    hashParams.get("type")?.toLowerCase() === "recovery" ||
    searchParams.get("type")?.toLowerCase() === "recovery"
  );
}

function readPasswordRecoveryMarker() {
  if (typeof window === "undefined") return false;

  try {
    const markedAt = Number(window.sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY));
    return Number.isFinite(markedAt) && Date.now() - markedAt < PASSWORD_RECOVERY_MAX_AGE_MS;
  } catch {
    return false;
  }
}

function markPasswordRecovery() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, String(Date.now()));
  } catch {
    // The auth event remains enough for the current render if storage is unavailable.
  }
}

function clearPasswordRecoveryMarker() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
  } catch {
    // Ignore storage failures; the in-memory state is still cleared.
  }
}

interface AuthContextType {
  session: AuthSessionFrontend | null;
  user: UserFrontend | null;
  isLoading: boolean;
  unreadMessages: number;
  isPasswordRecovery: boolean;
  refreshSession: () => void;
  refreshUnread: () => void;
  logout: () => Promise<void>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSessionFrontend | null>(null);
  const [user, setUser] = useState<UserFrontend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => hasPasswordRecoveryUrl() || readPasswordRecoveryMarker(),
  );
  
  // Ref para evitar m?ltiplas chamadas simult?neas de carregamento de perfil
  const loadingUserIdRef = useRef<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);

  const buildSession = useCallback(
    (supaSession: Session | null): AuthSessionFrontend | null => {
      if (!supaSession?.user) return null;
      return {
        userId: supaSession.user.id,
        email: supaSession.user.email || "",
        name: supaSession.user.user_metadata?.name || supaSession.user.email?.split("@")[0] || "Usuário",
      };
    },
    []
  );

  const loadUserAndUnread = useCallback(async (userId: string, email: string) => {
    // Let the in-flight request finish for the same user.
    if (loadingUserIdRef.current === userId) {
      return;
    }
    loadingUserIdRef.current = userId;

    try {
      let profile = await getProfileById(userId);
      
      if (!profile) {
        const defaultName = email.split("@")[0] || "Usuário";
        const success = await updateProfile(userId, { name: defaultName });
        if (success) {
          profile = await getProfileById(userId);
        }
      }

      if (profile) {
        const role = profile.role || "user";
        setUser({
          id: profile.id,
          email: email,
          name: profile.name,
          bio: profile.bio || "",
          phone: profile.phone || "",
          location: profile.location || "",
          avatar: profile.avatar || "",
          role,
          createdAt: profile.created_at,
        });
        setSession((current) => current && current.userId === userId ? { ...current, name: profile.name || current.name, role } : current);
        loadedUserIdRef.current = userId;
      }
      
      getUnreadCount(userId).then(setUnreadMessages).catch(console.error);
    } catch (err) {
      console.error("AuthContext: Erro fatal ao carregar perfil:", err);
    } finally {
      loadingUserIdRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const supaSession = await getValidatedSession();
    const s = buildSession(supaSession);
    setSession(s);
    if (s && supaSession) {
      if (loadedUserIdRef.current !== s.userId) setIsLoading(true);
      await loadUserAndUnread(s.userId, supaSession.user.email || "");
    } else {
      setIsLoading(false);
    }
  }, [buildSession, loadUserAndUnread]);

  const refreshUnread = useCallback(() => {
    const currentSession = session;
    if (currentSession) {
      getUnreadCount(currentSession.userId).then(setUnreadMessages);
    }
  }, [session]);

  useEffect(() => {
    let active = true;

    const bootstrapSession = async () => {
      try {
        const supaSession = await getValidatedSession();
        if (!active) return;
        const s = buildSession(supaSession);
        setSession(s);

        if (s && supaSession) {
          setIsLoading(true);
          await loadUserAndUnread(s.userId, supaSession.user.email || "");
        } else {
          setUser(null);
          setUnreadMessages(0);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("AuthContext: erro ao inicializar sessão:", error);
        if (!active) return;
        setSession(null);
        setUser(null);
        setUnreadMessages(0);
        setIsLoading(false);
      }
    };

    bootstrapSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, supaSession) => {
        if (event === "PASSWORD_RECOVERY") {
          markPasswordRecovery();
          setIsPasswordRecovery(true);
        }

        if (event === "SIGNED_OUT") {
          clearPasswordRecoveryMarker();
          setIsPasswordRecovery(false);
        }

        const s = buildSession(supaSession);

        // Supabase may emit TOKEN_REFRESHED and SIGNED_IN when the browser
        // regains focus. A known user should remain visible in either case.
        if (event === "TOKEN_REFRESHED") {
          if (!s) {
            setSession(null);
            loadedUserIdRef.current = null;
            setUser(null);
            setUnreadMessages(0);
          } else {
            setSession((current) => current?.userId === s.userId ? { ...current, email: s.email } : s);
            getUnreadCount(s.userId).then(setUnreadMessages).catch(console.error);
          }
          return;
        }

        if (!s || !supaSession) {
          loadedUserIdRef.current = null;
          setSession(null);
          setUser(null);
          setUnreadMessages(0);
          setIsLoading(false);
          return;
        }

        setSession((current) => current?.userId === s.userId ? { ...current, email: s.email } : s);

        const shouldRefreshProfile = loadedUserIdRef.current !== s.userId || event === "USER_UPDATED";
        if (shouldRefreshProfile) {
          if (loadedUserIdRef.current !== s.userId) setIsLoading(true);
          void loadUserAndUnread(s.userId, supaSession.user.email || "");
        } else {
          getUnreadCount(s.userId).then(setUnreadMessages).catch(console.error);
        }
      }
    );

    const timeout = setTimeout(() => setIsLoading(false), 8000);

    return () => {
      active = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [buildSession, loadUserAndUnread]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearPasswordRecoveryMarker();
    setIsPasswordRecovery(false);
    setSession(null);
    loadedUserIdRef.current = null;
    setUser(null);
    setUnreadMessages(0);
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    clearPasswordRecoveryMarker();
    setIsPasswordRecovery(false);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, isLoading, unreadMessages, isPasswordRecovery, refreshSession, refreshUnread, logout, clearPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
