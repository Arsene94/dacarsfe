"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    Calendar,
    Car,
    Clock,
    Eye,
    Newspaper,
    Phone,
    Plane,
    User,
    Users,
    X,
} from "lucide-react";
import Link from "next/link";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popup } from "@/components/ui/popup";
import BookingForm from "@/components/admin/BookingForm";
import BookingContractForm from "@/components/admin/BookingContractForm";
import { Label } from "@/components/ui/label";
import type { Column } from "@/types/ui";
import { useAuth } from "@/context/AuthContext";
import {
    AdminBookingFormValues,
    AdminReservation,
    type AdminBookingResource,
    createEmptyBookingForm,
} from "@/types/admin";
import type { ReservationAppliedOffer } from "@/types/reservation";
import type { ActivityReservation } from "@/types/activity";
import { apiClient } from "@/lib/api";
import {getStatusText} from "@/lib/utils";
import { extractItem, extractList } from "@/lib/apiResponse";

const STORAGE_BASE =
    process.env.NEXT_PUBLIC_STORAGE_URL ?? 'https://backend.dacars.ro/storage';

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

const toSafeString = (value: unknown, fallback = ""): string => {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return fallback;
};

const parseMetricCount = (value: unknown, fallback = 0): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return fallback;
};

const parseOptionalNumber = (value: unknown): number | null => {
    if (value == null || value === "") return null;
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const normalizeBoolean = (value: unknown, defaultValue = false): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["1", "true", "da", "yes"].includes(normalized)) return true;
        if (["0", "false", "nu", "no"].includes(normalized)) return false;
    }
    return defaultValue;
};

const pickLookupName = (value: unknown): string | undefined => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    if (isRecord(value)) {
        const name = toSafeString(value.name ?? (value as { label?: unknown }).label);
        const trimmed = name.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    return undefined;
};

const normalizeAppliedOfferEntry = (
    raw: unknown,
): ReservationAppliedOffer | null => {
    if (!isRecord(raw)) return null;
    const id = parseOptionalNumber(raw.id ?? (raw as { offer_id?: unknown }).offer_id);
    if (typeof id !== "number" || Number.isNaN(id)) {
        return null;
    }
    const titleSource =
        typeof raw.title === "string" && raw.title.trim().length > 0
            ? raw.title
            : typeof raw.name === "string" && raw.name.trim().length > 0
                ? raw.name
                : null;
    if (!titleSource) {
        return null;
    }
    const offerType = toSafeString((raw as { offer_type?: unknown }).offer_type, "").trim();
    const offerValue = toSafeString((raw as { offer_value?: unknown }).offer_value, "").trim();
    const discountLabel = toSafeString((raw as { discount_label?: unknown }).discount_label, "").trim()
        || toSafeString((raw as { badge?: unknown }).badge, "").trim();

    return {
        id,
        title: titleSource,
        offer_type: offerType.length > 0 ? offerType : null,
        offer_value: offerValue.length > 0 ? offerValue : null,
        discount_label: discountLabel.length > 0 ? discountLabel : null,
    };
};

const normalizeAppliedOffersList = (value: unknown): ReservationAppliedOffer[] => {
    if (!Array.isArray(value)) return [];
    const normalized = value
        .map((entry) => normalizeAppliedOfferEntry(entry))
        .filter((entry): entry is ReservationAppliedOffer => entry !== null);
    if (normalized.length === 0) {
        return [];
    }
    const unique = new Map<number, ReservationAppliedOffer>();
    normalized.forEach((entry) => {
        if (!unique.has(entry.id)) {
            unique.set(entry.id, entry);
        }
    });
    return Array.from(unique.values());
};

const toLocalDateTimeInput = (iso?: string | null): string => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const tzOffset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
};

const mapServiceSummaries = (
    services: unknown,
): Array<{ id: number; name: string }> => {
    if (!Array.isArray(services)) return [];
    return services
        .map((service) => {
            if (!isRecord(service)) return null;
            const id =
                toNumericId(service.id) ??
                toNumericId((service as { service_id?: unknown }).service_id);
            if (id == null) return null;
            const name = toSafeString(service.name ?? (service as { title?: unknown }).title).trim();
            return { id, name: name.length > 0 ? name : `Serviciu #${id}` };
        })
        .filter((entry): entry is { id: number; name: string } => entry !== null);
};

const resolveServiceIds = (booking: AdminBookingResource): number[] => {
    const directIds = Array.isArray(booking.service_ids)
        ? booking.service_ids
        : [];
    const numericDirect = directIds
        .map((value) => toNumericId(value))
        .filter((value): value is number => value != null);

    if (numericDirect.length > 0) {
        return numericDirect;
    }

    return mapServiceSummaries(booking.services).map((service) => service.id);
};

const mapActivityStatus = (status: string): AdminReservation["status"] => {
    switch (status?.toLowerCase()) {
        case "no_answer":
            return "no_answer";
        case "waiting_advance_payment":
            return "waiting_advance_payment";
        case "reserved":
            return "reserved";
        case "cancelled":
            return "cancelled";
        case "completed":
            return "completed";
        case "pending":
        default:
            return "pending";
    }
};

const mapActivityReservationToAdmin = (
    reservation: ActivityReservation,
): AdminReservation => ({
    id: String(reservation.id) || reservation.booking_number,
    bookingNumber: reservation.booking_number,
    customerName: reservation.customer_name ?? "",
    phone: reservation.customer_phone ?? "",
    carId: reservation.car_id,
    carName: reservation.car?.name ?? "",
    carLicensePlate: reservation.car?.license_plate,
    startDate: reservation.rental_start_date ?? "",
    endDate: reservation.rental_end_date ?? "",
    plan: reservation.with_deposit ? 1 : 0,
    status: mapActivityStatus(reservation.status ?? ""),
    total: reservation.total ?? 0,
    pricePerDay: reservation.price_per_day ?? undefined,
    servicesPrice: reservation.total_services ?? undefined,
    discount: reservation.coupon_amount ?? undefined,
    totalBeforeWheelPrize: null,
    wheelPrizeDiscount: null,
    wheelPrize: null,
    email: undefined,
    days: reservation.days ?? undefined,
    pickupTime: reservation.start_hour_group ?? undefined,
    dropoffTime: reservation.end_hour_group ?? undefined,
    location: undefined,
    discountCode: reservation.coupon_type ?? undefined,
    notes: reservation.note ?? undefined,
    createdAt: undefined,
    couponAmount: reservation.coupon_amount ?? 0,
    subTotal: reservation.sub_total ?? 0,
    taxAmount: 0,
});

const getStatusColor = (status: string) => {
    switch (status) {
        case "reserved":
            return "bg-green-100 text-green-800";
        case "pending":
            return "bg-yellow-100 text-yellow-800";
        case "cancelled":
            return "bg-red-100 text-red-800";
        case "completed":
            return "bg-blue-100 text-blue-800";
        case "no_answer":
            return "bg-orange-100 text-orange-800";
        case "waiting_advance_payment":
            return "bg-purple-100 text-purple-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
};

type ExpiringDocumentCarRow = {
    id: number | string;
    name: string;
    licensePlate: string;
    itpExpiresAt: string | null;
    rovinietaExpiresAt: string | null;
    insuranceExpiresAt: string | null;
};

type ExpiringDocumentField =
    | "itpExpiresAt"
    | "rovinietaExpiresAt"
    | "insuranceExpiresAt";

type ExpiringDocumentNotice = {
    field: ExpiringDocumentField;
    label: string;
    days: number;
};

type ExpiringDocumentAlertItem = {
    id: string;
    name: string;
    licensePlate: string;
    documents: ExpiringDocumentNotice[];
};

const EXPIRING_DOCUMENT_FIELDS: Array<{ field: ExpiringDocumentField; label: string }> = [
    { field: "itpExpiresAt", label: "ITP" },
    { field: "rovinietaExpiresAt", label: "Rovinietă" },
    { field: "insuranceExpiresAt", label: "Asigurare" },
];

const EXPIRING_DAYS_THRESHOLD = 7;

const EXPIRING_ALERT_STORAGE_KEY_PREFIX =
    "dacars:admin:expiring-documents-alert:last-shown";

const normalizeIsoDate = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return trimmed;
};

const formatDateDisplay = (iso?: string | null): string => {
    if (!iso) return "—";
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
        return "—";
    }
    return parsed.toLocaleDateString("ro-RO");
};

const calculateDaysUntil = (iso?: string | null): number | null => {
    if (!iso) return null;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const diffMs = target.getTime() - today.getTime();
    return Math.round(diffMs / 86400000);
};

const formatExpiryDistance = (days: number): string => {
    if (days < 0) {
        const absolute = Math.abs(days);
        return absolute === 1 ? "Expirat de 1 zi" : `Expirat de ${absolute} zile`;
    }
    if (days === 0) {
        return "Expiră astăzi";
    }
    if (days === 1) {
        return "Expiră mâine";
    }
    return `Expiră în ${days} zile`;
};

const getExpiringDocumentSummary = (
    row: ExpiringDocumentCarRow,
): { field: ExpiringDocumentField; label: string; days: number } | null => {
    const entries = EXPIRING_DOCUMENT_FIELDS.map(({ field, label }) => {
        const iso = row[field];
        const days = calculateDaysUntil(iso);
        return iso && days !== null ? { field, label, days } : null;
    }).filter(
        (
            entry,
        ): entry is { field: ExpiringDocumentField; label: string; days: number } => entry !== null,
    );

    if (entries.length === 0) {
        return null;
    }

    entries.sort((a, b) => a.days - b.days);
    return entries[0];
};

const getExpiringDocumentEntries = (
    row: ExpiringDocumentCarRow,
): ExpiringDocumentNotice[] => {
    const entries = EXPIRING_DOCUMENT_FIELDS.map(({ field, label }) => {
        const iso = row[field];
        const days = calculateDaysUntil(iso);
        if (!iso || days === null) {
            return null;
        }
        if (days > EXPIRING_DAYS_THRESHOLD) {
            return null;
        }
        return { field, label, days } satisfies ExpiringDocumentNotice;
    }).filter(
        (entry): entry is ExpiringDocumentNotice => entry !== null,
    );

    return entries.sort((a, b) => a.days - b.days);
};

const getAlertStorageKey = (userId?: number | null): string =>
    `${EXPIRING_ALERT_STORAGE_KEY_PREFIX}:${userId ?? "anonymous"}`;

const getTodayStamp = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const mapExpiringDocumentCar = (raw: unknown): ExpiringDocumentCarRow | null => {
    if (!isRecord(raw)) return null;
    const rawId = raw.id ?? (raw as { car_id?: unknown }).car_id;
    const numericId = toNumericId(rawId);
    const fallbackId = toSafeString(rawId ?? "", "").trim();
    const nameCandidate = toSafeString(raw.name ?? (raw as { car_name?: unknown }).car_name);
    const normalizedName = nameCandidate.trim().length > 0
        ? nameCandidate.trim()
        : `Autovehicul${numericId != null ? ` #${numericId}` : ""}`;
    const plateCandidate = toSafeString(
        raw.license_plate ??
            (raw as { licensePlate?: unknown }).licensePlate ??
            (raw as { plate?: unknown }).plate,
        "",
    ).trim();
    const licensePlate = plateCandidate.length > 0 ? plateCandidate.toUpperCase() : "—";
    const idValue = numericId ?? (fallbackId.length > 0 ? fallbackId : normalizedName);

    return {
        id: idValue,
        name: normalizedName,
        licensePlate,
        itpExpiresAt: normalizeIsoDate(
            raw.itp_expires_at ?? (raw as { itpExpiresAt?: unknown }).itpExpiresAt,
        ),
        rovinietaExpiresAt: normalizeIsoDate(
            raw.rovinieta_expires_at ??
                (raw as { rovinietaExpiresAt?: unknown }).rovinietaExpiresAt,
        ),
        insuranceExpiresAt: normalizeIsoDate(
            raw.insurance_expires_at ??
                (raw as { insuranceExpiresAt?: unknown }).insuranceExpiresAt,
        ),
    };
};

const expiringDocumentsColumns: Column<ExpiringDocumentCarRow>[] = [
    {
        id: "car",
        header: "Mașină",
        accessor: (car) => car.name,
        sortable: true,
        cell: (car) => (
            <span className="font-dm-sans text-sm text-gray-900 font-medium">{car.name}</span>
        ),
    },
    {
        id: "license",
        header: "Număr înmatriculare",
        accessor: (car) => car.licensePlate,
        sortable: true,
        cell: (car) => (
            <span className="font-dm-sans text-sm text-gray-700">{car.licensePlate}</span>
        ),
    },
    {
        id: "itp",
        header: "ITP",
        accessor: (car) => (car.itpExpiresAt ? new Date(car.itpExpiresAt) : null),
        sortable: true,
        cell: (car) => (
            <span className="font-dm-sans text-sm text-gray-700">
                {formatDateDisplay(car.itpExpiresAt)}
            </span>
        ),
    },
    {
        id: "rovinieta",
        header: "Rovinietă",
        accessor: (car) => (car.rovinietaExpiresAt ? new Date(car.rovinietaExpiresAt) : null),
        sortable: true,
        cell: (car) => (
            <span className="font-dm-sans text-sm text-gray-700">
                {formatDateDisplay(car.rovinietaExpiresAt)}
            </span>
        ),
    },
    {
        id: "insurance",
        header: "Asigurare",
        accessor: (car) => (car.insuranceExpiresAt ? new Date(car.insuranceExpiresAt) : null),
        sortable: true,
        cell: (car) => (
            <span className="font-dm-sans text-sm text-gray-700">
                {formatDateDisplay(car.insuranceExpiresAt)}
            </span>
        ),
    },
    {
        id: "next-expiry",
        header: "Expiră în",
        accessor: (car) => {
            const summary = getExpiringDocumentSummary(car);
            return summary ? summary.days : EXPIRING_DAYS_THRESHOLD + 1;
        },
        sortable: true,
        cell: (car) => {
            const summary = getExpiringDocumentSummary(car);
            if (!summary) {
                return <span className="font-dm-sans text-sm text-gray-500">—</span>;
            }
            const badgeColor =
                summary.days < 0
                    ? "bg-red-100 text-red-800"
                    : summary.days <= 3
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-orange-100 text-orange-800";
            return (
                <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${badgeColor}`}
                >
                    {formatExpiryDistance(summary.days)} ({summary.label})
                </span>
            );
        },
    },
];

const AdminDashboard = () => {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [expiringCars, setExpiringCars] = useState<ExpiringDocumentCarRow[]>([]);
    const [loadingExpiringCars, setLoadingExpiringCars] = useState(false);
    const [expiringCarsError, setExpiringCarsError] = useState<string | null>(null);
    const [showExpiringAlert, setShowExpiringAlert] = useState(false);
    const [carActivityDay, setCarActivityDay] = useState<string>('azi');
    const [activityDay, setActivityDay] = useState<string>('');
    const [activityHours, setActivityHours] = useState<string[]>([]);
    const [activityReservations, setActivityReservations] = useState<ActivityReservation[]>([]);
    const [popupOpen, setPopupOpen] = useState(false);
    const [activityDetails, setActivityDetails] = useState<{
        id: number;
        customer: string;
        phone: string;
        car: string;
        days: number;
        price_per_day: number;
        sub_total: number;
        total: number;
        services: { id:number, name: string }[];
        total_services: number;
        coupon_amount: number;
        coupon_type: string;
        with_deposit: boolean;
        note: string | null;
        arrivalDate: string;
        arrivalTime: string;
        returnDate: string;
        returnTime: string;
    } | null>(null);
    const [editPopupOpen, setEditPopupOpen] = useState(false);
    const [bookingInfo, setBookingInfo] = useState<AdminBookingFormValues | null>(
        null,
    );
    const [contractOpen, setContractOpen] = useState(false);
    const [contractReservation, setContractReservation] = useState<
        AdminReservation | null
    >(null);
    const [bookingsTodayCount, setBookingsTodayCount] = useState<number>(0);
    const [availableCarsCount, setAvailableCarsCount] = useState<number>(0);
    const [bookingsTotalCount, setBookingsTotalCount] = useState<number>(0);

    const openActivity = (details: {
        id: number;
        customer: string;
        phone: string;
        car: string;
        days: number;
        price_per_day: number;
        sub_total: number;
        total: number;
        services: {  id: number, name: string }[];
        total_services: number;
        coupon_amount: number;
        coupon_type: string;
        with_deposit: boolean;
        note: string | null;
        arrivalDate: string;
        arrivalTime: string;
        returnDate: string;
        returnTime: string;
    }) => {
        setActivityDetails(details);
        setPopupOpen(true);
    };

    const loadActivity = useCallback(async () => {
        try {
            const res = await apiClient.fetchWidgetActivity(carActivityDay);
            setActivityDay(res.day);
            setActivityHours(res.hours);
            setActivityReservations(res.data);
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    }, [carActivityDay]);

    useEffect(() => {
        loadActivity();
    }, [loadActivity]);

    useEffect(() => {
        const loadMetrics = async () => {
            try {
                const [bookingsToday, carsTotal, bookingsTotal] = await Promise.all([
                    apiClient.fetchAdminBookingsToday(),
                    apiClient.fetchAdminCarsTotal({ status: 'available' }),
                    apiClient.fetchAdminBookingsTotal({ statuses: 'all' }),
                ]);
                setBookingsTodayCount(
                    parseMetricCount(
                        bookingsToday?.count ??
                            (bookingsToday as { total?: unknown })?.total ??
                            (bookingsToday as { value?: unknown })?.value,
                    ),
                );
                setAvailableCarsCount(
                    parseMetricCount(
                        carsTotal?.count ??
                            (carsTotal as { total?: unknown })?.total ??
                            (carsTotal as { available?: unknown })?.available,
                    ),
                );
                setBookingsTotalCount(
                    parseMetricCount(
                        bookingsTotal?.count ??
                            (bookingsTotal as { total?: unknown })?.total ??
                            (bookingsTotal as { value?: unknown })?.value,
                    ),
                );
            } catch (error) {
                console.error('Error loading metrics:', error);
            }
        };
        loadMetrics();
    }, []);
    const loadExpiringCars = useCallback(async () => {
        setLoadingExpiringCars(true);
        setExpiringCarsError(null);
        try {
            const response = await apiClient.fetchAdminExpiringCarDocuments({
                within_days: EXPIRING_DAYS_THRESHOLD,
            });
            const list = extractList(response)
                .map(mapExpiringDocumentCar)
                .filter((car): car is ExpiringDocumentCarRow => car !== null);
            setExpiringCars(list);
        } catch (error) {
            console.error('Error loading expiring car documents:', error);
            setExpiringCars([]);
            setExpiringCarsError('Nu am putut încărca expirările documentelor auto.');
        } finally {
            setLoadingExpiringCars(false);
        }
    }, []);

    useEffect(() => {
        loadExpiringCars();
    }, [loadExpiringCars]);

    const expiringAlertItems = useMemo<ExpiringDocumentAlertItem[]>(() => {
        return expiringCars
            .map((car) => {
                const documents = getExpiringDocumentEntries(car);
                if (documents.length === 0) {
                    return null;
                }
                return {
                    id: String(car.id),
                    name: car.name,
                    licensePlate: car.licensePlate,
                    documents,
                } satisfies ExpiringDocumentAlertItem;
            })
            .filter((item): item is ExpiringDocumentAlertItem => item !== null);
    }, [expiringCars]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        if (authLoading || loadingExpiringCars) {
            return;
        }
        if (expiringAlertItems.length === 0) {
            setShowExpiringAlert(false);
            return;
        }

        const storageKey = getAlertStorageKey(user?.id);
        const todayStamp = getTodayStamp();
        let lastShown: string | null = null;

        try {
            lastShown = window.localStorage.getItem(storageKey);
        } catch (error) {
            console.warn('Nu am putut citi notificările zilnice:', error);
        }

        if (lastShown !== todayStamp) {
            setShowExpiringAlert(true);
            try {
                window.localStorage.setItem(storageKey, todayStamp);
            } catch (error) {
                console.warn('Nu am putut memora notificarea zilnică:', error);
            }
        }
    }, [authLoading, expiringAlertItems, loadingExpiringCars, user?.id]);

    const handleDismissExpiringAlert = () => {
        setShowExpiringAlert(false);
    };

    const getCarActivityLabel = (status: string) => {
        switch (status) {
            case 'azi':
                return `Astăzi ${new Date().toLocaleDateString('ro-RO')}`;
            case 'maine':
                return `Mâine ${new Date(Date.now() + 86400000).toLocaleDateString('ro-RO')}`;
            case '2zile':
                return `Peste 2 zile ${new Date(Date.now() + 172800000).toLocaleDateString('ro-RO')}`;
            case '3zile':
                return `Peste 3 zile ${new Date(Date.now() + 259200000).toLocaleDateString('ro-RO')}`;
            case '4zile':
                return `Peste 4 zile ${new Date(Date.now() + 345600000).toLocaleDateString('ro-RO')}`;
            case '5zile':
                return `Peste 5 zile ${new Date(Date.now() + 432000000).toLocaleDateString('ro-RO')}`;
        }
    }

    const updateDateTime = async () => {
        if (!activityDetails) {
            return;
        }

        try {
            const payload = {
                arrivalDate: activityDetails.arrivalDate,
                arrivalTime: activityDetails.arrivalTime,
                returnDate: activityDetails.returnDate,
                returnTime: activityDetails.returnTime,
            };

            await apiClient.updateBookingDate(activityDetails.id, payload);

        } catch (err) {
            console.log(err);
        } finally {
            setPopupOpen(false);
            loadActivity();
        }
    }

    const handleEditBooking = async () => {
        if (!activityDetails) return;
        try {
            const response = await apiClient.getBookingInfo(activityDetails.id);
            const info = extractItem(response);
            if (!info) {
                throw new Error("Rezervarea nu a putut fi încărcată.");
            }
            const carInfo = info.car ?? null;
            const baseForm = createEmptyBookingForm();
            const couponAmount = parseOptionalNumber(info.coupon_amount) ?? 0;
            const totalServices =
                parseOptionalNumber(info.total_services) ?? 0;
            const subTotal = parseOptionalNumber(info.sub_total) ?? 0;
            const serviceIds = resolveServiceIds(info);
            const carId = parseOptionalNumber(info.car_id) ?? null;
            const carImage = toSafeString(
                info.car_image ??
                    info.image_preview ??
                    carInfo?.image_preview ??
                    carInfo?.image,
                "",
            );
            const carLicensePlate = toSafeString(
                carInfo?.license_plate ?? info.license_plate ?? carInfo?.plate,
                "",
            );
            const carTransmission = toSafeString(
                pickLookupName(carInfo?.transmission) ?? info.transmission_name,
                "",
            );
            const carFuel = toSafeString(
                pickLookupName(carInfo?.fuel) ?? info.fuel_name,
                "",
            );
            const carDeposit =
                parseOptionalNumber(info.car_deposit ?? carInfo?.deposit) ?? null;
            const pricePerDay =
                parseOptionalNumber(info.price_per_day) ??
                parseOptionalNumber(info.original_price_per_day) ??
                0;
            const originalPricePerDay =
                parseOptionalNumber(info.original_price_per_day) ?? pricePerDay;
            const total = parseOptionalNumber(info.total) ?? 0;
            const taxAmount = parseOptionalNumber(info.tax_amount) ?? 0;
            const advancePayment =
                parseOptionalNumber(info.advance_payment) ?? 0;
            const totalBeforeWheelPrize =
                parseOptionalNumber(
                    info.total_before_wheel_prize ??
                        (info as { totalBeforeWheelPrize?: unknown })
                            .totalBeforeWheelPrize,
                ) ?? null;
            const wheelPrizeDiscount =
                parseOptionalNumber(info.wheel_prize_discount) ?? 0;
            const offersDiscount =
                parseOptionalNumber(info.offers_discount ?? (info as { offersDiscount?: unknown }).offersDiscount) ?? 0;
            const depositWaived = normalizeBoolean(info.deposit_waived, false);
            const appliedOffers = normalizeAppliedOffersList(info.applied_offers);
            const couponType =
                typeof info.coupon_type === "string"
                    ? info.coupon_type
                    : typeof (info as { discount_type?: unknown }).discount_type ===
                      "string"
                        ? String((info as { discount_type?: unknown }).discount_type)
                        : "";
            const rawCurrencyId =
                (info as { currency_id?: unknown }).currency_id ??
                (info as { currencyId?: unknown }).currencyId;
            const currencyId =
                typeof rawCurrencyId === "number" && Number.isFinite(rawCurrencyId)
                    ? rawCurrencyId
                    : typeof rawCurrencyId === "string"
                        ? rawCurrencyId
                        : baseForm.currency_id;
            const locationValue = toSafeString(
                (info as { location?: unknown }).location,
                baseForm.location ?? "",
            );
            const formatted: AdminBookingFormValues = {
                ...baseForm,
                ...info,
                id: info.id ?? activityDetails.id ?? null,
                booking_number:
                    info.booking_number ?? info.id ?? activityDetails.id ?? null,
                rental_start_date: toLocalDateTimeInput(info.rental_start_date),
                rental_end_date: toLocalDateTimeInput(info.rental_end_date),
                coupon_amount: couponAmount,
                coupon_type: couponType,
                coupon_code: toSafeString(info.coupon_code, ""),
                customer_name: toSafeString(
                    info.customer_name ?? info.customer?.name,
                    "",
                ),
                customer_email: toSafeString(
                    info.customer_email ?? info.customer?.email,
                    "",
                ),
                customer_phone: toSafeString(
                    info.customer_phone ?? info.customer?.phone,
                    "",
                ),
                customer_age: info.customer_age ?? info.customer?.age ?? null,
                customer_id: info.customer_id ?? info.customer?.id ?? null,
                car_id: carId,
                car_name: toSafeString(info.car_name ?? carInfo?.name, ""),
                car_image: carImage,
                car_license_plate: carLicensePlate,
                car_transmission: carTransmission,
                car_fuel: carFuel,
                car_deposit: carDeposit,
                service_ids: serviceIds,
                services: Array.isArray(info.services) ? info.services : [],
                total_services: totalServices,
                sub_total: subTotal,
                total,
                tax_amount: taxAmount,
                price_per_day: pricePerDay,
                original_price_per_day: originalPricePerDay,
                base_price: parseOptionalNumber(info.base_price) ?? pricePerDay,
                base_price_casco:
                    parseOptionalNumber(info.base_price_casco) ?? pricePerDay,
                days: parseOptionalNumber(info.days) ?? 0,
                keep_old_price: normalizeBoolean(info.keep_old_price, true),
                send_email: normalizeBoolean(info.send_email, false),
                with_deposit: normalizeBoolean(info.with_deposit, false),
                status: toSafeString(info.status, ""),
                total_before_wheel_prize: totalBeforeWheelPrize,
                wheel_prize_discount: wheelPrizeDiscount,
                wheel_prize: (info.wheel_prize ?? null) as AdminBookingFormValues["wheel_prize"],
                offers_discount: offersDiscount,
                deposit_waived: depositWaived,
                applied_offers: appliedOffers,
                advance_payment: advancePayment,
                note: toSafeString(info.note, ""),
                currency_id: currencyId,
                location: locationValue,
            };
            setBookingInfo(formatted);
            setPopupOpen(false);
            setEditPopupOpen(true);
        } catch (err) {
            console.error('Error loading booking info:', err);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {showExpiringAlert && expiringAlertItems.length > 0 && (
                    <div className="mb-8 rounded-xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="mt-1 h-6 w-6 flex-shrink-0 text-orange-500" />
                            <div className="flex-1">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="font-poppins text-lg font-semibold text-berkeley">
                                            Alertă documente ce expiră curând
                                        </h2>
                                        <p className="mt-1 text-sm font-dm-sans text-gray-700">
                                            Următoarele mașini au documente care expiră în cel mult {EXPIRING_DAYS_THRESHOLD} zile:
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDismissExpiringAlert}
                                        className="inline-flex rounded-full p-1 text-orange-500 transition hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-300"
                                        aria-label="Închide alerta pentru documente ce expiră"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <ul className="mt-4 space-y-2">
                                    {expiringAlertItems.map((item) => (
                                        <li
                                            key={item.id}
                                            className="text-sm font-dm-sans text-gray-800"
                                        >
                                            <span className="font-semibold text-gray-900">{item.name}</span>
                                            {item.licensePlate !== "—" && (
                                                <span className="text-gray-600"> ({item.licensePlate})</span>
                                            )}
                                            <span className="text-gray-600"> — </span>
                                            {item.documents.map((doc, index) => (
                                                <span key={`${item.id}-${doc.field}`} className="text-gray-800">
                                                    <span className="font-medium text-gray-900">{doc.label}</span>
                                                    {": "}
                                                    {formatExpiryDistance(doc.days)}
                                                    {index < item.documents.length - 1 ? "; " : ""}
                                                </span>
                                            ))}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-4 text-sm font-dm-sans text-gray-600">
                                    Verifică detalii complete în secțiunea flotă pentru actualizarea documentelor.
                                    <span className="ml-1">
                                        <Link
                                            href="/admin/cars"
                                            className="font-semibold text-berkeley underline-offset-2 hover:underline"
                                        >
                                            Deschide flotă
                                        </Link>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-dm-sans text-gray-600">
                                    Rezervări astăzi
                                </p>
                                <p className="text-2xl font-poppins font-bold text-berkeley">
                                    {bookingsTodayCount}
                                </p>
                            </div>
                            <Calendar className="h-8 w-8 text-jade" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-dm-sans text-gray-600">
                                    Mașini disponibile
                                </p>
                                <p className="text-2xl font-poppins font-bold text-berkeley">
                                    {availableCarsCount}
                                </p>
                            </div>
                            <Car className="h-8 w-8 text-jade" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-dm-sans text-gray-600">
                                    Total rezervări
                                </p>
                                <p className="text-2xl font-poppins font-bold text-berkeley">
                                    {bookingsTotalCount}
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-jade" />
                        </div>
                    </div>

                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Calendar */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-poppins font-semibold text-berkeley">
                                Activitate Auto - {getCarActivityLabel(carActivityDay)}
                            </h2>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-sm font-dm-sans text-gray-600">Plecare</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <span className="text-sm font-dm-sans text-gray-600">Sosire</span>
                                </div>
                            </div>
                        </div>

                        {/* Day Selector */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Calendar className="h-5 w-5 text-jade" />
                                    <Label htmlFor="day-selector" className="text-sm font-dm-sans font-semibold text-gray-700">
                                        Selectează ziua:
                                    </Label>
                                </div>
                                <Button
                                    variant="yellow"
                                    onClick={() => {
                                        setContractReservation(null);
                                        setContractOpen(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-berkeley hover:bg-gray-100 rounded-lg transition-colors duration-200"
                                >
                                    <Newspaper className="h-4 w-4 me-1" />
                                    Crează contract
                                </Button>
                            </div>
                            <div className="mt-2">
                                <Select
                                    id="day-selector"
                                    value={carActivityDay}
                                    className="w-full max-w-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent"
                                    aria-label="Selectează ziua"
                                    onValueChange={setCarActivityDay}
                                >
                                    <option value="azi">Astăzi - {new Date().toLocaleDateString('ro-RO')}</option>
                                    <option value="maine">Mâine - {new Date(Date.now() + 86400000).toLocaleDateString('ro-RO')}</option>
                                    <option value="2zile">Peste 2 zile - {new Date(Date.now() + 172800000).toLocaleDateString('ro-RO')}</option>
                                    <option value="3zile">Peste 3 zile - {new Date(Date.now() + 259200000).toLocaleDateString('ro-RO')}</option>
                                    <option value="4zile">Peste 4 zile - {new Date(Date.now() + 345600000).toLocaleDateString('ro-RO')}</option>
                                    <option value="5zile">Peste 5 zile - {new Date(Date.now() + 432000000).toLocaleDateString('ro-RO')}</option>
                                </Select>
                            </div>
                        </div>

                        {/* Activity Schedule */}
                        <div className="space-y-6">
                            {activityHours.map((hour) => {
                                const events = activityReservations.filter((res) => {
                                    const startStr = res.rental_start_date.slice(0, 10);
                                    const endStr = res.rental_end_date.slice(0, 10);
                                    return (
                                        (startStr === activityDay && res.start_hour_group.slice(0, 5) === hour) ||
                                        (endStr === activityDay && res.end_hour_group.slice(0, 5) === hour)
                                    );
                                });
                                return (
                                    <div key={hour} className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gradient-to-r from-berkeley/5 to-jade/5 px-6 py-4 border-b border-gray-200">
                                            <div className="flex items-center space-x-3">
                                                <Clock className="h-5 w-5 text-berkeley" />
                                                <h3 className="text-lg font-poppins font-semibold text-berkeley">{hour}</h3>
                                                <span className="text-sm font-dm-sans text-gray-600">
                                                    {events.length} activitate{events.length !== 1 ? 'i' : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {events.map((r) => {
                                                const startStr = r.rental_start_date.slice(0, 10);
                                                const isDeparture =
                                                    startStr === activityDay &&
                                                    r.start_hour_group.slice(0, 5) === hour;
                                                const hasDeposit = normalizeBoolean(r.with_deposit, false);
                                                const depositLabel = hasDeposit ? 'Cu garanție' : 'Fără garanție';
                                                const depositBadgeClass = hasDeposit
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-amber-100 text-amber-800';
                                                return (
                                                    <div
                                                        key={r.id + (isDeparture ? 'start' : 'end')}
                                                        className={`px-6 py-4 ${
                                                            isDeparture ? 'hover:bg-green-50' : 'hover:bg-red-50'
                                                        } transition-colors duration-200`}
                                                    >
                                                        <div className="flex items-center space-x-4">
                                                            <div className="flex-shrink-0">
                                                                <div
                                                                    className={`w-4 h-4 ${
                                                                        isDeparture ? 'bg-green-500' : 'bg-red-500'
                                                                    } rounded-full flex items-center justify-center`}
                                                                >
                                                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center flex-col md:flex-row space-x-3">
                                                                    <span
                                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                            isDeparture
                                                                                ? 'bg-green-100 text-green-800'
                                                                                : 'bg-red-100 text-red-800'
                                                                        }`}
                                                                    >
                                                                        {isDeparture ? 'Plecare' : 'Sosire'}
                                                                    </span>
                                                                    <span className="text-sm font-dm-sans font-semibold text-gray-900">
                                                                        {r.car?.license_plate}
                                                                    </span>
                                                                    {!isDeparture && (
                                                                        <span
                                                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${depositBadgeClass}`}
                                                                        >
                                                                            {depositLabel}
                                                                        </span>
                                                                    )}
                                                                    {r.child_seat_service_name && (
                                                                        <span className="text-sm text-red-500 font-bold">
                                                                            - {r.child_seat_service_name}
                                                                        </span>
                                                                    )}
                                                                    {r.note && (
                                                                        <span className="text-sm text-red-500 font-bold">
                                                                            - {r.note}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="mt-1 grid grid-cols-1 gap-4 text-sm text-gray-600">
                                                                    <div className="flex items-center space-x-1">
                                                                        <User className="h-4 w-4" />
                                                                        <span>{r.customer_name}</span>
                                                                    </div>
                                                                    <div className="flex items-center space-x-1">
                                                                        <Phone className="h-4 w-4" />
                                                                        <span>{r.customer_phone}</span>
                                                                    </div>

                                                                    {r.flight_number && (
                                                                        <div className="flex items-center space-x-1">
                                                                            <Plane className="h-4 w-4" />
                                                                            <span>{r.flight_number}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex-shrink-0">
                                                                <button
                                                                    onClick={() =>
                                                                        openActivity({
                                                                            id: r.id,
                                                                            customer: r.customer_name,
                                                                            phone: r.customer_phone,
                                                                            car: r.car?.license_plate || '',
                                                                            days: r.days,
                                                                            price_per_day: r.price_per_day,
                                                                            sub_total: r.sub_total,
                                                                            total: r.total,
                                                                            services: mapServiceSummaries(r.services),
                                                                            total_services: r.total_services,
                                                                            coupon_amount: r.coupon_amount,
                                                                            coupon_type: r.coupon_type,
                                                                            with_deposit: r.with_deposit,
                                                                            note: r.note ?? null,
                                                                            arrivalDate: r.rental_start_date.slice(0, 10),
                                                                            arrivalTime: r.start_hour_group.slice(0, 5),
                                                                            returnDate: r.rental_end_date.slice(0, 10),
                                                                            returnTime: r.end_hour_group.slice(0, 5),
                                                                        })
                                                                    }
                                                                    className="p-2 text-gray-400 hover:text-berkeley hover:bg-gray-100 rounded-lg transition-colors duration-200"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </button>

                                                                {isDeparture && (<button
                                                                    onClick={() => {
                                                                        setContractReservation(
                                                                            mapActivityReservationToAdmin(r),
                                                                        );
                                                                        setContractOpen(true);
                                                                    }}
                                                                    className="p-2 text-gray-400 hover:text-berkeley hover:bg-gray-100 rounded-lg transition-colors duration-200"
                                                                >
                                                                    <Newspaper className="h-4 w-4" />
                                                                </button>)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            {activityHours.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-poppins font-semibold text-gray-600 mb-2">
                                        Nu există alte activități
                                    </h3>
                                    <p className="text-gray-500 font-dm-sans">
                                        Toate activitățile pentru ziua selectată sunt afișate mai sus.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expiring car documents */}
                <div className="mt-8">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-poppins font-semibold text-berkeley">
                                Documente auto care expiră în {EXPIRING_DAYS_THRESHOLD} zile
                            </h2>
                            <Link
                                href="/admin/cars"
                                className="px-4 py-2 bg-jade text-white font-dm-sans font-semibold rounded-lg hover:bg-jade/90 transition-colors"
                                aria-label="Gestionează flota"
                            >
                                Gestionează flota
                            </Link>
                        </div>

                        {loadingExpiringCars ? (
                            <div className="py-10 text-center">
                                <p className="text-sm font-dm-sans text-gray-500">
                                    Încărcăm lista cu expirări iminente...
                                </p>
                            </div>
                        ) : expiringCarsError ? (
                            <div className="py-10 text-center">
                                <p className="text-sm font-dm-sans text-red-600 mb-4">
                                    {expiringCarsError}
                                </p>
                                <Button onClick={loadExpiringCars} variant="outline">
                                    Reîncarcă lista
                                </Button>
                            </div>
                        ) : expiringCars.length > 0 ? (
                            <DataTable data={expiringCars} columns={expiringDocumentsColumns} />
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                                <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-poppins font-semibold text-gray-600 mb-2">
                                    Nicio expirare în următoarele {EXPIRING_DAYS_THRESHOLD} zile
                                </h3>
                                <p className="text-gray-500 font-dm-sans">
                                    Toate documentele auto sunt în regulă pentru perioada următoare.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {activityDetails && (
                <Popup
                    open={popupOpen}
                    onClose={() => setPopupOpen(false)}
                    className="max-w-xl"
                >
                    <h3 className="text-lg font-poppins font-semibold text-berkeley mb-4">Detalii rezervare</h3>
                    <div className="space-y-2 mb-4">
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Client:</span> {activityDetails.customer}</div>
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Telefon:</span> {activityDetails.phone}</div>
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Mașină:</span> {activityDetails.car}</div>
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Preț per zi:</span> {activityDetails.price_per_day}€ x {activityDetails.days}</div>
                        {activityDetails.services.length > 0 && (
                            <div className="text-sm font-dm-sans">
                                <span className="font-semibold">Servicii:</span>
                                <ul className="list-disc list-inside">
                                    {activityDetails.services.map((s: { id: number; name: string }, index: number) => (
                                        <li key={s.id ?? index}>{s.name}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {activityDetails.services.length > 0 && (<div className="text-sm font-dm-sans"><span className="font-semibold">Preț servicii:</span> {activityDetails.total_services}€</div>)}
                        {activityDetails.coupon_amount > 0 && (<div className="text-sm font-dm-sans"><span className="font-semibold">Discount:</span> {activityDetails.coupon_amount}€</div>)}
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Total:</span> {activityDetails.total}€</div>
                        {activityDetails.note && (<div className="text-sm font-dm-sans"><span className="font-semibold">Notițe:</span> {activityDetails.note}</div>)}

                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="activity-arrival-date">Sosire</Label>
                            <div className="flex flex-col gap-2 lg:flex-row">
                                <Input
                                    id="activity-arrival-date"
                                    type="date"
                                    value={activityDetails.arrivalDate}
                                    onChange={(e) =>
                                        setActivityDetails({
                                            ...activityDetails,
                                            arrivalDate: e.target.value,
                                        })
                                    }
                                />
                                <Input
                                    id="activity-arrival-time"
                                    type="time"
                                    value={activityDetails.arrivalTime}
                                    onChange={(e) =>
                                        setActivityDetails({
                                            ...activityDetails,
                                            arrivalTime: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="activity-return-date">Retur</Label>
                            <div className="flex flex-col gap-2 lg:flex-row">
                                <Input
                                    id="activity-return-date"
                                    type="date"
                                    value={activityDetails.returnDate}
                                    onChange={(e) =>
                                        setActivityDetails({
                                            ...activityDetails,
                                            returnDate: e.target.value,
                                        })
                                    }
                                />
                                <Input
                                    id="activity-return-time"
                                    type="time"
                                    value={activityDetails.returnTime}
                                    onChange={(e) =>
                                        setActivityDetails({
                                            ...activityDetails,
                                            returnTime: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-0 lg:space-x-2">
                            <Button className="!px-4 py-4" variant="danger" onClick={() => setPopupOpen(false)}>Anulează</Button>
                            <Button className="!px-4 py-4" onClick={() => updateDateTime()}>Salvează</Button>
                            <Button className="!px-4 py-4" variant="blue" onClick={handleEditBooking}>Editează</Button>
                        </div>
                    </div>
                </Popup>
            )}
            {bookingInfo && (
                <BookingForm
                    open={editPopupOpen}
                    onClose={() => setEditPopupOpen(false)}
                    bookingInfo={bookingInfo}
                    setBookingInfo={setBookingInfo}
                    onUpdated={loadActivity}
                />
            )}
            <BookingContractForm
                open={contractOpen}
                onClose={() => setContractOpen(false)}
                reservation={contractReservation}
            />
        </div>
    );
};

export default AdminDashboard;
