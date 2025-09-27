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
import { SearchSelect } from "@/components/ui/search-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popup } from "@/components/ui/popup";
import CarImagesUploader, {
  type CarImageAsset,
} from "@/components/admin/car-images-uploader";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
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

const collectStringValues = (raw: unknown): string[] => {
  if (raw == null) return [];

  if (typeof raw === "string") {
    return raw
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (typeof raw === "number" || typeof raw === "boolean") {
    const value = String(raw).trim();
    return value.length > 0 ? [value] : [];
  }

  if (Array.isArray(raw)) {
    return raw
      .flatMap((item) => collectStringValues(item))
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (typeof raw === "object") {
    return collectStringValues(Object.values(raw as Record<string, unknown>));
  }

  return [];
};

const collectSpecs = (raw: unknown): string[] => collectStringValues(raw);

const normalizeImages = (raw: unknown): string[] =>
  collectStringValues(raw).filter((item) => /[./]/.test(item));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const generateImageId = (() => {
  let counter = 0;
  return (prefix: string) => {
    counter += 1;
    const uuid =
      typeof globalThis !== "undefined" &&
      globalThis.crypto &&
      typeof globalThis.crypto.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return `${prefix}-${uuid}-${counter}`;
  };
})();

const extractImageName = (value: string, fallbackIndex: number): string => {
  if (!value) {
    return `imagine-${fallbackIndex + 1}`;
  }

  try {
    const candidateUrl = new URL(value, "https://local.placeholder");
    const segments = candidateUrl.pathname.split(/[/\\\\]/).filter(Boolean);
    if (segments.length > 0) {
      return decodeURIComponent(segments[segments.length - 1]);
    }
  } catch {
    const segments = value.split(/[/\\\\]/).filter(Boolean);
    if (segments.length > 0) {
      return decodeURIComponent(segments[segments.length - 1]);
    }
  }

  return value;
};

const createExistingImageAsset = (
  value: string,
  index: number,
): CarImageAsset => ({
  id: generateImageId("existing"),
  name: extractImageName(value, index),
  previewUrl: toImageUrl(value),
  existingPath: value,
});

const createUploadedImageAsset = (file: File): CarImageAsset => {
  let preview = "";
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    preview = URL.createObjectURL(file);
  }

  return {
    id: generateImageId("upload"),
    name: file.name || "imagine",
    previewUrl: preview,
    file,
  };
};

const releaseImagePreview = (image: CarImageAsset) => {
  if (!image.file) return;
  if (!image.previewUrl) return;
  if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") {
    return;
  }
  if (image.previewUrl.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(image.previewUrl);
    } catch (error) {
      console.warn("Nu s-a putut elibera previzualizarea imaginii:", error);
    }
  }
};

const hasMeaningfulHtmlContent = (value: string): boolean => {
  const cleanedText = value
    .replace(/<(script|style)[^>]*>.*?<\/\1>/gis, "")
    .replace(/<br\s*\/?>(\s|&nbsp;|\u00a0)*/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanedText.length > 0) {
    return true;
  }

  return /<(img|video|audio|iframe|table|ul|ol|li|blockquote|pre|figure)\b/i.test(value);
};

const normalizeRichTextValue = (value: string): string => {
  if (!value) return "";
  const trimmed = value.trim();
  return hasMeaningfulHtmlContent(trimmed) ? trimmed : "";
};

const toDecimal = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    return toDecimalFromString(value);
  }
  return undefined;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "da", "yes", "y"].includes(normalized)) return true;
    if (["0", "false", "nu", "no", "n"].includes(normalized)) return false;
  }
  return undefined;
};

type LookupOption = { id: number; name: string };

const extractLookupOptions = (response: unknown): LookupOption[] => {
  const list = extractCarsList(response);
  const options: LookupOption[] = [];

  list.forEach((item) => {
    if (!isRecord(item)) return;

    const id = toInteger(item.id ?? (item as { value?: unknown }).value);
    const candidates = [item.name, item.title, item.label];
    const nameCandidate = candidates.find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    );

    if (id != null && nameCandidate) {
      options.push({ id, name: nameCandidate.trim() });
    }
  });

  return options.sort((a, b) =>
    a.name.localeCompare(b.name, "ro", { sensitivity: "base" }),
  );
};

type PartnerOption = {
  id: number;
  name: string;
  email?: string | null;
  username?: string | null;
};

const mapRawUserToPartnerOption = (raw: unknown): PartnerOption | null => {
  if (!isRecord(raw)) return null;

  const id = toInteger(raw.id ?? (raw as { user_id?: unknown }).user_id);
  if (id == null) return null;

  const firstName =
    typeof raw.first_name === "string" ? raw.first_name.trim() : "";
  const lastName =
    typeof raw.last_name === "string" ? raw.last_name.trim() : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const nameCandidate = [
    typeof raw.name === "string" ? raw.name : undefined,
    fullName.length > 0 ? fullName : undefined,
    typeof raw.username === "string" ? raw.username : undefined,
    typeof raw.email === "string" ? raw.email : undefined,
  ].find((value) => typeof value === "string" && value.trim().length > 0);

  const email = typeof raw.email === "string" ? raw.email.trim() : null;
  const username = typeof raw.username === "string" ? raw.username.trim() : null;

  return {
    id,
    name: nameCandidate ? nameCandidate.trim() : `Utilizator #${id}`,
    email,
    username,
  };
};

const extractPartnerOptions = (response: unknown): PartnerOption[] => {
  const list = extractCarsList(response);
  const options: PartnerOption[] = [];

  list.forEach((item) => {
    const option = mapRawUserToPartnerOption(item);
    if (option) {
      options.push(option);
    }
  });

  return options;
};

const normalizeStatus = (status: unknown): AdminCar["status"] => {
  if (typeof status !== "string") return "available";
  const value = status.toLowerCase();
  if (value === "maintenance" || value === "in_service") return "maintenance";
  if (value === "out_of_service" || value === "unavailable")
    return "out_of_service";
  return "available";
};

const extractCarsList = (response: unknown): unknown[] => {
  if (Array.isArray(response)) return response;
  if (!isRecord(response)) return [];

  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.results)) return response.results;

  return [];
};

const extractTotal = (response: unknown): number | undefined => {
  if (!isRecord(response)) return undefined;

  const metaSource =
    (isRecord(response.meta) ? response.meta : undefined) ??
    (isRecord(response.pagination) ? response.pagination : undefined);

  const candidates = [
    metaSource?.total,
    metaSource?.count,
    response.total,
    response.count,
    Array.isArray(response.data) ? response.data.length : undefined,
  ];

  const numericCandidate = candidates.find((value) => typeof value === "number");
  return typeof numericCandidate === "number" ? numericCandidate : undefined;
};

const extractLastPage = (response: unknown, fallback: number): number => {
  if (!isRecord(response)) return fallback;

  const metaSource =
    (isRecord(response.meta) ? response.meta : undefined) ??
    (isRecord(response.pagination) ? response.pagination : undefined);

  const candidates = [
    metaSource?.last_page,
    metaSource?.lastPage,
    response.last_page,
    response.lastPage,
  ];

  const numericCandidate = candidates.find(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  return numericCandidate ?? fallback;
};

const mapApiCarToAdminCar = (raw: unknown): AdminCar => {
  if (!isRecord(raw)) {
    throw new Error("Invalid car payload received from API.");
  }

  const makeSource = raw.make ?? raw.car_make ?? raw.brand ?? null;
  const makeRecord = isRecord(makeSource) ? makeSource : null;
  const makeName =
    toTrimmedString(makeSource) ??
    toTrimmedString(makeRecord?.name) ??
    toTrimmedString(raw.make_name) ??
    toTrimmedString(raw.brand_name) ??
    "";
  const makeId =
    (makeRecord ? toInteger(makeRecord.id) : undefined) ?? toInteger(raw.make_id);

  const typeSource = raw.type ?? raw.vehicle_type ?? raw.car_type ?? null;
  const typeRecord = isRecord(typeSource) ? typeSource : null;
  const typeName =
    toTrimmedString(typeSource) ??
    toTrimmedString(typeRecord?.name) ??
    toTrimmedString(raw.type_name) ??
    toTrimmedString(raw.vehicle_type_name) ??
    "";
  const typeId =
    (typeRecord ? toInteger(typeRecord.id) : undefined) ??
    toInteger(raw.type_id ?? (raw as { vehicle_type_id?: unknown }).vehicle_type_id) ??
    null;

  const transmissionSource = raw.transmission ?? raw.car_transmission ?? null;
  const transmissionRecord = isRecord(transmissionSource) ? transmissionSource : null;
  const transmissionName =
    toTrimmedString(transmissionSource) ??
    toTrimmedString(transmissionRecord?.name) ??
    toTrimmedString(raw.transmission_name) ??
    "";
  const transmissionId =
    (transmissionRecord ? toInteger(transmissionRecord.id) : undefined) ??
    toInteger(raw.transmission_id) ??
    null;

  const fuelSource = raw.fuel ?? raw.car_fuel ?? null;
  const fuelRecord = isRecord(fuelSource) ? fuelSource : null;
  const fuelName =
    toTrimmedString(fuelSource) ??
    toTrimmedString(fuelRecord?.name) ??
    toTrimmedString(raw.fuel_name) ??
    "";
  const fuelId =
    (fuelRecord ? toInteger(fuelRecord.id) : undefined) ?? toInteger(raw.fuel_id) ?? null;

  const seatsValue =
    toInteger(
      raw.number_of_seats ??
        raw.passengers ??
        raw.seats ??
        raw.capacity ??
        (raw as { capacity_passengers?: unknown }).capacity_passengers,
    ) ?? undefined;
  const passengers = seatsValue ?? 0;
  const doorsValue = toInteger(raw.number_of_doors ?? raw.doors) ?? undefined;
  const doors = doorsValue ?? 4;
  const luggage = toInteger(raw.luggage ?? raw.boot_space) ?? 2;

  const rawContent = typeof raw.content === "string" ? raw.content : "";
  const rawDescription = typeof raw.description === "string" ? raw.description : "";
  const descriptionSource =
    rawContent.trim().length > 0 ? rawContent : rawDescription;

  const mileage =
    toInteger(raw.mileage ?? raw.kilometers ?? raw.odometer ?? raw.km) ?? undefined;

  const serviceInfo = isRecord(raw.service) ? raw.service : null;
  const lastServiceCandidate =
    raw.last_service_date ?? raw.last_service ?? serviceInfo?.last_date;
  const nextServiceCandidate =
    raw.next_service_date ?? raw.next_service ?? serviceInfo?.next_date;

  const rawImages = raw.images ?? raw.gallery ?? raw.car_images ?? raw.media ?? undefined;
  const imageList = normalizeImages(rawImages);
  const primaryImageCandidate =
    raw.image_preview ??
    raw.image ??
    raw.thumbnail ??
    raw.cover_image ??
    raw.cover ??
    (imageList.length > 0 ? imageList[0] : getFirstImage(rawImages));
  const primaryImage = typeof primaryImageCandidate === "string" ? primaryImageCandidate : null;

  const depositValue = toDecimal(raw.deposit ?? raw.security_deposit);
  const weightValue = toDecimal(raw.weight);
  const weightFrontValue = toDecimal(raw.weight_front ?? raw.front_weight);
  const partnerIdValue = toInteger(raw.partner_id);
  const partnerPercentageValue = toDecimal(
    raw.partner_percentage ?? raw.partner_share ?? raw.partner_rate,
  );
  const isPartnerValue =
    toBoolean(raw.is_partner ?? raw.partner ?? raw.has_partner) ?? false;
  const vinValue =
    typeof raw.vin === "string"
      ? raw.vin
      : typeof (raw as { vehicle_identification_number?: unknown })
          .vehicle_identification_number === "string"
        ? (raw as { vehicle_identification_number: string })
            .vehicle_identification_number
        : "";

  const id =
    toInteger(raw.id ?? (raw as { car_id?: unknown }).car_id) ??
    (() => {
      throw new Error("Invalid car payload: missing identifier.");
    })();

  const name = toTrimmedString(raw.name) ?? "";

  return {
    id,
    name,
    type: typeName ? typeName : "Nespecificat",
    typeId,
    vehicleTypeId: typeId ?? null,
    vehicleTypeName: typeName,
    image: toImageUrl(primaryImage),
    images: imageList,
    makeId: makeId ?? null,
    makeName,
    price: parsePrice(raw.rental_rate ?? raw.price ?? raw.daily_rate ?? raw.rate),
    features: {
      passengers,
      transmission: transmissionName || "—",
      transmissionId,
      fuel: fuelName || "—",
      fuelId,
      doors,
      luggage,
    },
    transmissionId,
    transmissionName,
    fuelTypeId: fuelId,
    fuelTypeName: fuelName,
    status: normalizeStatus(raw.status ?? raw.availability ?? raw.state),
    rating: toNumber(raw.avg_review),
    description: descriptionSource,
    content: rawContent,
    specs: collectSpecs(raw.specs ?? raw.options ?? raw.features),
    licensePlate:
      toTrimmedString(raw.license_plate) ??
      toTrimmedString((raw as { licensePlate?: unknown }).licensePlate) ??
      toTrimmedString(raw.plate) ??
      "",
    year: toInteger(raw.year ?? raw.manufactured_year ?? raw.production_year),
    mileage,
    lastService: typeof lastServiceCandidate === "string" ? lastServiceCandidate : undefined,
    nextService: typeof nextServiceCandidate === "string" ? nextServiceCandidate : undefined,
    numberOfSeats: seatsValue ?? null,
    numberOfDoors: doorsValue ?? null,
    vin: vinValue,
    deposit: depositValue,
    weight: weightValue,
    weightFront: weightFrontValue,
    isPartner: isPartnerValue,
    partnerId: partnerIdValue ?? null,
    partnerPercentage: partnerPercentageValue,
  };
};

type CarFormState = {
  id: number | null;
  name: string;
  description: string;
  content: string;
  images: CarImageAsset[];
  license_plate: string;
  make_id: number | null;
  status: AdminCar["status"];
  year: string;
  mileage: string;
  vehicle_type_id: number | null;
  transmission_id: number | null;
  fuel_type_id: number | null;
  number_of_seats: string;
  number_of_doors: string;
  vin: string;
  deposit: string;
  weight: string;
  weight_front: string;
  is_partner: boolean;
  partner_id: string;
  partner_percentage: string;
  rental_rate: string;
};

const createEmptyFormState = (): CarFormState => ({
  id: null,
  name: "",
  description: "",
  content: "",
  images: [],
  license_plate: "",
  make_id: null,
  status: "available",
  year: "",
  mileage: "",
  vehicle_type_id: null,
  transmission_id: null,
  fuel_type_id: null,
  number_of_seats: "",
  number_of_doors: "",
  vin: "",
  deposit: "",
  weight: "",
  weight_front: "",
  is_partner: false,
  partner_id: "",
  partner_percentage: "",
  rental_rate: "",
});

const mapAdminCarToFormState = (car: AdminCar): CarFormState => {
  const imageList =
    Array.isArray(car.images) && car.images.length > 0
      ? car.images.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
      : [];

  return {
    id: car.id,
    name: car.name ?? "",
    description: normalizeRichTextValue(car.description ?? ""),
    content: normalizeRichTextValue(car.content ?? ""),
    images: imageList.map((value, index) =>
      createExistingImageAsset(value, index),
    ),
    license_plate: car.licensePlate ?? "",
    make_id: car.makeId ?? null,
    status: car.status,
    year: car.year != null ? String(car.year) : "",
    mileage: car.mileage != null ? String(car.mileage) : "",
    vehicle_type_id: car.vehicleTypeId ?? car.typeId ?? null,
    transmission_id:
      car.transmissionId ?? car.features?.transmissionId ?? null,
    fuel_type_id: car.fuelTypeId ?? car.features?.fuelId ?? null,
    number_of_seats:
      car.numberOfSeats != null
        ? String(car.numberOfSeats)
        : car.features?.passengers && car.features.passengers > 0
        ? String(car.features.passengers)
        : "",
    number_of_doors:
      car.numberOfDoors != null
        ? String(car.numberOfDoors)
        : car.features?.doors && car.features.doors > 0
        ? String(car.features.doors)
        : "",
    vin: car.vin ?? "",
    deposit: car.deposit != null ? String(car.deposit) : "",
    weight: car.weight != null ? String(car.weight) : "",
    weight_front: car.weightFront != null ? String(car.weightFront) : "",
    is_partner: car.isPartner ?? false,
    partner_id: car.partnerId != null ? String(car.partnerId) : "",
    partner_percentage:
      car.partnerPercentage != null ? String(car.partnerPercentage) : "",
    rental_rate: car.price ? String(car.price) : "",
  };
};

const buildCarPayload = (form: CarFormState) => {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    license_plate: form.license_plate.trim(),
    status: form.status,
  };

  const description = normalizeRichTextValue(form.description);
  if (description.length > 0) {
    payload.description = description;
  }

  const content = normalizeRichTextValue(form.content);
  if (content.length > 0) {
    payload.content = content;
  }

  if (form.make_id != null) {
    payload.make_id = form.make_id;
  }

  const year = toInteger(form.year);
  if (year !== undefined) {
    payload.year = year;
  }

  const mileage = toInteger(form.mileage);
  if (mileage !== undefined) {
    payload.mileage = mileage;
  }

  if (form.vehicle_type_id != null) {
    payload.vehicle_type_id = form.vehicle_type_id;
  }

  if (form.transmission_id != null) {
    payload.transmission_id = form.transmission_id;
  }

  if (form.fuel_type_id != null) {
    payload.fuel_type_id = form.fuel_type_id;
  }

  const seats = toInteger(form.number_of_seats);
  if (seats !== undefined) {
    payload.number_of_seats = seats;
  }

  const doors = toInteger(form.number_of_doors);
  if (doors !== undefined) {
    payload.number_of_doors = doors;
  }

  if (form.vin.trim().length > 0) {
    payload.vin = form.vin.trim();
  }

  const deposit = toDecimalFromString(form.deposit);
  if (deposit !== undefined) {
    payload.deposit = deposit;
  }

  const weight = toDecimalFromString(form.weight);
  if (weight !== undefined) {
    payload.weight = weight;
  }

  const weightFront = toDecimalFromString(form.weight_front);
  if (weightFront !== undefined) {
    payload.weight_front = weightFront;
  }

  payload.is_partner = form.is_partner;

  const partnerId = toInteger(form.partner_id);
  if (partnerId !== undefined) {
    payload.partner_id = partnerId;
  }

  const partnerPercentage = toDecimalFromString(form.partner_percentage);
  if (partnerPercentage !== undefined) {
    payload.partner_percentage = partnerPercentage;
  }

  const rentalRate = toDecimalFromString(form.rental_rate);
  if (rentalRate !== undefined) {
    payload.rental_rate = rentalRate;
  }

  const orderedImages: Array<{
    type: "file" | "existing";
    value: File | string;
  }> = [];
  let hasUploads = false;

  form.images.forEach((image) => {
    if (image.file) {
      hasUploads = true;
      orderedImages.push({ type: "file", value: image.file });
      return;
    }

    if (image.existingPath && image.existingPath.trim().length > 0) {
      orderedImages.push({
        type: "existing",
        value: image.existingPath.trim(),
      });
    }
  });

  if (!hasUploads) {
    if (orderedImages.length > 0) {
      payload.images = orderedImages.map((entry) => entry.value as string);
    }
    return payload;
  }

  const formData = new FormData();
  const appendValue = (key: string, value: unknown) => {
    if (value == null) return;

    if (Array.isArray(value)) {
      value.forEach((item) => appendValue(`${key}[]`, item));
      return;
    }

    if (typeof value === "boolean") {
      formData.append(key, value ? "1" : "0");
      return;
    }

    formData.append(key, String(value));
  };

  Object.entries(payload).forEach(([key, value]) => {
    appendValue(key, value);
  });

  orderedImages.forEach((entry) => {
    if (entry.type === "file") {
      const file = entry.value as File;
      formData.append("images[]", file, file.name);
    } else {
      formData.append("images[]", entry.value as string);
    }
  });

  return formData;
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
  const [carForm, setCarForm] = useState<CarFormState>(() =>
    createEmptyFormState(),
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [makeOptions, setMakeOptions] = useState<LookupOption[]>([]);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<LookupOption[]>([]);
  const [transmissionOptions, setTransmissionOptions] = useState<LookupOption[]>([]);
  const [fuelOptions, setFuelOptions] = useState<LookupOption[]>([]);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerResults, setPartnerResults] = useState<PartnerOption[]>([]);
  const [partnerSearchActive, setPartnerSearchActive] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerOption | null>(
    null,
  );

  const descriptionEditorConfig = useMemo(
    () => ({
      toolbar: [
        "heading",
        "|",
        "bold",
        "italic",
        "link",
        "bulletedList",
        "numberedList",
        "|",
        "blockQuote",
        "undo",
        "redo",
      ],
      placeholder: "Descriere scurtă a mașinii",
    }),
    [],
  );

  const contentEditorConfig = useMemo(
    () => ({
      toolbar: [
        "heading",
        "|",
        "bold",
        "italic",
        "link",
        "bulletedList",
        "numberedList",
        "|",
        "blockQuote",
        "insertTable",
        "undo",
        "redo",
      ],
      placeholder: "Informații detaliate pentru pagina mașinii",
    }),
    [],
  );

  const loadingRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const partnerRequestRef = useRef(0);

  const resetPartnerLookup = useCallback(() => {
    setPartnerSearch("");
    setPartnerResults([]);
    setPartnerSearchActive(false);
    setSelectedPartner(null);
    partnerRequestRef.current += 1;
  }, []);

  const fetchPartnerOptions = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      const requestId = ++partnerRequestRef.current;

      if (trimmed.length === 0) {
        setPartnerResults([]);
        return;
      }

      try {
        const response = await apiClient.getUsers({
          search: trimmed,
          perPage: 10,
          roles: ["partner"],
        });
        if (partnerRequestRef.current !== requestId) return;
        setPartnerResults(extractPartnerOptions(response));
      } catch (err) {
        if (partnerRequestRef.current !== requestId) return;
        console.error("Error searching partner users:", err);
        setPartnerResults([]);
      }
    },
    [],
  );

  const cleanupImages = useCallback((images: CarImageAsset[]) => {
    images.forEach((image) => {
      releaseImagePreview(image);
    });
  }, []);

  const handleImagesAdd = useCallback(
    (files: File[]) => {
      if (!files || files.length === 0) return;

      const imageFiles = files.filter((file) => {
        if (file.type) {
          return file.type.startsWith("image/");
        }
        return /\.(jpe?g|png|gif|webp|avif|heic|heif)$/i.test(file.name);
      });
      if (imageFiles.length === 0) return;

      setCarForm((prev) => ({
        ...prev,
        images: [...prev.images, ...imageFiles.map(createUploadedImageAsset)],
      }));
    },
    [setCarForm],
  );

  const handleImageRemove = useCallback(
    (id: string) => {
      setCarForm((prev) => {
        const target = prev.images.find((image) => image.id === id);
        if (!target) {
          return prev;
        }

        releaseImagePreview(target);
        return {
          ...prev,
          images: prev.images.filter((image) => image.id !== id),
        };
      });
    },
    [setCarForm],
  );

  const handleImagesReorder = useCallback(
    (nextImages: CarImageAsset[]) => {
      setCarForm((prev) => ({
        ...prev,
        images: nextImages,
      }));
    },
    [setCarForm],
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    if (!partnerSearchActive) return;
    const handler = setTimeout(() => {
      fetchPartnerOptions(partnerSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [partnerSearch, partnerSearchActive, fetchPartnerOptions]);

  useEffect(() => {
    if (!carForm.is_partner) return;
    if (!carForm.partner_id) return;
    const match = partnerResults.find(
      (item) => String(item.id) === carForm.partner_id,
    );
    if (!match) return;
    setSelectedPartner((prev) => {
      if (
        prev &&
        prev.id === match.id &&
        prev.name === match.name &&
        prev.email === match.email &&
        prev.username === match.username
      ) {
        return prev;
      }
      return match;
    });
  }, [carForm.is_partner, carForm.partner_id, partnerResults]);

  useEffect(() => {
    let active = true;

    const loadLookups = async () => {
      try {
        const [makesRes, typesRes, transmissionsRes, fuelsRes] =
          await Promise.all([
            apiClient.getCarMakes({ limit: 200 }),
            apiClient.getCarTypes({ limit: 200 }),
            apiClient.getCarTransmissions({ limit: 200 }),
            apiClient.getCarFuels({ limit: 200 }),
          ]);

        if (!active) return;

        setMakeOptions(extractLookupOptions(makesRes));
        setVehicleTypeOptions(extractLookupOptions(typesRes));
        setTransmissionOptions(extractLookupOptions(transmissionsRes));
        setFuelOptions(extractLookupOptions(fuelsRes));
      } catch (err) {
        console.error("Error loading car lookup data:", err);
      }
    };

    loadLookups();

    return () => {
      active = false;
    };
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const [totalRes, availableRes, maintenanceRes, outServiceRes] =
        await Promise.all([
          apiClient.fetchAdminCarsTotal(),
          apiClient.fetchAdminCarsTotal({ status: "available" }),
          apiClient.fetchAdminCarsTotal({ status: "maintenance" }),
          apiClient.fetchAdminCarsTotal({ status: "out_of_service" }),
        ]);
      const toCount = (data: unknown): number => {
        if (typeof data === "number" && Number.isFinite(data)) {
          return data;
        }

        if (isRecord(data)) {
          const candidates: Array<unknown> = [
            data.count,
            data.total,
            Array.isArray(data.data) ? data.data.length : data.data,
            data.value,
            Array.isArray(data.cars) ? data.cars.length : data.cars,
          ];

          for (const candidate of candidates) {
            if (typeof candidate === "number" && Number.isFinite(candidate)) {
              return candidate;
            }
          }
        }

        return 0;
      };
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
        const params: Record<string, string | number | undefined> = {
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
    cleanupImages(carForm.images);
    resetPartnerLookup();
    setCarForm(createEmptyFormState());
    setModalMode("create");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (car: AdminCar) => {
    cleanupImages(carForm.images);
    resetPartnerLookup();
    setCarForm(mapAdminCarToFormState(car));
    if (car.partnerId != null) {
      const fallback = `Utilizator #${car.partnerId}`;
      const carRecord = car as unknown as Record<string, unknown>;
      const partnerName =
        toTrimmedString(carRecord.partnerName) ??
        toTrimmedString(carRecord.partner_name) ??
        fallback;
      const partnerEmail =
        toTrimmedString(carRecord.partnerEmail) ??
        toTrimmedString(carRecord.partner_email) ??
        null;
      const partnerUsername =
        toTrimmedString(carRecord.partnerUsername) ??
        toTrimmedString(carRecord.partner_username) ??
        null;

      setSelectedPartner({
        id: car.partnerId,
        name:
          typeof partnerName === "string" && partnerName.trim().length > 0
            ? partnerName.trim()
            : fallback,
        email:
          typeof partnerEmail === "string" && partnerEmail.trim().length > 0
            ? partnerEmail.trim()
            : null,
        username:
          typeof partnerUsername === "string" &&
          partnerUsername.trim().length > 0
            ? partnerUsername.trim()
            : null,
      });

      void fetchPartnerOptions(String(car.partnerId));
    }
    setModalMode("edit");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    resetPartnerLookup();
  };

  const handleFormChange = (
    field: keyof CarFormState,
  ): ((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void) => {
    return (event) => {
      const value = event.target.value;
      setCarForm((prev) => ({
        ...prev,
        [field]: value as CarFormState[typeof field],
      }));
    };
  };

  const handleRichTextChange = useCallback(
    (field: "description" | "content") =>
      (_event: unknown, editorInstance: { getData: () => string }) => {
        const value = normalizeRichTextValue(editorInstance.getData());
        setCarForm((prev) => {
          if (prev[field] === value) {
            return prev;
          }

          return {
            ...prev,
            [field]: value,
          };
        });
      },
    [],
  );

  const handleStatusChange = (value: string) => {
    setCarForm((prev) => ({
      ...prev,
      status: (value as AdminCar["status"]) ?? prev.status,
    }));
  };

  const handleMakeChange = (value: string) => {
    setCarForm((prev) => {
      if (!value) {
        return { ...prev, make_id: null };
      }

      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return { ...prev, make_id: numeric };
      }

      return prev;
    });
  };

  const handleVehicleTypeChange = (value: string) => {
    setCarForm((prev) => {
      if (!value) {
        return { ...prev, vehicle_type_id: null };
      }

      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return { ...prev, vehicle_type_id: numeric };
      }

      return prev;
    });
  };

  const handleTransmissionChange = (value: string) => {
    setCarForm((prev) => {
      if (!value) {
        return { ...prev, transmission_id: null };
      }

      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return { ...prev, transmission_id: numeric };
      }

      return prev;
    });
  };

  const handleFuelChange = (value: string) => {
    setCarForm((prev) => {
      if (!value) {
        return { ...prev, fuel_type_id: null };
      }

      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return { ...prev, fuel_type_id: numeric };
      }

      return prev;
    });
  };

  const handlePartnerSearchOpen = useCallback(() => {
    setPartnerSearchActive(true);
    if (
      carForm.is_partner &&
      carForm.partner_id &&
      partnerResults.length === 0
    ) {
      fetchPartnerOptions(carForm.partner_id);
    }
  }, [carForm.is_partner, carForm.partner_id, partnerResults.length, fetchPartnerOptions]);

  const handlePartnerSelect = useCallback((user: PartnerOption) => {
    setSelectedPartner(user);
    setCarForm((prev) => ({
      ...prev,
      partner_id: user?.id != null ? String(user.id) : "",
    }));
    setPartnerSearch("");
  }, []);

  const handlePartnerChange = (value: string) => {
    const nextIsPartner = value === "true";
    setCarForm((prev) => {
      if (!nextIsPartner) {
        return {
          ...prev,
          is_partner: false,
          partner_id: "",
          partner_percentage: "",
        };
      }

      return {
        ...prev,
        is_partner: true,
      };
    });
    if (!nextIsPartner) {
      resetPartnerLookup();
    }
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
      cleanupImages(carForm.images);
      setCarForm(createEmptyFormState());
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
              <Label htmlFor="car-make" className="text-sm font-dm-sans font-semibold text-gray-700">
                Marcă
              </Label>
              <Select
                id="car-make"
                className="mt-2"
                value={carForm.make_id != null ? String(carForm.make_id) : ""}
                onValueChange={handleMakeChange}
              >
                <option value="">Selectează marcă</option>
                {makeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="car-type" className="text-sm font-dm-sans font-semibold text-gray-700">
                Tip vehicul
              </Label>
              <Select
                id="car-type"
                className="mt-2"
                value={
                  carForm.vehicle_type_id != null
                    ? String(carForm.vehicle_type_id)
                    : ""
                }
                onValueChange={handleVehicleTypeChange}
              >
                <option value="">Selectează tip</option>
                {vehicleTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
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
                placeholder="125000"
              />
            </div>

            <div>
              <Label htmlFor="car-transmission" className="text-sm font-dm-sans font-semibold text-gray-700">
                Transmisie
              </Label>
              <Select
                id="car-transmission"
                className="mt-2"
                value={
                  carForm.transmission_id != null
                    ? String(carForm.transmission_id)
                    : ""
                }
                onValueChange={handleTransmissionChange}
              >
                <option value="">Selectează transmisia</option>
                {transmissionOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="car-fuel" className="text-sm font-dm-sans font-semibold text-gray-700">
                Tip combustibil
              </Label>
              <Select
                id="car-fuel"
                className="mt-2"
                value={
                  carForm.fuel_type_id != null
                    ? String(carForm.fuel_type_id)
                    : ""
                }
                onValueChange={handleFuelChange}
              >
                <option value="">Selectează combustibil</option>
                {fuelOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="car-seats" className="text-sm font-dm-sans font-semibold text-gray-700">
                Număr locuri
              </Label>
              <Input
                id="car-seats"
                type="number"
                min="1"
                value={carForm.number_of_seats}
                onChange={handleFormChange("number_of_seats")}
                placeholder="5"
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
                value={carForm.number_of_doors}
                onChange={handleFormChange("number_of_doors")}
                placeholder="4"
              />
            </div>

            <div>
              <Label htmlFor="car-vin" className="text-sm font-dm-sans font-semibold text-gray-700">
                Serie șasiu (VIN)
              </Label>
              <Input
                id="car-vin"
                value={carForm.vin}
                onChange={handleFormChange("vin")}
                placeholder="VIN"
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
              <Label htmlFor="car-deposit" className="text-sm font-dm-sans font-semibold text-gray-700">
                Garanție (€)
              </Label>
              <Input
                id="car-deposit"
                type="number"
                min="0"
                step="0.01"
                value={carForm.deposit}
                onChange={handleFormChange("deposit")}
                placeholder="250"
              />
            </div>

            <div>
              <Label htmlFor="car-weight" className="text-sm font-dm-sans font-semibold text-gray-700">
                Greutate (kg)
              </Label>
              <Input
                id="car-weight"
                type="number"
                min="0"
                step="0.01"
                value={carForm.weight}
                onChange={handleFormChange("weight")}
                placeholder="1200"
              />
            </div>

            <div>
              <Label htmlFor="car-weight-front" className="text-sm font-dm-sans font-semibold text-gray-700">
                Greutate față (kg)
              </Label>
              <Input
                id="car-weight-front"
                type="number"
                min="0"
                step="0.01"
                value={carForm.weight_front}
                onChange={handleFormChange("weight_front")}
                placeholder="600"
              />
            </div>

            <div>
              <Label htmlFor="car-partner" className="text-sm font-dm-sans font-semibold text-gray-700">
                Mașină partener
              </Label>
              <Select
                id="car-partner"
                className="mt-2"
                value={carForm.is_partner ? "true" : "false"}
                onValueChange={handlePartnerChange}
              >
                <option value="false">Nu</option>
                <option value="true">Da</option>
              </Select>
            </div>

            {carForm.is_partner && (
              <>
                <div>
                  <Label
                    htmlFor="car-partner-id"
                    className="text-sm font-dm-sans font-semibold text-gray-700"
                  >
                    Partener
                  </Label>
                  <div className="mt-2">
                    <SearchSelect
                      id="car-partner-id"
                      value={carForm.is_partner ? selectedPartner : null}
                      search={partnerSearch}
                      items={partnerResults}
                      onSearch={(value) => {
                        setPartnerSearch(value);
                        if (value.trim().length === 0) {
                          setPartnerResults([]);
                        }
                      }}
                      onSelect={handlePartnerSelect}
                      onOpen={handlePartnerSearchOpen}
                      placeholder="Selectează partenerul"
                      renderItem={(user) => {
                        const secondaryInfo = [user.username, user.email]
                          .filter(
                            (value): value is string =>
                              typeof value === "string" &&
                              value.trim().length > 0,
                          )
                          .join(" • ");

                        return (
                          <div className="min-w-0">
                            <div className="font-dm-sans font-semibold truncate">
                              {user.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {secondaryInfo || "Fără detalii suplimentare"}
                            </div>
                          </div>
                        );
                      }}
                      renderValue={(user) => {
                        const secondaryInfo = [user.username, user.email]
                          .filter(
                            (value): value is string =>
                              typeof value === "string" &&
                              value.trim().length > 0,
                          )
                          .join(" • ");

                        return (
                          <div className="flex flex-col">
                            <span className="font-dm-sans font-semibold text-sm">
                              {user.name}
                            </span>
                            {secondaryInfo && (
                              <span className="text-xs text-gray-500">
                                {secondaryInfo}
                              </span>
                            )}
                          </div>
                        );
                      }}
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="car-partner-percentage"
                    className="text-sm font-dm-sans font-semibold text-gray-700"
                  >
                    Procent partener (%)
                  </Label>
                  <Input
                    id="car-partner-percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={carForm.partner_percentage}
                    onChange={handleFormChange("partner_percentage")}
                    placeholder="15"
                  />
                </div>
              </>
            )}

            <div className="lg:col-span-2">
              <Label
                htmlFor="car-images-uploader"
                className="text-sm font-dm-sans font-semibold text-gray-700"
              >
                Imagini
              </Label>
              <CarImagesUploader
                id="car-images-uploader"
                images={carForm.images}
                onAddFiles={handleImagesAdd}
                onRemove={handleImageRemove}
                onReorder={handleImagesReorder}
                disabled={saving}
              />
            </div>

            <div className="lg:col-span-2">
              <Label
                htmlFor="car-description-editor"
                className="text-sm font-dm-sans font-semibold text-gray-700"
              >
                Descriere
              </Label>
              <div
                id="car-description-editor"
                className="mt-2 rich-text-editor rich-text-editor--description"
              >
                <CKEditor
                  editor={ClassicEditor}
                  data={carForm.description}
                  config={descriptionEditorConfig}
                  onChange={handleRichTextChange("description")}
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <Label
                htmlFor="car-content-editor"
                className="text-sm font-dm-sans font-semibold text-gray-700"
              >
                Conținut detaliat
              </Label>
              <div id="car-content-editor" className="mt-2 rich-text-editor rich-text-editor--content">
                <CKEditor
                  editor={ClassicEditor}
                  data={carForm.content}
                  config={contentEditorConfig}
                  onChange={handleRichTextChange("content")}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 lg:flex-row lg:justify-end">
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
