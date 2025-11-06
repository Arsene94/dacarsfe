"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CalendarRange, Loader2, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import DateRangePicker from "@/components/ui/date-range-picker";
import { SearchSelect } from "@/components/ui/search-select";
import { Select } from "@/components/ui/select";
import { extractList } from "@/lib/apiResponse";
import apiClient from "@/lib/api";
import type { ActivityLog, ActivityLogContext } from "@/types/activity-log";
import type { ApiListResult, ApiMeta } from "@/types/api";
import type { Column } from "@/types/ui";
import type { User } from "@/types/auth";

type DateRangeValue = {
  startDate: Date | null;
  endDate: Date | null;
};

interface ActivityLogFilters {
  search: string;
  action: string;
  userId: number | null;
  from: string;
  to: string;
  sort: "latest" | "oldest";
}

interface NormalizedActivityLogUser {
  id: number | null;
  name: string | null;
  email: string | null;
}

interface NormalizedActivityLogSubject {
  type: string | null;
  id: string | null;
  label: string | null;
}

interface NormalizedActivityLog {
  id: number;
  action: string;
  message: string;
  user: NormalizedActivityLogUser | null;
  subject: NormalizedActivityLogSubject | null;
  context: ActivityLogContext | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UserOption {
  id: number;
  name: string;
  email: string | null;
}

const defaultFilters: ActivityLogFilters = {
  search: "",
  action: "",
  userId: null,
  from: "",
  to: "",
  sort: "latest",
};

const perPageOptions = [10, 25, 50, 100];

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
};

const parseString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const mapLogUser = (value: unknown): NormalizedActivityLogUser | null => {
  if (!isObject(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = parseNumber(record.id);
  const name = parseString(record.name);
  const email = parseString(record.email);
  if (id == null && !name && !email) {
    return null;
  }
  return {
    id: id ?? null,
    name: name ?? null,
    email: email ?? null,
  };
};

const mapLogSubject = (value: unknown): NormalizedActivityLogSubject | null => {
  if (!isObject(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const type = parseString(record.type);
  const label = parseString(record.label);
  const idValue = record.id;
  const id =
    typeof idValue === "string"
      ? idValue.trim()
      : typeof idValue === "number"
      ? String(Math.trunc(idValue))
      : idValue != null
      ? String(idValue)
      : null;

  if (!type && !label && !id) {
    return null;
  }

  return {
    type: type ?? null,
    label: label ?? null,
    id: id && id.length > 0 ? id : null,
  };
};

const mapContext = (value: unknown): ActivityLogContext | null => {
  if (!isObject(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const context: ActivityLogContext = {};

  Object.entries(record).forEach(([key, entry]) => {
    context[key] = entry;
  });

  const { changes, original } = record;
  if (isObject(changes)) {
    context.changes = { ...changes };
  } else if ("changes" in context) {
    delete context.changes;
  }
  if (isObject(original)) {
    context.original = { ...original };
  } else if ("original" in context) {
    delete context.original;
  }

  return context;
};

const mapActivityLog = (entry: unknown): NormalizedActivityLog | null => {
  if (!isObject(entry)) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const id = parseNumber(record.id);
  if (id == null) {
    return null;
  }

  const action = parseString(record.action) ?? "—";
  const message = parseString(record.message) ?? "—";
  const ipAddress =
    parseString(record.ip_address) ?? parseString(record.ipAddress) ?? null;
  const userAgent =
    parseString(record.user_agent) ?? parseString(record.userAgent) ?? null;
  const createdAt =
    parseString(record.created_at) ?? parseString(record.createdAt) ?? null;
  const updatedAt =
    parseString(record.updated_at) ?? parseString(record.updatedAt) ?? null;

  return {
    id,
    action,
    message,
    user: mapLogUser(record.user),
    subject: mapLogSubject(record.subject),
    context: mapContext(record.context),
    ipAddress,
    userAgent,
    createdAt,
    updatedAt,
  };
};

const mapUserOption = (value: unknown): UserOption | null => {
  if (!isObject(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = parseNumber(record.id);
  if (id == null) {
    return null;
  }

  const firstName = parseString(record.first_name);
  const lastName = parseString(record.last_name);
  const nameField = parseString(record.name);
  const username = parseString(record.username);
  const email = parseString(record.email);
  const nameParts = [firstName, lastName].filter(
    (part): part is string => Boolean(part),
  );

  let name = nameParts.join(" ").trim();
  if (!name) {
    name = nameField ?? username ?? email ?? `Utilizator #${id}`;
  }

  return {
    id,
    name,
    email: email ?? null,
  };
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

const formatJson = (value: unknown): string => {
  if (value == null) {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    try {
      return String(value);
    } catch {
      return "—";
    }
  }
};

const toDateInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTimeValue = (date: Date | null): number | null =>
  date ? date.getTime() : null;

const areDateRangesEqual = (left: DateRangeValue, right: DateRangeValue) =>
  getTimeValue(left.startDate) === getTimeValue(right.startDate) &&
  getTimeValue(left.endDate) === getTimeValue(right.endDate);

const getMetaNumber = (
  meta: ApiMeta | null | undefined,
  keys: readonly string[],
): number | null => {
  if (!meta) {
    return null;
  }
  const record = meta as Record<string, unknown>;
  for (const key of keys) {
    const parsed = parseNumber(record[key]);
    if (parsed != null) {
      return parsed;
    }
  }
  return null;
};

const clampPerPage = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 25;
  }
  return Math.max(1, Math.min(100, Math.trunc(value)));
};

const createDefaultFilters = (): ActivityLogFilters => ({
  ...defaultFilters,
});

const createDefaultDateRange = (): DateRangeValue => ({
  startDate: null,
  endDate: null,
});

const sortOptions: ReadonlyArray<{ value: "latest" | "oldest"; label: string }> = [
  { value: "latest", label: "Cele mai noi" },
  { value: "oldest", label: "Cele mai vechi" },
];
const ActivityLogsPage = () => {
  const [logs, setLogs] = useState<NormalizedActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityLogFilters>(createDefaultFilters);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [actionSearch, setActionSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>(createDefaultDateRange);
  const [showCalendar, setShowCalendar] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    setSelectedAction(filters.action ? filters.action : null);
  }, [filters.action]);

  useEffect(() => {
    let canceled = false;
    const loadActions = async () => {
      try {
        const response = await apiClient.getActivityLogActions();
        if (canceled) {
          return;
        }
        setAvailableActions((previous) => {
          const actionSet = new Set(previous);
          response.forEach((action) => {
            if (typeof action === "string" && action.trim().length > 0) {
              actionSet.add(action.trim());
            }
          });
          const actions = Array.from(actionSet);
          actions.sort((a, b) =>
            a.localeCompare(b, "ro", { sensitivity: "base" }),
          );
          return actions;
        });
      } catch (err) {
        console.error("Failed to fetch activity log actions", err);
      }
    };

    void loadActions();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    const nextRange = filters.from || filters.to
      ? {
          startDate: parseDateInput(filters.from),
          endDate: parseDateInput(filters.to),
        }
      : createDefaultDateRange();

    setDateRange((previous) =>
      areDateRangesEqual(previous, nextRange) ? previous : nextRange,
    );
  }, [filters.from, filters.to]);

  useEffect(() => {
    if (filters.userId == null) {
      setSelectedUser(null);
      return;
    }
    const match = users.find((user) => user.id === filters.userId);
    if (match) {
      setSelectedUser(match);
    }
  }, [filters.userId, users]);

  const loadUsers = useCallback(async () => {
    if (usersLoaded || usersLoading) {
      return;
    }
    setUsersLoading(true);
    try {
      const response = await apiClient.getUsers({
        perPage: 100,
        includeRoles: false,
      });
      const list = extractList<User>(response as ApiListResult<User>);
      const mapped = list
        .map((item) => mapUserOption(item))
        .filter((item): item is UserOption => item !== null)
        .sort((a, b) => a.name.localeCompare(b.name, "ro", { sensitivity: "base" }));
      setUsers(mapped);
      setUsersLoaded(true);
    } catch (err) {
      console.error("Failed to fetch users for activity logs", err);
    } finally {
      setUsersLoading(false);
    }
  }, [usersLoaded, usersLoading]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) {
      return users;
    }
    return users.filter((user) => {
      const haystack = `${user.name} ${user.email ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [userSearch, users]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getActivityLogs({
        page,
        perPage,
        search: filters.search || undefined,
        action: filters.action || undefined,
        userId: filters.userId ?? undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        sort: filters.sort,
      });

      const list = extractList<ActivityLog>(
        response as ApiListResult<ActivityLog>,
      );
      const mapped = list
        .map((item) => mapActivityLog(item))
        .filter((item): item is NormalizedActivityLog => item !== null);
      setLogs(mapped);
      setAvailableActions((previous) => {
        const actionSet = new Set(previous);
        mapped.forEach((log) => {
          if (log.action && log.action !== "—") {
            actionSet.add(log.action);
          }
        });
        const actions = Array.from(actionSet);
        actions.sort((a, b) =>
          a.localeCompare(b, "ro", { sensitivity: "base" }),
        );
        return actions;
      });

      if (response && typeof response === "object") {
        const metaValue = (response as Record<string, unknown>).meta;
        if (metaValue && typeof metaValue === "object") {
          setMeta(metaValue as ApiMeta);
          const serverPage = getMetaNumber(metaValue as ApiMeta, [
            "current_page",
            "currentPage",
          ]);
          if (serverPage != null && serverPage !== page) {
            setPage(serverPage);
          }
        } else {
          setMeta(null);
        }
      } else {
        setMeta(null);
      }
    } catch (err) {
      console.error("Failed to fetch activity logs", err);
      setLogs([]);
      setMeta(null);
      setError("Nu am putut încărca logurile de activitate. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  }, [filters, page, perPage]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const columns = useMemo<Column<NormalizedActivityLog>[]>(
    () => [
      {
        id: "message",
        header: "Mesaj",
        accessor: (row) => row.message,
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{row.message}</span>
            <span className="text-xs text-gray-500">{row.action}</span>
          </div>
        ),
      },
      {
        id: "user",
        header: "Utilizator",
        accessor: (row) => row.user?.name ?? "",
        cell: (row) => (
          <div className="flex flex-col text-sm">
            <span className="text-gray-900">{row.user?.name ?? "Sistem"}</span>
            {row.user?.email && (
              <span className="text-xs text-gray-500">{row.user.email}</span>
            )}
          </div>
        ),
      },
      {
        id: "subject",
        header: "Entitate",
        accessor: (row) => row.subject?.label ?? "",
        cell: (row) =>
          row.subject ? (
            <div className="flex flex-col text-sm text-gray-700">
              <span>{row.subject.label ?? "—"}</span>
              <span className="text-xs text-gray-500">
                {row.subject.type ?? ""}
                {row.subject.id ? ` • ${row.subject.id}` : ""}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          ),
      },
      {
        id: "ip",
        header: "Adresă IP",
        accessor: (row) => row.ipAddress ?? "",
        cell: (row) => (
          <span className="text-sm text-gray-700">{row.ipAddress ?? "—"}</span>
        ),
      },
      {
        id: "created_at",
        header: "Creat la",
        accessor: (row) => toSortableDateValue(row.createdAt),
        cell: (row) => (
          <span className="text-sm text-gray-600">
            {formatDateTime(row.createdAt)}
          </span>
        ),
        sortable: true,
      },
    ],
    [],
  );

  const currentPage =
    getMetaNumber(meta, ["current_page", "currentPage"]) ?? page;
  const lastPage = getMetaNumber(meta, ["last_page", "lastPage"]) ?? 1;
  const totalItems = getMetaNumber(meta, ["total", "count"]) ?? logs.length;

  const actionOptions = useMemo(() => {
    const actionSet = new Set(availableActions);
    if (filters.action) {
      actionSet.add(filters.action);
    }
    if (selectedAction) {
      actionSet.add(selectedAction);
    }
    const actions = Array.from(actionSet);
    actions.sort((a, b) => a.localeCompare(b, "ro", { sensitivity: "base" }));
    return actions;
  }, [availableActions, filters.action, selectedAction]);

  const filteredActions = useMemo(() => {
    const query = actionSearch.trim().toLowerCase();
    if (!query) {
      return actionOptions;
    }
    return actionOptions.filter((action) =>
      action.toLowerCase().includes(query),
    );
  }, [actionOptions, actionSearch]);

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.action) ||
    filters.userId != null ||
    Boolean(filters.from && filters.to) ||
    filters.sort !== "latest";

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    const nextAction = selectedAction ? selectedAction.trim() : "";
    setFilters((prev) => ({
      ...prev,
      search: nextSearch,
      action: nextAction,
    }));
    setPage(1);
  };

  const handleResetSearchFilters = () => {
    setSearchInput("");
    setSelectedAction(null);
    setActionSearch("");
    setFilters((prev) => ({
      ...prev,
      search: "",
      action: "",
    }));
    setPage(1);
  };

  const handleSelectUser = (user: UserOption) => {
    setSelectedUser(user);
    setFilters((prev) => ({
      ...prev,
      userId: user.id,
    }));
    setPage(1);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setFilters((prev) => ({
      ...prev,
      userId: null,
    }));
    setPage(1);
  };

  const handleDateRangeChange = (range: DateRangeValue) => {
    setDateRange(range);
    const from = range.startDate ? toDateInput(range.startDate) : "";
    const to = range.endDate ? toDateInput(range.endDate) : "";
    setFilters((prev) => ({
      ...prev,
      from,
      to,
    }));
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    const normalized = value === "oldest" ? "oldest" : "latest";
    setFilters((prev) => ({
      ...prev,
      sort: normalized,
    }));
    setPage(1);
  };

  const handlePerPageChange = (value: string) => {
    const parsed = clampPerPage(Number(value));
    setPerPage(parsed);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(createDefaultFilters());
    setSearchInput("");
    setSelectedAction(null);
    setActionSearch("");
    setSelectedUser(null);
    setUserSearch("");
    setDateRange(createDefaultDateRange());
    setPerPage(25);
    setPage(1);
  };

  const handleRefresh = () => {
    void fetchLogs();
  };

  const renderLogDetails = (log: NormalizedActivityLog) => {
    const extraEntries = log.context
      ? Object.entries(log.context).filter(
          ([key]) => key !== "changes" && key !== "original",
        )
      : [];

    return (
      <div className="space-y-4 text-sm text-gray-700">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Acțiune
            </span>
            <p className="mt-1 font-medium text-gray-900">{log.action}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Creat la
            </span>
            <p className="mt-1 text-gray-700">{formatDateTime(log.createdAt)}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Adresă IP
            </span>
            <p className="mt-1 text-gray-700">{log.ipAddress ?? "—"}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              User Agent
            </span>
            <p className="mt-1 break-all text-gray-700">{log.userAgent ?? "—"}</p>
          </div>
        </div>
        {log.context?.changes && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Modificări</h3>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-900/90 p-3 text-xs text-gray-100">
              {formatJson(log.context.changes)}
            </pre>
          </div>
        )}
        {log.context?.original && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Valori inițiale</h3>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-100 p-3 text-xs text-gray-700">
              {formatJson(log.context.original)}
            </pre>
          </div>
        )}
        {extraEntries.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Context suplimentar</h3>
            <div className="mt-2 space-y-3">
              {extraEntries.map(([key, value]) => (
                <div key={key}>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {key}
                  </span>
                  <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
                    {formatJson(value)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Loguri de activitate</h1>
          <p className="text-sm text-gray-600">
            Vizualizează și filtrează acțiunile efectuate în platformă.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-jade focus:ring-offset-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Reîmprospătează
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-jade focus:ring-offset-2"
          >
            Resetare filtre
          </button>
        </div>
      </div>

      <form
        onSubmit={handleApplyFilters}
        className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4"
      >
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="activity-log-search">
            Căutare
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="activity-log-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Caută după mesaj, acțiune, utilizator sau entitate"
              className="pl-10"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="activity-log-action">
            Acțiune
          </label>
          <SearchSelect<string>
            id="activity-log-action"
            value={selectedAction}
            search={actionSearch}
            items={filteredActions}
            onSearch={setActionSearch}
            onSelect={(action) => {
              setSelectedAction(action);
              setActionSearch("");
            }}
            placeholder="Selectează acțiunea"
            renderItem={(action) => (
              <span className="text-sm font-medium text-gray-900">{action}</span>
            )}
            renderValue={(action) => (
              <span className="truncate text-sm font-medium text-gray-900">{action}</span>
            )}
          />
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <Button type="submit" size="sm">
            <Search className="mr-2 h-4 w-4" /> Aplică filtrele
          </Button>
          <button
            type="button"
            onClick={handleResetSearchFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-jade focus:ring-offset-2"
          >
            Curăță câmpurile
          </button>
        </div>
      </form>

      <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Utilizator
          </label>
          <SearchSelect<UserOption>
            value={selectedUser}
            search={userSearch}
            items={filteredUsers}
            onSearch={setUserSearch}
            onSelect={handleSelectUser}
            onOpen={loadUsers}
            placeholder="Selectează utilizator"
            renderItem={(item) => (
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">{item.name}</span>
                {item.email && (
                  <span className="text-xs text-gray-500">{item.email}</span>
                )}
              </div>
            )}
            renderValue={(item) => (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-gray-900">
                  {item.name}
                </span>
                {item.email && (
                  <span className="text-xs text-gray-500">{item.email}</span>
                )}
              </div>
            )}
          />
          {selectedUser && (
            <button
              type="button"
              onClick={handleClearUser}
              className="mt-2 text-xs font-medium text-red-600 hover:underline"
            >
              Elimină filtrul de utilizator
            </button>
          )}
          {usersLoading && (
            <p className="mt-1 text-xs text-gray-500">Se încarcă utilizatorii...</p>
          )}
        </div>
        <div className="md:col-span-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Interval de timp
          </label>
          <button
            type="button"
            onClick={() => setShowCalendar(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-jade focus:ring-offset-2"
          >
            <CalendarRange className="h-4 w-4 text-gray-500" />
            {filters.from && filters.to
              ? `${new Date(filters.from).toLocaleDateString("ro-RO")} - ${new Date(filters.to).toLocaleDateString("ro-RO")}`
              : "Selectează perioada"}
          </button>
        </div>
        <div className="grid gap-4 md:col-span-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Sortare
            </label>
            <Select
              value={filters.sort}
              onValueChange={handleSortChange}
              aria-label="Ordine loguri"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Elemente pe pagină
            </label>
            <Select
              value={perPage.toString()}
              onValueChange={handlePerPageChange}
              aria-label="Loguri pe pagină"
            >
              {perPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
          <span className="font-medium text-gray-900">Filtre active:</span>
          {filters.search && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
              Căutare: {filters.search}
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setFilters((prev) => ({ ...prev, search: "" }));
                  setPage(1);
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Elimină filtrul de căutare"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.action && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
              Acțiune: {filters.action}
              <button
                type="button"
                onClick={() => {
                  setSelectedAction(null);
                  setActionSearch("");
                  setFilters((prev) => ({ ...prev, action: "" }));
                  setPage(1);
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Elimină filtrul de acțiune"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedUser && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
              Utilizator: {selectedUser.name}
              <button
                type="button"
                onClick={handleClearUser}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Elimină filtrul de utilizator"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.from && filters.to && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
              {new Date(filters.from).toLocaleDateString("ro-RO")} - {new Date(filters.to).toLocaleDateString("ro-RO")}
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, from: "", to: "" }));
                  setDateRange(createDefaultDateRange());
                  setPage(1);
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Elimină filtrul de perioadă"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.sort !== "latest" && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
              Sortare: {filters.sort === "oldest" ? "Cele mai vechi" : "Cele mai noi"}
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, sort: "latest" }));
                  setPage(1);
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Resetează sortarea"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Se încarcă logurile...
          </div>
        ) : logs.length > 0 ? (
          <DataTable
            data={logs}
            columns={columns}
            renderRowDetails={renderLogDetails}
          />
        ) : (
          <div className="py-12 text-center text-sm text-gray-500">
            Nu există loguri pentru criteriile selectate.
          </div>
        )}

        {logs.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Afișezi {logs.length} din {totalItems} loguri
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                className="px-2 py-1 text-gray-600 disabled:opacity-50"
                disabled={currentPage <= 1}
              >
                Prima
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="px-2 py-1 text-gray-600 disabled:opacity-50"
                disabled={currentPage <= 1}
              >
                Anterior
              </button>
              <span>
                Pagina {currentPage} din {lastPage}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((prev) => (lastPage ? Math.min(lastPage, prev + 1) : prev + 1))
                }
                className="px-2 py-1 text-gray-600 disabled:opacity-50"
                disabled={currentPage >= lastPage}
              >
                Următoarea
              </button>
              <button
                type="button"
                onClick={() => setPage(lastPage || 1)}
                className="px-2 py-1 text-gray-600 disabled:opacity-50"
                disabled={currentPage >= lastPage}
              >
                Ultima
              </button>
            </div>
          </div>
        )}
      </div>

      <Popup open={showCalendar} onClose={() => setShowCalendar(false)} className="p-0">
        <DateRangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
          onClose={() => setShowCalendar(false)}
        />
      </Popup>
    </div>
  );
};

export default ActivityLogsPage;
