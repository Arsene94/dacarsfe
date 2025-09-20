export interface RolePermission {
  id: number;
  name: string;
  group: string | null;
}

export interface RolePermissionGroup {
  group: string;
  permissions: RolePermission[];
}

export interface Role {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  is_default: boolean | number;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  permissions: RolePermission[];
}
