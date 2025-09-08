export interface User {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  username: string | null;
  avatar: number | null;
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
