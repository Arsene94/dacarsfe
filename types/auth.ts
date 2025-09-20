export interface User {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  username: string | null;
  avatar: string | number | null;
  super_user: boolean;
  manage_supers: boolean;
  roles: string[];
  permissions: string[];
  last_login?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AdminLoginPayload {
  login: string;
  password: string;
}

export interface AdminRegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  [key: string]: unknown;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }

  return false;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        return trimmed.length > 0 ? trimmed : null;
      }

      if (typeof entry === "number" && Number.isFinite(entry)) {
        return String(entry);
      }

      return null;
    })
    .filter((entry): entry is string => entry !== null);
};

const toAvatar = (value: unknown): string | number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }

  return null;
};

export const normalizeUser = (raw: unknown): User | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const id = toNumber(raw.id);
  if (id === null) {
    return null;
  }

  return {
    id,
    first_name: toStringOrNull(raw.first_name),
    last_name: toStringOrNull(raw.last_name),
    email: toStringOrNull(raw.email),
    username: toStringOrNull(raw.username),
    avatar: toAvatar(raw.avatar),
    super_user: toBoolean(raw.super_user),
    manage_supers: toBoolean(raw.manage_supers),
    roles: toStringArray(raw.roles),
    permissions: toStringArray(raw.permissions),
    last_login: toStringOrNull(raw.last_login),
    created_at: toStringOrNull(raw.created_at),
    updated_at: toStringOrNull(raw.updated_at),
  } satisfies User;
};

export const ensureUser = (raw: unknown): User => {
  const user = normalizeUser(raw);
  if (!user) {
    throw new Error("Invalid user payload received from API.");
  }

  return user;
};
