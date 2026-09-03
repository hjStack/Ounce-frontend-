"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { hasAdminAccess } from "../lib/admin";
import type { Member } from "../types/api";
import { apiFetch } from "@/lib/api";

interface AuthContextValue {
  user: Member | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/api/members/me", { credentials: "include" });
      setUser(res.ok ? ((await res.json()) as Member) : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      const res = await apiFetch("/api/members/logout", {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 404) {
        await apiFetch("/logout", { method: "POST", credentials: "include" });
      }
    } catch (err) {
      console.error("로그아웃 요청 실패:", err);
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      isAdmin: hasAdminAccess(user),
      refresh,
      logout,
    }),
    [user, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 는 AuthProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
