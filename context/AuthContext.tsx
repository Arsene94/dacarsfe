"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { apiClient } from "@/lib/api";
import {
  identifyAnonymousMixpanelVisitor,
  identifyMixpanelUser,
  resetMixpanelIdentity,
} from "@/lib/mixpanelClient";
import type { User, AuthResponse } from "@/types/auth";

const TOKEN_STORAGE_KEY = "auth_token";
const USER_STORAGE_KEY = "auth_user";
const TOKEN_EXPIRY_STORAGE_KEY = "auth_token_expires_at";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

type ApiErrorLike = Error & { status?: number };

const readStoredToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

const readStoredExpiry = (): number | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  const parsed = Date.parse(stored);
  if (Number.isNaN(parsed)) {
    localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);
    return null;
  }

  return parsed;
};

const readStoredUser = (): User | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as User;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to parse cached admin user from storage", error);
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const persistSession = (token: string, user: User | null, referenceDate: Date = new Date()) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);

  const expiresAt = new Date(referenceDate.getTime() + SESSION_DURATION_MS).toISOString();
  localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiresAt);

  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};

const clearStoredSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);
};

const isUnauthorizedError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const status = (error as ApiErrorLike).status;
    return status === 401 || status === 403 || status === 419;
  }
  return false;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mixpanelIdentityRef = useRef<string | null>(null);
  const pendingAnonymousIdentityRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const initializeSession = async () => {
      const existingToken = readStoredToken();
      if (!existingToken) {
        setLoading(false);
        return;
      }

      const expiryTimestamp = readStoredExpiry();
      if (!expiryTimestamp || expiryTimestamp <= Date.now()) {
        apiClient.removeToken();
        clearStoredSession();
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setToken(existingToken);
      apiClient.setToken(existingToken);

      const cachedUser = readStoredUser();
      if (cachedUser) {
        setUser(cachedUser);
      }

      try {
        const profile = await apiClient.me();
        setUser(profile);
      } catch (error) {
        if (isUnauthorizedError(error)) {
          apiClient.removeToken();
          clearStoredSession();
          setToken(null);
          setUser(null);
        } else {
          console.error("Failed to refresh authenticated user", error);
        }
      } finally {
        setLoading(false);
      }
    };

    void initializeSession();
  }, []);

  const login = async (login: string, password: string) => {
    const res: AuthResponse = await apiClient.login({ login, password });
    setToken(res.token);
    setUser(res.user);
    try {
      const profile = await apiClient.me();
      setUser(profile);
    } catch (error) {
      console.error("Failed to refresh authenticated user", error);
    }
  };

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    persistSession(token, user);
  }, [token, user]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user) {
      const mixpanelId = String(user.id);
      const identityKey = `user:${mixpanelId}`;
      const previousIdentity = mixpanelIdentityRef.current;

      if (previousIdentity && previousIdentity !== identityKey) {
        resetMixpanelIdentity();
      }

      const firstName = typeof user.first_name === "string" ? user.first_name.trim() : "";
      const lastName = typeof user.last_name === "string" ? user.last_name.trim() : "";
      const fullName = [firstName, lastName].filter((part) => part.length > 0).join(" ");

      identifyMixpanelUser(mixpanelId, {
        email: user.email ?? undefined,
        username: user.username ?? undefined,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        full_name: fullName || undefined,
        roles: user.roles,
        permissions: user.permissions,
        super_user: user.super_user,
        manage_supers: user.manage_supers,
        last_login: user.last_login ?? undefined,
        created_at: user.created_at ?? undefined,
      });

      mixpanelIdentityRef.current = identityKey;
      pendingAnonymousIdentityRef.current = false;
      return;
    }

    const previousIdentity = mixpanelIdentityRef.current;
    if (previousIdentity && !previousIdentity.startsWith("anonymous")) {
      resetMixpanelIdentity();
      mixpanelIdentityRef.current = null;
    }

    if (mixpanelIdentityRef.current === "anonymous" || pendingAnonymousIdentityRef.current) {
      return;
    }

    pendingAnonymousIdentityRef.current = true;
    void identifyAnonymousMixpanelVisitor()
      .then(() => {
        mixpanelIdentityRef.current = "anonymous";
      })
      .finally(() => {
        pendingAnonymousIdentityRef.current = false;
      });
  }, [loading, user]);

  const logout = async () => {
    try {
      await apiClient.logout();
    } finally {
      apiClient.removeToken();
      clearStoredSession();
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
