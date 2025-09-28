"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus, RefreshCw } from "lucide-react";
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
import type {
  ActivityRecord,
  ActivityType,
  ActivityWeeklySummary,
} from "@/types/activity-tracking";
import type { ApiListResult, ApiMeta } from "@/types/api";

interface CarOption {
  id: number;
  name: string;
  licensePlate: string | null;
}

interface NormalizedActivity {
  id: number;
  carId: number;
  carLabel: string;
  carPlate: string | null;
  type: ActivityType;
  typeLabel: string;
  amount: number;
  performedAt: string;
  performedAtDate: Date | null;
  notes: string | null;
  isPaid: boolean;
  paidAt: string | null;
  paidAtDate: Date | null;
  paidByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ActivityFormState {
  performedAt: string;
  type: ActivityType;
  notes: string;
}

const activityTypeLabels: Record<ActivityType, string> = {
  cleaning: "Curățare mașină",
  delivery: "Livrare către client",
};

const textareaClass =
  "block w-full max-w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-[#191919] shadow-sm transition focus:border-transparent focus:ring-2 focus:ring-jade focus:shadow-md placeholder:text-gray-500";

const dateFormatter = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "medium",
  timeStyle: "short",
});
const dateWithWeekdayFormatter = new Intl.DateTimeFormat("ro-RO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const currencyFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
  maximumFractionDigits: 0,
});

const getIsoWeekInfo = (date: Date): { year: number; week: number } => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.floor(((target.valueOf() - yearStart.valueOf()) / 86400000 + 1) / 7) + 1;
  return { year: target.getUTCFullYear(), week };
};

const formatIsoWeek = (date: Date): string => {
  const { year, week } = getIsoWeekInfo(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
};

const parseIsoWeekRange = (
  value: string,
): { start: Date; end: Date } | null => {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const [, yearPart, weekPart] = match;
  const year = Number(yearPart);
  const week = Number(weekPart);
  if (!Number.isFinite(year) || !Number.isFinite(week)) {
    return null;
  }
  const simple = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = simple.getUTCDay() || 7;
  simple.setUTCDate(simple.getUTCDate() + 1 - dayOfWeek + (week - 1) * 7);
  const start = new Date(simple);
  const end = new Date(simple);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
};

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const safeParseDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const parts = value.split("-");
  if (parts.length === 3) {
    const [yearPart, monthPart, dayPart] = parts;
    const year = Number(yearPart);
    const month = Number(monthPart);
    const day = Number(dayPart);
    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day)
    ) {
      const parsed = new Date(year, month - 1, day);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const normalizeActivity = (
  activity: ActivityRecord,
  carMap: Map<number, CarOption>,
): NormalizedActivity => {
  const carInfo = carMap.get(activity.car_id);
  const carLabel = carInfo?.name?.trim() ?? activity.car_plate ?? `Mașină #${activity.car_id}`;
  const carPlate = carInfo?.licensePlate ?? activity.car_plate ?? null;
  const performedAtDate = safeParseDate(activity.performed_at);
  const paidAtDate = safeParseDate(activity.paid_at);
  return {
    id: activity.id,
    carId: activity.car_id,
    carLabel,
    carPlate,
    type: activity.type,
    typeLabel: activityTypeLabels[activity.type],
    amount: activity.amount,
    performedAt: activity.performed_at,
    performedAtDate,
    notes: activity.notes,
    isPaid: activity.is_paid,
    paidAt: activity.paid_at,
    paidAtDate,
    paidByName: activity.paid_by_name ?? null,
    createdAt: activity.created_at ?? null,
    updatedAt: activity.updated_at ?? null,
  };
};

const deriveMeta = (response: ApiListResult<ActivityRecord>): ApiMeta | null => {
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
    };
  }
  return null;
};

const ActivityTrackingManager = () => {
  const [activities, setActivities] = useState<NormalizedActivity[]>([]);
  const [listMeta, setListMeta] = useState<ApiMeta | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<ActivityWeeklySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  const [weekFilter, setWeekFilter] = useState<string>(() => formatIsoWeek(new Date()));
  const [carOptions, setCarOptions] = useState<CarOption[]>([]);
  const [carSearch, setCarSearch] = useState("");
  const [selectedCar, setSelectedCar] = useState<CarOption | null>(null);
  const [carError, setCarError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<ActivityFormState>(() => ({
    performedAt: toDateInputValue(new Date()),
    type: "cleaning",
    notes: "",
  }));
  const [formCar, setFormCar] = useState<CarOption | null>(null);
  const [formCarSearch, setFormCarSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const aggregated = useMemo(() => {
    const paidCount = activities.reduce((acc, activity) => acc + (activity.isPaid ? 1 : 0), 0);
    const unpaidCount = activities.length - paidCount;

    if (weeklySummary) {
      const byType = weeklySummary.breakdown_by_type ?? {};
      const cleaning = byType.cleaning ?? {
        count: 0,
        amount: 0,
      };
      const delivery = byType.delivery ?? {
        count: 0,
        amount: 0,
      };
      return {
        count: weeklySummary.activities_count,
        amount: weeklySummary.total_amount,
        amountPerActivity: weeklySummary.amount_per_activity,
        cleaning,
        delivery,
        paidCount,
        unpaidCount,
      };
    }

    const base = activities.reduce(
      (
        acc,
        activity,
      ) => {
        acc.count += 1;
        acc.amount += activity.amount;
        if (activity.type === "cleaning") {
          acc.cleaning.count += 1;
          acc.cleaning.amount += activity.amount;
        } else if (activity.type === "delivery") {
          acc.delivery.count += 1;
          acc.delivery.amount += activity.amount;
        }
        return acc;
      },
      {
        count: 0,
        amount: 0,
        amountPerActivity: activities[0]?.amount ?? 25,
        cleaning: { count: 0, amount: 0 },
        delivery: { count: 0, amount: 0 },
      },
    );

    return {
      ...base,
      paidCount,
      unpaidCount,
    };
  }, [activities, weeklySummary]);

  const weekRange = useMemo(() => parseIsoWeekRange(weekFilter), [weekFilter]);
  const summaryRangeLabel = useMemo(() => {
    if (!weeklySummary) {
      return null;
    }
    const start = safeParseDate(weeklySummary.start_date);
    const end = safeParseDate(weeklySummary.end_date);
    if (start && end) {
      return `${dateFormatter.format(start)} – ${dateFormatter.format(end)}`;
    }
    if (weeklySummary.week) {
      return weeklySummary.week;
    }
    return null;
  }, [weeklySummary]);
  const dayBreakdown = weeklySummary?.breakdown_by_day ?? [];

  const columns: Column<NormalizedActivity>[] = useMemo(
    () => [
      {
        id: "performedAt",
        header: "Data activității",
        accessor: (row) => row.performedAtDate ?? row.performedAt,
        cell: (row) =>
          row.performedAtDate ? dateFormatter.format(row.performedAtDate) : row.performedAt,
        sortable: true,
      },
      {
        id: "car",
        header: "Mașină",
        accessor: (row) => row.carLabel,
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{row.carLabel}</span>
            {row.carPlate && (
              <span className="text-xs text-gray-500">{row.carPlate}</span>
            )}
          </div>
        ),
      },
      {
        id: "type",
        header: "Activitate",
        accessor: (row) => row.typeLabel,
        cell: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              row.type === "cleaning"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-sky-50 text-sky-700"
            }`}
          >
            {row.typeLabel}
          </span>
        ),
      },
      {
        id: "paid",
        header: "Plată",
        accessor: (row) => (row.isPaid ? 1 : 0),
        cell: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              row.isPaid
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {row.isPaid ? "Achitată" : "Neachitată"}
          </span>
        ),
        sortable: true,
      },
      {
        id: "amount",
        header: "Valoare",
        accessor: (row) => row.amount,
        cell: (row) => currencyFormatter.format(row.amount),
        sortable: true,
      },
    ],
    [],
  );

  const renderRowDetails = useCallback(
    (row: NormalizedActivity) => (
      <div className="space-y-3 text-sm text-gray-700">
        <div className="grid gap-2 text-xs text-gray-500 md:grid-cols-2">
          {row.createdAt && (
            <span>Înregistrată: {dateTimeFormatter.format(new Date(row.createdAt))}</span>
          )}
          {row.updatedAt && row.updatedAt !== row.createdAt && (
            <span>Actualizată: {dateTimeFormatter.format(new Date(row.updatedAt))}</span>
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900">Status plată</p>
          <div className="mt-1 space-y-1 text-xs">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 font-medium ${
                row.isPaid
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {row.isPaid ? "Activitate achitată" : "Activitate neachitată"}
            </span>
            {row.isPaid && row.paidAtDate && (
              <p className="text-gray-600">
                Marcată ca achitată la {dateTimeFormatter.format(row.paidAtDate)}
              </p>
            )}
            {row.isPaid && row.paidByName && (
              <p className="text-gray-600">Confirmată de {row.paidByName}</p>
            )}
          </div>
        </div>
        <div>
          <p className="font-medium text-gray-900">Observații</p>
          <p className="mt-1 whitespace-pre-line">
            {row.notes?.trim() ? row.notes : "Nu există observații"}
          </p>
        </div>
      </div>
    ),
    [],
  );

  const loadCars = useCallback(async () => {
    try {
      setCarError(null);
      const response = await apiClient.getCars({ perPage: 200 });
      const list = extractList(response);
      const normalized = list
        .map((car) => {
          const nameCandidate =
            typeof car.name === "string" && car.name.trim().length > 0
              ? car.name.trim()
              : typeof (car as { title?: unknown }).title === "string"
              ? ((car as { title: string }).title.trim())
              : typeof (car as { label?: unknown }).label === "string"
              ? ((car as { label: string }).label.trim())
              : `Mașină #${car.id}`;
          const plateCandidate =
            typeof car.license_plate === "string" && car.license_plate.trim().length > 0
              ? car.license_plate.trim()
              : typeof (car as { licensePlate?: unknown }).licensePlate === "string"
              ? ((car as { licensePlate: string }).licensePlate.trim())
              : typeof (car as { plate?: unknown }).plate === "string"
              ? ((car as { plate: string }).plate.trim())
              : null;
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

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = {
        week: weekFilter || undefined,
        car_id: selectedCar?.id,
        per_page: 100,
      };
      const [listResponse, summaryResponse] = await Promise.all([
        apiClient.getActivities(params),
        apiClient
          .getActivityWeeklySummary({ week: params.week, car_id: params.car_id })
          .catch(() => null),
      ]);

      const list = extractList(listResponse);
      const meta = deriveMeta(listResponse);
      setListMeta(meta);
      const normalized = list.map((activity) => normalizeActivity(activity, carLookup));
      setActivities(normalized);
      setWeeklySummary(summaryResponse ?? null);
    } catch (error) {
      console.error("Nu s-au putut încărca activitățile", error);
      setLoadError("Nu s-au putut încărca activitățile. Încearcă să reîncarci pagina.");
      setActivities([]);
      setWeeklySummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [carLookup, selectedCar, weekFilter]);

  useEffect(() => {
    loadCars();
  }, [loadCars]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    setMarkPaidError(null);
  }, [selectedCar, weekFilter]);

  const openModal = () => {
    setFormState({
      performedAt: toDateInputValue(new Date()),
      type: "cleaning",
      notes: "",
    });
    setFormCar(selectedCar);
    setFormCarSearch("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isSaving) {
      setIsModalOpen(false);
    }
  };

  const handleMarkWeekPaid = async () => {
    if (!weekFilter) {
      setMarkPaidError("Selectează săptămâna pentru care confirmi plata activităților.");
      return;
    }

    setIsMarkingPaid(true);
    setMarkPaidError(null);
    try {
      const payload = selectedCar
        ? { week: weekFilter, car_id: selectedCar.id }
        : { week: weekFilter };
      const result = await apiClient.markActivitiesPaid(payload);
      const paidAt = safeParseDate(result.paid_at);
      const paidAtLabel = paidAt ? dateTimeFormatter.format(paidAt) : result.paid_at;
      const rangeStart = safeParseDate(result.range.start_date);
      const rangeEnd = safeParseDate(result.range.end_date);
      const rangeLabel = rangeStart && rangeEnd
        ? `${dateFormatter.format(rangeStart)} – ${dateFormatter.format(rangeEnd)}`
        : result.range.week ?? weekFilter;
      const carLabel = selectedCar ? ` pentru ${selectedCar.name}` : "";
      setSuccessMessage(
        `Au fost marcate ${result.marked_count} activități${carLabel} ca achitate (${rangeLabel}). Confirmare: ${paidAtLabel}.`,
      );
      await loadActivities();
    } catch (error) {
      console.error("Nu s-a putut marca plata activităților", error);
      setMarkPaidError(
        "Nu s-au putut marca activitățile ca achitate. Încearcă din nou sau verifică filtrul selectat.",
      );
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleFormChange = <K extends keyof ActivityFormState>(key: K) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormState((prev) => ({
      ...prev,
      [key]: event.target.value,
    }));
  };

  const handleFormTypeChange = (value: string) => {
    if (value === "cleaning" || value === "delivery") {
      setFormState((prev) => ({ ...prev, type: value }));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formCar) {
      setFormError("Selectează mașina pentru care înregistrezi activitatea.");
      return;
    }
    if (!formState.performedAt) {
      setFormError("Completează data activității.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        car_id: formCar.id,
        performed_at: formState.performedAt,
        type: formState.type,
        notes: formState.notes.trim() ? formState.notes.trim() : undefined,
      };
      await apiClient.createActivity(payload);
      setSuccessMessage("Activitatea a fost salvată cu succes.");
      setIsModalOpen(false);
      await loadActivities();
    } catch (error) {
      console.error("Nu s-a putut salva activitatea", error);
      setFormError("Nu s-a putut salva activitatea. Verifică datele și încearcă din nou.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Activități operaționale</h1>
          <p className="text-sm text-gray-600">
            Monitorizează curățarea și livrarea mașinilor înregistrate în platformă.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleMarkWeekPaid}
            disabled={isLoading || isMarkingPaid || !weekFilter}
          >
            <CheckCircle2 className={`mr-2 h-4 w-4 ${isMarkingPaid ? "animate-spin" : ""}`} />
            {isMarkingPaid ? "Se confirmă plata..." : "Marchează ca achitate"}
          </Button>
          <Button onClick={loadActivities} variant="secondary" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Reîncarcă
          </Button>
          <Button onClick={openModal}>
            <Plus className="mr-2 h-4 w-4" /> Adaugă activitate
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {markPaidError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {markPaidError}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
        <div className="space-y-1">
          <Label htmlFor="week-filter">Filtru săptămână</Label>
          <Input
            id="week-filter"
            type="week"
            value={weekFilter}
            onChange={(event) => setWeekFilter(event.target.value)}
          />
          {weekRange && (
            <p className="text-xs text-gray-500">
              {dateFormatter.format(weekRange.start)} – {dateFormatter.format(weekRange.end)}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="car-filter">Filtru mașină</Label>
          <SearchSelect<CarOption>
            id="car-filter"
            value={selectedCar}
            search={carSearch}
            items={filteredCars}
            onSearch={setCarSearch}
            onSelect={(item) => {
              setSelectedCar(item);
              setCarSearch("");
            }}
            placeholder="Selectează o mașină"
            onOpen={() => {
              if (carOptions.length === 0) {
                loadCars();
              }
            }}
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
              onClick={() => setSelectedCar(null)}
              className="mt-1 text-xs text-jade underline"
            >
              Elimină filtrul
            </button>
          )}
          {carError && (
            <p className="text-xs text-red-600">{carError}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Total săptămână</Label>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm font-medium text-gray-900">
              {aggregated.count} activități
            </p>
            <p className="text-xs text-gray-500">
              {currencyFormatter.format(aggregated.amount)} în total
            </p>
            <p className="text-xs text-gray-500">
              {listMeta?.total ?? activities.length} înregistrări listate
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Curățări</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {aggregated.cleaning.count}
          </p>
          <p className="text-xs text-gray-500">
            {currencyFormatter.format(aggregated.cleaning.amount)} total
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Livrări</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {aggregated.delivery.count}
          </p>
          <p className="text-xs text-gray-500">
            {currencyFormatter.format(aggregated.delivery.amount)} total
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Valoare per activitate</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {currencyFormatter.format(aggregated.amountPerActivity)}
          </p>
          <p className="text-xs text-gray-500">Sumă fixă per înregistrare</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Plăți confirmate</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {aggregated.paidCount}
          </p>
          <p className="text-xs text-gray-500">
            {aggregated.unpaidCount > 0
              ? `${aggregated.unpaidCount} activități în așteptare`
              : "Toate activitățile listate sunt achitate"}
          </p>
        </div>
      </div>

      <DataTable
        data={activities}
        columns={columns}
        renderRowDetails={renderRowDetails}
        pageSize={10}
      />

      {weeklySummary && dayBreakdown.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Distribuția activităților pe zile ({weeklySummary.week})
            </h3>
            <p className="text-xs text-gray-500">
              Interval: {summaryRangeLabel ?? "—"}
            </p>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
            {dayBreakdown.map((entry) => {
              const entryDate = safeParseDate(entry.date);
              const formatted = entryDate
                ? dateWithWeekdayFormatter.format(entryDate)
                : entry.date;
              return (
                <div key={entry.date} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-sm font-medium text-gray-900 capitalize">{formatted}</p>
                  <p className="text-xs text-gray-500">
                    {currencyFormatter.format(entry.amount)} · {entry.count} activități
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Popup open={isModalOpen} onClose={closeModal} className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold">
            Adaugă activitate operațională
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="activity-date">Data activității</Label>
              <Input
                id="activity-date"
                type="date"
                value={formState.performedAt}
                onChange={handleFormChange("performedAt")}
                max={toDateInputValue(new Date())}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="activity-type">Tip activitate</Label>
              <Select
                id="activity-type"
                value={formState.type}
                onValueChange={handleFormTypeChange}
              >
                <option value="cleaning">Curățare mașină</option>
                <option value="delivery">Livrare către client</option>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="activity-car">Mașină</Label>
              <SearchSelect<CarOption>
                id="activity-car"
                value={formCar}
                search={formCarSearch}
                items={filteredFormCars}
                onSearch={setFormCarSearch}
                onSelect={(item) => {
                  setFormCar(item);
                  setFormCarSearch("");
                }}
                placeholder="Selectează mașina"
                onOpen={() => {
                  if (carOptions.length === 0) {
                    loadCars();
                  }
                }}
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
              {formCar && (
                <button
                  type="button"
                  onClick={() => setFormCar(null)}
                  className="mt-1 text-xs text-jade underline"
                >
                  Elimină selecția
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="activity-notes">Observații (opțional)</Label>
            <textarea
              id="activity-notes"
              value={formState.notes}
              onChange={handleFormChange("notes")}
              rows={3}
              placeholder="Detalii suplimentare despre activitate"
              className={textareaClass}
            />
          </div>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>
              Anulează
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Se salvează..." : "Salvează activitatea"}
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
};

export default ActivityTrackingManager;
