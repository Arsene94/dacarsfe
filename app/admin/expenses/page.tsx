"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import type { Column } from "@/types/ui";
import type { Expense, ExpenseListParams } from "@/types/expense";

interface CarOption {
  id: number;
  name: string;
  licensePlate: string | null;
}

interface AuthorOption {
  id: number;
  name: string;
}

interface NormalizedExpense {
  id: number;
  type: string;
  typeKey: string;
  typeLabel: string;
  description: string;
  amount: number;
  spentAt: string;
  spentAtDate: Date | null;
  carId: number | null;
  carName: string | null;
  carPlate: string | null;
  isRecurring: boolean;
  recurrenceDay: number | null;
  recurrenceStartsOn: string | null;
  recurrenceEndsOn: string | null;
  recurrenceLastGenerated: string | null;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ExpenseFormState {
  id: number | null;
  type: string;
  description: string;
  amount: string;
  spentAt: string;
  carId: string;
  isRecurring: boolean;
  endsOn: string;
}

const expenseTypeLabels: Record<string, string> = {
  spalat: "Spălat",
  parcare: "Parcare",
  service: "Service",
  casa: "Casă",
  marketing: "Marketing",
  altele: "Altele",
};

const expenseTypeOptions = Object.entries(expenseTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

const currencyFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
});

const dateFormatter = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" });

const dateTimeFormatter = new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const monthFormatter = new Intl.DateTimeFormat("ro-RO", {
  month: "long",
  year: "numeric",
});

const defaultFormState: ExpenseFormState = {
  id: null,
  type: "",
  description: "",
  amount: "",
  spentAt: "",
  carId: "",
  isRecurring: false,
  endsOn: "",
};

const textareaClass =
  "block w-full max-w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-[#191919] shadow-sm transition focus:border-transparent focus:ring-2 focus:ring-jade focus:shadow-md placeholder:text-gray-500";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toNumericId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseAmount = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const cleaned = value
      .replace(/[^0-9.,-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "");
    const normalized = cleaned.replace(/,/g, ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const parseBoolean = (value: unknown, defaultValue = false): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "da"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "nu"].includes(normalized)) {
      return false;
    }
  }
  return defaultValue;
};

const normalizeDateValue = (value: unknown): { raw: string; date: Date | null } => {
  if (typeof value === "string" && value.trim().length > 0) {
    const raw = value.trim();
    const date = new Date(raw);
    return {
      raw,
      date: Number.isNaN(date.getTime()) ? null : date,
    };
  }
  return { raw: "", date: null };
};

const getDateInputValue = (value: string): string =>
  value && value.length >= 10 ? value.slice(0, 10) : value;

const capitalize = (value: string): string => {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const pickCarName = (car: unknown): { name: string | null; plate: string | null } => {
  if (!isRecord(car)) {
    return { name: null, plate: null };
  }
  const nameCandidate =
    typeof car.name === "string"
      ? car.name
      : typeof (car as { title?: unknown }).title === "string"
      ? ((car as { title: string }).title)
      : typeof (car as { label?: unknown }).label === "string"
      ? ((car as { label: string }).label)
      : null;
  const name = nameCandidate ? nameCandidate.trim() : null;
  const plateCandidate =
    typeof (car as { license_plate?: unknown }).license_plate === "string"
      ? ((car as { license_plate: string }).license_plate)
      : typeof (car as { licensePlate?: unknown }).licensePlate === "string"
      ? ((car as { licensePlate: string }).licensePlate)
      : typeof (car as { plate?: unknown }).plate === "string"
      ? ((car as { plate: string }).plate)
      : null;
  const plate = plateCandidate ? plateCandidate.trim() : null;
  return {
    name: name && name.length > 0 ? name : null,
    plate: plate && plate.length > 0 ? plate : null,
  };
};

const pickAuthorName = (author: Record<string, unknown>): string | null => {
  const directKeys = [
    "name",
    "full_name",
    "fullName",
    "display_name",
    "displayName",
  ];
  for (const key of directKeys) {
    const candidate = toTrimmedString(author[key]);
    if (candidate) {
      return candidate;
    }
  }

  const firstName =
    toTrimmedString(author.first_name) ?? toTrimmedString(author.firstName);
  const lastName =
    toTrimmedString(author.last_name) ?? toTrimmedString(author.lastName);
  const parts = [firstName, lastName].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  if (parts.length > 0) {
    return parts.join(" ");
  }

  const username = toTrimmedString(author.username);
  if (username) {
    return username;
  }

  const email = toTrimmedString(author.email);
  if (email) {
    return email;
  }

  return null;
};

const extractExpenseAuthor = (
  expense: Expense,
): { id: number | null; name: string | null } => {
  const idCandidates: unknown[] = [
    expense.created_by,
    (expense as { createdBy?: unknown }).createdBy,
    (expense as { author_id?: unknown }).author_id,
    (expense as { user_id?: unknown }).user_id,
  ];

  let id: number | null = null;
  for (const candidate of idCandidates) {
    const parsed = toNumericId(candidate);
    if (parsed != null) {
      id = parsed;
      break;
    }
  }

  const nameCandidates: unknown[] = [
    (expense as { created_by_name?: unknown }).created_by_name,
    (expense as { createdByName?: unknown }).createdByName,
  ];

  let name: string | null = null;
  for (const candidate of nameCandidates) {
    const parsed = toTrimmedString(candidate);
    if (parsed) {
      name = parsed;
      break;
    }
  }

  if (!name) {
    const authorRecords: unknown[] = [
      expense.created_by_user,
      (expense as { createdByUser?: unknown }).createdByUser,
      (expense as { creator?: unknown }).creator,
      (expense as { author?: unknown }).author,
      (expense as { user?: unknown }).user,
    ];

    for (const candidate of authorRecords) {
      if (isRecord(candidate)) {
        const extracted = pickAuthorName(candidate);
        if (extracted) {
          name = extracted;
          break;
        }
      }
    }
  }

  return {
    id,
    name,
  };
};

const normalizeExpense = (expense: Expense): NormalizedExpense | null => {
  const id = toNumericId(expense.id);
  if (id == null) {
    return null;
  }

  const rawType =
    typeof expense.type === "string" && expense.type.trim().length > 0
      ? expense.type.trim()
      : "altele";
  const typeKey = rawType.toLowerCase();
  const typeLabel = expenseTypeLabels[typeKey] ?? capitalize(rawType);

  const amount = parseAmount(expense.amount);
  const { raw: spentAtRaw, date: spentAtDate } = normalizeDateValue(expense.spent_at);
  const spentAt = getDateInputValue(spentAtRaw);

  const description =
    typeof expense.description === "string" ? expense.description.trim() : "";

  const carId = toNumericId(expense.car_id);
  const { name: carName, plate: carPlate } = pickCarName(expense.car);

  const author = extractExpenseAuthor(expense);

  const recurrence = expense.recurrence;
  const recurrenceDay = isRecord(recurrence)
    ? toNumericId((recurrence as { day_of_month?: unknown }).day_of_month)
    : null;
  const recurrenceStartsOn = isRecord(recurrence)
    ? getDateInputValue(
        typeof recurrence?.starts_on === "string" ? recurrence.starts_on : "",
      )
    : null;
  const recurrenceEndsOn = isRecord(recurrence)
    ? getDateInputValue(
        typeof recurrence?.ends_on === "string" ? recurrence.ends_on : "",
      )
    : null;
  const recurrenceLastGenerated = isRecord(recurrence)
    ? getDateInputValue(
        typeof recurrence?.last_generated_period === "string"
          ? recurrence.last_generated_period
          : "",
      )
    : null;

  return {
    id,
    type: rawType,
    typeKey,
    typeLabel,
    description,
    amount,
    spentAt,
    spentAtDate,
    carId,
    carName,
    carPlate,
    isRecurring: parseBoolean(expense.is_recurring),
    recurrenceDay,
    recurrenceStartsOn,
    recurrenceEndsOn,
    recurrenceLastGenerated,
    createdById: author.id,
    createdByName: author.name,
    createdAt:
      typeof expense.created_at === "string" ? expense.created_at : null,
    updatedAt:
      typeof expense.updated_at === "string" ? expense.updated_at : null,
  };
};

const mapCarOption = (car: unknown): CarOption | null => {
  if (!isRecord(car)) {
    return null;
  }
  const id = toNumericId(car.id);
  if (id == null) {
    return null;
  }
  const nameCandidate =
    typeof car.name === "string"
      ? car.name
      : typeof (car as { title?: unknown }).title === "string"
      ? ((car as { title: string }).title)
      : typeof (car as { label?: unknown }).label === "string"
      ? ((car as { label: string }).label)
      : null;
  const name = nameCandidate && nameCandidate.trim().length > 0
    ? nameCandidate.trim()
    : `Mașină #${id}`;
  const plateCandidate =
    typeof (car as { license_plate?: unknown }).license_plate === "string"
      ? ((car as { license_plate: string }).license_plate)
      : typeof (car as { licensePlate?: unknown }).licensePlate === "string"
      ? ((car as { licensePlate: string }).licensePlate)
      : typeof (car as { plate?: unknown }).plate === "string"
      ? ((car as { plate: string }).plate)
      : null;
  const licensePlate = plateCandidate && plateCandidate.trim().length > 0
    ? plateCandidate.trim()
    : null;
  return {
    id,
    name,
    licensePlate,
  };
};

const formatDateTime = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return dateTimeFormatter.format(date);
};

const formatPeriod = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return monthFormatter.format(date);
};

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<NormalizedExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<ExpenseFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [carOptions, setCarOptions] = useState<CarOption[]>([]);
  const [selectedCar, setSelectedCar] = useState<CarOption | null>(null);
  const [carSearch, setCarSearch] = useState("");
  const [authorOptions, setAuthorOptions] = useState<AuthorOption[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [recurringFilter, setRecurringFilter] = useState("all");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: ExpenseListParams = {
        include: ["car", "recurrence", "createdBy", "createdByUser", "creator", "user"],
        perPage: 100,
      };
      if (typeFilter) {
        params.type = typeFilter;
      }
      if (recurringFilter === "true") {
        params.is_recurring = true;
      } else if (recurringFilter === "false") {
        params.is_recurring = false;
      }
      if (createdByFilter) {
        const numericCreatedBy = Number(createdByFilter);
        if (Number.isFinite(numericCreatedBy)) {
          params.created_by = numericCreatedBy;
        } else {
          params.created_by = createdByFilter;
        }
      }
      const response = await apiClient.getExpenses(params);
      const rawList = extractList<Expense>(response);
      const normalized = rawList
        .map((item) => normalizeExpense(item))
        .filter((item): item is NormalizedExpense => item !== null)
        .sort((a, b) => {
          const timeA = a.spentAtDate ? a.spentAtDate.getTime() : 0;
          const timeB = b.spentAtDate ? b.spentAtDate.getTime() : 0;
          return timeB - timeA;
        });
      setExpenses(normalized);
      setAuthorOptions((prev) => {
        const map = new Map<number, AuthorOption>();
        prev.forEach((option) => {
          map.set(option.id, option);
        });
        normalized.forEach((item) => {
          if (item.createdById != null) {
            const label =
              item.createdByName && item.createdByName.length > 0
                ? item.createdByName
                : `Utilizator #${item.createdById}`;
            const existing = map.get(item.createdById);
            if (!existing || existing.name.startsWith("Utilizator #")) {
              map.set(item.createdById, { id: item.createdById, name: label });
            }
          }
        });
        return Array.from(map.values()).sort((a, b) =>
          a.name.localeCompare(b.name, "ro", { sensitivity: "base" }),
        );
      });
    } catch (error) {
      console.error("Nu am putut încărca cheltuielile", error);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, recurringFilter, createdByFilter]);

  const loadCars = useCallback(async () => {
    try {
      const response = await apiClient.getCars({ perPage: 200 });
      const cars = extractList(response);
      const mapped = cars
        .map((car) => mapCarOption(car))
        .filter((car): car is CarOption => car !== null)
        .sort((a, b) => a.name.localeCompare(b.name, "ro"));
      setCarOptions(mapped);
    } catch (error) {
      console.error("Nu am putut încărca mașinile", error);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    loadCars();
  }, [loadCars]);

  const filteredCars = useMemo(() => {
    const query = carSearch.trim().toLowerCase();
    if (!query) {
      return carOptions.slice(0, 50);
    }
    return carOptions
      .filter((option) => {
        const nameMatch = option.name.toLowerCase().includes(query);
        const plateMatch = option.licensePlate
          ? option.licensePlate.toLowerCase().includes(query)
          : false;
        return nameMatch || plateMatch;
      })
      .slice(0, 50);
  }, [carOptions, carSearch]);

  const totalAmount = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amount, 0),
    [expenses],
  );

  const openAddModal = () => {
    setFormState(defaultFormState);
    setFormError(null);
    setSelectedCar(null);
    setCarSearch("");
    setIsModalOpen(true);
  };

  const openEditModal = (expense: NormalizedExpense) => {
    setFormState({
      id: expense.id,
      type: expense.type,
      description: expense.description,
      amount: expense.amount.toString(),
      spentAt: expense.spentAt,
      carId: expense.carId ? expense.carId.toString() : "",
      isRecurring: expense.isRecurring,
      endsOn: expense.recurrenceEndsOn ?? "",
    });
    setFormError(null);
    setCarSearch("");
    if (expense.carId != null) {
      const existing = carOptions.find((option) => option.id === expense.carId);
      setSelectedCar(
        existing ?? {
          id: expense.carId,
          name:
            expense.carName && expense.carName.length > 0
              ? expense.carName
              : `Mașină #${expense.carId}`,
          licensePlate: expense.carPlate,
        },
      );
    } else {
      setSelectedCar(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }
    setIsModalOpen(false);
    setFormState(defaultFormState);
    setFormError(null);
    setSelectedCar(null);
    setCarSearch("");
  };

  const handleInputChange = (
    field: keyof ExpenseFormState,
    transform?: (value: string) => string,
  ) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = transform ? transform(event.target.value) : event.target.value;
      setFormState((prev) => ({ ...prev, [field]: value }));
    };

  const handleCheckboxChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { checked } = event.target;
    setFormState((prev) => ({ ...prev, isRecurring: checked }));
    if (!checked) {
      setFormState((prev) => ({ ...prev, endsOn: "" }));
    }
  };

  const handleCarSelect = (car: CarOption) => {
    setSelectedCar(car);
    setFormState((prev) => ({ ...prev, carId: car.id.toString() }));
  };

  const clearSelectedCar = () => {
    setSelectedCar(null);
    setFormState((prev) => ({ ...prev, carId: "" }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const trimmedType = formState.type.trim();
    const numericAmount = parseAmount(formState.amount);
    const trimmedDescription = formState.description.trim();
    const spentAt = formState.spentAt.trim();
    const endsOn = formState.endsOn.trim();

    if (!trimmedType) {
      setFormError("Alege tipul cheltuielii.");
      return;
    }

    if (!spentAt) {
      setFormError("Selectează data cheltuielii.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setFormError("Introdu o sumă validă.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload = {
      type: trimmedType,
      description: trimmedDescription.length > 0 ? trimmedDescription : null,
      amount: numericAmount,
      spent_at: spentAt,
      car_id: formState.carId ? Number(formState.carId) : null,
      is_recurring: formState.isRecurring,
      ends_on: formState.isRecurring && endsOn.length > 0 ? endsOn : null,
    } as const;

    try {
      if (formState.id) {
        await apiClient.updateExpense(formState.id, payload);
      } else {
        await apiClient.createExpense(payload);
      }
      closeModal();
      await loadExpenses();
    } catch (error) {
      console.error("Nu am putut salva cheltuiala", error);
      setFormError("Nu am putut salva cheltuiala. Încearcă din nou.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (expenseId: number) => {
    if (deletingId) {
      return;
    }
    const confirmed = window.confirm(
      "Ești sigur că vrei să ștergi această cheltuială?",
    );
    if (!confirmed) {
      return;
    }
    setDeletingId(expenseId);
    try {
      await apiClient.deleteExpense(expenseId);
      await loadExpenses();
    } catch (error) {
      console.error("Nu am putut șterge cheltuiala", error);
    } finally {
      setDeletingId(null);
    }
  };

  const dynamicTypeOptions = useMemo(() => {
    if (
      formState.type &&
      !expenseTypeOptions.some((option) => option.value === formState.type)
    ) {
      return [
        ...expenseTypeOptions,
        { value: formState.type, label: capitalize(formState.type) },
      ];
    }
    return expenseTypeOptions;
  }, [formState.type]);

  const columns: Column<NormalizedExpense>[] = [
    {
      id: "type",
      header: "Tip",
      accessor: (row) => row.typeLabel,
      sortable: true,
    },
    {
      id: "amount",
      header: "Sumă",
      accessor: (row) => row.amount,
      sortable: true,
      cell: (row) => currencyFormatter.format(row.amount),
    },
    {
      id: "date",
      header: "Data",
      accessor: (row) => row.spentAtDate ?? row.spentAt,
      sortable: true,
      cell: (row) =>
        row.spentAtDate ? dateFormatter.format(row.spentAtDate) : row.spentAt || "-",
    },
    {
      id: "car",
      header: "Mașină",
      accessor: (row) => row.carName ?? "",
      sortable: true,
      cell: (row) =>
        row.carName
          ? `${row.carName}${row.carPlate ? ` (${row.carPlate})` : ""}`
          : "-",
    },
    {
      id: "createdBy",
      header: "Adăugată de",
      accessor: (row) =>
        row.createdByName ??
        (row.createdById != null ? `Utilizator #${row.createdById}` : ""),
      sortable: true,
      cell: (row) =>
        row.createdByName ??
        (row.createdById != null ? `Utilizator #${row.createdById}` : "-"),
    },
    {
      id: "recurring",
      header: "Recurent",
      accessor: (row) => (row.isRecurring ? "Da" : "Nu"),
      sortable: true,
      cell: (row) => (row.isRecurring ? "Da" : "Nu"),
    },
    {
      id: "actions",
      header: "Acțiuni",
      accessor: () => "",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              openEditModal(row);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={deletingId === row.id}
            onClick={(event) => {
              event.stopPropagation();
              handleDelete(row.id);
            }}
          >
            {deletingId === row.id ? (
              <span>Se șterge...</span>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  const renderRowDetails = (row: NormalizedExpense) => (
    <div className="space-y-3 text-sm text-gray-700">
      {row.description && (
        <p>
          <span className="font-medium text-gray-900">Descriere:</span> {row.description}
        </p>
      )}
      {row.isRecurring && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="font-medium text-gray-900">Recurență</p>
          <ul className="mt-2 space-y-1">
            <li>
              Ziua lunii:{" "}
              {row.recurrenceDay != null ? row.recurrenceDay : "-"}
            </li>
            <li>
              Începe din:{" "}
              {row.recurrenceStartsOn || "-"}
            </li>
            <li>
              Se oprește la:{" "}
              {row.recurrenceEndsOn || "-"}
            </li>
            <li>
              Ultima generare:{" "}
              {formatPeriod(row.recurrenceLastGenerated) || "-"}
            </li>
          </ul>
        </div>
      )}
      <div className="grid gap-1 text-xs text-gray-500 md:grid-cols-2">
        <span>
          Adăugată de:{" "}
          {row.createdByName ??
            (row.createdById != null ? `Utilizator #${row.createdById}` : "-")}
        </span>
        {row.createdAt && (
          <span>
            Creată: {formatDateTime(row.createdAt) ?? row.createdAt}
          </span>
        )}
        {row.updatedAt && row.updatedAt !== row.createdAt && (
          <span>
            Actualizată: {formatDateTime(row.updatedAt) ?? row.updatedAt}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cheltuieli flotă</h1>
          <p className="text-sm text-gray-600">
            Înregistrează și urmărește costurile operaționale ale flotei.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadExpenses} variant="secondary" disabled={isLoading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Reîncarcă
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" /> Adaugă cheltuială
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="expense-filter-type">Filtru după tip</Label>
          <Select
            id="expense-filter-type"
            value={typeFilter}
            onValueChange={setTypeFilter}
          >
            <option value="">Toate tipurile</option>
            {expenseTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="expense-filter-recurring">Recurență</Label>
          <Select
            id="expense-filter-recurring"
            value={recurringFilter}
            onValueChange={setRecurringFilter}
          >
            <option value="all">Toate</option>
            <option value="true">Doar recurente</option>
            <option value="false">Doar unice</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="expense-filter-created-by">Adăugată de</Label>
          <Select
            id="expense-filter-created-by"
            value={createdByFilter}
            onValueChange={setCreatedByFilter}
          >
            <option value="">Toți autorii</option>
            {authorOptions.map((option) => (
              <option key={option.id} value={option.id.toString()}>
                {option.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        data={expenses}
        columns={columns}
        renderRowDetails={renderRowDetails}
      />

      <div className="flex justify-end text-sm font-semibold text-gray-900">
        Total filtrat: {currencyFormatter.format(totalAmount)}
      </div>

      <Popup open={isModalOpen} onClose={closeModal} className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold">
            {formState.id ? "Editează cheltuiala" : "Adaugă cheltuială"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="expense-type">Tip cheltuială</Label>
              <Select
                id="expense-type"
                value={formState.type}
                placeholder="Alege tipul"
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, type: value }))
                }
              >
                <option value="" disabled hidden>
                  Alege tipul
                </option>
                {dynamicTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="expense-amount">Sumă</Label>
              <Input
                id="expense-amount"
                value={formState.amount}
                onChange={handleInputChange("amount")}
                placeholder="Ex: 2500"
                inputMode="decimal"
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="expense-date">Data cheltuielii</Label>
              <Input
                id="expense-date"
                type="date"
                value={formState.spentAt}
                onChange={handleInputChange("spentAt")}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="expense-car">Mașină asociată</Label>
              <SearchSelect<CarOption>
                id="expense-car"
                value={selectedCar}
                search={carSearch}
                items={filteredCars}
                onSearch={setCarSearch}
                onSelect={handleCarSelect}
                onOpen={() => {
                  if (carOptions.length === 0) {
                    loadCars();
                  }
                }}
                placeholder="Selectează o mașină"
                renderItem={(item) => (
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    {item.licensePlate && (
                      <span className="text-xs text-gray-500">{item.licensePlate}</span>
                    )}
                  </div>
                )}
                renderValue={(item) => (
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    {item.licensePlate && (
                      <span className="text-xs text-gray-500">{item.licensePlate}</span>
                    )}
                  </div>
                )}
              />
              {selectedCar && (
                <button
                  type="button"
                  onClick={clearSelectedCar}
                  className="mt-1 text-xs text-jade underline"
                >
                  Elimină selecția
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="expense-description">Descriere</Label>
            <textarea
              id="expense-description"
              value={formState.description}
              onChange={handleInputChange("description")}
              placeholder="Adaugă detalii despre cheltuială"
              rows={4}
              className={textareaClass}
            />
          </div>
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={formState.isRecurring}
                onChange={handleCheckboxChange}
                className="h-4 w-4 rounded border-gray-300 text-jade focus:ring-jade"
              />
              Cheltuială recurentă
            </label>
            {formState.isRecurring && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="expense-ends-on">Generare până la</Label>
                  <Input
                    id="expense-ends-on"
                    type="date"
                    value={formState.endsOn}
                    onChange={handleInputChange("endsOn")}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Cheltuielile recurente se generează automat lunar până la data setată.
                </p>
              </div>
            )}
          </div>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={isSaving}
            >
              Anulează
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Se salvează..." : "Salvează"}
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
};

export default ExpensesPage;

