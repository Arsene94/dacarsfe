"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  ChevronDown,
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
import type { Column } from "@/types/ui";
import type { User } from "@/types/auth";

interface UserFormState {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  roles: string[];
  superUser: boolean;
  manageSupers: boolean;
}

const defaultFormState: UserFormState = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  password: "",
  roles: [],
  superUser: false,
  manageSupers: false,
};

interface RoleOption {
  id: number;
  slug: string;
  name: string;
}

const ToggleSwitch = ({
  checked,
  disabled,
  onToggle,
  ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  ariaLabel?: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      if (disabled) {
        return;
      }
      onToggle();
    }}
    className={cn(
      "relative inline-flex h-6 w-11 items-center rounded-full border border-transparent transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-jade/70",
      disabled
        ? "cursor-not-allowed opacity-60"
        : "cursor-pointer focus-visible:ring-offset-2",
      checked
        ? "bg-gradient-to-r from-jade to-jadeLight shadow-inner"
        : "bg-gray-300",
    )}
  >
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-300 ease-out",
        checked ? "translate-x-5" : "translate-x-1",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full transition-colors duration-300",
          checked ? "bg-jade" : "bg-gray-400",
        )}
      />
    </span>
  </button>
);

const SUPER_TOGGLE_ERROR_MESSAGE =
  "Nu am putut actualiza statutul de super utilizator. Încearcă din nou.";

const parseString = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    const text = String(value);
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
};

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ["1", "true", "yes", "da", "y"].includes(normalized);
  }
  return false;
};

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          const trimmed = item.trim();
          return trimmed.length > 0 ? trimmed : null;
        }
        if (item && typeof item === "object") {
          const maybeSlug = (item as Record<string, unknown>).slug;
          const maybeName = (item as Record<string, unknown>).name;
          if (typeof maybeSlug === "string" && maybeSlug.trim().length > 0) {
            return maybeSlug.trim();
          }
          if (typeof maybeName === "string" && maybeName.trim().length > 0) {
            return maybeName.trim();
          }
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
};

const parseDate = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
};

const toDisplayName = (user: User): string => {
  const parts = [user.first_name, user.last_name]
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  if (parts.length > 0) {
    return parts.join(" ");
  }
  if (user.username && user.username.trim().length > 0) {
    return user.username;
  }
  if (user.email && user.email.trim().length > 0) {
    return user.email;
  }
  return `Utilizator #${user.id}`;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toNumericId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const mapUserResource = (raw: unknown): User | null => {
  if (!isRecord(raw)) return null;
  const id =
    toNumericId(raw.id) ??
    toNumericId((raw as { user_id?: unknown; userId?: unknown }).user_id) ??
    toNumericId((raw as { userId?: unknown }).userId);
  if (id == null) return null;
  const avatarCandidate = toNumericId(raw.avatar);
  return {
    id,
    first_name: parseString(raw.first_name),
    last_name: parseString(raw.last_name),
    email: parseString(raw.email),
    username: parseString(raw.username),
    avatar: avatarCandidate,
    super_user: parseBoolean(raw.super_user),
    manage_supers: parseBoolean(raw.manage_supers),
    roles: parseStringArray(raw.roles),
    permissions: parseStringArray(raw.permissions),
    last_login: parseDate(raw.last_login),
    created_at: parseDate(raw.created_at),
    updated_at: parseDate(raw.updated_at),
  };
};

const extractUsers = (response: unknown): unknown[] => {
  if (Array.isArray(response)) return response;
  if (!isRecord(response)) return [];

  const collected: unknown[] = [];
  if (Array.isArray(response.data)) collected.push(...response.data);
  const users = (response as { users?: unknown }).users;
  if (Array.isArray(users)) collected.push(...users);
  if (Array.isArray(response.items)) collected.push(...response.items);
  if (Array.isArray(response.results)) collected.push(...response.results);

  return collected;
};

const extractRoleCandidates = (response: unknown): unknown[] => {
  if (Array.isArray(response)) return response;
  if (!isRecord(response)) return [];

  const collected: unknown[] = [];
  if (Array.isArray(response.data)) collected.push(...response.data);
  const roles = (response as { roles?: unknown }).roles;
  if (Array.isArray(roles)) collected.push(...roles);
  if (Array.isArray(response.items)) collected.push(...response.items);
  if (Array.isArray(response.results)) collected.push(...response.results);
  if (Array.isArray((response as { payload?: unknown }).payload)) {
    collected.push(...((response as { payload?: unknown }).payload as unknown[]));
  }

  return collected;
};

const mapRoleOption = (value: unknown): RoleOption | null => {
  if (!isRecord(value)) return null;

  const id = toNumericId(value.id);
  const slug = parseString(value.slug);
  const name = parseString(value.name);

  if (id == null || !slug) {
    return null;
  }

  return {
    id,
    slug,
    name: name ?? slug,
  };
};

const UsersAdminPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<UserFormState>(
    () => ({ ...defaultFormState }),
  );
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [superToggleLoading, setSuperToggleLoading] = useState<
    Record<number, boolean>
  >({});
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [isRolesOpen, setIsRolesOpen] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const searchRef = useRef<string>("");
  const roleDropdownRef = useRef<HTMLDivElement | null>(null);

  const subtleButtonClass =
    "inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-jade focus:ring-offset-2";

  const filteredRoles = useMemo(() => {
    const query = roleSearchTerm.trim().toLowerCase();
    if (!query) {
      return availableRoles;
    }

    return availableRoles.filter((role) => {
      const name = role.name.toLowerCase();
      const slug = role.slug.toLowerCase();
      return name.includes(query) || slug.includes(query);
    });
  }, [availableRoles, roleSearchTerm]);

  const selectedRoleBadges = useMemo(
    () =>
      formState.roles.map((slug) => {
        const option = availableRoles.find((role) => role.slug === slug);
        return {
          slug,
          name: option?.name ?? slug,
        };
      }),
    [formState.roles, availableRoles],
  );

  const fetchUsers = useCallback(async (nextSearch?: string) => {
    setLoading(true);
    setError(null);
    const searchValue =
      typeof nextSearch === "string" ? nextSearch.trim() : searchRef.current;
    searchRef.current = searchValue;
    try {
      const response = await apiClient.getUsers({
        search: searchValue || undefined,
        limit: 100,
        includeRoles: true,
        sort: "-id",
      });
      const rawList = extractUsers(response);
      const mapped = rawList
        .map((item) => mapUserResource(item))
        .filter((item): item is User => item !== null)
        .sort((a, b) => {
          const dateDiff =
            toSortableDateValue(b.created_at) -
            toSortableDateValue(a.created_at);
          if (dateDiff !== 0) return dateDiff;
          return b.id - a.id;
        });
      setUsers(mapped);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setError("Nu am putut încărca utilizatorii. Încearcă din nou.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const response = await apiClient.getRoles({ perPage: 100 });
      const rawList = extractRoleCandidates(response);
      const mapped = rawList
        .map((item) => mapRoleOption(item))
        .filter((item): item is RoleOption => item !== null)
        .sort((a, b) => a.name.localeCompare(b.name, "ro", { sensitivity: "base" }));
      setAvailableRoles(mapped);
    } catch (err) {
      console.error("Failed to fetch roles", err);
      setAvailableRoles([]);
      setRolesError("Nu am putut încărca lista de roluri. Încearcă din nou.");
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (!isRolesOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRolesOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isRolesOpen]);

  useEffect(() => {
    if (!isRolesOpen) {
      setRoleSearchTerm("");
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRolesOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRolesOpen]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void fetchUsers(searchTerm);
  };

  const handleSearchReset = () => {
    setSearchTerm("");
    void fetchUsers("");
  };

  const openAddModal = useCallback(() => {
    setEditingUser(null);
    setFormState({ ...defaultFormState });
    setFormError(null);
    setIsRolesOpen(false);
    setRoleSearchTerm("");
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((user: User) => {
    setEditingUser(user);
    setFormState({
      firstName: user.first_name ?? "",
      lastName: user.last_name ?? "",
      email: user.email ?? "",
      username: user.username ?? "",
      password: "",
      roles: user.roles,
      superUser: user.super_user,
      manageSupers: user.manage_supers,
    });
    setFormError(null);
    setIsRolesOpen(false);
    setRoleSearchTerm("");
    setIsModalOpen(true);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setIsSaving(false);
    setFormError(null);
    setFormState({ ...defaultFormState });
    setEditingUser(null);
    setIsRolesOpen(false);
    setRoleSearchTerm("");
  };

  type TextField =
    | "firstName"
    | "lastName"
    | "email"
    | "username"
    | "password";

  const handleTextChange = (field: TextField) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setFormState((prev) => ({ ...prev, [field]: value }));
    };

  const handleCheckboxChange =
    (field: "superUser" | "manageSupers") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { checked } = event.target;
      setFormState((prev) => ({ ...prev, [field]: checked }));
    };

  const handleRoleToggle = (slug: string) => {
    setFormState((prev) => {
      const exists = prev.roles.includes(slug);
      const updated = exists
        ? prev.roles.filter((item) => item !== slug)
        : [...prev.roles, slug];
      return { ...prev, roles: updated };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    const trimmedEmail = formState.email.trim();
    const trimmedUsername = formState.username.trim();
    const trimmedPassword = formState.password.trim();

    if (!trimmedEmail && !trimmedUsername) {
      setFormError("Introdu cel puțin un email sau un nume de utilizator.");
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 8) {
      setFormError("Parola trebuie să aibă cel puțin 8 caractere.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload: Record<string, unknown> = {
      first_name: formState.firstName.trim() || undefined,
      last_name: formState.lastName.trim() || undefined,
      email: trimmedEmail || undefined,
      username: trimmedUsername || undefined,
      super_user: formState.superUser,
      manage_supers: formState.manageSupers,
    };

    const roles = formState.roles
      .map((role) => role.trim())
      .filter((role, index, self) => role.length > 0 && self.indexOf(role) === index);
    if (roles.length > 0) {
      payload.roles = roles;
    }

    if (trimmedPassword) {
      payload.password = trimmedPassword;
    }

    try {
      if (editingUser) {
        await apiClient.updateUser(editingUser.id, payload);
      } else {
        await apiClient.createUser(payload);
      }
      await fetchUsers();
      closeModal();
    } catch (err) {
      console.error("Failed to save user", err);
      setFormError(
        editingUser
          ? "Nu am putut actualiza utilizatorul. Verifică datele și încearcă din nou."
          : "Nu am putut crea utilizatorul. Verifică datele și încearcă din nou.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = useCallback((user: User) => {
    setDeleteTarget(user);
    setDeleteError(null);
  }, []);

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError(null);
    setIsDeleting(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.deleteUser(deleteTarget.id);
      await fetchUsers();
      closeDeleteModal();
    } catch (err) {
      console.error("Failed to delete user", err);
      setDeleteError("Nu am putut șterge utilizatorul. Încearcă din nou.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSuperToggle = useCallback(async (user: User) => {
    const userId = user.id;
    const nextStatus = !user.super_user;
    setSuperToggleLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      if (user.super_user) {
        await apiClient.removeUserSuper(userId);
      } else {
        await apiClient.makeUserSuper(userId);
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.id === userId ? { ...item, super_user: nextStatus } : item,
        ),
      );

      let shouldUpdateForm = false;
      setEditingUser((prev) => {
        if (prev && prev.id === userId) {
          shouldUpdateForm = true;
          return { ...prev, super_user: nextStatus };
        }
        return prev;
      });

      if (shouldUpdateForm) {
        setFormState((prev) => ({ ...prev, superUser: nextStatus }));
      }

      setError((current) =>
        current === SUPER_TOGGLE_ERROR_MESSAGE ? null : current,
      );
    } catch (err) {
      console.error("Failed to toggle super user status", err);
      setError(SUPER_TOGGLE_ERROR_MESSAGE);
    } finally {
      setSuperToggleLoading((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  }, []);

  const columns = useMemo<Column<User>[]>(
    () => [
      {
        id: "name",
        header: "Nume",
        accessor: (row) => `${toDisplayName(row).toLowerCase()}-${row.id}`,
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">
              {toDisplayName(row)}
            </span>
            <span className="text-xs text-gray-500">ID: {row.id}</span>
          </div>
        ),
        sortable: true,
      },
      {
        id: "email",
        header: "Email",
        accessor: (row) => row.email ?? "",
        cell: (row) => row.email ?? "—",
        sortable: true,
      },
      {
        id: "username",
        header: "Utilizator",
        accessor: (row) => row.username ?? "",
        cell: (row) => row.username ?? "—",
        sortable: true,
      },
      {
        id: "roles",
        header: "Roluri",
        accessor: (row) => row.roles.join(", ").toLowerCase(),
        cell: (row) =>
          row.roles.length > 0 ? row.roles.join(", ") : "—",
        sortable: true,
      },
      {
        id: "super_user",
        header: "Super utilizator",
        accessor: (row) => (row.super_user ? 1 : 0),
        cell: (row) => {
          const busy = Boolean(superToggleLoading[row.id]);
          return (
            <div className="flex items-center gap-2">
              <ToggleSwitch
                checked={row.super_user}
                disabled={busy}
                ariaLabel={`${
                  row.super_user ? "Dezactivează" : "Activează"
                } statutul de super utilizator pentru ${toDisplayName(row)}`}
                onToggle={() => {
                  void handleSuperToggle(row);
                }}
              />
              {busy && (
                <Loader2
                  className="h-4 w-4 animate-spin text-gray-400"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        },
        sortable: true,
      },
      {
        id: "created_at",
        header: "Creat la",
        accessor: (row) => toSortableDateValue(row.created_at),
        cell: (row) => formatDateTime(row.created_at),
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
              aria-label={`Editează ${toDisplayName(row)}`}
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
              aria-label={`Șterge ${toDisplayName(row)}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [openEditModal, openDeleteModal, handleSuperToggle, superToggleLoading],
  );

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Utilizatori</h1>
          <p className="text-sm text-gray-600">
            Gestionează conturile și rolurile din panoul de administrare.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSearchTerm(searchRef.current);
              void fetchUsers();
            }}
            className={subtleButtonClass}
          >
            <RefreshCw className="h-4 w-4" />
            Reîmprospătează
          </button>
          <Button onClick={openAddModal} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adaugă utilizator
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
            placeholder="Caută după nume, email, telefon sau rol"
            aria-label="Caută utilizatori"
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
            Se încarcă utilizatorii...
          </div>
        ) : users.length > 0 ? (
          <DataTable data={users} columns={columns} pageSize={10} />
        ) : (
          <div className="py-12 text-center text-sm text-gray-500">
            Nu există utilizatori pentru criteriile actuale.
          </div>
        )}
      </div>

      <Popup open={isModalOpen} onClose={closeModal} className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editingUser ? "Editează utilizator" : "Adaugă utilizator"}
            </h2>
            <p className="text-sm text-gray-600">
              Completează datele de bază. Parola este opțională.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label
                htmlFor="user-first-name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Prenume
              </label>
              <Input
                id="user-first-name"
                value={formState.firstName}
                onChange={handleTextChange("firstName")}
                placeholder="Prenume"
              />
            </div>
            <div>
              <label
                htmlFor="user-last-name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Nume
              </label>
              <Input
                id="user-last-name"
                value={formState.lastName}
                onChange={handleTextChange("lastName")}
                placeholder="Nume"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label
                htmlFor="user-email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <Input
                id="user-email"
                type="email"
                value={formState.email}
                onChange={handleTextChange("email")}
                placeholder="nume@exemplu.ro"
              />
            </div>
            <div>
              <label
                htmlFor="user-username"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Nume utilizator
              </label>
              <Input
                id="user-username"
                value={formState.username}
                onChange={handleTextChange("username")}
                placeholder="username"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label
                htmlFor="user-password"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Parolă
              </label>
              <Input
                id="user-password"
                type="password"
                value={formState.password}
                onChange={handleTextChange("password")}
                placeholder={
                  editingUser
                    ? "Lasă gol pentru a păstra parola actuală"
                    : "Setează o parolă (minim 8 caractere)"
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Lasă necompletat pentru a păstra parola existentă sau pentru a crea cont fără parolă.
              </p>
            </div>
            <div>
              <label
                htmlFor="user-roles"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Roluri
              </label>
              <div ref={roleDropdownRef} className="relative">
                <button
                  type="button"
                  id="user-roles"
                  aria-haspopup="listbox"
                  aria-expanded={isRolesOpen}
                  aria-controls="user-roles-listbox"
                  onClick={() => setIsRolesOpen((prev) => !prev)}
                  className={cn(
                    "flex w-full min-h-[44px] items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-left text-sm text-[#191919] shadow-sm transition focus:outline-none focus:ring-2 focus:ring-jade focus:ring-offset-2",
                    isRolesOpen ? "border-transparent shadow-md ring-2 ring-jade" : "hover:border-gray-400",
                  )}
                >
                  <div className="flex flex-1 flex-wrap items-center gap-2 pr-3">
                    {selectedRoleBadges.length > 0 ? (
                      selectedRoleBadges.map((role) => (
                        <span
                          key={role.slug}
                          className="inline-flex items-center gap-1 rounded-full bg-jade/10 px-2.5 py-1 text-xs font-medium text-jade"
                        >
                          {role.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">
                        Selectează rolurile din listă
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                </button>

                {isRolesOpen && (
                  <div
                    id="user-roles-listbox"
                    role="listbox"
                    aria-multiselectable="true"
                    className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl"
                  >
                    <div className="border-b p-2">
                      <Input
                        value={roleSearchTerm}
                        onChange={(event) => setRoleSearchTerm(event.target.value)}
                        placeholder="Caută roluri"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                      {rolesLoading ? (
                        <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Se încarcă rolurile...
                        </div>
                      ) : filteredRoles.length > 0 ? (
                        filteredRoles.map((role) => {
                          const checked = formState.roles.includes(role.slug);
                          return (
                            <label
                              key={role.id}
                              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50"
                              role="option"
                              aria-selected={checked}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleRoleToggle(role.slug)}
                                className="h-4 w-4 rounded border-gray-300 text-jade focus:ring-jade"
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{role.name}</p>
                                <p className="text-xs text-gray-500">{role.slug}</p>
                              </div>
                            </label>
                          );
                        })
                      ) : (
                        <div className="px-3 py-4 text-sm text-gray-500">
                          {roleSearchTerm.trim()
                            ? "Nu există roluri care să corespundă căutării."
                            : rolesError ?? "Nu există roluri definite momentan."}
                        </div>
                      )}
                    </div>
                    {!rolesLoading && rolesError && (
                      <div className="border-t px-3 py-2 text-xs text-red-600">
                        {rolesError}{" "}
                        <button
                          type="button"
                          className="font-medium underline hover:text-red-700"
                          onClick={() => {
                            void fetchRoles();
                          }}
                        >
                          Reîncearcă
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Alege unul sau mai multe roluri disponibile pentru utilizator.
              </p>
              {rolesError && !rolesLoading && (
                <p className="mt-1 text-xs text-red-600">
                  {rolesError}{" "}
                  <button
                    type="button"
                    className="font-medium underline hover:text-red-700"
                    onClick={() => {
                      void fetchRoles();
                    }}
                  >
                    Reîncarcă lista
                  </button>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <label className="flex flex-col items-start gap-2 text-sm text-gray-700 lg:flex-row lg:items-center">
              <input
                type="checkbox"
                checked={formState.superUser}
                onChange={handleCheckboxChange("superUser")}
                className="h-4 w-4 rounded border-gray-300 text-jade focus:ring-jade"
              />
              Super utilizator
            </label>
            <label className="flex flex-col items-start gap-2 text-sm text-gray-700 lg:flex-row lg:items-center">
              <input
                type="checkbox"
                checked={formState.manageSupers}
                onChange={handleCheckboxChange("manageSupers")}
                className="h-4 w-4 rounded border-gray-300 text-jade focus:ring-jade"
              />
              Poate gestiona super utilizatorii
            </label>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <button
              type="button"
              onClick={closeModal}
              className={subtleButtonClass}
            >
              Anulează
            </button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se salvează...
                </>
              ) : editingUser ? (
                "Salvează modificările"
              ) : (
                "Adaugă utilizator"
              )}
            </Button>
          </div>
        </form>
      </Popup>

      <Popup open={Boolean(deleteTarget)} onClose={closeDeleteModal} className="max-w-md">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Ștergere utilizator
            </h2>
            <p className="text-sm text-gray-600">
              Ești sigur că vrei să ștergi contul {" "}
              <span className="font-medium text-gray-900">
                {deleteTarget ? toDisplayName(deleteTarget) : ""}
              </span>
              ? Această acțiune nu poate fi anulată.
            </p>
          </div>
          {deleteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeDeleteModal}
              className={subtleButtonClass}
            >
              Anulează
            </button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se șterge...
                </>
              ) : (
                "Șterge utilizator"
              )}
            </Button>
          </div>
        </div>
      </Popup>
    </div>
  );
};

export default UsersAdminPage;
