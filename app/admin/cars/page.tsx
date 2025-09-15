"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Search,
  Plus,
  Edit,
  Trash2,
  Car,
  Settings,
  Users,
  Fuel,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popup } from "@/components/ui/popup";
import apiClient from "@/lib/api";
import { AdminCar } from "@/types/admin";

const STORAGE_BASE =
  process.env.NEXT_PUBLIC_STORAGE_URL ?? "https://backend.dacars.ro/storage";
const PER_PAGE = 12;

const toImageUrl = (path?: string | null): string => {
  if (!path) return "/images/placeholder-car.svg";
  if (/^https?:\/\//i.test(path)) return path;
  const base = STORAGE_BASE.replace(/\/$/, "");
  const cleaned = String(path).replace(/^\//, "");
  return `${base}/${cleaned}`;
};

const getFirstImage = (images: unknown): string | null => {
  if (!images) return null;
  if (typeof images === "string") return images;
  if (Array.isArray(images)) {
    const first = images.find((item) => typeof item === "string" && item);
    return typeof first === "string" ? first : null;
  }
  if (typeof images === "object") {
    const values = Object.values(images as Record<string, unknown>);
    const first = values.find((item) => typeof item === "string" && item);
    return typeof first === "string" ? first : null;
  }
  return null;
};

const parsePrice = (raw: unknown): number => {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^0-9.,-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "");
    const normalized = cleaned.replace(/,/g, ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  try {
    return parsePrice(String(raw));
  } catch {
    return 0;
  }
};

const toNumber = (value: unknown): number | undefined => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const toInteger = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  if (typeof value === "string" && value.trim().length === 0) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : undefined;
};

const toDecimalFromString = (value: string): number | undefined => {
  if (!value || value.trim().length === 0) return undefined;
  if (!/[0-9]/.test(value)) return undefined;
  return parsePrice(value);
};

const collectSpecs = (raw: unknown): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (item != null ? String(item).trim() : ""))
      .filter((item) => item.length > 0);
  }
  if (typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>)
      .map((item) => (item != null ? String(item).trim() : ""))
      .filter((item) => item.length > 0);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
};

const normalizeStatus = (status: unknown): AdminCar["status"] => {
  if (typeof status !== "string") return "available";
  const value = status.toLowerCase();
  if (value === "maintenance" || value === "in_service") return "maintenance";
  if (value === "out_of_service" || value === "unavailable")
    return "out_of_service";
  return "available";
};

const extractCarsList = (response: any): any[] => {
  if (!response) return [];
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

const extractTotal = (response: any): number | undefined => {
  const meta = response?.meta ?? response?.pagination ?? {};
  const total =
    meta?.total ??
    meta?.count ??
    response?.total ??
    response?.count ??
    response?.data?.length;
  return typeof total === "number" ? total : undefined;
};

const extractLastPage = (response: any, fallback: number): number => {
  const meta = response?.meta ?? response?.pagination ?? {};
  const lastPage =
    meta?.last_page ??
    meta?.lastPage ??
    response?.last_page ??
    response?.lastPage ??
    fallback;
  return typeof lastPage === "number" && Number.isFinite(lastPage)
    ? lastPage
    : fallback;
};

const mapApiCarToAdminCar = (raw: any): AdminCar => {
  const typeInfo = raw?.type ?? raw?.vehicle_type ?? raw?.car_type ?? null;
  const typeName =
    typeof typeInfo === "string"
      ? typeInfo
      : typeInfo?.name ?? raw?.type_name ?? raw?.vehicle_type_name ?? "";
  const typeId =
    typeof typeInfo === "object" && typeInfo
      ? toInteger((typeInfo as any).id) ?? null
      : toInteger(raw?.type_id ?? raw?.vehicle_type_id) ?? null;

  const transmissionInfo = raw?.transmission ?? null;
  const transmissionName =
    typeof transmissionInfo === "string"
      ? transmissionInfo
      : transmissionInfo?.name ?? raw?.transmission_name ?? "";
  const transmissionId =
    typeof transmissionInfo === "object" && transmissionInfo
      ? toInteger((transmissionInfo as any).id) ?? null
      : toInteger(raw?.transmission_id) ?? null;

  const fuelInfo = raw?.fuel ?? null;
  const fuelName =
    typeof fuelInfo === "string"
      ? fuelInfo
      : fuelInfo?.name ?? raw?.fuel_name ?? "";
  const fuelId =
    typeof fuelInfo === "object" && fuelInfo
      ? toInteger((fuelInfo as any).id) ?? null
      : toInteger(raw?.fuel_id) ?? null;

  const passengers =
    toInteger(raw?.number_of_seats ?? raw?.passengers ?? raw?.seats) ?? 0;
  const doors = toInteger(raw?.doors) ?? 4;
  const luggage = toInteger(raw?.luggage ?? raw?.boot_space) ?? 2;

  const descriptionSource =
    typeof raw?.content === "string" && raw.content.trim().length > 0
      ? raw.content
      : typeof raw?.description === "string"
      ? raw.description
      : "";

  const mileage =
    toInteger(raw?.mileage ?? raw?.kilometers ?? raw?.odometer ?? raw?.km) ??
    undefined;

  const lastService =
    raw?.last_service_date ?? raw?.last_service ?? raw?.service?.last_date;
  const nextService =
    raw?.next_service_date ?? raw?.next_service ?? raw?.service?.next_date;

  return {
    id: Number(raw?.id) || raw?.id,
    name: raw?.name ?? "",
    type: typeName ? typeName : "Nespecificat",
    typeId,
    image: toImageUrl(
      raw?.image_preview ??
        raw?.image ??
        raw?.thumbnail ??
        getFirstImage(raw?.images),
    ),
    price:
      parsePrice(raw?.rental_rate ?? raw?.price ?? raw?.daily_rate ?? raw?.rate),
    features: {
      passengers,
      transmission: transmissionName || "—",
      transmissionId,
      fuel: fuelName || "—",
      fuelId,
      doors,
      luggage,
    },
    status: normalizeStatus(raw?.status ?? raw?.availability ?? raw?.state),
    rating: toNumber(raw?.avg_review),
    description: descriptionSource,
    specs: collectSpecs(raw?.specs ?? raw?.options ?? raw?.features),
    licensePlate: raw?.license_plate ?? raw?.licensePlate ?? raw?.plate ?? "",
    year: toInteger(raw?.year ?? raw?.manufactured_year ?? raw?.production_year),
    mileage,
    lastService: typeof lastService === "string" ? lastService : undefined,
    nextService: typeof nextService === "string" ? nextService : undefined,
  };
};

type CarFormState = {
  id: number | null;
  name: string;
  license_plate: string;
  status: AdminCar["status"];
  type_id: number | null;
  type_name: string;
  rental_rate: string;
  year: string;
  mileage: string;
  passengers: string;
  transmission: string;
  fuel: string;
  doors: string;
  luggage: string;
  description: string;
  specs: string;
  last_service: string;
  next_service: string;
};

const EMPTY_FORM: CarFormState = {
  id: null,
  name: "",
  license_plate: "",
  status: "available",
  type_id: null,
  type_name: "",
  rental_rate: "",
  year: "",
  mileage: "",
  passengers: "",
  transmission: "",
  fuel: "",
  doors: "",
  luggage: "",
  description: "",
  specs: "",
  last_service: "",
  next_service: "",
};

const mapAdminCarToFormState = (car: AdminCar): CarFormState => ({
  id: car.id,
  name: car.name ?? "",
  license_plate: car.licensePlate ?? "",
  status: car.status,
  type_id: car.typeId ?? null,
  type_name: car.type ?? "",
  rental_rate: car.price ? String(car.price) : "",
  year: car.year ? String(car.year) : "",
  mileage: car.mileage ? String(car.mileage) : "",
  passengers: car.features?.passengers
    ? String(car.features.passengers)
    : "",
  transmission: car.features?.transmission ?? "",
  fuel: car.features?.fuel ?? "",
  doors: car.features?.doors ? String(car.features.doors) : "",
  luggage: car.features?.luggage ? String(car.features.luggage) : "",
  description: car.description ?? "",
  specs: Array.isArray(car.specs) ? car.specs.join(", ") : "",
  last_service: car.lastService ? car.lastService.slice(0, 10) : "",
  next_service: car.nextService ? car.nextService.slice(0, 10) : "",
});

const buildCarPayload = (form: CarFormState) => {
  const payload: Record<string, any> = {
    name: form.name.trim(),
    license_plate: form.license_plate.trim(),
    status: form.status,
  };

  if (form.type_id) {
    payload.type_id = form.type_id;
  } else if (form.type_name.trim().length > 0) {
    payload.type_name = form.type_name.trim();
  }

  const rentalRate = toDecimalFromString(form.rental_rate);
  if (rentalRate !== undefined) {
    payload.rental_rate = rentalRate;
  }

  const year = toInteger(form.year);
  if (year !== undefined) {
    payload.year = year;
  }

  const mileage = toInteger(form.mileage);
  if (mileage !== undefined) {
    payload.mileage = mileage;
  }

  const passengers = toInteger(form.passengers);
  if (passengers !== undefined) {
    payload.number_of_seats = passengers;
  }

  const doors = toInteger(form.doors);
  if (doors !== undefined) {
    payload.doors = doors;
  }

  const luggage = toInteger(form.luggage);
  if (luggage !== undefined) {
    payload.luggage = luggage;
  }

  if (form.transmission.trim().length > 0) {
    payload.transmission_name = form.transmission.trim();
  }

  if (form.fuel.trim().length > 0) {
    payload.fuel_name = form.fuel.trim();
  }

  if (form.description.trim().length > 0) {
    payload.description = form.description.trim();
  }

  if (form.specs.trim().length > 0) {
    payload.specs = form.specs
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (form.last_service) {
    payload.last_service_date = form.last_service;
  }

  if (form.next_service) {
    payload.next_service_date = form.next_service;
  }

  return payload;
};

const CarsPage = () => {
  const [cars, setCars] = useState<AdminCar[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [totalCars, setTotalCars] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    total: 0,
    available: 0,
    maintenance: 0,
    outOfService: 0,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [carForm, setCarForm] = useState<CarFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const fetchMetrics = useCallback(async () => {
    try {
      const [totalRes, availableRes, maintenanceRes, outServiceRes] =
        await Promise.all([
          apiClient.fetchAdminCarsTotal(),
          apiClient.fetchAdminCarsTotal({ status: "available" }),
          apiClient.fetchAdminCarsTotal({ status: "maintenance" }),
          apiClient.fetchAdminCarsTotal({ status: "out_of_service" }),
        ]);
      const toCount = (data: any) =>
        Number(
          data?.count ??
            data?.total ??
            data?.data ??
            data?.value ??
            data?.cars ??
            0,
        ) || 0;
      setMetrics({
        total: toCount(totalRes),
        available: toCount(availableRes),
        maintenance: toCount(maintenanceRes),
        outOfService: toCount(outServiceRes),
      });
    } catch (err) {
      console.error("Error loading car metrics:", err);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const fetchCars = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setError(null);

      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingInitial(true);
      }

      try {
        const params: Record<string, any> = {
          page: pageToLoad,
          perPage: PER_PAGE,
        };

        if (searchTerm.length > 0) {
          params.search = searchTerm;
        }

        if (statusFilter !== "all") {
          params.status = statusFilter;
        }

        if (typeFilter !== "all") {
          if (typeFilter.startsWith("id:")) {
            const idValue = Number(typeFilter.slice(3));
            if (!Number.isNaN(idValue)) {
              params.type_id = idValue;
            }
          } else if (typeFilter.startsWith("name:")) {
            params.type = typeFilter.slice(5);
          } else {
            params.type = typeFilter;
          }
        }

        if (sortBy && sortBy !== "none") {
          params.sort_by = sortBy;
        }

        const response = await apiClient.getCars(params);
        const list = extractCarsList(response).map(mapApiCarToAdminCar);

        setCars((prev) => (append ? [...prev, ...list] : list));

        const total = extractTotal(response);
        setTotalCars((prev) => {
          if (typeof total === "number" && total >= 0) {
            return total;
          }
          return append ? prev + list.length : list.length;
        });

        const lastPage = extractLastPage(response, pageToLoad);
        let more = pageToLoad < lastPage;
        if (!Number.isFinite(lastPage) || lastPage <= pageToLoad) {
          more = list.length === PER_PAGE;
        }
        if (list.length === 0) {
          more = false;
        }
        setHasMore(more);
        setCurrentPage(pageToLoad);
      } catch (err) {
        console.error("Error loading cars:", err);
        setError(
          err instanceof Error
            ? err.message
            : "A apărut o eroare la încărcarea mașinilor.",
        );
        if (!append) {
          setCars([]);
          setTotalCars(0);
        }
        setHasMore(false);
      } finally {
        loadingRef.current = false;
        if (append) {
          setLoadingMore(false);
        } else {
          setLoadingInitial(false);
        }
      }
    },
    [searchTerm, statusFilter, typeFilter, sortBy],
  );

  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchCars(1, false);
  }, [fetchCars]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loadingRef.current) {
          fetchCars(currentPage + 1, true);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchCars, hasMore, currentPage]);

  const handleOpenCreate = () => {
    setCarForm(EMPTY_FORM);
    setModalMode("create");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (car: AdminCar) => {
    setCarForm(mapAdminCarToFormState(car));
    setModalMode("edit");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (saving) return;
    setIsModalOpen(false);
  };

  const handleFormChange = (
    field: keyof CarFormState,
  ): ((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void) => {
    return (event) => {
      const value = event.target.value;
      setCarForm((prev) => {
        if (field === "type_name") {
          return { ...prev, type_name: value, type_id: null };
        }
        return { ...prev, [field]: value };
      });
    };
  };

  const handleStatusChange = (value: string) => {
    setCarForm((prev) => ({
      ...prev,
      status: (value as AdminCar["status"]) ?? prev.status,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);

    try {
      const payload = buildCarPayload(carForm);
      const response =
        modalMode === "edit" && carForm.id
          ? await apiClient.updateCar(carForm.id, payload)
          : await apiClient.createCar(payload);

      const dataCandidate =
        response?.data ?? response?.car ?? response?.item ?? response;
      const normalizedSource = Array.isArray(dataCandidate)
        ? dataCandidate[0]
        : dataCandidate;

      if (!normalizedSource || typeof normalizedSource !== "object") {
        throw new Error("Răspunsul serverului nu a putut fi interpretat.");
      }

      const normalizedCar = mapApiCarToAdminCar(normalizedSource);
      setCars((prev) => {
        if (modalMode === "edit") {
          return prev.map((car) =>
            car.id === normalizedCar.id ? normalizedCar : car,
          );
        }
        return [normalizedCar, ...prev];
      });

      setIsModalOpen(false);
      await fetchMetrics();
      setHasMore(true);
      setCurrentPage(1);
      await fetchCars(1, false);
    } catch (err) {
      console.error("Error saving car:", err);
      setFormError(
        err instanceof Error
          ? err.message
          : "A apărut o eroare la salvarea mașinii.",
      );
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = useMemo(() => {
    const entries = new Map<string, { value: string; label: string }>();
    cars.forEach((car) => {
      if (!car.type || car.type === "Nespecificat") return;
      if (car.typeId != null) {
        const key = `id:${car.typeId}`;
        if (!entries.has(key)) {
          entries.set(key, { value: key, label: car.type });
        }
      } else {
        const key = `name:${car.type}`;
        if (!entries.has(key)) {
          entries.set(key, { value: key, label: car.type });
        }
      }
    });
    return Array.from(entries.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "ro", { sensitivity: "base" }),
    );
  }, [cars]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "out_of_service":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Disponibilă";
      case "maintenance":
        return "În service";
      case "out_of_service":
        return "Indisponibilă";
      default:
        return status;
    }
  };

  const isServiceDue = (nextServiceDate?: string) => {
    if (!nextServiceDate) return false;
    const nextService = new Date(nextServiceDate);
    const today = new Date();
    const diff =
      (nextService.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  };

  const resultsCount = totalCars || cars.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Înapoi la dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-poppins font-semibold text-berkeley">
                Gestionare Flota Auto
              </h1>
            </div>

            <Button
              onClick={handleOpenCreate}
              className="flex items-center space-x-2 px-4 py-2"
              aria-label="Adaugă Mașină"
            >
              <Plus className="h-4 w-4" />
              <span className="font-dm-sans font-semibold">Adaugă Mașină</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-dm-sans text-gray-600">
                  Total Mașini
                </p>
                <p className="text-2xl font-poppins font-bold text-berkeley">
                  {metrics.total}
                </p>
              </div>
              <Car className="h-8 w-8 text-jade" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-dm-sans text-gray-600">
                  Disponibile
                </p>
                <p className="text-2xl font-poppins font-bold text-green-600">
                  {metrics.available}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-dm-sans text-gray-600">În Service</p>
                <p className="text-2xl font-poppins font-bold text-yellow-600">
                  {metrics.maintenance}
                </p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-dm-sans text-gray-600">
                  Indisponibile
                </p>
                <p className="text-2xl font-poppins font-bold text-red-600">
                  {metrics.outOfService}
                </p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Caută mașini..."
                aria-label="Caută mașini"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>

            <div>
              <Label htmlFor="car-status-filter" className="text-sm font-dm-sans font-semibold text-gray-700">
                Status
              </Label>
              <Select
                id="car-status-filter"
                className="mt-2"
                value={statusFilter}
                onValueChange={setStatusFilter}
                aria-label="Filtrează după status"
              >
                <option value="all">Toate statusurile</option>
                <option value="available">Disponibile</option>
                <option value="maintenance">În Service</option>
                <option value="out_of_service">Indisponibile</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="car-type-filter" className="text-sm font-dm-sans font-semibold text-gray-700">
                Tip vehicul
              </Label>
              <Select
                id="car-type-filter"
                className="mt-2"
                value={typeFilter}
                onValueChange={setTypeFilter}
                aria-label="Filtrează după tip"
              >
                <option value="all">Toate tipurile</option>
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="car-sort" className="text-sm font-dm-sans font-semibold text-gray-700">
                Sortare
              </Label>
              <Select
                id="car-sort"
                className="mt-2"
                value={sortBy}
                onValueChange={setSortBy}
                aria-label="Sortează mașinile"
              >
                <option value="recent">Cele mai noi</option>
                <option value="oldest">Cele mai vechi</option>
                <option value="name_asc">Nume A-Z</option>
                <option value="name_desc">Nume Z-A</option>
              </Select>
              <p className="mt-2 text-sm text-gray-600 font-dm-sans text-right md:text-left">
                {resultsCount} mașini găsite
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 font-dm-sans">
            {error}
          </div>
        )}

        {loadingInitial ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 text-jade animate-spin" />
          </div>
        ) : cars.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cars.map((car) => (
                <div
                  key={car.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="relative w-full h-48">
                    <Image
                      src={car.image || "/images/placeholder-car.svg"}
                      alt={car.name || "Mașină"}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-jade text-white px-3 py-1 rounded-full text-sm font-dm-sans font-semibold">
                      {car.type}
                    </div>
                    <div
                      className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-dm-sans font-semibold ${getStatusColor(car.status)}`}
                    >
                      {getStatusText(car.status)}
                    </div>
                    {isServiceDue(car.nextService) && (
                      <div className="absolute bottom-4 left-4 bg-red-500 text-white px-2 py-1 rounded-lg flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-xs font-dm-sans">Service</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-poppins font-semibold text-berkeley">
                        {car.licensePlate || "—"}
                      </h3>
                      {car.year && (
                        <span className="text-sm font-dm-sans text-gray-500">
                          Anul {car.year}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 font-dm-sans">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-jade" />
                          <span>{car.features?.passengers ?? 0} persoane</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Settings className="h-4 w-4 text-jade" />
                          <span>{car.features?.transmission}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 font-dm-sans">
                        <div className="flex items-center space-x-2">
                          <Fuel className="h-4 w-4 text-jade" />
                          <span>{car.features?.fuel}</span>
                        </div>
                        <span className="font-semibold text-berkeley">{car.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(car)}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-jade text-jade font-dm-sans font-semibold rounded-lg hover:bg-jade hover:text-white transition-colors"
                        aria-label="Editează mașina"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Editează</span>
                      </button>
                      <button
                        type="button"
                        className="ml-3 p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Șterge"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div ref={loadMoreRef} className="h-10"></div>

            {loadingMore && (
              <div className="flex justify-center items-center gap-2 py-6 text-gray-500 font-dm-sans">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Se încarcă mașini...</span>
              </div>
            )}

            {!hasMore && !loadingMore && cars.length > 0 && (
              <p className="text-center text-sm text-gray-500 font-dm-sans mt-6">
                Ai ajuns la sfârșitul listei.
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-poppins font-semibold text-gray-600 mb-2">
              Nu există mașini
            </h3>
            <p className="text-gray-500 font-dm-sans">
              Nu am găsit mașini care să corespundă criteriilor de căutare.
            </p>
          </div>
        )}
      </div>

      <Popup
        open={isModalOpen}
        onClose={handleCloseModal}
        className="max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-poppins font-bold text-berkeley">
            {modalMode === "create" ? "Adaugă mașină" : "Editează mașina"}
          </h3>
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Închide formularul"
            disabled={saving}
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 font-dm-sans">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="car-name" className="text-sm font-dm-sans font-semibold text-gray-700">
                Nume mașină
              </Label>
              <Input
                id="car-name"
                value={carForm.name}
                onChange={handleFormChange("name")}
                required
                placeholder="Ex: Dacia Logan"
              />
            </div>

            <div>
              <Label htmlFor="car-license" className="text-sm font-dm-sans font-semibold text-gray-700">
                Număr înmatriculare
              </Label>
              <Input
                id="car-license"
                value={carForm.license_plate}
                onChange={handleFormChange("license_plate")}
                required
                placeholder="B 123 ABC"
              />
            </div>

            <div>
              <Label htmlFor="car-status" className="text-sm font-dm-sans font-semibold text-gray-700">
                Status
              </Label>
              <Select
                id="car-status"
                className="mt-2"
                value={carForm.status}
                onValueChange={handleStatusChange}
              >
                <option value="available">Disponibilă</option>
                <option value="maintenance">În service</option>
                <option value="out_of_service">Indisponibilă</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="car-type" className="text-sm font-dm-sans font-semibold text-gray-700">
                Tip vehicul
              </Label>
              <Input
                id="car-type"
                value={carForm.type_name}
                onChange={handleFormChange("type_name")}
                placeholder="Ex: Economic"
              />
            </div>

            <div>
              <Label htmlFor="car-year" className="text-sm font-dm-sans font-semibold text-gray-700">
                An fabricație
              </Label>
              <Input
                id="car-year"
                type="number"
                min="1900"
                max="2100"
                value={carForm.year}
                onChange={handleFormChange("year")}
                placeholder="2024"
              />
            </div>

            <div>
              <Label htmlFor="car-mileage" className="text-sm font-dm-sans font-semibold text-gray-700">
                Kilometraj
              </Label>
              <Input
                id="car-mileage"
                type="number"
                min="0"
                value={carForm.mileage}
                onChange={handleFormChange("mileage")}
                placeholder="45000"
              />
            </div>

            <div>
              <Label htmlFor="car-passengers" className="text-sm font-dm-sans font-semibold text-gray-700">
                Număr persoane
              </Label>
              <Input
                id="car-passengers"
                type="number"
                min="1"
                value={carForm.passengers}
                onChange={handleFormChange("passengers")}
                placeholder="5"
              />
            </div>

            <div>
              <Label htmlFor="car-transmission" className="text-sm font-dm-sans font-semibold text-gray-700">
                Transmisie
              </Label>
              <Input
                id="car-transmission"
                value={carForm.transmission}
                onChange={handleFormChange("transmission")}
                placeholder="Manuală / Automată"
              />
            </div>

            <div>
              <Label htmlFor="car-fuel" className="text-sm font-dm-sans font-semibold text-gray-700">
                Combustibil
              </Label>
              <Input
                id="car-fuel"
                value={carForm.fuel}
                onChange={handleFormChange("fuel")}
                placeholder="Benzină / Diesel"
              />
            </div>

            <div>
              <Label htmlFor="car-doors" className="text-sm font-dm-sans font-semibold text-gray-700">
                Număr uși
              </Label>
              <Input
                id="car-doors"
                type="number"
                min="2"
                value={carForm.doors}
                onChange={handleFormChange("doors")}
                placeholder="4"
              />
            </div>

            <div>
              <Label htmlFor="car-luggage" className="text-sm font-dm-sans font-semibold text-gray-700">
                Spațiu bagaje
              </Label>
              <Input
                id="car-luggage"
                type="number"
                min="0"
                value={carForm.luggage}
                onChange={handleFormChange("luggage")}
                placeholder="2"
              />
            </div>

            <div>
              <Label htmlFor="car-price" className="text-sm font-dm-sans font-semibold text-gray-700">
                Preț/zi (€)
              </Label>
              <Input
                id="car-price"
                type="number"
                min="0"
                step="0.01"
                value={carForm.rental_rate}
                onChange={handleFormChange("rental_rate")}
                placeholder="45"
              />
            </div>

            <div>
              <Label htmlFor="car-specs" className="text-sm font-dm-sans font-semibold text-gray-700">
                Dotări (separate prin virgulă)
              </Label>
              <Input
                id="car-specs"
                value={carForm.specs}
                onChange={handleFormChange("specs")}
                placeholder="Aer condiționat, Navigație"
              />
            </div>

            <div>
              <Label htmlFor="car-last-service" className="text-sm font-dm-sans font-semibold text-gray-700">
                Ultimul service
              </Label>
              <Input
                id="car-last-service"
                type="date"
                value={carForm.last_service}
                onChange={handleFormChange("last_service")}
              />
            </div>

            <div>
              <Label htmlFor="car-next-service" className="text-sm font-dm-sans font-semibold text-gray-700">
                Următor service
              </Label>
              <Input
                id="car-next-service"
                type="date"
                value={carForm.next_service}
                onChange={handleFormChange("next_service")}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="car-description" className="text-sm font-dm-sans font-semibold text-gray-700">
                Descriere
              </Label>
              <textarea
                id="car-description"
                value={carForm.description}
                onChange={handleFormChange("description")}
                className="w-full min-h-[120px] rounded-lg border border-gray-300 px-4 py-3 font-dm-sans text-gray-700 focus:ring-2 focus:ring-jade focus:border-transparent transition"
                placeholder="Detalii despre mașină"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-dm-sans hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Anulează"
              disabled={saving}
            >
              Anulează
            </button>
            <Button
              type="submit"
              disabled={saving}
              className="px-6 py-2 flex items-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
              aria-label={
                modalMode === "create"
                  ? "Adaugă mașina"
                  : "Salvează modificările"
              }
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {modalMode === "create"
                  ? "Adaugă mașina"
                  : "Salvează modificările"}
              </span>
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
};

export default CarsPage;
