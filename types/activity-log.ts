export interface ActivityLogUser {
  id: number;
  name: string | null;
  email: string | null;
}

export interface ActivityLogSubject {
  type: string | null;
  id: string | null;
  label: string | null;
}

export interface ActivityLogContext {
  changes?: Record<string, unknown>;
  original?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ActivityLog {
  id: number;
  action: string;
  message: string;
  user?: ActivityLogUser | null;
  subject?: ActivityLogSubject | null;
  context?: ActivityLogContext | null;
  ip_address?: string | null;
  user_agent?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ActivityLogListParams {
  page?: number;
  perPage?: number;
  search?: string;
  userId?: number | string | null;
  action?: string;
  from?: string;
  to?: string;
  sort?: "latest" | "oldest";
}
