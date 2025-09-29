"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popup } from "@/components/ui/popup";
import { SearchSelect } from "@/components/ui/search-select";
import { Select } from "@/components/ui/select";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import type { Column } from "@/types/ui";
import type { ApiListResult, ApiMeta } from "@/types/api";
import type { ApiCar } from "@/types/car";
import type { User } from "@/types/auth";
import type {
  CarCashflowDirection,
  CarCashflowListParams,
  CarCashflowPaymentMethod,
  CarCashflowRecord,
} from "@/types/car-cashflow";

interface CarOption {
  id: number;
  name: string;
  licensePlate: string | null;
}

interface UserOption {
  id: number;
  name: string;
}

interface NormalizedCashflow {
  id: number;
  carId: number;
  carLabel: string;
  carPlate: string | null;
  direction: CarCashflowDirection;
  directionLabel: string;
  paymentMethod: CarCashflowPaymentMethod;
  paymentMethodLabel: string;
  totalAmount: number;
  cashAmount: number | null;
  cardAmount: number | null;
  occurredOn: string;
  occurredOnDate: Date | null;
  createdAt: string | null;
  createdAtDate: Date | null;
  createdById: number | null;
  createdByName: string | null;
  description: string | null;
}

interface CashflowFormState {
  direction: CarCashflowDirection;
  paymentMethod: CarCashflowPaymentMethod;
  cashAmount: string;
  cardAmount: string;
  occurredOn: string;
  description: string;
}

interface MonthlySummary {
  totalCount: number;
  incomeCount: number;
  incomeAmount: number;
  expenseCount: number;
  expenseAmount: number;
  netAmount: number;
  cashPortion: number;
  cardPortion: number;
  byPaymentMethod: Record<CarCashflowPaymentMethod, { count: number; amount: number }>;
}

const directionLabels: Record<CarCashflowDirection, string> = {
  income: "Încasare",
  expense: "Cheltuială",
};

const paymentMethodLabels: Record<CarCashflowPaymentMethod, string> = {
  cash: "Numerar",
  card: "Card",
  cash_card: "Numerar + card",
};

const currencyFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const monthFormatter = new Intl.DateTimeFormat("ro-RO", {
  month: "long",
  year: "numeric",
});

const textareaClass =
  "block w-full max-w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-[#191919] shadow-sm transition focus:border-transparent focus:ring-2 focus:ring-jade focus:shadow-md placeholder:text-gray-500";

const getCurrentMonthInput = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const coerceNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const safeParseDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(" ", "T");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  const fallback = new Date(value);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (match) {
    const iso = `${match[1]}T00:00:00`;
    const dateOnly = new Date(iso);
    if (!Number.isNaN(dateOnly.getTime())) {
      return dateOnly;
    }
  }
  return null;
};

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDateTimeInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateTimeForApi = (value: string): string => {
  if (!value) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  const seconds = String(parsed.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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

const formatUserName = (user: Partial<User> | null | undefined): string | null => {
  if (!user) {
    return null;
  }
  const first = coerceNonEmptyString(user.first_name) ?? "";
  const last = coerceNonEmptyString(user.last_name) ?? "";
  const fullName = [first, last].filter(Boolean).join(" ");
  if (fullName.length > 0) {
    return fullName;
  }
  const fallback =
    coerceNonEmptyString(user.username)
      ?? coerceNonEmptyString(user.email)
      ?? null;
  if (fallback) {
    return fallback;
  }
  if (typeof user.id === "number") {
    return `Utilizator #${user.id}`;
  }
  return null;
};

const deriveMeta = (response: ApiListResult<CarCashflowRecord>): ApiMeta | null => {
  if (Array.isArray(response)) {
    return null;
  }
  if (response.meta) {
    return response.meta;
  }
  if (response.pagination) {
    return response.pagination;
  }
  if (typeof response.total === "number" || typeof response.count === "number") {
    return {
      total: response.total ?? response.count,
      count: response.count ?? response.total,
      last_page: response.last_page ?? response.lastPage,
    } as ApiMeta;
  }
  return null;
};

const normalizeCashflow = (
  record: CarCashflowRecord,
  carLookup: Map<number, CarOption>,
  userLookup: Map<number, UserOption>,
): NormalizedCashflow => {
  const fallbackCar: CarOption = record.car
    ? {
        id: record.car.id,
        name:
          coerceNonEmptyString(record.car.name)
            ?? coerceNonEmptyString(record.car.license_plate)
            ?? `Mașină #${record.car.id}`,
        licensePlate: coerceNonEmptyString(record.car.license_plate),
      }
    : {
        id: record.car_id,
        name: `Mașină #${record.car_id}`,
        licensePlate: null,
      };
  const carInfo = carLookup.get(record.car_id) ?? fallbackCar;

  const occurredOnDate = safeParseDate(record.occurred_on);
  const createdAtDate = safeParseDate(record.created_at ?? undefined);

  const createdByCandidate =
    typeof record.created_by === "number" && Number.isFinite(record.created_by)
      ? record.created_by
      : record.created_by_user?.id ?? null;
  const createdByName =
    formatUserName(record.created_by_user)
      ?? (createdByCandidate !== null
        ? userLookup.get(createdByCandidate)?.name ?? null
        : null);

  const cashAmount =
    typeof record.cash_amount === "number" && Number.isFinite(record.cash_amount)
      ? record.cash_amount
      : record.payment_method === "cash"
        ? record.total_amount
        : null;
  const cardAmount =
    typeof record.card_amount === "number" && Number.isFinite(record.card_amount)
      ? record.card_amount
      : record.payment_method === "card"
        ? record.total_amount
        : null;

  return {
    id: record.id,
    carId: record.car_id,
    carLabel: carInfo.name,
    carPlate: carInfo.licensePlate,
    direction: record.direction,
    directionLabel: directionLabels[record.direction],
    paymentMethod: record.payment_method,
    paymentMethodLabel: paymentMethodLabels[record.payment_method],
    totalAmount: record.total_amount,
    cashAmount,
    cardAmount,
    occurredOn: record.occurred_on,
    occurredOnDate,
    createdAt: record.created_at ?? null,
    createdAtDate,
    createdById: createdByCandidate,
    createdByName,
    description: coerceNonEmptyString(record.description),
  };
};

const createDefaultFormState = (): CashflowFormState => ({
  direction: "income",
  paymentMethod: "cash",
  cashAmount: "",
  cardAmount: "",
  occurredOn: toDateTimeInputValue(new Date()),
  description: "",
});

const CarCashflowManager = () => {
  const [entries, setEntries] = useState<NormalizedCashflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [carOptions, setCarOptions] = useState<CarOption[]>([]);
  const [carError, setCarError] = useState<string | null>(null);
  const [carSearch, setCarSearch] = useState("");
  const [selectedCar, setSelectedCar] = useState<CarOption | null>(null);

  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [creatorSearch, setCreatorSearch] = useState("");
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);

  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [createdDateFilter, setCreatedDateFilter] = useState<string>("");
  const [createdMonthFilter, setCreatedMonthFilter] = useState<string>(() => getCurrentMonthInput());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<CashflowFormState>(() => createDefaultFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formCar, setFormCar] = useState<CarOption | null>(null);
  const [formCarSearch, setFormCarSearch] = useState("");
  const [formCreatedById, setFormCreatedById] = useState<number | null>(null);
  const [formCreatedBySearch, setFormCreatedBySearch] = useState("");

  const totalAmountNumber = useMemo(() => {
    if (formState.paymentMethod === "cash_card") {
      return parseAmount(formState.cashAmount) + parseAmount(formState.cardAmount);
    }
    if (formState.paymentMethod === "cash") {
      return parseAmount(formState.cashAmount);
    }
    return parseAmount(formState.cardAmount);
  }, [formState.cardAmount, formState.cashAmount, formState.paymentMethod]);

  const totalAmountDisplay = useMemo(() => {
    if (!Number.isFinite(totalAmountNumber) || totalAmountNumber <= 0) {
      return "0";
    }
    return totalAmountNumber.toLocaleString("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [totalAmountNumber]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const carLookup = useMemo(() => {
    const map = new Map<number, CarOption>();
    carOptions.forEach((car) => {
      map.set(car.id, car);
    });
    return map;
  }, [carOptions]);

  const userLookup = useMemo(() => {
    const map = new Map<number, UserOption>();
    userOptions.forEach((user) => {
      map.set(user.id, user);
    });
    return map;
  }, [userOptions]);

  const filteredCars = useMemo(() => {
    const query = carSearch.trim().toLowerCase();
    if (!query) {
      return carOptions;
    }
    return carOptions.filter((car) => {
      const nameMatch = car.name.toLowerCase().includes(query);
      const plateMatch = car.licensePlate?.toLowerCase().includes(query);
      return nameMatch || Boolean(plateMatch);
    });
  }, [carOptions, carSearch]);

  const filteredCreators = useMemo(() => {
    const query = creatorSearch.trim().toLowerCase();
    if (!query) {
      return userOptions;
    }
    return userOptions.filter((user) => user.name.toLowerCase().includes(query));
  }, [creatorSearch, userOptions]);

  const filteredFormCars = useMemo(() => {
    const query = formCarSearch.trim().toLowerCase();
    if (!query) {
      return carOptions;
    }
    return carOptions.filter((car) => {
      const nameMatch = car.name.toLowerCase().includes(query);
      const plateMatch = car.licensePlate?.toLowerCase().includes(query);
      return nameMatch || Boolean(plateMatch);
    });
  }, [carOptions, formCarSearch]);

  const selectedCreatorOption = useMemo(
    () => (selectedCreatorId !== null ? userOptions.find((user) => user.id === selectedCreatorId) ?? null : null),
    [selectedCreatorId, userOptions],
  );

  const formCreatedByOption = useMemo(
    () => (formCreatedById !== null ? userOptions.find((user) => user.id === formCreatedById) ?? null : null),
    [formCreatedById, userOptions],
  );

  const filteredFormCreators = useMemo(() => {
    const query = formCreatedBySearch.trim().toLowerCase();
    if (!query) {
      return userOptions;
    }
    return userOptions.filter((user) => user.name.toLowerCase().includes(query));
  }, [formCreatedBySearch, userOptions]);

  const monthLabel = useMemo(() => {
    if (!createdMonthFilter) {
      return null;
    }
    const parts = createdMonthFilter.split("-");
    if (parts.length !== 2) {
      return null;
    }
    const [yearPart, monthPart] = parts;
    const year = Number(yearPart);
    const monthIndex = Number(monthPart);
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
      return null;
    }
    const date = new Date(year, monthIndex - 1, 1);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return monthFormatter.format(date);
  }, [createdMonthFilter]);

  const monthlySummary = useMemo<MonthlySummary>(() => {
    return entries.reduce<MonthlySummary>(
      (acc, entry) => {
        acc.totalCount += 1;
        if (entry.direction === "income") {
          acc.incomeCount += 1;
          acc.incomeAmount += entry.totalAmount;
        } else {
          acc.expenseCount += 1;
          acc.expenseAmount += entry.totalAmount;
        }
        acc.netAmount = acc.incomeAmount - acc.expenseAmount;

        const methodStats = acc.byPaymentMethod[entry.paymentMethod];
        methodStats.count += 1;
        methodStats.amount += entry.totalAmount;

        if (entry.paymentMethod === "cash") {
          acc.cashPortion += entry.totalAmount;
        } else if (entry.paymentMethod === "card") {
          acc.cardPortion += entry.totalAmount;
        } else {
          acc.cashPortion += entry.cashAmount ?? 0;
          acc.cardPortion += entry.cardAmount ?? 0;
        }

        return acc;
      },
      {
        totalCount: 0,
        incomeCount: 0,
        incomeAmount: 0,
        expenseCount: 0,
        expenseAmount: 0,
        netAmount: 0,
        cashPortion: 0,
        cardPortion: 0,
        byPaymentMethod: {
          cash: { count: 0, amount: 0 },
          card: { count: 0, amount: 0 },
          cash_card: { count: 0, amount: 0 },
        },
      },
    );
  }, [entries]);

  const loadCars = useCallback(async () => {
    try {
      setCarError(null);
      const response = await apiClient.getCars({ perPage: 200 });
      const list = extractList<ApiCar>(response);
      const normalized = list
        .map((car) => {
          const record = car as Record<string, unknown>;
          const nameCandidate =
            coerceNonEmptyString(car?.name)
              ?? coerceNonEmptyString(record.title)
              ?? coerceNonEmptyString(record.label)
              ?? `Mașină #${car.id}`;
          const plateCandidate =
            coerceNonEmptyString(car?.license_plate)
              ?? coerceNonEmptyString(record.licensePlate)
              ?? coerceNonEmptyString(record.plate)
              ?? null;
          return {
            id: car.id,
            name: nameCandidate,
            licensePlate: plateCandidate,
          } satisfies CarOption;
        })
        .sort((a, b) => a.name.localeCompare(b.name, "ro"));
      setCarOptions(normalized);
    } catch (error) {
      console.error("Nu s-au putut încărca mașinile", error);
      setCarError("Nu s-au putut încărca mașinile. Încearcă din nou mai târziu.");
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setUsersError(null);
      const response = await apiClient.getUsers({ limit: 200, includeRoles: false });
      const list = extractList<User>(response);
      const normalized = list
        .map((user) => {
          const name = formatUserName(user) ?? `Utilizator #${user.id}`;
          return {
            id: user.id,
            name,
          } satisfies UserOption;
        })
        .sort((a, b) => a.name.localeCompare(b.name, "ro"));
      setUserOptions(normalized);
    } catch (error) {
      console.error("Nu s-au putut încărca utilizatorii", error);
      setUsersError("Nu s-au putut încărca utilizatorii. Încearcă din nou mai târziu.");
    }
  }, []);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params: CarCashflowListParams = {
        per_page: 100,
        include: "car,createdBy",
        car_id: selectedCar?.id,
        payment_method:
          paymentMethodFilter !== "all"
            ? (paymentMethodFilter as CarCashflowPaymentMethod)
            : undefined,
        direction:
          directionFilter !== "all"
            ? (directionFilter as CarCashflowDirection)
            : undefined,
        created_by: selectedCreatorId ?? undefined,
        created_date: createdDateFilter || undefined,
        created_month: createdDateFilter ? undefined : createdMonthFilter || undefined,
      };

      const response = await apiClient.getCarCashflows(params);
      const meta = deriveMeta(response);
      let records = extractList<CarCashflowRecord>(response);

      const lastPage = typeof meta?.last_page === "number" ? meta.last_page : null;
      if (lastPage && lastPage > 1) {
        const additionalResponses = await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, index) =>
            apiClient.getCarCashflows({ ...params, page: index + 2 }),
          ),
        );
        additionalResponses.forEach((pageResponse) => {
          const pageItems = extractList<CarCashflowRecord>(pageResponse);
          if (pageItems.length > 0) {
            records = records.concat(pageItems);
          }
        });
      }

      const normalized = records.map((record) => normalizeCashflow(record, carLookup, userLookup));
      setEntries(normalized);
    } catch (error) {
      console.error("Nu s-au putut încărca fluxurile financiare", error);
      setLoadError("Nu s-au putut încărca fluxurile financiare. Încearcă să reîncarci pagina.");
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [carLookup, createdDateFilter, createdMonthFilter, directionFilter, paymentMethodFilter, selectedCar, selectedCreatorId, userLookup]);

  useEffect(() => {
    loadCars();
    loadUsers();
  }, [loadCars, loadUsers]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const openModal = (direction: CarCashflowDirection) => {
    setFormState((prev) => ({ ...createDefaultFormState(), direction }));
    setFormError(null);
    setFormCar(selectedCar);
    setFormCarSearch("");
    setFormCreatedById(null);
    setFormCreatedBySearch("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }
    setIsModalOpen(false);
  };

  const handleRefresh = () => {
    loadEntries();
  };

  const handleResetFilters = () => {
    setSelectedCar(null);
    setCarSearch("");
    setPaymentMethodFilter("all");
    setDirectionFilter("all");
    setSelectedCreatorId(null);
    setCreatorSearch("");
    setCreatedDateFilter("");
    setCreatedMonthFilter(getCurrentMonthInput());
  };

  const handleFormChange = <K extends keyof CashflowFormState>(key: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setFormState((prev) => ({ ...prev, [key]: value }));
    };

  const handleFormSelectChange = (key: "direction" | "paymentMethod") => (value: string) => {
    setFormState((prev) => {
      if (key === "paymentMethod") {
        const paymentMethod = value as CarCashflowPaymentMethod;
        return {
          ...prev,
          paymentMethod,
          cashAmount: paymentMethod === "card" ? "" : prev.cashAmount,
          cardAmount: paymentMethod === "cash" ? "" : prev.cardAmount,
        };
      }
      return { ...prev, [key]: value as CarCashflowDirection };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formCar) {
      setFormError("Selectează mașina pentru care înregistrezi tranzacția.");
      return;
    }
    let cashAmount: number | undefined;
    let cardAmount: number | undefined;
    let totalAmount: number;

    if (formState.paymentMethod === "cash_card") {
      const cash = parseAmount(formState.cashAmount);
      const card = parseAmount(formState.cardAmount);
      if (cash <= 0 || card <= 0) {
        setFormError("Pentru plățile mixte completează sumele pe cash și card.");
        return;
      }
      totalAmount = cash + card;
      cashAmount = cash;
      cardAmount = card;
    } else if (formState.paymentMethod === "cash") {
      const cash = parseAmount(formState.cashAmount);
      if (cash <= 0) {
        setFormError("Introdu o sumă cash mai mare decât 0.");
        return;
      }
      totalAmount = cash;
      cashAmount = cash;
      cardAmount = undefined;
    } else if (formState.paymentMethod === "card") {
      const card = parseAmount(formState.cardAmount);
      if (card <= 0) {
        setFormError("Introdu o sumă card mai mare decât 0.");
        return;
      }
      totalAmount = card;
      cardAmount = card;
      cashAmount = undefined;
    } else {
      totalAmount = 0;
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setFormError("Introdu sume mai mari decât 0 pentru tranzacție.");
      return;
    }

    const payload = {
      car_id: formCar.id,
      direction: formState.direction,
      payment_method: formState.paymentMethod,
      total_amount: totalAmount,
      occurred_on: formatDateTimeForApi(formState.occurredOn),
      description: coerceNonEmptyString(formState.description),
      cash_amount: cashAmount,
      card_amount: cardAmount,
      created_by: formCreatedById ?? undefined,
    };

    setIsSaving(true);
    setFormError(null);
    try {
      await apiClient.createCarCashflow(payload);
      setIsModalOpen(false);
      setSuccessMessage("Tranzacția a fost înregistrată cu succes.");
      setFormState(createDefaultFormState());
      setFormCar(null);
      setFormCreatedById(null);
      loadEntries();
    } catch (error) {
      console.error("Nu s-a putut salva tranzacția", error);
      setFormError("Nu s-a putut salva tranzacția. Verifică datele și încearcă din nou.");
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<NormalizedCashflow>[] = useMemo(
    () => [
      {
        id: "car",
        header: "Mașină",
        accessor: (row) => row.carLabel,
        sortable: true,
        cell: (row) => (
          <div className="space-y-0.5">
            <p className="font-medium text-gray-900">{row.carLabel}</p>
            {row.carPlate && <p className="text-xs text-gray-500">{row.carPlate}</p>}
          </div>
        ),
      },
      {
        id: "direction",
        header: "Tip",
        accessor: (row) => row.directionLabel,
        sortable: true,
        cell: (row) => (
          <span
            className={
              row.direction === "income"
                ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                : "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700"
            }
          >
            {row.directionLabel}
          </span>
        ),
      },
      {
        id: "payment_method",
        header: "Metodă plată",
        accessor: (row) => row.paymentMethodLabel,
        sortable: true,
      },
      {
        id: "total_amount",
        header: "Sumă totală",
        accessor: (row) => row.totalAmount,
        sortable: true,
        cell: (row) => (
          <div className="space-y-0.5">
            <p className="font-medium text-gray-900">{currencyFormatter.format(row.totalAmount)}</p>
            {(row.cashAmount ?? 0) > 0 && (
              <p className="text-xs text-gray-500">Cash: {currencyFormatter.format(row.cashAmount ?? 0)}</p>
            )}
            {(row.cardAmount ?? 0) > 0 && (
              <p className="text-xs text-gray-500">Card: {currencyFormatter.format(row.cardAmount ?? 0)}</p>
            )}
          </div>
        ),
      },
      {
        id: "occurred_on",
        header: "Data tranzacției",
        accessor: (row) => row.occurredOnDate ?? row.occurredOn,
        sortable: true,
        cell: (row) => (
          <span>{row.occurredOnDate ? dateTimeFormatter.format(row.occurredOnDate) : row.occurredOn}</span>
        ),
      },
      {
        id: "created_by",
        header: "Adăugat de",
        accessor: (row) => row.createdByName ?? "",
        sortable: true,
        cell: (row) => row.createdByName ?? "—",
      },
      {
        id: "created_at",
        header: "Data adăugării",
        accessor: (row) => row.createdAtDate ?? row.createdAt ?? "",
        sortable: true,
        cell: (row) => (
          <span>{row.createdAtDate ? dateTimeFormatter.format(row.createdAtDate) : row.createdAt ?? "—"}</span>
        ),
      },
    ],
    [],
  );

  const renderRowDetails = useCallback(
    (row: NormalizedCashflow) => (
      <div className="space-y-2 text-sm text-gray-600">
        {row.description ? (
          <p>
            <span className="font-medium text-gray-800">Descriere:</span> {row.description}
          </p>
        ) : (
          <p className="italic text-gray-400">Nu există detalii suplimentare.</p>
        )}
      </div>
    ),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Fluxuri financiare flotă</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitorizează lunar încasările și cheltuielile înregistrate pentru fiecare mașină.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Reîncarcă
          </Button>
          <Button onClick={() => openModal("income")}>
            <Plus className="mr-2 h-4 w-4" /> Adaugă încasare
          </Button>
          <Button variant="danger" onClick={() => openModal("expense")}>
            <Plus className="mr-2 h-4 w-4" /> Adaugă cheltuială
          </Button>
        </div>
      </div>

      {(carError || usersError) && (
        <div className="space-y-2">
          {carError && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {carError}
            </div>
          )}
          {usersError && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {usersError}
            </div>
          )}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1">
            <Label htmlFor="cashflow-car">Mașină</Label>
            <SearchSelect<CarOption>
              id="cashflow-car"
              value={selectedCar}
              search={carSearch}
              items={filteredCars}
              onSearch={setCarSearch}
              onSelect={(item) => setSelectedCar(item)}
              placeholder="Selectează mașina"
              renderItem={(item) => (
                <div className="flex flex-col">
                  <span className="font-medium">{item.name}</span>
                  {item.licensePlate && <span className="text-xs text-gray-500">{item.licensePlate}</span>}
                </div>
              )}
              renderValue={(item) => (
                <div className="flex flex-col">
                  <span>{item.name}</span>
                  {item.licensePlate && <span className="text-xs text-gray-500">{item.licensePlate}</span>}
                </div>
              )}
            />
            {selectedCar && (
              <button
                type="button"
                onClick={() => setSelectedCar(null)}
                className="text-xs text-jade underline"
              >
                Șterge selecția
              </button>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cashflow-payment">Metodă plată</Label>
            <Select
              id="cashflow-payment"
              value={paymentMethodFilter}
              onValueChange={(value) => setPaymentMethodFilter(value)}
            >
              <option value="all">Toate</option>
              <option value="cash">Numerar</option>
              <option value="card">Card</option>
              <option value="cash_card">Numerar + card</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cashflow-direction">Tip</Label>
            <Select
              id="cashflow-direction"
              value={directionFilter}
              onValueChange={(value) => setDirectionFilter(value)}
            >
              <option value="all">Toate</option>
              <option value="income">Încasări</option>
              <option value="expense">Cheltuieli</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cashflow-creator">Adăugat de</Label>
            <SearchSelect<UserOption>
              id="cashflow-creator"
              value={selectedCreatorOption}
              search={creatorSearch}
              items={filteredCreators}
              onSearch={setCreatorSearch}
              onSelect={(item) => setSelectedCreatorId(item.id)}
              placeholder="Selectează utilizator"
              renderItem={(item) => <span>{item.name}</span>}
            />
            {selectedCreatorId !== null && (
              <button
                type="button"
                onClick={() => setSelectedCreatorId(null)}
                className="text-xs text-jade underline"
              >
                Elimină filtrul
              </button>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cashflow-created-date">Data adăugării</Label>
            <Input
              id="cashflow-created-date"
              type="date"
              value={createdDateFilter}
              max={toDateInputValue(new Date())}
              onChange={(event) => setCreatedDateFilter(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cashflow-created-month">Luna adăugării</Label>
            <Input
              id="cashflow-created-month"
              type="month"
              value={createdMonthFilter}
              onChange={(event) => setCreatedMonthFilter(event.target.value)}
            />
            {createdMonthFilter && (
              <button
                type="button"
                onClick={() => setCreatedMonthFilter("")}
                className="text-xs text-jade underline"
              >
                Golește luna
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" onClick={handleResetFilters}>
            Reset filtre
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sumar lunar</h2>
            <p className="text-sm text-gray-500">
              {monthLabel ? `Rezultate pentru ${monthLabel}` : "Selectează o lună pentru a vedea sumarul lunar."}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {entries.length} înregistrări afișate
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-700">Total încasări</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-900">
              {currencyFormatter.format(monthlySummary.incomeAmount)}
            </p>
            <p className="text-xs text-emerald-700">{monthlySummary.incomeCount} înregistrări</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-medium text-rose-700">Total cheltuieli</p>
            <p className="mt-2 text-2xl font-semibold text-rose-900">
              {currencyFormatter.format(monthlySummary.expenseAmount)}
            </p>
            <p className="text-xs text-rose-700">{monthlySummary.expenseCount} înregistrări</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">Sold lunar</p>
            <p className="mt-2 text-2xl font-semibold text-blue-900">
              {currencyFormatter.format(monthlySummary.netAmount)}
            </p>
            <p className="text-xs text-blue-700">
              {monthlySummary.netAmount >= 0 ? "Profit net" : "Deficit net"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700">Distribuție cash vs card</p>
            <p className="mt-2 text-base text-gray-700">
              Cash: {currencyFormatter.format(monthlySummary.cashPortion)}
            </p>
            <p className="text-base text-gray-700">
              Card: {currencyFormatter.format(monthlySummary.cardPortion)}
            </p>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Metodă plată</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Înregistrări</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Sumă totală</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {(Object.keys(paymentMethodLabels) as CarCashflowPaymentMethod[]).map((method) => {
                const stats = monthlySummary.byPaymentMethod[method];
                return (
                  <tr key={method}>
                    <td className="px-4 py-2 text-gray-700">{paymentMethodLabels[method]}</td>
                    <td className="px-4 py-2 text-gray-700">{stats.count}</td>
                    <td className="px-4 py-2 text-gray-700">{currencyFormatter.format(stats.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {entries.length === 0 && !isLoading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
          Nu există tranzacții care să corespundă filtrelor curente.
        </div>
      ) : (
        <DataTable data={entries} columns={columns} renderRowDetails={renderRowDetails} pageSize={15} />
      )}

      {isLoading && (
        <div className="text-sm text-gray-500">Se încarcă datele...</div>
      )}

      <Popup open={isModalOpen} onClose={closeModal} className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Adaugă tranzacție</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="form-occurred-on">Data și ora tranzacției</Label>
              <Input
                id="form-occurred-on"
                type="datetime-local"
                value={formState.occurredOn}
                onChange={handleFormChange("occurredOn")}
                max={toDateTimeInputValue(new Date())}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="form-direction">Tip</Label>
              <Select
                id="form-direction"
                value={formState.direction}
                onValueChange={handleFormSelectChange("direction")}
                required
              >
                <option value="income">Încasare</option>
                <option value="expense">Cheltuială</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="form-payment-method">Metodă plată</Label>
              <Select
                id="form-payment-method"
                value={formState.paymentMethod}
                onValueChange={handleFormSelectChange("paymentMethod")}
                required
              >
                <option value="cash">Numerar</option>
                <option value="card">Card</option>
                <option value="cash_card">Numerar + card</option>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="form-car">Mașină</Label>
              <SearchSelect<CarOption>
                id="form-car"
                value={formCar}
                search={formCarSearch}
                items={filteredFormCars}
                onSearch={setFormCarSearch}
                onSelect={(item) => setFormCar(item)}
                placeholder="Selectează mașina"
                renderItem={(item) => (
                  <div className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    {item.licensePlate && <span className="text-xs text-gray-500">{item.licensePlate}</span>}
                  </div>
                )}
                renderValue={(item) => (
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.licensePlate && <span className="text-xs text-gray-500">{item.licensePlate}</span>}
                  </div>
                )}
              />
            </div>
            {formState.paymentMethod !== "card" && (
              <div className="space-y-1">
                <Label htmlFor="form-cash-amount">Sumă cash</Label>
                <Input
                  id="form-cash-amount"
                  value={formState.cashAmount}
                  onChange={handleFormChange("cashAmount")}
                  placeholder="0"
                  inputMode="decimal"
                  required={formState.paymentMethod !== "card"}
                />
              </div>
            )}
            {formState.paymentMethod !== "cash" && (
              <div className="space-y-1">
                <Label htmlFor="form-card-amount">Sumă card</Label>
                <Input
                  id="form-card-amount"
                  value={formState.cardAmount}
                  onChange={handleFormChange("cardAmount")}
                  placeholder="0"
                  inputMode="decimal"
                  required={formState.paymentMethod !== "cash"}
                />
              </div>
            )}
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="form-total-amount">Sumă totală</Label>
              <Input id="form-total-amount" value={totalAmountDisplay} disabled readOnly />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="form-description">Descriere</Label>
              <textarea
                id="form-description"
                className={textareaClass}
                value={formState.description}
                onChange={handleFormChange("description")}
                rows={3}
                placeholder="Detaliază tranzacția în câteva cuvinte"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="form-created-by">Responsabil</Label>
              <SearchSelect<UserOption>
                id="form-created-by"
                value={formCreatedByOption}
                search={formCreatedBySearch}
                items={filteredFormCreators}
                onSearch={setFormCreatedBySearch}
                onSelect={(item) => setFormCreatedById(item.id)}
                placeholder="Selectează utilizatorul care adaugă tranzacția"
                renderItem={(item) => <span>{item.name}</span>}
              />
              {formCreatedById !== null && (
                <button
                  type="button"
                  onClick={() => setFormCreatedById(null)}
                  className="text-xs text-jade underline"
                >
                  Folosește utilizatorul curent
                </button>
              )}
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>
              Anulează
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Se salvează..." : "Salvează tranzacția"}
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
};

export default CarCashflowManager;
