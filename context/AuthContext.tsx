"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { apiClient } from "@/lib/api";
import type { User, AuthResponse } from "@/types/auth";
import {
  identifyAnonymousMixpanelVisitor,
  identifyMixpanelUser,
  resetMixpanelIdentity,
} from "@/lib/mixpanelClient";

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
    const existingToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (existingToken) {
      setToken(existingToken);
      apiClient.setToken(existingToken);
      apiClient
        .me()
        .then((u) => setUser(u))
        .catch(() => {
          apiClient.removeToken();
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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
