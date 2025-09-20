"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import type { Column } from "@/types/ui";
import type { ServiceReport, ServiceReportListParams } from "@/types/service-report";

interface CarOption {
  id: number;
  name: string;
  licensePlate: string | null;
}

interface ServiceReportFormState {
  id: number | null;
  mechanicName: string;
  servicedAt: string;
  carId: string;
  odometerKm: string;
  oilType: string;
  workPerformed: string;
  observations: string;
}

interface NormalizedServiceReport {
  id: number;
  mechanicName: string;
  servicedAtInput: string;
  servicedAtDate: Date | null;
  servicedAtRaw: string;
  carId: number | null;
  carName: string | null;
  carPlate: string | null;
  odometerKm: number | null;
  oilType: string;
  workPerformed: string;
  observations: string;
  createdAt: string | null;
  updatedAt: string | null;
}

const defaultFormState: ServiceReportFormState = {
  id: null,
  mechanicName: "",
  servicedAt: "",
  carId: "",
  odometerKm: "",
  oilType: "",
  workPerformed: "",
  observations: "",
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

const normalizeDateValue = (value: string): { raw: string; date: Date | null } => {
  const raw = value.trim();
  if (!raw) {
    return { raw: "", date: null };
  }
  const date = new Date(raw);
  return {
    raw,
    date: Number.isNaN(date.getTime()) ? null : date,
  };
};

const toLocalDateTimeInput = (value: string): string => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const match = value.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    return match ? match[0] : "";
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const fromLocalDateTime = (value: string): string => {
  if (!value) {
    return value;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return `${value}:00`;
  }
  return value;
};

const numberFormatter = new Intl.NumberFormat("ro-RO");

const dateTimeFormatter = new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const safeFormatDateTime = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return dateTimeFormatter.format(date);
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

const buildServicedAtRaw = (report: ServiceReport): string => {
  if (typeof report.serviced_at === "string" && report.serviced_at.trim().length > 0) {
    return report.serviced_at.trim();
  }
  if (typeof report.service_date === "string" && report.service_date.trim().length > 0) {
    const datePart = report.service_date.trim();
    const timePart =
      typeof report.service_time === "string" && report.service_time.trim().length > 0
        ? report.service_time.trim()
        : "00:00:00";
    return `${datePart}T${timePart}`;
  }
  return "";
};

const normalizeServiceReport = (
  report: ServiceReport,
): NormalizedServiceReport | null => {
  const id = toNumericId(report.id);
  if (id == null) {
    return null;
  }
  const mechanicName =
    typeof report.mechanic_name === "string" ? report.mechanic_name.trim() : "";
  const rawDateTime = buildServicedAtRaw(report);
  const { raw, date } = normalizeDateValue(rawDateTime);
  const servicedAtInput = raw ? toLocalDateTimeInput(raw) : "";
  const { name: carName, plate: carPlate } = pickCarName(report.car);
  const carId = toNumericId(report.car_id);
  const odometer = toNumericId(report.odometer_km);
  const oilType =
    typeof report.oil_type === "string" ? report.oil_type.trim() : "";
  const workPerformed =
    typeof report.work_performed === "string" ? report.work_performed.trim() : "";
  const observations =
    typeof report.observations === "string" ? report.observations.trim() : "";

  return {
    id,
    mechanicName,
    servicedAtInput,
    servicedAtDate: date,
    servicedAtRaw: raw,
    carId,
    carName,
    carPlate,
    odometerKm: odometer,
    oilType,
    workPerformed,
    observations,
    createdAt:
      typeof report.created_at === "string" ? report.created_at : null,
    updatedAt:
      typeof report.updated_at === "string" ? report.updated_at : null,
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

const ServiceReportsPage = () => {
  const [reports, setReports] = useState<NormalizedServiceReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<ServiceReportFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [carOptions, setCarOptions] = useState<CarOption[]>([]);
  const [formSelectedCar, setFormSelectedCar] = useState<CarOption | null>(null);
  const [formCarSearch, setFormCarSearch] = useState("");
  const [mechanicSearch, setMechanicSearch] = useState("");
  const [mechanicFilter, setMechanicFilter] = useState("");
  const [filterCar, setFilterCar] = useState<CarOption | null>(null);
  const [filterCarSearch, setFilterCarSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filterCarId = filterCar ? filterCar.id.toString() : "";

  const loadServiceReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: ServiceReportListParams = {
        include: "car",
        perPage: 100,
      };
      if (mechanicFilter.trim().length > 0) {
        params.mechanic_name = mechanicFilter.trim();
      }
      if (filterCarId) {
        params.car_id = filterCarId;
      }
      const response = await apiClient.getServiceReports(params);
      const rawList = extractList<ServiceReport>(response);
      const normalized = rawList
        .map((item) => normalizeServiceReport(item))
        .filter((item): item is NormalizedServiceReport => item !== null)
        .sort((a, b) => {
          const timeA = a.servicedAtDate ? a.servicedAtDate.getTime() : 0;
          const timeB = b.servicedAtDate ? b.servicedAtDate.getTime() : 0;
          return timeB - timeA;
        });
      setReports(normalized);
    } catch (error) {
      console.error("Nu am putut încărca fișele de service", error);
    } finally {
      setIsLoading(false);
    }
  }, [mechanicFilter, filterCarId]);

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
    loadServiceReports();
  }, [loadServiceReports]);

  useEffect(() => {
    loadCars();
  }, [loadCars]);

  const filteredFormCars = useMemo(() => {
    const query = formCarSearch.trim().toLowerCase();
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
  }, [carOptions, formCarSearch]);

  const filteredFilterCars = useMemo(() => {
    const query = filterCarSearch.trim().toLowerCase();
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
  }, [carOptions, filterCarSearch]);

  const openAddModal = () => {
    setFormState(defaultFormState);
    setFormError(null);
    setFormSelectedCar(null);
    setFormCarSearch("");
    setIsModalOpen(true);
  };

  const openEditModal = (report: NormalizedServiceReport) => {
    setFormState({
      id: report.id,
      mechanicName: report.mechanicName,
      servicedAt: report.servicedAtInput,
      carId: report.carId ? report.carId.toString() : "",
      odometerKm: report.odometerKm != null ? report.odometerKm.toString() : "",
      oilType: report.oilType,
      workPerformed: report.workPerformed,
      observations: report.observations,
    });
    setFormError(null);
    setFormCarSearch("");
    if (report.carId != null) {
      const existing = carOptions.find((option) => option.id === report.carId);
      setFormSelectedCar(
        existing ?? {
          id: report.carId,
          name:
            report.carName && report.carName.length > 0
              ? report.carName
              : `Mașină #${report.carId}`,
          licensePlate: report.carPlate,
        },
      );
    } else {
      setFormSelectedCar(null);
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
    setFormSelectedCar(null);
    setFormCarSearch("");
  };

  const handleInputChange = (
    field: keyof ServiceReportFormState,
  ) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleCarSelect = (car: CarOption) => {
    setFormSelectedCar(car);
    setFormState((prev) => ({ ...prev, carId: car.id.toString() }));
  };

  const clearFormSelectedCar = () => {
    setFormSelectedCar(null);
    setFormState((prev) => ({ ...prev, carId: "" }));
  };

  const handleFilterCarSelect = (car: CarOption) => {
    setFilterCar(car);
    setFilterCarSearch("");
  };

  const clearFilterCar = () => {
    setFilterCar(null);
    setFilterCarSearch("");
  };

  const applyMechanicFilter = () => {
    setMechanicFilter(mechanicSearch.trim());
  };

  const resetFilters = () => {
    setMechanicSearch("");
    setMechanicFilter("");
    clearFilterCar();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const mechanicName = formState.mechanicName.trim();
    const servicedAt = formState.servicedAt.trim();
    const odometer = formState.odometerKm.trim();
    const oilType = formState.oilType.trim();
    const workPerformed = formState.workPerformed.trim();
    const observations = formState.observations.trim();

    if (!mechanicName) {
      setFormError("Introdu numele mecanicului.");
      return;
    }

    if (!servicedAt) {
      setFormError("Selectează data și ora intervenției.");
      return;
    }

    let odometerValue: number | null = null;
    if (odometer) {
      const parsed = Number(odometer);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setFormError("Introdu un kilometraj valid.");
        return;
      }
      odometerValue = Math.round(parsed);
    }

    setIsSaving(true);
    setFormError(null);

    const payload = {
      mechanic_name: mechanicName,
      serviced_at: fromLocalDateTime(servicedAt),
      car_id: formState.carId ? Number(formState.carId) : null,
      odometer_km: odometerValue,
      oil_type: oilType.length > 0 ? oilType : null,
      work_performed: workPerformed.length > 0 ? workPerformed : null,
      observations: observations.length > 0 ? observations : null,
    } as const;

    try {
      if (formState.id) {
        await apiClient.updateServiceReport(formState.id, payload);
      } else {
        await apiClient.createServiceReport(payload);
      }
      closeModal();
      await loadServiceReports();
    } catch (error) {
      console.error("Nu am putut salva fișa de service", error);
      setFormError("Nu am putut salva fișa de service. Încearcă din nou.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (reportId: number) => {
    if (deletingId) {
      return;
    }
    const confirmed = window.confirm(
      "Ești sigur că vrei să ștergi această fișă de service?",
    );
    if (!confirmed) {
      return;
    }
    setDeletingId(reportId);
    try {
      await apiClient.deleteServiceReport(reportId);
      await loadServiceReports();
    } catch (error) {
      console.error("Nu am putut șterge fișa de service", error);
    } finally {
      setDeletingId(null);
    }
  };

  const columns: Column<NormalizedServiceReport>[] = [
    {
      id: "date",
      header: "Data și ora",
      accessor: (row) => row.servicedAtDate ?? row.servicedAtRaw,
      sortable: true,
      cell: (row) =>
        row.servicedAtDate
          ? dateTimeFormatter.format(row.servicedAtDate)
          : row.servicedAtRaw || "-",
    },
    {
      id: "mechanic",
      header: "Mecanic",
      accessor: (row) => row.mechanicName,
      sortable: true,
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
      id: "odometer",
      header: "Kilometraj",
      accessor: (row) => row.odometerKm ?? 0,
      sortable: true,
      cell: (row) =>
        row.odometerKm != null ? numberFormatter.format(row.odometerKm) : "-",
    },
    {
      id: "oil",
      header: "Ulei",
      accessor: (row) => row.oilType ?? "",
      sortable: true,
      cell: (row) => row.oilType || "-",
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

  const renderRowDetails = (row: NormalizedServiceReport) => (
    <div className="space-y-3 text-sm text-gray-700">
      <div className="grid gap-1 text-xs text-gray-500 md:grid-cols-2">
        {row.createdAt && (
          <span>Creată: {safeFormatDateTime(row.createdAt) ?? row.createdAt}</span>
        )}
        {row.updatedAt && row.updatedAt !== row.createdAt && (
          <span>
            Actualizată: {safeFormatDateTime(row.updatedAt) ?? row.updatedAt}
          </span>
        )}
      </div>
      {row.workPerformed && (
        <div>
          <p className="font-medium text-gray-900">Intervenții efectuate</p>
          <p className="mt-1 whitespace-pre-line">{row.workPerformed}</p>
        </div>
      )}
      {row.observations && (
        <div>
          <p className="font-medium text-gray-900">Observații</p>
          <p className="mt-1 whitespace-pre-line">{row.observations}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Fișe service mașini</h1>
          <p className="text-sm text-gray-600">
            Centralizează reviziile și intervențiile efectuate pe fiecare vehicul.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadServiceReports} variant="secondary" disabled={isLoading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Reîncarcă
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" /> Adaugă raport
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-1">
          <Label htmlFor="mechanic-filter">Filtru mecanic</Label>
          <Input
            id="mechanic-filter"
            value={mechanicSearch}
            onChange={(event) => setMechanicSearch(event.target.value)}
            placeholder="Ex: Mihai Ionescu"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="car-filter">Filtru mașină</Label>
          <SearchSelect<CarOption>
            id="car-filter"
            value={filterCar}
            search={filterCarSearch}
            items={filteredFilterCars}
            onSearch={setFilterCarSearch}
            onSelect={handleFilterCarSelect}
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
          {filterCar && (
            <button
              type="button"
              onClick={clearFilterCar}
              className="mt-1 text-xs text-jade underline"
            >
              Elimină filtrul după mașină
            </button>
          )}
        </div>
        <div className="flex items-end gap-2">
          <Button variant="secondary" onClick={applyMechanicFilter}>
            Aplică filtre
          </Button>
          <Button variant="outline" onClick={resetFilters}>
            Resetează
          </Button>
        </div>
      </div>

      <DataTable
        data={reports}
        columns={columns}
        renderRowDetails={renderRowDetails}
      />

      <Popup open={isModalOpen} onClose={closeModal} className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold">
            {formState.id ? "Editează raportul" : "Adaugă raport de service"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="service-mechanic">Mecanic</Label>
              <Input
                id="service-mechanic"
                value={formState.mechanicName}
                onChange={handleInputChange("mechanicName")}
                placeholder="Ex: Mihai Ionescu"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="service-datetime">Data și ora intervenției</Label>
              <Input
                id="service-datetime"
                type="datetime-local"
                value={formState.servicedAt}
                onChange={handleInputChange("servicedAt")}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="service-car">Mașină</Label>
              <SearchSelect<CarOption>
                id="service-car"
                value={formSelectedCar}
                search={formCarSearch}
                items={filteredFormCars}
                onSearch={setFormCarSearch}
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
              {formSelectedCar && (
                <button
                  type="button"
                  onClick={clearFormSelectedCar}
                  className="mt-1 text-xs text-jade underline"
                >
                  Elimină selecția
                </button>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="service-odometer">Kilometraj</Label>
              <Input
                id="service-odometer"
                value={formState.odometerKm}
                onChange={handleInputChange("odometerKm")}
                placeholder="Ex: 145200"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="service-oil">Tip ulei</Label>
              <Input
                id="service-oil"
                value={formState.oilType}
                onChange={handleInputChange("oilType")}
                placeholder="Ex: 5W30"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="service-work">Intervenții efectuate</Label>
            <textarea
              id="service-work"
              value={formState.workPerformed}
              onChange={handleInputChange("workPerformed")}
              placeholder="Detaliază piesele schimbate, lichidele, etc."
              rows={4}
              className={textareaClass}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="service-observations">Observații</Label>
            <textarea
              id="service-observations"
              value={formState.observations}
              onChange={handleInputChange("observations")}
              placeholder="Recomandări viitoare, probleme identificate"
              rows={4}
              className={textareaClass}
            />
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

export default ServiceReportsPage;

