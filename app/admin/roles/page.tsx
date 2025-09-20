"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import type { Column } from "@/types/ui";
import type { Role, RolePermission } from "@/types/roles";

interface RoleFormState {
  slug: string;
  name: string;
  description: string;
  isDefault: boolean;
  permissionsInput: string;
}

interface RolesPaginationMeta {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

type NormalizedRole = Omit<
  Role,
  | "description"
  | "is_default"
  | "permissions"
  | "created_by"
  | "updated_by"
  | "created_at"
  | "updated_at"
> & {
  description: string | null;
  is_default: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string | null;
  updated_at: string | null;
  permissions: RolePermission[];
};

const defaultFormState: RoleFormState = {
  slug: "",
  name: "",
  description: "",
  isDefault: false,
  permissionsInput: "",
};

const subtleButtonClass =
  "inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-jade focus:ring-offset-2";

const textareaClass =
  "block w-full max-w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-[#191919] shadow-sm transition focus:border-transparent focus:ring-2 focus:ring-jade focus:shadow-md placeholder:text-gray-500";

const parseNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseBooleanFlag = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ["1", "true", "yes", "da", "y"].includes(normalized);
  }
  return false;
};

const mapPermission = (value: unknown): RolePermission | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = parseNullableNumber(record.id);
  const name = typeof record.name === "string" ? record.name : null;
  const group =
    typeof record.group === "string"
      ? record.group
      : record.group == null
      ? null
      : null;

  if (id == null || !name) {
    return null;
  }

  return {
    id,
    name,
    group,
  };
};

const mapRoleResource = (value: unknown): NormalizedRole | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = parseNullableNumber(record.id);
  const slug = typeof record.slug === "string" ? record.slug : null;
  const name = typeof record.name === "string" ? record.name : null;
  if (id == null || !slug || !name) {
    return null;
  }

  const description =
    typeof record.description === "string"
      ? record.description
      : record.description == null
      ? null
      : null;

  const createdBy = parseNullableNumber(record.created_by);
  const updatedBy = parseNullableNumber(record.updated_by);
  const createdAt =
    typeof record.created_at === "string" ? record.created_at : null;
  const updatedAt =
    typeof record.updated_at === "string" ? record.updated_at : null;

  const permissions = Array.isArray(record.permissions)
    ? record.permissions
        .map((permission) => mapPermission(permission))
        .filter((permission): permission is RolePermission => Boolean(permission))
    : [];

  return {
    id,
    slug,
    name,
    description,
    is_default: parseBooleanFlag(record.is_default),
    created_by: createdBy,
    updated_by: updatedBy,
    created_at: createdAt,
    updated_at: updatedAt,
    permissions,
  };
};

const parsePermissionsInput = (value: string): string[] => {
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .filter((entry, index, list) =>
      list.findIndex((candidate) => candidate.toLowerCase() === entry.toLowerCase()) ===
      index,
    );
};

const formatPermissionsForInput = (permissions: RolePermission[]): string => {
  return permissions.map((permission) => permission.name).join("\n");
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString("ro-RO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};

const toSortableDateValue = (value: string | null | undefined): number => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const RolesAdminPage = () => {
  const [roles, setRoles] = useState<NormalizedRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState<RolesPaginationMeta | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<NormalizedRole | null>(null);
  const [formState, setFormState] = useState<RoleFormState>(
    () => ({ ...defaultFormState }),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NormalizedRole | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRoles = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.getRoles({
          page,
          includePermissions: true,
        });

        const rawList = extractList<Role>(response);

        const mapped = rawList
          .map((item: unknown) => mapRoleResource(item))
          .filter(
            (item: NormalizedRole | null): item is NormalizedRole => item !== null,
          );

        setRoles(mapped);

        const metaValue =
          response && typeof response === "object"
            ? (response as Record<string, unknown>).meta
            : null;

        if (metaValue && typeof metaValue === "object") {
          setMeta(metaValue as RolesPaginationMeta);
          const serverPage = parseNullableNumber(
            (metaValue as Record<string, unknown>).current_page,
          );
          if (serverPage != null && serverPage !== page) {
            setCurrentPage(serverPage);
          }
        } else {
          setMeta(null);
        }
      } catch (err) {
        console.error("Failed to fetch roles", err);
        setRoles([]);
        setMeta(null);
        setError("Nu am putut încărca rolurile. Încearcă din nou.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchRoles(currentPage);
  }, [currentPage, fetchRoles]);

  const visibleRoles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((role) => {
      if (
        role.name.toLowerCase().includes(query) ||
        role.slug.toLowerCase().includes(query) ||
        (role.description ? role.description.toLowerCase().includes(query) : false)
      ) {
        return true;
      }
      return role.permissions.some((permission) => {
        const nameMatch = permission.name.toLowerCase().includes(query);
        const groupMatch = permission.group
          ? permission.group.toLowerCase().includes(query)
          : false;
        return nameMatch || groupMatch;
      });
    });
  }, [roles, searchTerm]);

  const openCreateModal = () => {
    setEditingRole(null);
    setFormState({ ...defaultFormState });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingRole(null);
    setFormState({ ...defaultFormState });
    setFormError(null);
  }, []);

  const openEditModal = useCallback((role: NormalizedRole) => {
    setEditingRole(role);
    setFormState({
      slug: role.slug,
      name: role.name,
      description: role.description ?? "",
      isDefault: role.is_default,
      permissionsInput: formatPermissionsForInput(role.permissions),
    });
    setFormError(null);
    setIsModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((role: NormalizedRole) => {
    setDeleteTarget(role);
    setDeleteError(null);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteTarget(null);
    setDeleteError(null);
    setIsDeleting(false);
  }, []);

  const handleTextChange = (
    field: "slug" | "name" | "description" | "permissionsInput",
  ) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, isDefault: event.target.checked }));
  };

  const handleSearchReset = () => {
    setSearchTerm("");
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm((value) => value.trim());
  };

  const handleRefresh = () => {
    void fetchRoles(currentPage);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const slug = formState.slug.trim();
    const name = formState.name.trim();
    if (!slug) {
      setFormError("Slug-ul este obligatoriu.");
      return;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
      setFormError(
        "Slug-ul poate conține doar litere, cifre și cratime fără spații.",
      );
      return;
    }
    if (!name) {
      setFormError("Numele rolului este obligatoriu.");
      return;
    }

    const permissions = parsePermissionsInput(formState.permissionsInput);
    const description = formState.description.trim();

    const payload: Record<string, unknown> = {
      slug,
      name,
      is_default: formState.isDefault ? 1 : 0,
    };

    if (description.length > 0) {
      payload.description = description;
    } else if (editingRole) {
      payload.description = null;
    }

    if (
      editingRole ||
      permissions.length > 0 ||
      formState.permissionsInput.trim().length === 0
    ) {
      payload.permissions = permissions;
    }

    setIsSaving(true);
    try {
      if (editingRole) {
        await apiClient.updateRole(editingRole.id, payload);
        await fetchRoles(currentPage);
      } else {
        await apiClient.createRole(payload);
        if (currentPage === 1) {
          await fetchRoles(1);
        } else {
          setCurrentPage(1);
        }
      }
      closeModal();
    } catch (err) {
      console.error("Failed to save role", err);
      setFormError(
        editingRole
          ? "Nu am putut actualiza rolul. Verifică datele și încearcă din nou."
          : "Nu am putut crea rolul. Verifică datele și încearcă din nou.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await apiClient.deleteRole(deleteTarget.id);
      const shouldGoBack = roles.length === 1 && currentPage > 1;
      closeDeleteModal();
      if (shouldGoBack) {
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else {
        await fetchRoles(currentPage);
      }
    } catch (err) {
      console.error("Failed to delete role", err);
      setDeleteError("Nu am putut șterge rolul. Încearcă din nou.");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo<Column<NormalizedRole>[]>(
    () => [
      {
        id: "name",
        header: "Nume",
        accessor: (row) => row.name.toLowerCase(),
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{row.name}</span>
            <span className="text-sm text-gray-500">{row.slug}</span>
          </div>
        ),
        sortable: true,
      },
      {
        id: "description",
        header: "Descriere",
        accessor: (row) => row.description ?? "",
        cell: (row) =>
          row.description ? (
            <span className="text-sm text-gray-700">{row.description}</span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          ),
      },
      {
        id: "is_default",
        header: "Implicit",
        accessor: (row) => (row.is_default ? 1 : 0),
        cell: (row) => (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
              row.is_default
                ? "bg-jade/10 text-jade"
                : "bg-gray-100 text-gray-600",
            )}
          >
            {row.is_default ? "Da" : "Nu"}
          </span>
        ),
        sortable: true,
      },
      {
        id: "permissions",
        header: "Permisiuni",
        accessor: (row) => row.permissions.length,
        cell: (row) =>
          row.permissions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.permissions.map((permission) => (
                <span
                  key={permission.id}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                >
                  {permission.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          ),
      },
      {
        id: "updated_at",
        header: "Actualizat",
        accessor: (row) => toSortableDateValue(row.updated_at),
        cell: (row) => (
          <span className="text-sm text-gray-600">
            {formatDateTime(row.updated_at)}
          </span>
        ),
        sortable: true,
      },
      {
        id: "actions",
        header: "Acțiuni",
        accessor: (row) => row.id,
        cell: (row) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openEditModal(row);
              }}
              className="text-jade transition-colors hover:text-jadeLight"
              aria-label={`Editează ${row.name}`}
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openDeleteModal(row);
              }}
              className="text-red-500 transition-colors hover:text-red-600"
              aria-label={`Șterge ${row.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [openEditModal, openDeleteModal],
  );

  const totalPages = meta?.last_page ?? 1;
  const displayPage = meta?.current_page ?? currentPage;

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Roluri</h1>
          <p className="text-sm text-gray-600">
            Gestionează rolurile și permisiunile utilizatorilor din platformă.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className={subtleButtonClass}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-4 w-4", loading && "animate-spin")}
            />
            Reîmprospătează
          </button>
          <Button onClick={openCreateModal} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adaugă rol
          </Button>
        </div>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Caută după nume, slug sau permisiune"
            aria-label="Caută roluri"
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm">
            <Search className="mr-2 h-4 w-4" /> Caută
          </Button>
          <button
            type="button"
            onClick={handleSearchReset}
            className={subtleButtonClass}
          >
            Resetare
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Se încarcă rolurile...
          </div>
        ) : visibleRoles.length > 0 ? (
          <DataTable data={visibleRoles} columns={columns} />
        ) : (
          <div className="py-12 text-center text-sm text-gray-500">
            Nu există roluri care să corespundă criteriilor selectate.
          </div>
        )}

        {visibleRoles.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="flex items-center gap-2 text-gray-600 disabled:opacity-50"
              disabled={displayPage <= 1}
            >
              Anterior
            </button>
            <span>
              Pagina {displayPage} din {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) =>
                  totalPages ? Math.min(totalPages, prev + 1) : prev + 1,
                )
              }
              className="flex items-center gap-2 text-gray-600 disabled:opacity-50"
              disabled={displayPage >= totalPages}
            >
              Următoarea
            </button>
          </div>
        )}
      </div>

      <Popup open={isModalOpen} onClose={closeModal} className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editingRole ? "Editează rol" : "Adaugă rol"}
            </h2>
            <p className="text-sm text-gray-600">
              Configurează slug-ul, numele și permisiunile rolului.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="role-name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Nume
              </label>
              <Input
                id="role-name"
                value={formState.name}
                onChange={handleTextChange("name")}
                placeholder="Ex: Agent"
              />
            </div>
            <div>
              <label
                htmlFor="role-slug"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Slug
              </label>
              <Input
                id="role-slug"
                value={formState.slug}
                onChange={handleTextChange("slug")}
                placeholder="ex: agent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Folosește litere, cifre și cratime. Exemplu: support-agent.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="role-description"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Descriere
            </label>
            <textarea
              id="role-description"
              value={formState.description}
              onChange={handleTextChange("description")}
              placeholder="Descriere opțională pentru rol"
              className={textareaClass}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={formState.isDefault}
                onChange={handleCheckboxChange}
                className="h-4 w-4 rounded border-gray-300 text-jade focus:ring-jade"
              />
              Rol implicit pentru utilizatori noi
            </label>
            <p className="text-xs text-gray-500">
              Rolurile implicite se aplică automat conturilor nou create.
            </p>
          </div>

          <div>
            <label
              htmlFor="role-permissions"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Permisiuni
            </label>
            <textarea
              id="role-permissions"
              value={formState.permissionsInput}
              onChange={handleTextChange("permissionsInput")}
              placeholder={"Introdu permisiunile una pe linie sau separate prin virgule"}
              className={textareaClass}
              rows={5}
            />
            <p className="mt-1 text-xs text-gray-500">
              Exemplu: bookings.view, bookings.update, bookings.cancel
            </p>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={closeModal}
              className={subtleButtonClass}
              disabled={isSaving}
            >
              Anulează
            </button>
            <Button type="submit" disabled={isSaving} size="sm">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se salvează...
                </>
              ) : editingRole ? (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Salvează modificările
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Creează rol
                </>
              )}
            </Button>
          </div>
        </form>
      </Popup>

      <Popup
        open={Boolean(deleteTarget)}
        onClose={closeDeleteModal}
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Ștergi acest rol?
            </h2>
            <p className="text-sm text-gray-600">
              Rolul „{deleteTarget?.name}” va fi eliminat din sistem, iar utilizatorii asociați își vor pierde acest rol.
            </p>
          </div>
          {deleteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {deleteError}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDeleteModal}
              className={subtleButtonClass}
              disabled={isDeleting}
            >
              Anulează
            </button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
              size="sm"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se șterge...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Șterge rolul
                </>
              )}
            </Button>
          </div>
        </div>
      </Popup>
    </div>
  );
};

export default RolesAdminPage;
