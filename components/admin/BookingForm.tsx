"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchSelect } from "@/components/ui/search-select";
import { Button } from "@/components/ui/button";
import { Popup } from "@/components/ui/popup";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { normalizeManualCouponType } from "@/lib/bookingDiscounts";
import {
    extractFirstCar,
    mapCustomerSearchResults,
    normalizeAdminCarOption,
} from "@/lib/adminBookingHelpers";
import type {
    AdminBookingCarOption,
    AdminBookingCustomerSummary,
    AdminBookingFormValues,
    AdminBookingLinkedService,
} from "@/types/admin";
import type { ApiCar } from "@/types/car";
import type {
    QuotePricePayload,
    QuotePriceResponse,
    Service,
    CouponTotalDiscountDetails,
} from "@/types/reservation";

const STORAGE_BASE =
    process.env.NEXT_PUBLIC_STORAGE_URL ?? "https://backend.dacars.ro/storage";

const EURO_TO_RON = 5;

const leiFormatter = new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
});

const convertEuroToLei = (value: number | null | undefined): number | null => {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return null;
    }
    return Math.round(value * EURO_TO_RON * 100) / 100;
};

const formatLeiAmount = (value: number | null | undefined): string | null => {
    const converted = convertEuroToLei(value);
    if (converted == null) return null;
    return `${leiFormatter.format(converted)} lei`;
};

const formatEuroAmount = (value: number | null | undefined): string | null => {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return null;
    }
    const rounded = Math.round(value * 100) / 100;
    return leiFormatter.format(rounded);
};

const parsePrice = (raw: unknown): number => {
    if (raw == null) return 0;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
    const parsed = parseFloat(String(raw).replace(/[^\d.,]/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
};

const toDisplayString = (value: unknown, fallback = ""): string => {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return fallback;
};

const resolveAdminCarName = (
    car: AdminBookingCarOption | null | undefined,
    fallback: string,
): string => {
    if (car && typeof car.name === "string") {
        const trimmed = car.name.trim();
        if (trimmed.length > 0) {
            return trimmed;
        }
    }
    return fallback;
};

type CarRelation = AdminBookingCarOption["transmission"];

const resolveRelationLabel = (relation: CarRelation, fallback = ""): string => {
    if (typeof relation === "string") {
        const trimmed = relation.trim();
        return trimmed.length > 0 ? trimmed : fallback;
    }

    if (relation && typeof relation === "object" && "name" in relation) {
        const name = (relation as { name?: unknown }).name;
        if (typeof name === "string") {
            const trimmed = name.trim();
            return trimmed.length > 0 ? trimmed : fallback;
        }
    }

    return fallback;
};

const toOptionalNumber = (value: unknown): number | null => {
    if (value == null || value === "") return null;
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const parsed = Number(value.replace(/[^0-9.,-]/g, "").replace(",", "."));
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

const areApproximatelyEqual = (
    a: number | null | undefined,
    b: number | null | undefined,
    epsilon = 0.01,
): boolean => {
    if (!isFiniteNumber(a) || !isFiniteNumber(b)) {
        return false;
    }
    return Math.abs(a - b) < epsilon;
};

const pickFirstNumber = (candidates: unknown[]): number | null => {
    for (const candidate of candidates) {
        const parsed = toOptionalNumber(candidate);
        if (typeof parsed === "number") {
            return parsed;
        }
    }
    return null;
};

const resolvePlanNumber = (
    preferCasco: boolean,
    depositValue: unknown,
    cascoValue: unknown,
): number | null => {
    const depositNumeric = toOptionalNumber(depositValue);
    const cascoNumeric = toOptionalNumber(cascoValue);
    return preferCasco ? cascoNumeric ?? depositNumeric : depositNumeric ?? cascoNumeric;
};

const resolvePlanAmount = (
    preferCasco: boolean,
    depositCandidates: unknown[],
    cascoCandidates: unknown[],
): number | null => {
    const depositValue = pickFirstNumber(depositCandidates);
    const cascoValue = pickFirstNumber(cascoCandidates);
    return resolvePlanNumber(preferCasco, depositValue, cascoValue);
};

const normalizeQuoteResponse = (
    raw: QuotePriceResponse | null | undefined,
): QuotePriceResponse | null => {
    if (!raw || typeof raw !== "object") {
        return raw ?? null;
    }

    const normalized: QuotePriceResponse = {
        ...raw,
    };

    const applyNumeric = <K extends keyof QuotePriceResponse>(
        key: K,
        value: unknown,
    ) => {
        const numeric = toOptionalNumber(value);
        if (numeric != null) {
            normalized[key] = numeric as QuotePriceResponse[K];
        }
    };

    applyNumeric("price_per_day", raw.price_per_day);
    applyNumeric("price_per_day_casco", raw.price_per_day_casco);
    applyNumeric("base_price", raw.base_price);
    applyNumeric("base_price_casco", raw.base_price_casco);
    applyNumeric("sub_total", raw.sub_total);
    applyNumeric("sub_total_casco", raw.sub_total_casco);
    applyNumeric("subtotal", (raw as { subtotal?: unknown }).subtotal);
    applyNumeric("subtotal_casco", (raw as { subtotal_casco?: unknown }).subtotal_casco);
    applyNumeric("total", raw.total);
    applyNumeric("total_casco", raw.total_casco);
    applyNumeric("days", raw.days);
    applyNumeric("advance_payment", raw.advance_payment);
    applyNumeric("rental_rate", raw.rental_rate);
    applyNumeric("rental_rate_casco", raw.rental_rate_casco);
    applyNumeric("coupon_amount", raw.coupon_amount);
    applyNumeric("coupon_total_discount", raw.coupon_total_discount);
    applyNumeric("total_services", raw.total_services);
    applyNumeric("discount_amount", (raw as { discount_amount?: unknown }).discount_amount);
    applyNumeric("discount_subtotal", (raw as { discount_subtotal?: unknown }).discount_subtotal);
    applyNumeric("discount_total", (raw as { discount_total?: unknown }).discount_total);

    if (
        !(typeof normalized.price_per_day === "number" && Number.isFinite(normalized.price_per_day))
    ) {
        const rentalRateNumeric = toOptionalNumber(raw.rental_rate);
        if (typeof rentalRateNumeric === "number") {
            normalized.price_per_day = rentalRateNumeric;
        }
    }

    if (
        !(typeof normalized.price_per_day_casco === "number" &&
            Number.isFinite(normalized.price_per_day_casco))
    ) {
        const rentalRateCascoNumeric = toOptionalNumber(
            (raw as { rental_rate_casco?: unknown }).rental_rate_casco ?? raw.rental_rate,
        );
        if (typeof rentalRateCascoNumeric === "number") {
            normalized.price_per_day_casco = rentalRateCascoNumeric;
        }
    }

    if (!(typeof normalized.sub_total === "number" && Number.isFinite(normalized.sub_total))) {
        const subtotalNumeric = toOptionalNumber((raw as { subtotal?: unknown }).subtotal);
        if (typeof subtotalNumeric === "number") {
            normalized.sub_total = subtotalNumeric;
        }
    }

    if (
        !(typeof normalized.sub_total_casco === "number" &&
            Number.isFinite(normalized.sub_total_casco))
    ) {
        const subtotalCascoNumeric = toOptionalNumber(
            (raw as { subtotal_casco?: unknown }).subtotal_casco ?? (raw as { subtotal?: unknown }).subtotal,
        );
        if (typeof subtotalCascoNumeric === "number") {
            normalized.sub_total_casco = subtotalCascoNumeric;
        }
    }

    if (!(typeof normalized.total === "number" && Number.isFinite(normalized.total))) {
        const totalNumeric = toOptionalNumber((raw as { total?: unknown }).total);
        if (typeof totalNumeric === "number") {
            normalized.total = totalNumeric;
        }
    }

    if (
        !(typeof normalized.total_casco === "number" &&
            Number.isFinite(normalized.total_casco))
    ) {
        const totalCascoNumeric = toOptionalNumber(
            (raw as { total_casco?: unknown }).total_casco ?? (raw as { total?: unknown }).total,
        );
        if (typeof totalCascoNumeric === "number") {
            normalized.total_casco = totalCascoNumeric;
        }
    }

    const discountRaw = raw.discount;
    if (discountRaw && typeof discountRaw === "object" && !Array.isArray(discountRaw)) {
        const discountObject = discountRaw as {
            discount?: unknown;
            subtotal?: unknown;
            total?: unknown;
        };
        const breakdown = {
            discount: toOptionalNumber(discountObject.discount) ?? undefined,
            subtotal: toOptionalNumber(discountObject.subtotal) ?? undefined,
            total: toOptionalNumber(discountObject.total) ?? undefined,
        };
        normalized.discount_breakdown = breakdown;
        const subtotalBefore = pickFirstNumber([
            normalized.subtotal,
            normalized.sub_total,
            (raw as { subtotal?: unknown }).subtotal,
        ]);
        if (breakdown.subtotal != null) {
            normalized.discount_subtotal = breakdown.subtotal;
        }
        if (breakdown.discount != null) {
            normalized.discount = breakdown.discount;
            normalized.discount_amount = breakdown.discount;
            normalized.discount_total = breakdown.total ?? breakdown.discount;
        }
        if (
            (breakdown.discount == null || breakdown.discount === 0) &&
            subtotalBefore != null &&
            breakdown.subtotal != null &&
            subtotalBefore > breakdown.subtotal
        ) {
            const derivedDiscount = Math.round((subtotalBefore - breakdown.subtotal) * 100) / 100;
            normalized.discount = derivedDiscount;
            normalized.discount_amount = derivedDiscount;
            normalized.discount_total = derivedDiscount;
            breakdown.discount = derivedDiscount;
            if (breakdown.total == null || breakdown.total === 0) {
                breakdown.total = derivedDiscount;
            }
        }
        if (breakdown.total != null && (normalized.discount_total == null || normalized.discount_total === 0)) {
            normalized.discount_total = breakdown.total;
        }
    } else {
        const numericDiscount = toOptionalNumber(discountRaw);
        if (numericDiscount != null) {
            normalized.discount = numericDiscount;
            normalized.discount_amount = numericDiscount;
        }
    }

    const subtotalNumeric = pickFirstNumber([
        normalized.subtotal,
        normalized.sub_total,
        (raw as { subtotal?: unknown }).subtotal,
    ]);
    if (subtotalNumeric != null) {
        normalized.subtotal = subtotalNumeric;
        normalized.sub_total = subtotalNumeric;
    }

    const subtotalCascoNumeric = pickFirstNumber([
        normalized.subtotal_casco,
        normalized.sub_total_casco,
        (raw as { subtotal_casco?: unknown }).subtotal_casco,
        subtotalNumeric,
    ]);
    if (subtotalCascoNumeric != null) {
        normalized.subtotal_casco = subtotalCascoNumeric;
        normalized.sub_total_casco = subtotalCascoNumeric;
    }

    const totalNumeric = pickFirstNumber([normalized.total, (raw as { total?: unknown }).total]);
    if (totalNumeric != null) {
        normalized.total = totalNumeric;
    }

    const totalCascoNumeric = pickFirstNumber([
        normalized.total_casco,
        (raw as { total_casco?: unknown }).total_casco,
        totalNumeric,
    ]);
    if (totalCascoNumeric != null) {
        normalized.total_casco = totalCascoNumeric;
    }

    const totalServicesNumeric = pickFirstNumber([
        normalized.total_services,
        (raw as { total_services?: unknown }).total_services,
    ]);
    if (totalServicesNumeric != null) {
        normalized.total_services = totalServicesNumeric;
    }

    const duplicateNumeric = (
        sourceKey: keyof QuotePriceResponse,
        targetKey: keyof QuotePriceResponse,
    ) => {
        const value = normalized[sourceKey];
        if (typeof value === "number" && Number.isFinite(value)) {
            const current = normalized[targetKey];
            if (!(typeof current === "number" && Number.isFinite(current))) {
                (normalized as Record<string, unknown>)[String(targetKey)] = value;
            }
        }
    };

    duplicateNumeric("base_price", "base_price_casco");
    duplicateNumeric("rental_rate", "rental_rate_casco");
    duplicateNumeric("price_per_day", "price_per_day_casco");
    duplicateNumeric("sub_total", "sub_total_casco");
    duplicateNumeric("subtotal", "subtotal_casco");
    duplicateNumeric("total", "total_casco");
    duplicateNumeric("discount", "discount_casco");
    duplicateNumeric("discount_amount", "discount_amount_casco");
    duplicateNumeric("discount_subtotal", "discount_subtotal_casco");
    duplicateNumeric("discount_total", "discount_total_casco");

    const withDepositRaw = raw.with_deposit;
    if (typeof withDepositRaw === "boolean") {
        normalized.with_deposit = withDepositRaw;
    } else if (typeof withDepositRaw === "string") {
        const trimmed = withDepositRaw.trim().toLowerCase();
        normalized.with_deposit = ["1", "true", "da", "yes"].includes(trimmed);
    } else if (typeof withDepositRaw === "number") {
        normalized.with_deposit = withDepositRaw !== 0;
    }

    return normalized;
};

const normalizeServiceIds = (values: unknown): number[] => {
    if (!Array.isArray(values)) return [];

    const parsed = values
        .map((raw) => {
            if (typeof raw === "number") {
                return Number.isFinite(raw) ? raw : null;
            }
            if (typeof raw === "string") {
                return toOptionalNumber(raw);
            }
            return null;
        })
        .filter((value): value is number => value != null)
        .sort((a, b) => a - b);

    return parsed.filter((value, index) => index === 0 || value !== parsed[index - 1]);
};

const extractLinkedServiceIds = (
    services: AdminBookingLinkedService[] | null | undefined,
): number[] => {
    if (!Array.isArray(services)) {
        return [];
    }

    const rawIds = services
        .map((service) => {
            if (!service) return null;
            if (typeof service.id === "number" || typeof service.id === "string") {
                return service.id;
            }
            const fallback = (service as { service_id?: number | string | null }).service_id;
            if (typeof fallback === "number" || typeof fallback === "string") {
                return fallback;
            }
            return null;
        })
        .filter((value): value is number | string => value != null);

    return normalizeServiceIds(rawIds);
};

const resolveServiceSelection = (
    info: Pick<AdminBookingFormValues, "service_ids" | "services"> | null | undefined,
): number[] => {
    if (!info) return [];

    const explicitIds = normalizeServiceIds(info.service_ids);
    const linkedIds = extractLinkedServiceIds(info.services ?? null);

    if (explicitIds.length === 0) {
        return linkedIds;
    }

    if (linkedIds.length === 0) {
        return explicitIds;
    }

    const merged = [...explicitIds];
    linkedIds.forEach((id) => {
        if (!merged.includes(id)) {
            merged.push(id);
        }
    });
    return merged.sort((a, b) => a - b);
};

const toApiDateTime = (value: string | null | undefined): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return undefined;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
        return `${trimmed}:00`;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)) {
        return `${trimmed.replace(" ", "T")}:00`;
    }
    return trimmed;
};

const trimmedOrNull = (value: unknown): string | null => {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const resolveBookingIdentifier = (
    values: Pick<AdminBookingFormValues, "id" | "booking_number">,
): number | string | null => {
    if (typeof values.id === "number" && Number.isFinite(values.id)) {
        return values.id;
    }
    if (typeof values.id === "string") {
        const normalized = trimmedOrNull(values.id);
        if (normalized) {
            return normalized;
        }
    }

    if (
        typeof values.booking_number === "number" &&
        Number.isFinite(values.booking_number)
    ) {
        return values.booking_number;
    }
    if (typeof values.booking_number === "string") {
        const normalized = trimmedOrNull(values.booking_number);
        if (normalized) {
            return normalized;
        }
    }

    return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const normalizeDateTimeString = (value: string): string => {
    const trimmed = value.trim().replace(" ", "T");
    if (/T\d{2}:\d{2}$/.test(trimmed)) {
        return `${trimmed}:00`;
    }
    return trimmed;
};

const parseDateTimeValue = (value: string | null | undefined): Date | null => {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return null;
    }
    const normalized = normalizeDateTimeString(trimmed);
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
};

const parsePeriodDate = (value: string | null | undefined): Date | null => {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return null;
    }
    const normalized = trimmed.includes("T") ? trimmed : `${trimmed}T00:00:00`;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
};

const buildQuotePayload = (
    values: AdminBookingFormValues,
    serviceIds: number[],
): QuotePricePayload => {
    const carId = typeof values.car_id === "number" ? values.car_id : Number(values.car_id ?? 0);
    const payload: QuotePricePayload = {
        car_id: carId,
        rental_start_date: toApiDateTime(values.rental_start_date) ?? values.rental_start_date,
        rental_end_date: toApiDateTime(values.rental_end_date) ?? values.rental_end_date,
        with_deposit: values.with_deposit,
        keep_old_price: values.keep_old_price !== false,
        service_ids: serviceIds,
    };

    const bookingIdentifier = resolveBookingIdentifier(values);
    if (bookingIdentifier != null) {
        payload.booking_id = bookingIdentifier;
    }

    const customerEmail = trimmedOrNull(values.customer_email);
    if (customerEmail) {
        payload.customer_email = customerEmail;
    }

    const totalServices = toOptionalNumber(values.total_services);
    if (totalServices != null) {
        payload.total_services = totalServices;
    }

    const couponType = normalizeManualCouponType(values.coupon_type);
    if (couponType) {
        payload.coupon_type = couponType;
        if (couponType === "code") {
            const couponCode = trimmedOrNull(values.coupon_code);
            if (couponCode) {
                payload.coupon_code = couponCode;
            }
        } else {
            const couponAmount = toOptionalNumber(values.coupon_amount);
            if (couponAmount != null) {
                payload.coupon_amount = couponAmount;
            }
            const couponCode = trimmedOrNull(values.coupon_code);
            if (couponCode) {
                payload.coupon_code = couponCode;
            }
        }
    } else {
        const couponCode = trimmedOrNull(values.coupon_code);
        if (couponCode) {
            payload.coupon_code = couponCode;
        }
    }

    const basePrice =
        toOptionalNumber(values.base_price) ??
        toOptionalNumber(values.price_per_day) ??
        toOptionalNumber(values.original_price_per_day);
    if (basePrice != null) {
        payload.base_price = basePrice;
    }

    const basePriceCasco = toOptionalNumber(values.base_price_casco);
    if (basePriceCasco != null) {
        payload.base_price_casco = basePriceCasco;
    }

    const originalPrice = toOptionalNumber(values.original_price_per_day);
    if (originalPrice != null) {
        payload.original_price_per_day = originalPrice;
    }

    const advancePayment = toOptionalNumber(values.advance_payment);
    if (advancePayment != null) {
        payload.advance_payment = advancePayment;
    }

    return payload;
};

const buildBookingUpdatePayload = (
    values: AdminBookingFormValues,
    serviceIds: number[],
): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
        service_ids: serviceIds,
        with_deposit: values.with_deposit !== false,
        keep_old_price: values.keep_old_price !== false,
        send_email: values.send_email !== false,
    };

    const bookingIdentifier = resolveBookingIdentifier(values);

    if (bookingIdentifier != null) {
        payload.booking_id = bookingIdentifier;
    }

    const rentalStart = toApiDateTime(values.rental_start_date);
    if (rentalStart) {
        payload.rental_start_date = rentalStart;
    }
    const rentalEnd = toApiDateTime(values.rental_end_date);
    if (rentalEnd) {
        payload.rental_end_date = rentalEnd;
    }

    const rawCarId = values.car_id as unknown;
    if (typeof rawCarId === "number") {
        payload.car_id = rawCarId;
    } else if (typeof rawCarId === "string" && rawCarId.trim().length > 0) {
        payload.car_id = rawCarId.trim();
    }

    const couponType = normalizeManualCouponType(values.coupon_type);
    if (couponType) {
        payload.coupon_type = couponType;
    }

    if (couponType === "code") {
        const couponCode = trimmedOrNull(values.coupon_code);
        if (couponCode) {
            payload.coupon_code = couponCode;
        }
    } else {
        const couponAmount = toOptionalNumber(values.coupon_amount);
        if (couponAmount != null) {
            payload.coupon_amount = couponAmount;
        }
        const couponCode = trimmedOrNull(values.coupon_code);
        if (couponCode) {
            payload.coupon_code = couponCode;
        }
    }

    const customerName = trimmedOrNull(values.customer_name);
    if (customerName) {
        payload.customer_name = customerName;
    }
    const customerEmail = trimmedOrNull(values.customer_email);
    if (customerEmail) {
        payload.customer_email = customerEmail;
    }
    const customerPhone = trimmedOrNull(values.customer_phone);
    if (customerPhone) {
        payload.customer_phone = customerPhone;
    }

    const customerAge = toOptionalNumber(values.customer_age);
    if (customerAge != null) {
        payload.customer_age = customerAge;
    }

    if (
        typeof values.customer_id === "number" ||
        (typeof values.customer_id === "string" && values.customer_id.trim().length > 0)
    ) {
        payload.customer_id = values.customer_id;
    }

    const basePrice = toOptionalNumber(values.base_price);
    if (basePrice != null) {
        payload.base_price = basePrice;
    }
    const basePriceCasco = toOptionalNumber(values.base_price_casco);
    if (basePriceCasco != null) {
        payload.base_price_casco = basePriceCasco;
    }
    const carDeposit = toOptionalNumber(values.car_deposit);
    if (carDeposit != null) {
        payload.car_deposit = carDeposit;
    }
    const pricePerDay = toOptionalNumber(values.price_per_day);
    if (pricePerDay != null) {
        payload.price_per_day = pricePerDay;
    }
    const originalPrice = toOptionalNumber(values.original_price_per_day);
    if (originalPrice != null) {
        payload.original_price_per_day = originalPrice;
    }

    const totalServices = toOptionalNumber(values.total_services);
    if (totalServices != null) {
        payload.total_services = totalServices;
    }

    const subtotal = toOptionalNumber(values.sub_total);
    if (subtotal != null) {
        payload.sub_total = subtotal;
    }

    const total = toOptionalNumber(values.total);
    if (total != null) {
        payload.total = total;
    }

    const taxAmount = toOptionalNumber(values.tax_amount);
    if (taxAmount != null) {
        payload.tax_amount = taxAmount;
    }

    const days = toOptionalNumber(values.days);
    if (days != null) {
        payload.days = days;
    }

    const advancePayment = toOptionalNumber(values.advance_payment);
    if (advancePayment != null) {
        payload.advance_payment = advancePayment;
    }

    const status = trimmedOrNull(values.status);
    if (status) {
        payload.status = status;
    }

    const note = trimmedOrNull(values.note);
    if (note) {
        payload.note = note;
    }

    const location = trimmedOrNull(values.location);
    if (location) {
        payload.location = location;
    }

    const currencyId =
        typeof values.currency_id === "number"
            ? values.currency_id
            : typeof values.currency_id === "string" && values.currency_id.trim().length > 0
                ? values.currency_id
                : null;
    if (currencyId != null) {
        payload.currency_id = currencyId;
    }

    return payload;
};

interface BookingFormProps {
    open: boolean;
    onClose: () => void;
    bookingInfo: AdminBookingFormValues | null;
    setBookingInfo: React.Dispatch<React.SetStateAction<AdminBookingFormValues | null>>;
    onUpdated?: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({
    open,
    onClose,
    bookingInfo,
    setBookingInfo,
    onUpdated,
}) => {
    const [carSearch, setCarSearch] = useState("");
    const [carResults, setCarResults] = useState<AdminBookingCarOption[]>([]);
    const [carSearchActive, setCarSearchActive] = useState(false);
    const [services, setServices] = useState<Service[]>([]);

    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<AdminBookingCustomerSummary[]>([]);
    const [customerSearchActive, setCustomerSearchActive] = useState(false);
    const [quote, setQuote] = useState<QuotePriceResponse | null>(null);
    const originalTotals = useRef<{ subtotal: number; total: number }>({
        subtotal: 0,
        total: 0,
    });
    const lastQuoteKeyRef = useRef<string | null>(null);

    const updateBookingInfo = useCallback(
        (updater: (prev: AdminBookingFormValues) => AdminBookingFormValues) => {
            setBookingInfo((prev) => (prev ? updater(prev) : prev));
        },
        [setBookingInfo],
    );

    const fetchCars = useCallback(
        async (query: string) => {
            try {
                const resp = await apiClient.getCars({
                    search: query,
                    start_date: bookingInfo?.rental_start_date ?? undefined,
                    end_date: bookingInfo?.rental_end_date ?? undefined,
                    limit: 100,
                });
                const list = extractList(resp).map(normalizeAdminCarOption);
                setCarResults(list);
            } catch (error) {
                console.error("Error searching cars:", error);
            }
        },
        [bookingInfo?.rental_start_date, bookingInfo?.rental_end_date],
    );

    const fetchCustomers = useCallback(async (query: string) => {
        try {
            const resp = await apiClient.searchCustomersByPhone(query);
            const records = Array.isArray(resp) ? resp : extractList(resp);
            const list = mapCustomerSearchResults(records);
            setCustomerResults(list);
        } catch (error) {
            console.error("Error searching customers:", error);
        }
    }, []);

    const hasBookingInfo = Boolean(bookingInfo);
    const selectedServiceIds = useMemo(
        () => resolveServiceSelection(bookingInfo),
        [bookingInfo],
    );
    const rentalStart = bookingInfo?.rental_start_date ?? "";
    const rentalEnd = bookingInfo?.rental_end_date ?? "";
    const bookingCarId = bookingInfo?.car_id ?? null;
    const bookingCarLicense = bookingInfo?.car_license_plate ?? "";
    const bookingCarTransmission = bookingInfo?.car_transmission ?? "";
    const bookingCarFuel = bookingInfo?.car_fuel ?? "";
    const normalizedCouponType = normalizeManualCouponType(bookingInfo?.coupon_type);
    const hasManualCoupon = normalizedCouponType.length > 0;
    const couponTypeValue = hasManualCoupon ? normalizedCouponType : "none";
    const couponValueLabel =
        normalizedCouponType === "code"
            ? "Cod cupon"
            : normalizedCouponType === "percentage"
                ? "Procentaj (%)"
                : "Valoare";
    const couponValueInputProps =
        normalizedCouponType === "percentage"
            ? { min: 0, max: 100, step: 0.1 }
            : {};
    const couponValueInputType = normalizedCouponType === "code" ? "text" : "text";
    const couponValueInputDisabled = !hasManualCoupon;
    const couponValue =
        normalizedCouponType === "code"
            ? bookingInfo?.coupon_code ?? ""
            : hasManualCoupon
                ? bookingInfo?.coupon_amount ?? 0
                : "";
    const selectedCarOption = bookingInfo?.car_id
        ? normalizeAdminCarOption({
              id: bookingInfo.car_id,
              name: bookingInfo.car_name,
              image_preview: bookingInfo.car_image,
              number_of_seats: 0,
              license_plate: bookingInfo.car_license_plate,
              transmission: { name: bookingInfo.car_transmission },
              fuel: { name: bookingInfo.car_fuel },
          } as ApiCar)
        : null;

    const rentalStartDateValue = useMemo(() => parseDateTimeValue(rentalStart), [rentalStart]);
    const rentalEndDateValue = useMemo(() => parseDateTimeValue(rentalEnd), [rentalEnd]);


    useEffect(() => {
        setQuote(null);
        lastQuoteKeyRef.current = null;
    }, [bookingInfo?.id]);

    useEffect(() => {
        if (!bookingInfo) {
            return;
        }

        const normalizedServiceIds = resolveServiceSelection(bookingInfo);

        if (
            !bookingInfo.car_id ||
            !bookingInfo.rental_start_date ||
            !bookingInfo.rental_end_date
        ) {
            return;
        }

        const quotePayload = buildQuotePayload(bookingInfo, normalizedServiceIds);
        const quoteKey = JSON.stringify(quotePayload);

        if (lastQuoteKeyRef.current === quoteKey) {
            return;
        }

        let cancelled = false;

        const quotePrice = async () => {
            try {
                lastQuoteKeyRef.current = quoteKey;
                const data = await apiClient.quotePrice(quotePayload);
                if (cancelled) {
                    return;
                }
                const normalizedData = normalizeQuoteResponse(data) ?? data;
                setQuote(normalizedData);
                updateBookingInfo((prev) => {
                    const preferCasco = prev.with_deposit === false;
                    const prevPricePerDay = toOptionalNumber(prev.price_per_day);
                    const prevOriginalPrice = toOptionalNumber(prev.original_price_per_day);
                    const prevDiscountApplied = toOptionalNumber(prev.discount_applied);
                    const manualCouponType = normalizeManualCouponType(prev.coupon_type);
                    const manualCouponAmount = toOptionalNumber(prev.coupon_amount);
                    const hasFixedPerDayOverride =
                        manualCouponType === "fixed_per_day" &&
                        typeof manualCouponAmount === "number" &&
                        Number.isFinite(manualCouponAmount) &&
                        manualCouponAmount > 0;
                    const manualOverrideRate = hasFixedPerDayOverride
                        ? Math.round(manualCouponAmount * 100) / 100
                        : null;
                    const depositRateCandidate = pickFirstNumber([
                        normalizedData.rental_rate,
                        normalizedData.base_price,
                        normalizedData.price_per_day,
                        prev.base_price,
                        prev.price_per_day,
                    ]);
                    const cascoRateCandidate = pickFirstNumber([
                        (normalizedData as { rental_rate_casco?: unknown }).rental_rate_casco,
                        (normalizedData as { base_price_casco?: unknown }).base_price_casco,
                        (normalizedData as { price_per_day_casco?: unknown }).price_per_day_casco,
                        prev.base_price_casco,
                        prev.price_per_day,
                    ]);
                    const selectedRateCandidate = preferCasco
                        ? cascoRateCandidate ?? prevPricePerDay ?? depositRateCandidate
                        : depositRateCandidate ?? prevPricePerDay ?? cascoRateCandidate;
                    const normalizedSelectedRate =
                        typeof selectedRateCandidate === "number" && Number.isFinite(selectedRateCandidate)
                            ? Math.round(selectedRateCandidate * 100) / 100
                            : null;
                    const normalizedDepositRate =
                        typeof depositRateCandidate === "number" && Number.isFinite(depositRateCandidate)
                            ? Math.round(depositRateCandidate * 100) / 100
                            : null;
                    const normalizedCascoRate =
                        typeof cascoRateCandidate === "number" && Number.isFinite(cascoRateCandidate)
                            ? Math.round(cascoRateCandidate * 100) / 100
                            : null;

                    const breakdown = (normalizedData as {
                        discount_breakdown?: {
                            discount?: number | null | undefined;
                            subtotal?: number | null | undefined;
                            total?: number | null | undefined;
                        };
                    }).discount_breakdown;

                    const totalServicesValue =
                        toOptionalNumber(normalizedData.total_services) ??
                        toOptionalNumber(prev.total_services) ??
                        0;

                    const normalizedSubtotalBefore = pickFirstNumber([
                        normalizedData.subtotal,
                        normalizedData.sub_total,
                        (normalizedData as { subtotal?: unknown }).subtotal,
                        prev.sub_total,
                    ]);

                    const normalizedDiscountSubtotal = pickFirstNumber([
                        breakdown?.subtotal,
                        normalizedData.discount_subtotal,
                        (normalizedData as { discount_subtotal_casco?: unknown })?.discount_subtotal_casco,
                    ]);

                    const derivedDiscountFromSubtotal =
                        normalizedSubtotalBefore != null &&
                        normalizedDiscountSubtotal != null &&
                        normalizedSubtotalBefore > normalizedDiscountSubtotal
                            ? Math.round((normalizedSubtotalBefore - normalizedDiscountSubtotal) * 100) / 100
                            : null;

                    const nextSubtotalValue =
                        resolvePlanAmount(
                            preferCasco,
                            [
                                breakdown?.subtotal,
                                normalizedData.discount_subtotal,
                                normalizedData.sub_total,
                                normalizedData.subtotal,
                            ],
                            [
                                breakdown?.subtotal,
                                (normalizedData as { discount_subtotal_casco?: unknown })
                                    .discount_subtotal_casco,
                                normalizedData.sub_total_casco,
                                (normalizedData as { subtotal_casco?: unknown }).subtotal_casco,
                            ],
                        ) ?? toOptionalNumber(prev.sub_total);
                    const nextTotalValue =
                        resolvePlanAmount(
                            preferCasco,
                            [
                                normalizedData.total,
                                breakdown?.subtotal != null && totalServicesValue
                                    ? breakdown.subtotal + totalServicesValue
                                    : null,
                                normalizedData.discount_subtotal,
                                normalizedData.discount_total,
                            ],
                            [
                                (normalizedData as { total_casco?: unknown }).total_casco,
                                breakdown?.subtotal != null && totalServicesValue
                                    ? breakdown.subtotal + totalServicesValue
                                    : null,
                                (normalizedData as { discount_subtotal_casco?: unknown })
                                    .discount_subtotal_casco,
                                (normalizedData as { discount_total_casco?: unknown }).discount_total_casco,
                                normalizedData.total_casco,
                            ],
                        ) ?? toOptionalNumber(prev.total);

                    const normalizedDiscountApplied =
                        resolvePlanAmount(
                            preferCasco,
                            [
                                derivedDiscountFromSubtotal,
                                breakdown?.discount,
                                normalizedData.discount,
                                normalizedData.discount_amount,
                                normalizedData.coupon_amount,
                            ],
                            [
                                derivedDiscountFromSubtotal,
                                breakdown?.discount,
                                (normalizedData as { discount_casco?: unknown }).discount_casco,
                                (normalizedData as { discount_amount_casco?: unknown })
                                    .discount_amount_casco,
                            ],
                        ) ?? prevDiscountApplied;

                    const normalizedDays =
                        toOptionalNumber(normalizedData.days) ?? toOptionalNumber(prev.days) ?? 0;

                    return {
                        ...prev,
                        days: normalizedDays,
                        price_per_day:
                            manualOverrideRate ?? normalizedSelectedRate ?? prev.price_per_day,
                        original_price_per_day:
                            prevOriginalPrice ??
                            (typeof prevPricePerDay === "number" && Number.isFinite(prevPricePerDay)
                                ? Math.round(prevPricePerDay * 100) / 100
                                : normalizedSelectedRate ?? null),
                        base_price:
                            manualOverrideRate ??
                            normalizedDepositRate ??
                            toOptionalNumber(normalizedData.base_price) ??
                            prev.base_price ??
                            null,
                        base_price_casco:
                            manualOverrideRate ??
                            normalizedCascoRate ??
                            toOptionalNumber((normalizedData as { base_price_casco?: unknown }).base_price_casco) ??
                            prev.base_price_casco ??
                            null,
                        with_deposit:
                            typeof normalizedData.with_deposit === "boolean"
                                ? normalizedData.with_deposit
                                : prev.with_deposit,
                        sub_total:
                            typeof nextSubtotalValue === "number" && Number.isFinite(nextSubtotalValue)
                                ? nextSubtotalValue
                                : prev.sub_total,
                        total:
                            typeof nextTotalValue === "number" && Number.isFinite(nextTotalValue)
                                ? nextTotalValue
                                : prev.total,
                        discount_applied:
                            typeof normalizedDiscountApplied === "number" && Number.isFinite(normalizedDiscountApplied)
                                ? normalizedDiscountApplied
                                : prevDiscountApplied ?? null,
                        total_services: totalServicesValue,
                    };
                });
            } catch (error) {
                if (lastQuoteKeyRef.current === quoteKey) {
                    lastQuoteKeyRef.current = null;
                }
                console.error("Error quoting price:", error);
            }
        };

        quotePrice();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        bookingInfo?.car_id,
        bookingInfo?.rental_start_date,
        bookingInfo?.rental_end_date,
        bookingInfo?.base_price,
        bookingInfo?.base_price_casco,
        bookingInfo?.original_price_per_day,
        bookingInfo?.coupon_type,
        bookingInfo?.coupon_amount,
        bookingInfo?.coupon_code,
        bookingInfo?.customer_email,
        bookingInfo?.service_ids,
        bookingInfo?.with_deposit,
        bookingInfo?.keep_old_price,
        bookingInfo?.advance_payment,
    ]);


    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await apiClient.getServices();
                const list = Array.isArray(res) ? res : extractList(res);
                const mapped: Service[] = list
                    .map((service) => {
                        const id =
                            typeof service.id === "number"
                                ? service.id
                                : toOptionalNumber(service.id) ?? null;
                        if (id == null) {
                            return null;
                        }
                        return {
                            id,
                            name: service.name ?? "",
                            price: parsePrice(service.price),
                        } satisfies Service;
                    })
                    .filter((service): service is Service => service != null);
                setServices(mapped);
            } catch (error) {
                console.error("Error fetching services:", error);
            }
        };

        fetchServices();
    }, []);

    useEffect(() => {
        if (!carSearchActive) return;
        if (!hasBookingInfo) return;

        if (rentalStart.trim().length === 0 || rentalEnd.trim().length === 0) {
            return;
        }
        const handler = setTimeout(() => {
            fetchCars(carSearch);
        }, 300);
        return () => clearTimeout(handler);
    }, [
        carSearch,
        fetchCars,
        carSearchActive,
        hasBookingInfo,
        rentalStart,
        rentalEnd,
    ]);

    useEffect(() => {
        if (!customerSearchActive) return;
        if (customerSearch.trim().length === 0) {
            setCustomerResults([]);
            return;
        }
        const handler = setTimeout(() => {
            fetchCustomers(customerSearch);
        }, 300);
        return () => clearTimeout(handler);
    }, [customerSearch, fetchCustomers, customerSearchActive]);

    // Populate customer details only when a suggestion is selected

    const recalcTotals = useCallback((info: AdminBookingFormValues): AdminBookingFormValues => {
        const normalizedType = normalizeManualCouponType(info.coupon_type);
        const parsedCouponAmount = toOptionalNumber(info.coupon_amount);
        const resolvedCouponAmount =
            normalizedType === "code"
                ? 0
                : parsedCouponAmount ?? (typeof info.coupon_amount === "number" ? info.coupon_amount : 0);

        const pricePerDayValue = toOptionalNumber(info.price_per_day);
        const basePriceValue = toOptionalNumber(info.base_price);
        const basePriceCascoValue = toOptionalNumber(info.base_price_casco);
        const originalPriceValue = toOptionalNumber(info.original_price_per_day);

        const fallbackBase = basePriceValue ?? pricePerDayValue ?? originalPriceValue ?? null;
        const fallbackCasco = basePriceCascoValue ?? basePriceValue ?? fallbackBase ?? null;
        const hasFixedPerDayOverride = normalizedType === "fixed_per_day" && resolvedCouponAmount > 0;
        const hasActivePerDayDiscount = normalizedType === "per_day" && resolvedCouponAmount > 0;

        const nextBase = hasFixedPerDayOverride ? resolvedCouponAmount : fallbackBase;
        const nextBaseCasco = hasFixedPerDayOverride ? resolvedCouponAmount : fallbackCasco ?? nextBase;
        const nextOriginal = hasActivePerDayDiscount
            ? pickFirstNumber([originalPriceValue, fallbackBase, pricePerDayValue])
            : pickFirstNumber([pricePerDayValue, fallbackBase, originalPriceValue]);

        const hasChanges =
            info.coupon_type !== normalizedType ||
            info.coupon_amount !== (normalizedType === "code" ? 0 : resolvedCouponAmount) ||
            info.base_price !== nextBase ||
            info.base_price_casco !== (nextBaseCasco ?? nextBase) ||
            info.original_price_per_day !== nextOriginal;

        if (!hasChanges) {
            return info;
        }

        return {
            ...info,
            coupon_type: normalizedType,
            coupon_amount: normalizedType === "code" ? 0 : resolvedCouponAmount,
            base_price: nextBase,
            base_price_casco: nextBaseCasco ?? nextBase,
            original_price_per_day: nextOriginal,
        };
    }, []);

    useEffect(() => {
        if (!open || !bookingCarId) return;
        if (bookingCarLicense && bookingCarTransmission && bookingCarFuel) return;
        if (rentalStart.trim().length === 0 || rentalEnd.trim().length === 0) return;
        let ignore = false;
        const load = async () => {
            try {
                const res = await apiClient.getCarForBooking({
                    car_id: bookingCarId ?? 0,
                    start_date: rentalStart,
                    end_date: rentalEnd,
                });
                const car = extractFirstCar(res);
                if (!car || ignore) return;
                const normalized = normalizeAdminCarOption(car);
                updateBookingInfo((prev) => {
                    const imageCandidates: Array<unknown> = [
                        normalized.image_preview,
                        (normalized as Partial<ApiCar>).image,
                        prev.car_image,
                    ];
                    const nextImage =
                        imageCandidates.find(
                            (value): value is string =>
                                typeof value === "string" && value.trim().length > 0,
                        ) ?? "";

                    return recalcTotals({
                        ...prev,
                        car_name: resolveAdminCarName(normalized, prev.car_name),
                        car_image: nextImage,
                        car_license_plate: toDisplayString(
                            normalized.license_plate,
                            prev.car_license_plate,
                        ),
                        car_transmission:
                            resolveRelationLabel(normalized.transmission, prev.car_transmission),
                        car_fuel: resolveRelationLabel(normalized.fuel, prev.car_fuel),
                        price_per_day: parsePrice(
                            normalized.rental_rate ?? prev.price_per_day,
                        ),
                        base_price: parsePrice(normalized.rental_rate),
                        base_price_casco: parsePrice(normalized.rental_rate_casco),
                    });
                });
            } catch (err) {
                console.error("Error loading car:", err);
            }
        };
        load();
        return () => {
            ignore = true;
        };
    }, [
        open,
        bookingCarId,
        bookingCarLicense,
        bookingCarTransmission,
        bookingCarFuel,
        rentalStart,
        rentalEnd,
        recalcTotals,
        updateBookingInfo,
    ]);

    const handleSelectCar = (car: AdminBookingCarOption) => {
        if (!bookingInfo) {
            return;
        }
        const price = car.rental_rate ? Number(car.rental_rate) : bookingInfo.price_per_day;
        const normalized = normalizeAdminCarOption(car);
        const imageCandidates: Array<unknown> = [
            normalized.image_preview,
            (normalized as Partial<ApiCar>).image,
            bookingInfo.car_image,
        ];
        const nextImage =
            imageCandidates.find(
                (value): value is string =>
                    typeof value === "string" && value.trim().length > 0,
            ) ?? "";

        const updated = recalcTotals({
            ...bookingInfo,
            car_id: Number(car.id),
            car_name: resolveAdminCarName(normalized, bookingInfo.car_name),
            car_image: nextImage,
            car_license_plate: toDisplayString(
                normalized.license_plate,
                bookingInfo.car_license_plate,
            ),
            car_transmission: resolveRelationLabel(
                normalized.transmission,
                bookingInfo.car_transmission,
            ),
            car_fuel: resolveRelationLabel(normalized.fuel, bookingInfo.car_fuel),
            price_per_day: price,
            base_price: parsePrice(normalized.rental_rate),
            base_price_casco: parsePrice(normalized.rental_rate_casco),
        });
        setBookingInfo(updated);
        setCarSearch("");
        setCarResults([]);
    };

    const handleSelectCustomer = (customer: AdminBookingCustomerSummary) => {
        if (!bookingInfo) {
            return;
        }
        setBookingInfo({
            ...bookingInfo,
            customer_phone: customer.phone || "",
            customer_name: customer.name || "",
            customer_email: customer.email || "",
            customer_id: customer.id ?? bookingInfo.customer_id,
        });
        setCustomerSearch("");
        setCustomerResults([]);
    };

    const handleCarSearchOpen = useCallback(() => {

        setCarSearchActive(true);
    }, []);

    const handleCustomerSearchOpen = useCallback(() => {
        setCustomerSearchActive(true);
    }, []);

    const toggleService = useCallback(
        (id: number) => {
            if (!hasBookingInfo) return;

            updateBookingInfo((prev) => {
                const currentServiceIds = resolveServiceSelection(prev);
                const hasId = currentServiceIds.includes(id);
                const nextIds = hasId
                    ? currentServiceIds.filter((serviceId) => serviceId !== id)
                    : [...currentServiceIds, id].sort((a, b) => a - b);

                const total = nextIds.reduce((sum, serviceId) => {
                    const svc = services.find((service) => service.id === serviceId);
                    return sum + (svc?.price ?? 0);
                }, 0);

                return recalcTotals({
                    ...prev,
                    service_ids: nextIds,
                    total_services: total,
                });
            });
        },
        [hasBookingInfo, services, updateBookingInfo, recalcTotals],
    );

    useEffect(() => {
        if (!hasBookingInfo) return;

        const total = selectedServiceIds.reduce((sum, id) => {
            const svc = services.find((service) => service.id === id);
            return sum + (svc?.price ?? 0);
        }, 0);

        updateBookingInfo((prev) => {
            const currentServiceIds = resolveServiceSelection(prev);
            const sameServices =
                currentServiceIds.length === selectedServiceIds.length &&
                currentServiceIds.every((id, index) => id === selectedServiceIds[index]);
            const previousTotal =
                typeof prev.total_services === "number"
                    ? prev.total_services
                    : toOptionalNumber(prev.total_services) ?? 0;

            if (sameServices && Math.abs(previousTotal - total) < 0.01) {
                return prev;
            }

            return recalcTotals({
                ...prev,
                service_ids: selectedServiceIds,
                total_services: total,
            });
        });
    }, [
        hasBookingInfo,
        selectedServiceIds,
        services,
        recalcTotals,
        updateBookingInfo,
    ]);

    useEffect(() => {
        if (!open || !bookingInfo) return;

        const subTotalValue = toOptionalNumber(bookingInfo.sub_total) ?? 0;
        const servicesValue = toOptionalNumber(bookingInfo.total_services) ?? 0;
        const totalValue =
            toOptionalNumber(bookingInfo.total) ?? subTotalValue + servicesValue;

        originalTotals.current = {
            subtotal: subTotalValue + servicesValue,
            total: totalValue,
        };
        updateBookingInfo((prev) => recalcTotals(prev));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, bookingInfo, recalcTotals, updateBookingInfo]);

    if (!bookingInfo) return null;

    const days =
        toOptionalNumber(quote?.days) ?? toOptionalNumber(bookingInfo.days) ?? 0;

    const quotePricePerDayDeposit = pickFirstNumber([
        quote?.price_per_day,
        quote?.rental_rate,
        quote?.base_price,
    ]);
    const quoteBasePriceDeposit = pickFirstNumber([
        quote?.base_price,
        quote?.price_per_day,
        quote?.rental_rate,
    ]);
    const quotePricePerDayCasco = pickFirstNumber([
        quote?.price_per_day_casco,
        quote?.rental_rate_casco,
        quote?.rental_rate,
        quote?.price_per_day,
    ]);
    const quoteBasePriceCasco = pickFirstNumber([
        quote?.base_price_casco,
        quote?.price_per_day_casco,
        quote?.base_price,
        quote?.price_per_day,
    ]);
    const basePriceEuro = toOptionalNumber(quote?.base_price);
    const subtotalEuro =
        toOptionalNumber(quote?.subtotal) ?? toOptionalNumber(quote?.sub_total);
    const totalEuro = toOptionalNumber(quote?.total);
    const rentalRateEuro = toOptionalNumber(quote?.rental_rate);
    const advancePaymentEuro = toOptionalNumber(quote?.advance_payment);

    const discountBreakdownRaw =
        quote?.discount_breakdown ??
        (quote?.discount && typeof quote.discount === "object" && !Array.isArray(quote.discount)
            ? (quote.discount as { subtotal?: unknown; total?: unknown; discount?: unknown })
            : null);
    const discountSubtotalEuro = toOptionalNumber(discountBreakdownRaw?.subtotal);
    const discountTotalEuro = toOptionalNumber(discountBreakdownRaw?.total);

    const basePriceLeiDisplay = formatLeiAmount(basePriceEuro);
    const subtotalLeiDisplay = formatLeiAmount(subtotalEuro);
    const totalLeiDisplay = formatLeiAmount(totalEuro);

    const basePriceEuroDisplay = formatEuroAmount(basePriceEuro);
    const subtotalEuroDisplay = formatEuroAmount(subtotalEuro);
    const totalEuroDisplay = formatEuroAmount(totalEuro);
    const rentalRateEuroDisplay = formatEuroAmount(rentalRateEuro);
    const discountSubtotalEuroDisplay = formatEuroAmount(discountSubtotalEuro);
    const discountTotalEuroDisplay = formatEuroAmount(discountTotalEuro);
    const showAdvancePayment =
        typeof advancePaymentEuro === "number" &&
        Number.isFinite(advancePaymentEuro) &&
        advancePaymentEuro !== 0;
    const remainingBalanceEuro =
        showAdvancePayment && typeof totalEuro === "number" && Number.isFinite(totalEuro)
            ? Math.round((totalEuro - (advancePaymentEuro as number)) * 100) / 100
            : null;
    const advancePaymentLeiDisplay = formatLeiAmount(advancePaymentEuro);
    const remainingBalanceLeiDisplay = formatLeiAmount(remainingBalanceEuro);
    const advancePaymentEuroDisplay = formatEuroAmount(advancePaymentEuro);
    const remainingBalanceEuroDisplay = formatEuroAmount(remainingBalanceEuro);

    const discountAppliedEuro =
        typeof totalEuro === "number" &&
        Number.isFinite(totalEuro) &&
        typeof discountTotalEuro === "number" &&
        Number.isFinite(discountTotalEuro)
            ? Math.round((totalEuro - discountTotalEuro) * 100) / 100
            : null;
    const discountAppliedEuroDisplay = formatEuroAmount(discountAppliedEuro);

    const showDiscountDetails =
        discountSubtotalEuro != null &&
        discountSubtotalEuro !== 0 &&
        discountTotalEuro != null &&
        discountTotalEuro !== 0;

    const isNewBooking = bookingInfo?.id == null;

    const handleSubmitBooking = async () => {
        if (!bookingInfo) {
            console.error("Lipsesc informațiile rezervării; nu putem salva rezervarea.");
            return;
        }
        try {
            const serviceIds = resolveServiceSelection(bookingInfo);
            const payload = buildBookingUpdatePayload(bookingInfo, serviceIds);
            if (isNewBooking) {
                await apiClient.createBooking(payload);
            } else {
                const bookingId = bookingInfo.id;

                if (bookingId == null) {
                    console.error(
                        "Identificatorul rezervării lipsește; nu putem actualiza rezervarea.",
                    );
                    return;
                }

                payload.booking_id = bookingId;
                await apiClient.updateBooking(bookingId, payload);
            }
            onClose();
            onUpdated?.();
        } catch (error) {
            console.error(
                isNewBooking ? "Failed to create booking:" : "Failed to update booking:",
                error,
            );
        }
    }

    return (
        <Popup
            open={open}
            onClose={onClose}
            className="max-w-5xl w-full max-h-[80vh] overflow-y-auto"
        >
            <h3 className="text-lg font-poppins font-semibold text-berkeley mb-4">
                {isNewBooking ? "Crează rezervare" : "Editează rezervarea"}
            </h3>
            <div className="flex flex-col lg:flex-row items-start gap-6">
                <div className="w-full lg:w-2/3 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
                    <div>
                        <Label htmlFor="rental-start-date">Dată preluare</Label>
                        <Input
                            id="rental-start-date"
                            type="datetime-local"
                            value={bookingInfo.rental_start_date || ""}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    rental_start_date: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <Label htmlFor="rental-end-date">Dată returnare</Label>
                        <Input
                            id="rental-end-date"
                            type="datetime-local"
                            value={bookingInfo.rental_end_date || ""}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    rental_end_date: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <Label htmlFor="car-select">Mașină</Label>
                        <SearchSelect<AdminBookingCarOption>
                            id="car-select"
                            value={selectedCarOption}
                            search={carSearch}
                            items={carResults}
                            onSearch={setCarSearch}
                            onSelect={handleSelectCar}
                            onOpen={handleCarSearchOpen}
                            placeholder="Selectează mașina"
                            renderItem={(car) => {
                                const carName = resolveAdminCarName(car, "Autovehicul");
                                const transmissionLabel = resolveRelationLabel(car.transmission);
                                const fuelLabel = resolveRelationLabel(car.fuel);
                                const imagePath = car.image_preview || car.image;

                                return (
                                    <>
                                        <Image
                                            src={
                                                imagePath
                                                    ?
                                                          STORAGE_BASE +
                                                          "/" +
                                                          imagePath
                                                    : "/images/placeholder-car.svg"
                                            }
                                            alt={carName}
                                            width={64}
                                            height={40}
                                            className="w-16 h-10 object-cover rounded"
                                        />
                                        <div className="flex justify-between items-end w-full">
                                            <div>
                                                <div className="font-dm-sans font-semibold">{carName}</div>
                                                <div className="text-xs">
                                                    {toDisplayString(car.license_plate)} • {transmissionLabel} • {fuelLabel}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs">
                                                    Preț cu garanție: {toDisplayString(car.rental_rate)}€ x {toDisplayString(car.days)} zile = {toDisplayString(car.total_deposit)}€
                                                </div>
                                                <div className="text-xs">
                                                    Preț fără garanție: {toDisplayString(car.rental_rate_casco)}€ x {toDisplayString(car.days)} zile = {toDisplayString(car.total_without_deposit)}€
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            }}
                            itemClassName={(car) =>
                                car.available
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                            }
                            renderValue={(car) => {
                                const carName = resolveAdminCarName(car, "Autovehicul");
                                const transmissionLabel = resolveRelationLabel(car.transmission);
                                const fuelLabel = resolveRelationLabel(car.fuel);
                                const imagePath = car.image_preview || car.image;

                                return (
                                    <div className="flex items-center gap-3">
                                        <Image
                                            src={
                                                imagePath
                                                    ?
                                                          STORAGE_BASE +
                                                          "/" +
                                                          imagePath
                                                    : "/images/placeholder-car.svg"
                                            }
                                            alt={carName}
                                            width={64}
                                            height={40}
                                            className="w-16 h-10 object-cover rounded"
                                        />
                                        <div className="text-left">
                                            <div className="font-dm-sans font-semibold text-gray-700">{carName}</div>
                                            <div className="text-xs text-gray-600">
                                                {toDisplayString(car.license_plate)} • {transmissionLabel} • {fuelLabel}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }}
                        />
                    </div>

                    <div>
                        <Label htmlFor="car-deposit">Garantie</Label>
                        <Input
                            id="car-deposit"
                            type="number"
                            value={bookingInfo.car_deposit ?? ""}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    car_deposit: toOptionalNumber(e.target.value),
                                })
                            }
                        />
                    </div>

                      <div>
                          <Label htmlFor="customer-name">Nume client</Label>
                          <Input
                              id="customer-name"
                              type="text"
                              value={bookingInfo.customer_name || ""}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    customer_name: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <Label htmlFor="customer-email">Email</Label>
                        <Input
                            id="customer-email"
                            type="email"
                            value={bookingInfo.customer_email || ""}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    customer_email: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <Label htmlFor="customer-phone">Telefon</Label>
                        <SearchSelect
                            id="customer-phone"
                            value={
                                bookingInfo.customer_phone
                                    ? {
                                          id: bookingInfo.customer_id,
                                          name: bookingInfo.customer_name,
                                          phone: bookingInfo.customer_phone,
                                          email: bookingInfo.customer_email,
                                      }
                                    : null
                            }
                            search={customerSearch}
                            items={customerResults}
                            onSearch={(v) => {
                                setCustomerSearch(v);
                                if (!customerSearch && v === "") return;
                                updateBookingInfo((prev) => ({
                                    ...prev,
                                    customer_phone: v,
                                    customer_id: null,
                                }));
                            }}
                            onSelect={handleSelectCustomer}
                            onOpen={handleCustomerSearchOpen}
                            placeholder="Selectează clientul"
                            renderItem={(user) => (
                                <div>
                                    <div className="font-dm-sans font-semibold">{user.name}</div>
                                    <div className="text-xs">{user.phone} • {user.email}</div>
                                </div>
                            )}
                            renderValue={(user) => <span>{user.phone}</span>}
                        />
                    </div>


                    <div className="lg:col-span-2">
                        <Label htmlFor="coupon-type">Tip discount</Label>
                        <Select
                            id="coupon-type"
                            value={couponTypeValue}
                            onValueChange={(value) =>
                                updateBookingInfo((prev) => {
                                    if (value === "none") {
                                        return recalcTotals({
                                            ...prev,
                                            coupon_type: "",
                                            coupon_amount: 0,
                                            coupon_code: "",
                                        });
                                    }

                                    const normalized = normalizeManualCouponType(value);
                                    return recalcTotals({
                                        ...prev,
                                        coupon_type: normalized,
                                        coupon_amount: 0,
                                        coupon_code: "",
                                    });
                                })
                            }
                            placeholder="Selectează"
                        >
                            <option value="none">Fără discount</option>
                            {/*<option value="fixed_per_day">Pret fix pe zi</option>*/}
                            <option value="per_day">Reducere pret pe zi</option>
                            <option value="days">Zile</option>
                            <option value="from_total">Din total</option>
                            <option value="percentage">Procentaj</option>
                            <option value="code">Cupon</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="coupon-value">{couponValueLabel}</Label>
                        <Input
                            id="coupon-value"
                            type={couponValueInputType}
                            disabled={couponValueInputDisabled}
                            {...couponValueInputProps}
                            value={couponValue}
                            onChange={(e) => {
                                const rawValue = e.target.value;
                                updateBookingInfo((prev) => {
                                    const nextType = normalizeManualCouponType(
                                        prev.coupon_type && prev.coupon_type.length > 0
                                            ? prev.coupon_type
                                            : "fixed_per_day",
                                    );
                                    if (nextType === "code") {
                                        return recalcTotals({
                                            ...prev,
                                            coupon_type: nextType,
                                            coupon_code: rawValue,
                                        });
                                    }
                                    const numericValue = Number(rawValue);
                                    return recalcTotals({
                                        ...prev,
                                        coupon_type: nextType,
                                        coupon_amount: Number.isFinite(numericValue) ? numericValue : 0,
                                    });
                                });
                            }}
                        />
                    </div>
                    <div>
                        <Label htmlFor="advance-payment">Plată în avans</Label>
                        <Input
                            id="advance-payment"
                            type="number"
                            value={bookingInfo.advance_payment || 0}
                            onChange={(e) =>
                                updateBookingInfo((prev) =>
                                    recalcTotals({
                                        ...prev,
                                        advance_payment: Number(e.target.value) || 0,
                                    }),
                                )
                            }
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 mb-2">
                            Servicii suplimentare
                        </h4>
                        <div className="space-y-2">
                            {services.map((s) => (
                                <label key={s.id} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-jade"
                                        checked={selectedServiceIds.includes(s.id)}
                                        onChange={() => toggleService(s.id)}
                                    />
                                    <span className="text-sm text-gray-700">
                                        {s.name} - {s.price}€
                                    </span>
                                </label>
                            ))}
                            {services.length === 0 && (
                                <p className="text-sm text-gray-600">Niciun serviciu disponibil</p>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <Label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                            Plan de închiriere
                        </Label>
                        <div className="mt-1 rounded-md border divide-y">
                            <label
                                htmlFor="with-deposit-yes"
                                className="flex cursor-pointer items-start space-x-3 p-4"
                            >
                                <input
                                    id="with-deposit-yes"
                                    type="radio"
                                    name="withDeposit"
                                    checked={!!bookingInfo.with_deposit}
                                    onChange={() =>
                                        updateBookingInfo((prev) =>
                                            recalcTotals({
                                                ...prev,
                                                with_deposit: true,
                                                price_per_day:
                                                    quotePricePerDayDeposit ?? prev.price_per_day,
                                                original_price_per_day:
                                                    toOptionalNumber(prev.original_price_per_day) ??
                                                    quoteBasePriceDeposit ??
                                                    toOptionalNumber(prev.base_price) ??
                                                    prev.price_per_day,
                                            }),
                                        )
                                    }
                                    className="mt-1 h-4 w-4 text-jade focus:ring-jade border-gray-300"
                                />
                                <div>
                                    <div className="font-dm-sans font-medium text-gray-900">
                                        Plan cu Garanție
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Alege acest plan și achită o garanție în valoare de: {bookingInfo.car_deposit ?? 0}€ pentru închiriere.
                                    </p>
                                </div>
                            </label>
                            <label
                                htmlFor="with-deposit-no"
                                className="flex cursor-pointer items-start space-x-3 p-4"
                            >
                                <input
                                    id="with-deposit-no"
                                    type="radio"
                                    name="withDeposit"
                                    checked={!bookingInfo.with_deposit}
                                    onChange={() =>
                                        updateBookingInfo((prev) =>
                                            recalcTotals({
                                                ...prev,
                                                with_deposit: false,
                                                price_per_day:
                                                    quotePricePerDayCasco ??
                                                    quotePricePerDayDeposit ??
                                                    prev.price_per_day,
                                                original_price_per_day:
                                                    toOptionalNumber(prev.original_price_per_day) ??
                                                    quoteBasePriceCasco ??
                                                    quoteBasePriceDeposit ??
                                                    toOptionalNumber(prev.base_price_casco) ??
                                                    toOptionalNumber(prev.base_price) ??
                                                    prev.price_per_day,
                                            }),
                                        )
                                    }
                                    className="mt-1 h-4 w-4 text-jade focus:ring-jade border-gray-300"
                                />
                                <div>
                                    <div className="font-dm-sans font-medium text-gray-900">
                                        Plan fără garanție
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Alege acest plan dacă nu vrei să plătești garanție pentru închiriere.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-1/3 h-fit space-y-2">
                    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 border-b border-gray-300 pb-2">
                            Publicare
                        </h4>
                        <div className="mt-2 space-x-2">
                            <Button className="!px-4 py-4" onClick={handleSubmitBooking}>
                                {isNewBooking ? "Adaugă rezervare" : "Salvează"}
                            </Button>
                            <Button className="!px-4 py-4" variant="danger" onClick={onClose}>
                                Anulează
                            </Button>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 border-b border-gray-300 pb-2">
                            Păstrează prețul vechi
                        </h4>
                        <div className="mt-2">
                            <Input
                                type="checkbox"
                                className="w-5 h-5"
                                checked={bookingInfo.keep_old_price ?? true}
                                onChange={(e) =>
                                    setBookingInfo({
                                        ...bookingInfo,
                                        keep_old_price: e.target.checked,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 border-b border-gray-300 pb-2">
                            Trimite email de confirmare
                        </h4>
                        <div className="mt-2">
                            <Input
                                type="checkbox"
                                className="w-5 h-5"
                                checked={bookingInfo.send_email ?? true}
                                onChange={(e) =>
                                    setBookingInfo({
                                        ...bookingInfo,
                                        send_email: e.target.checked,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 border-b border-gray-300 pb-2">
                            Status
                        </h4>
                        <div className="mt-2">
                            <Select
                                value={bookingInfo.status || ""}
                                onValueChange={(v) =>
                                    setBookingInfo({
                                        ...bookingInfo,
                                        status: v,
                                    })
                                }
                                placeholder="Selectează status"
                            >
                                <option value="reserved">Rezervat</option>
                                <option value="pending">În așteptare</option>
                                <option value="cancelled">Anulat</option>
                                <option value="completed">Finalizat</option>
                                <option value="no_answer">Fără răspuns</option>
                                <option value="waiting_advance_payment">Așteaptă avans</option>
                            </Select>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 border-b border-gray-300 pb-2">
                            Notițe
                        </h4>
                        <div className="mt-2">
                            <Input
                                type="text"
                                value={bookingInfo.note || ""}
                                onChange={(e) =>
                                    setBookingInfo({
                                        ...bookingInfo,
                                        note: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 border-b border-gray-300 pb-2">
                            Rezumat plată
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <h5 className="font-dm-sans text-sm font-semibold text-gray-700 mb-2">
                                    Rezumat în lei
                                </h5>
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Preț per zi:</span>
                                    <span>
                                        {basePriceLeiDisplay ? `${basePriceLeiDisplay} x ${days} zile` : "—"}
                                    </span>
                                </div>
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Subtotal:</span>
                                    <span>{subtotalLeiDisplay ?? "—"}</span>
                                </div>
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Total:</span>
                                    <span>{totalLeiDisplay ?? "—"}</span>
                                </div>
                                {showAdvancePayment && (
                                    <>
                                        <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                            <span>Avans:</span>
                                            <span>{advancePaymentLeiDisplay ?? "—"}</span>
                                        </div>
                                        <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                            <span>Rest de plată:</span>
                                            <span>{remainingBalanceLeiDisplay ?? "—"}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="pt-4 border-t border-gray-300">
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Preț per zi:</span>
                                    <span>
                                        {basePriceEuroDisplay != null
                                            ? `${basePriceEuroDisplay}€ x ${days} zile`
                                            : "—"}
                                    </span>
                                </div>
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Subtotal:</span>
                                    <span>
                                        {subtotalEuroDisplay != null ? `${subtotalEuroDisplay}€` : "—"}
                                    </span>
                                </div>
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Total:</span>
                                    <span>
                                        {totalEuroDisplay != null ? `${totalEuroDisplay}€` : "—"}
                                    </span>
                                </div>
                                {showAdvancePayment && (
                                    <>
                                        <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                            <span>Avans:</span>
                                            <span>
                                                {advancePaymentEuroDisplay != null
                                                    ? `${advancePaymentEuroDisplay}€`
                                                    : "—"}
                                            </span>
                                        </div>
                                        <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                            <span>Rest de plată:</span>
                                            <span>
                                                {remainingBalanceEuroDisplay != null
                                                    ? `${remainingBalanceEuroDisplay}€`
                                                    : "—"}
                                            </span>
                                        </div>
                                    </>
                                )}
                                {showDiscountDetails && (
                                    <div className="font-dm-sans text-sm mt-3">
                                        Detalii discount:
                                        <ul className="list-disc">
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Preț per zi:</span>
                                                <span>
                                                    {rentalRateEuroDisplay != null
                                                        ? `${rentalRateEuroDisplay}€`
                                                        : "—"}
                                                </span>
                                            </li>
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Discount total aplicat:</span>
                                                <span>
                                                    {discountAppliedEuroDisplay != null
                                                        ? `${discountAppliedEuroDisplay}€`
                                                        : "—"}
                                                </span>
                                            </li>
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Subtotal:</span>
                                                <span>
                                                    {discountSubtotalEuroDisplay != null
                                                        ? `${discountSubtotalEuroDisplay}€`
                                                        : "—"}
                                                </span>
                                            </li>
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Total:</span>
                                                <span>
                                                    {discountTotalEuroDisplay != null
                                                        ? `${discountTotalEuroDisplay}€`
                                                        : "—"}
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Popup>
    );
};

export default BookingForm;

