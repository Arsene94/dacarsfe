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
import { mapPeriod } from "@/lib/wheelNormalization";
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
    ReservationAppliedOffer,
    ReservationWheelPrizePayload,
    ReservationWheelPrizeSummary,
    Service,
} from "@/types/reservation";
import type { Offer, OfferStatus } from "@/types/offer";
import type { WheelOfFortunePeriod } from "@/types/wheel";

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

const pickFirstNumber = (...values: Array<number | null | undefined>): number | null => {
    for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
    }
    return null;
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

type PlanSnapshot = {
    pricePerDay: number | null;
    subtotal: number | null;
    total: number | null;
    discount: number | null;
    totalBeforeWheel: number | null;
    days: number | null;
};

const createEmptyPlanSnapshot = (): PlanSnapshot => ({
    pricePerDay: null,
    subtotal: null,
    total: null,
    discount: null,
    totalBeforeWheel: null,
    days: null,
});

const mergePlanSnapshot = (
    snapshot: PlanSnapshot,
    updates: Partial<PlanSnapshot>,
): PlanSnapshot => {
    const next = { ...snapshot };
    (Object.entries(updates) as Array<
        [keyof PlanSnapshot, PlanSnapshot[keyof PlanSnapshot]]
    >).forEach(([key, value]) => {
        if (value !== undefined) {
            next[key] = value;
        }
    });
    return next;
};

type AdminOfferOption = Pick<
    Offer,
    "id" | "title" | "status" | "starts_at" | "ends_at" | "discount_label" | "badge" | "offer_type" | "offer_value"
>;

interface WheelPrizeSelectOption {
    id: number;
    value: string;
    label: string;
    summary: ReservationWheelPrizeSummary;
    inactive?: boolean;
}

interface OfferSelectOption extends AdminOfferOption {
    label: string;
    inactive?: boolean;
}

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

const collectMonthsInRange = (start: Date, end: Date): number[] => {
    const months: number[] = [];
    const cursor = new Date(start.getTime());
    cursor.setHours(12, 0, 0, 0);
    const boundary = new Date(end.getTime());
    boundary.setHours(12, 0, 0, 0);
    while (cursor <= boundary) {
        const monthIndex = cursor.getMonth() + 1;
        if (!months.includes(monthIndex)) {
            months.push(monthIndex);
        }
        cursor.setMonth(cursor.getMonth() + 1, 1);
    }
    return months;
};

const isPeriodActiveForRange = (
    period: WheelOfFortunePeriod,
    startDate: Date | null,
    endDate: Date | null,
): boolean => {
    const hasPrizeList = Array.isArray(period.wheel_of_fortunes) && period.wheel_of_fortunes.length > 0;
    if (!hasPrizeList) {
        return false;
    }
    if (period.active === false || period.is_active === false) {
        return false;
    }
    const rangeStart = startDate ?? endDate;
    const rangeEnd = endDate ?? startDate;
    if (!rangeStart) {
        return false;
    }
    const periodStart = parsePeriodDate(period.start_at ?? period.starts_at);
    const periodEnd = parsePeriodDate(period.end_at ?? period.ends_at);
    if (periodStart && rangeEnd && rangeEnd < periodStart) {
        return false;
    }
    if (periodEnd && rangeStart && rangeStart > periodEnd) {
        return false;
    }
    const activeMonths = Array.isArray(period.active_months) ? period.active_months : null;
    if (activeMonths && activeMonths.length > 0 && rangeStart) {
        const monthsInRange = collectMonthsInRange(rangeStart, rangeEnd ?? rangeStart);
        const hasOverlap = monthsInRange.some((month) => activeMonths.includes(month));
        if (!hasOverlap) {
            return false;
        }
    }
    return true;
};

const normalizeWheelPrizeSummary = (
    raw: unknown,
): ReservationWheelPrizeSummary | null => {
    if (!isRecord(raw)) {
        return null;
    }
    const prizeId = toOptionalNumber(
        raw.wheel_of_fortune_prize_id ?? raw.prize_id ?? raw.id ?? (raw as { prizeId?: unknown }).prizeId,
    );
    const wheelId = toOptionalNumber(
        raw.wheel_of_fortune_id ?? raw.period_id ?? (raw as { wheelId?: unknown }).wheelId,
    );
    const titleSource =
        typeof raw.title === "string" && raw.title.trim().length > 0
            ? raw.title.trim()
            : typeof raw.name === "string" && raw.name.trim().length > 0
                ? raw.name.trim()
                : null;
    const amount = toOptionalNumber(
        raw.amount ?? raw.discount_value ?? (raw as { value?: unknown }).value,
    );
    const discountValue = toOptionalNumber(
        raw.discount_value ?? raw.discount ?? (raw as { value?: unknown }).value,
    );
    const discountValueDeposit =
        toOptionalNumber((raw as { discount_value_deposit?: unknown }).discount_value_deposit) ??
        toOptionalNumber((raw as { discount_deposit?: unknown }).discount_deposit) ??
        (typeof discountValue === "number" ? discountValue : null);
    const discountValueCasco =
        toOptionalNumber((raw as { discount_value_casco?: unknown }).discount_value_casco) ??
        toOptionalNumber((raw as { discount_casco?: unknown }).discount_casco) ??
        (typeof discountValue === "number" ? discountValue : null);
    const description =
        typeof raw.description === "string" && raw.description.trim().length > 0
            ? raw.description
            : null;
    const typeSource =
        typeof raw.type === "string" && raw.type.trim().length > 0
            ? raw.type.trim()
            : typeof (raw as { prize_type?: unknown }).prize_type === "string"
                ? String((raw as { prize_type: unknown }).prize_type)
                : undefined;
    const amountLabel =
        typeof (raw as { amount_label?: unknown }).amount_label === "string"
            ? ((raw as { amount_label: string }).amount_label.trim() || null)
            : typeof (raw as { amountLabel?: unknown }).amountLabel === "string"
                ? ((raw as { amountLabel: string }).amountLabel.trim() || null)
                : null;
    const eligible =
        typeof (raw as { eligible?: unknown }).eligible === "boolean"
            ? Boolean((raw as { eligible: boolean }).eligible)
            : typeof (raw as { is_eligible?: unknown }).is_eligible === "boolean"
                ? Boolean((raw as { is_eligible: boolean }).is_eligible)
                : undefined;

    return {
        wheel_of_fortune_id: wheelId ?? null,
        prize_id: toOptionalNumber(raw.prize_id ?? raw.id) ?? null,
        wheel_of_fortune_prize_id: prizeId ?? null,
        title: titleSource ?? "Premiu DaCars",
        type: typeof typeSource === "string" ? typeSource : undefined,
        type_label:
            typeof (raw as { type_label?: unknown }).type_label === "string"
                ? ((raw as { type_label: string }).type_label.trim() || undefined)
                : undefined,
        amount: typeof amount === "number" ? amount : null,
        description,
        amount_label: amountLabel,
        discount_value: typeof discountValue === "number" ? discountValue : 0,
        eligible,
        discount_value_deposit:
            typeof discountValueDeposit === "number" ? discountValueDeposit : null,
        discount_value_casco:
            typeof discountValueCasco === "number" ? discountValueCasco : null,
    };
};

const sanitizeWheelPrizePayload = (
    prize: ReservationWheelPrizeSummary | null | undefined,
): ReservationWheelPrizePayload | null => {
    if (!prize) {
        return null;
    }
    const pivotId = toOptionalNumber(prize.wheel_of_fortune_prize_id);
    const rawPrizeId = toOptionalNumber(prize.prize_id) ?? pivotId;
    if (rawPrizeId == null) {
        return null;
    }
    const wheelId = toOptionalNumber(prize.wheel_of_fortune_id);
    const discountValue = toOptionalNumber(prize.discount_value) ?? 0;
    const discountValueDeposit =
        toOptionalNumber(prize.discount_value_deposit) ?? discountValue;
    const discountValueCasco = toOptionalNumber(prize.discount_value_casco) ?? discountValue;
    const payload: ReservationWheelPrizePayload = {
        prize_id: rawPrizeId,
        wheel_of_fortune_id: wheelId ?? null,
        wheel_of_fortune_prize_id: pivotId ?? null,
        discount_value: discountValue,
    };
    if (discountValueDeposit != null) {
        payload.discount_value_deposit = discountValueDeposit;
    }
    if (discountValueCasco != null) {
        payload.discount_value_casco = discountValueCasco;
    }
    if (typeof prize.eligible === "boolean") {
        payload.eligible = prize.eligible;
    }
    if (typeof prize.title === "string" && prize.title.trim().length > 0) {
        payload.title = prize.title.trim();
    }
    if (typeof prize.type === "string" && prize.type.trim().length > 0) {
        payload.type = prize.type.trim();
    }
    if (typeof prize.type_label === "string") {
        payload.type_label = prize.type_label;
    }
    const amount = toOptionalNumber(prize.amount);
    if (amount != null) {
        payload.amount = amount;
    }
    if (typeof prize.description === "string") {
        payload.description = prize.description;
    }
    if (typeof prize.amount_label === "string") {
        payload.amount_label = prize.amount_label;
    }
    return payload;
};

const normalizeAppliedOfferEntry = (raw: unknown): ReservationAppliedOffer | null => {
    if (!isRecord(raw)) {
        return null;
    }
    const id = toOptionalNumber(raw.id ?? (raw as { offer_id?: unknown }).offer_id);
    if (typeof id !== "number" || Number.isNaN(id)) {
        return null;
    }
    const titleSource =
        typeof raw.title === "string" && raw.title.trim().length > 0
            ? raw.title.trim()
            : typeof raw.name === "string" && raw.name.trim().length > 0
                ? raw.name.trim()
                : null;
    if (!titleSource) {
        return null;
    }
    const offerType =
        typeof (raw as { offer_type?: unknown }).offer_type === "string"
            ? String((raw as { offer_type: unknown }).offer_type)
            : null;
    const offerValue =
        typeof (raw as { offer_value?: unknown }).offer_value === "string"
            ? String((raw as { offer_value: unknown }).offer_value)
            : null;
    const discountLabel =
        typeof (raw as { discount_label?: unknown }).discount_label === "string"
            ? String((raw as { discount_label: unknown }).discount_label)
            : typeof (raw as { badge?: unknown }).badge === "string"
                ? String((raw as { badge: unknown }).badge)
                : null;
    const percentDeposit = toOptionalNumber(
        (raw as { percent_discount_deposit?: unknown }).percent_discount_deposit,
    );
    const percentCasco = toOptionalNumber(
        (raw as { percent_discount_casco?: unknown }).percent_discount_casco,
    );
    const fixedDeposit = toOptionalNumber((raw as { fixed_discount_deposit?: unknown }).fixed_discount_deposit);
    const fixedCasco = toOptionalNumber((raw as { fixed_discount_casco?: unknown }).fixed_discount_casco);
    const fixedDepositApplied = toOptionalNumber(
        (raw as { fixed_discount_deposit_applied?: unknown }).fixed_discount_deposit_applied,
    );
    const fixedCascoApplied = toOptionalNumber(
        (raw as { fixed_discount_casco_applied?: unknown }).fixed_discount_casco_applied,
    );
    const discountAmountDeposit = toOptionalNumber(
        (raw as { discount_amount_deposit?: unknown }).discount_amount_deposit,
    );
    const discountAmountCasco = toOptionalNumber(
        (raw as { discount_amount_casco?: unknown }).discount_amount_casco,
    );
    const discountAmount = toOptionalNumber((raw as { discount_amount?: unknown }).discount_amount);

    const normalized: ReservationAppliedOffer = {
        id,
        title: titleSource,
        offer_type: offerType,
        offer_value: offerValue,
        discount_label: discountLabel,
    };

    if (percentDeposit != null) {
        normalized.percent_discount_deposit = percentDeposit;
    }
    if (percentCasco != null) {
        normalized.percent_discount_casco = percentCasco;
    }
    if (fixedDeposit != null) {
        normalized.fixed_discount_deposit = fixedDeposit;
    }
    if (fixedCasco != null) {
        normalized.fixed_discount_casco = fixedCasco;
    }
    if (fixedDepositApplied != null) {
        normalized.fixed_discount_deposit_applied = fixedDepositApplied;
    }
    if (fixedCascoApplied != null) {
        normalized.fixed_discount_casco_applied = fixedCascoApplied;
    }
    if (discountAmountDeposit != null) {
        normalized.discount_amount_deposit = discountAmountDeposit;
    }
    if (discountAmountCasco != null) {
        normalized.discount_amount_casco = discountAmountCasco;
    }
    if (discountAmount != null) {
        normalized.discount_amount = discountAmount;
    }

    return normalized;
};

const normalizeAppliedOffers = (raw: unknown): ReservationAppliedOffer[] => {
    if (!Array.isArray(raw)) {
        return [];
    }
    const mapped = raw
        .map((entry) => normalizeAppliedOfferEntry(entry))
        .filter((entry): entry is ReservationAppliedOffer => entry != null);
    if (mapped.length === 0) {
        return [];
    }
    const unique = new Map<number, ReservationAppliedOffer>();
    mapped.forEach((entry) => {
        if (!unique.has(entry.id)) {
            unique.set(entry.id, entry);
        }
    });
    return Array.from(unique.values());
};

const sanitizeAppliedOffersPayload = (
    offers: ReservationAppliedOffer[] | null | undefined,
): ReservationAppliedOffer[] | null => {
    if (!Array.isArray(offers) || offers.length === 0) {
        return null;
    }
    const sanitized = offers
        .map((offer) => {
            if (!offer || typeof offer.id !== "number" || Number.isNaN(offer.id)) {
                return null;
            }
            const title = typeof offer.title === "string" ? offer.title.trim() : "";
            if (!title) {
                return null;
            }
            const normalized: ReservationAppliedOffer = {
                id: offer.id,
                title,
                offer_type: offer.offer_type ?? null,
                offer_value: offer.offer_value ?? null,
                discount_label: offer.discount_label ?? null,
            };
            const percentDeposit = toOptionalNumber(offer.percent_discount_deposit);
            const percentCasco = toOptionalNumber(offer.percent_discount_casco);
            const fixedDeposit = toOptionalNumber(offer.fixed_discount_deposit);
            const fixedCasco = toOptionalNumber(offer.fixed_discount_casco);
            const fixedDepositApplied = toOptionalNumber(offer.fixed_discount_deposit_applied);
            const fixedCascoApplied = toOptionalNumber(offer.fixed_discount_casco_applied);
            const discountAmountDeposit = toOptionalNumber(offer.discount_amount_deposit);
            const discountAmountCasco = toOptionalNumber(offer.discount_amount_casco);
            const discountAmount = toOptionalNumber(offer.discount_amount);

            if (percentDeposit != null) {
                normalized.percent_discount_deposit = percentDeposit;
            }
            if (percentCasco != null) {
                normalized.percent_discount_casco = percentCasco;
            }
            if (fixedDeposit != null) {
                normalized.fixed_discount_deposit = fixedDeposit;
            }
            if (fixedCasco != null) {
                normalized.fixed_discount_casco = fixedCasco;
            }
            if (fixedDepositApplied != null) {
                normalized.fixed_discount_deposit_applied = fixedDepositApplied;
            }
            if (fixedCascoApplied != null) {
                normalized.fixed_discount_casco_applied = fixedCascoApplied;
            }
            if (discountAmountDeposit != null) {
                normalized.discount_amount_deposit = discountAmountDeposit;
            }
            if (discountAmountCasco != null) {
                normalized.discount_amount_casco = discountAmountCasco;
            }
            if (discountAmount != null) {
                normalized.discount_amount = discountAmount;
            }

            return normalized;
        })
        .filter((entry): entry is ReservationAppliedOffer => entry != null);
    return sanitized.length > 0 ? sanitized : null;
};

const sanitizeAppliedOffersForQuote = (
    offers: ReservationAppliedOffer[] | null | undefined,
): ReservationAppliedOffer[] | null => {
    if (!Array.isArray(offers) || offers.length === 0) {
        return null;
    }

    const sanitized = offers
        .map((offer) => {
            if (!offer || typeof offer.id !== "number" || Number.isNaN(offer.id)) {
                return null;
            }

            const title = typeof offer.title === "string" ? offer.title.trim() : "";
            if (!title) {
                return null;
            }

            const normalized: ReservationAppliedOffer = {
                id: offer.id,
                title,
                offer_type: offer.offer_type ?? null,
                offer_value: offer.offer_value ?? null,
                discount_label: offer.discount_label ?? null,
            };

            const percentDeposit = toOptionalNumber(offer.percent_discount_deposit);
            if (percentDeposit != null) {
                normalized.percent_discount_deposit = percentDeposit;
            }

            const percentCasco = toOptionalNumber(offer.percent_discount_casco);
            if (percentCasco != null) {
                normalized.percent_discount_casco = percentCasco;
            }

            const fixedDeposit = toOptionalNumber(offer.fixed_discount_deposit);
            if (fixedDeposit != null) {
                normalized.fixed_discount_deposit = fixedDeposit;
            }

            const fixedCasco = toOptionalNumber(offer.fixed_discount_casco);
            if (fixedCasco != null) {
                normalized.fixed_discount_casco = fixedCasco;
            }

            return normalized;
        })
        .filter((entry): entry is ReservationAppliedOffer => entry != null);

    return sanitized.length > 0 ? sanitized : null;
};

const isOfferActiveForRange = (
    offer: AdminOfferOption,
    startDate: Date | null,
    endDate: Date | null,
): boolean => {
    const rangeStart = startDate ?? endDate;
    const rangeEnd = endDate ?? startDate;
    if (!rangeStart) {
        return true;
    }
    const offerStart = parsePeriodDate(offer.starts_at);
    const offerEnd = parsePeriodDate(offer.ends_at);
    if (offerStart && rangeEnd && rangeEnd < offerStart) {
        return false;
    }
    if (offerEnd && rangeStart && rangeStart > offerEnd) {
        return false;
    }
    if (typeof offer.status === "string") {
        const normalized = offer.status.trim().toLowerCase();
        if (["archived", "draft"].includes(normalized)) {
            return false;
        }
    }
    return true;
};

const buildOfferLabel = (offer: AdminOfferOption): string => {
    const title = offer.title.trim();
    const badge =
        typeof offer.discount_label === "string" && offer.discount_label.trim().length > 0
            ? offer.discount_label.trim()
            : typeof offer.badge === "string" && offer.badge.trim().length > 0
                ? offer.badge.trim()
                : null;
    return badge ? `${title} • ${badge}` : title;
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
        service_ids: serviceIds,
    };

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

    const wheelPrizeSummary = values.wheel_prize ?? null;
    const explicitWheelPrizeId = toOptionalNumber(values.wheel_of_fortune_prize_id);
    const wheelPrizeId =
        explicitWheelPrizeId ??
        toOptionalNumber(wheelPrizeSummary?.wheel_of_fortune_prize_id) ??
        toOptionalNumber(wheelPrizeSummary?.prize_id);
    if (wheelPrizeId != null) {
        payload.wheel_of_fortune_prize_id = wheelPrizeId;
    }

    const wheelPrizeDiscount =
        toOptionalNumber(values.wheel_prize_discount) ??
        toOptionalNumber(wheelPrizeSummary?.discount_value);
    if (wheelPrizeDiscount != null) {
        payload.wheel_prize_discount = wheelPrizeDiscount;
    }

    const wheelPrizePayload = sanitizeWheelPrizePayload(wheelPrizeSummary);
    if (wheelPrizePayload) {
        payload.wheel_prize = wheelPrizePayload;
    }

    const totalBeforeWheelPrize = toOptionalNumber(values.total_before_wheel_prize);
    if (totalBeforeWheelPrize != null) {
        payload.total_before_wheel_prize = totalBeforeWheelPrize;
    }

    if (values.deposit_waived === true) {
        payload.deposit_waived = true;
    }

    const appliedOffersPayload = sanitizeAppliedOffersForQuote(values.applied_offers);
    if (appliedOffersPayload) {
        payload.applied_offers = appliedOffersPayload;
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
        deposit_waived: values.deposit_waived === true,
    };

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

    const wheelPrizeSummary = values.wheel_prize ?? null;
    const wheelPrizePayload = sanitizeWheelPrizePayload(wheelPrizeSummary);
    if (wheelPrizePayload) {
        payload.wheel_prize = wheelPrizePayload;
        payload.wheel_of_fortune_prize_id =
            wheelPrizePayload.wheel_of_fortune_prize_id ?? wheelPrizePayload.prize_id ?? null;
    } else {
        payload.wheel_prize = null;
        payload.wheel_of_fortune_prize_id = null;
    }

    const wheelPrizeDiscount =
        toOptionalNumber(values.wheel_prize_discount) ??
        toOptionalNumber(wheelPrizeSummary?.discount_value);
    if (wheelPrizeDiscount != null) {
        payload.wheel_prize_discount = wheelPrizeDiscount;
    }

    const totalBeforeWheelPrize = toOptionalNumber(values.total_before_wheel_prize);
    if (totalBeforeWheelPrize != null) {
        payload.total_before_wheel_prize = totalBeforeWheelPrize;
    }

    const offersDiscount = toOptionalNumber(values.offers_discount);
    if (offersDiscount != null) {
        payload.offers_discount = offersDiscount;
    }

    const offerFixedDiscount = toOptionalNumber(values.offer_fixed_discount);
    if (offerFixedDiscount != null) {
        payload.offer_fixed_discount = offerFixedDiscount;
    }

    const appliedOffersPayload = sanitizeAppliedOffersPayload(values.applied_offers);
    payload.applied_offers = appliedOffersPayload ?? [];

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
    const [wheelPeriods, setWheelPeriods] = useState<WheelOfFortunePeriod[]>([]);
    const [offerOptions, setOfferOptions] = useState<AdminOfferOption[]>([]);

    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<AdminBookingCustomerSummary[]>([]);
    const [customerSearchActive, setCustomerSearchActive] = useState(false);
    const [quote, setQuote] = useState<QuotePriceResponse | null>(null);
    const originalTotals = useRef<{ subtotal: number; total: number }>({
        subtotal: 0,
        total: 0,
    });
    const [planSnapshots, setPlanSnapshots] = useState<{
        deposit: PlanSnapshot;
        casco: PlanSnapshot;
    }>(() => ({
        deposit: createEmptyPlanSnapshot(),
        casco: createEmptyPlanSnapshot(),
    }));
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
    const couponTypeValue = normalizeManualCouponType(bookingInfo?.coupon_type);
    const couponValueLabel =
        couponTypeValue === "code"
            ? "Cod cupon"
            : couponTypeValue === "percentage"
                ? "Procentaj (%)"
                : "Valoare";
    const couponValueInputProps =
        couponTypeValue === "percentage"
            ? { min: 0, max: 100, step: 0.1 }
            : {};
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

    const wheelPrizeOptions = useMemo<WheelPrizeSelectOption[]>(() => {
        const relevantPeriods = wheelPeriods.filter((period) =>
            isPeriodActiveForRange(period, rentalStartDateValue, rentalEndDateValue),
        );
        const mapped = relevantPeriods.flatMap((period) => {
            const prizes = Array.isArray(period.wheel_of_fortunes) ? period.wheel_of_fortunes : [];
            return prizes
                .map((prize): WheelPrizeSelectOption | null => {
                    const prizeId = toOptionalNumber((prize as { id?: unknown }).id);
                    if (typeof prizeId !== "number" || Number.isNaN(prizeId)) {
                        return null;
                    }
                    const title =
                        typeof prize.title === "string" && prize.title.trim().length > 0
                            ? prize.title.trim()
                            : `Premiu #${prizeId}`;
                    const discountValueDeposit =
                        toOptionalNumber((prize as { discount_value_deposit?: unknown }).discount_value_deposit) ??
                        toOptionalNumber((prize as { discount_deposit?: unknown }).discount_deposit);
                    const discountValueCasco =
                        toOptionalNumber((prize as { discount_value_casco?: unknown }).discount_value_casco) ??
                        toOptionalNumber((prize as { discount_casco?: unknown }).discount_casco);
                    const summary: ReservationWheelPrizeSummary = {
                        wheel_of_fortune_id: prize.period_id ?? period.id ?? null,
                        prize_id: prizeId,
                        wheel_of_fortune_prize_id: prizeId,
                        title,
                        type: prize.type ?? undefined,
                        amount: typeof prize.amount === "number" ? prize.amount : null,
                        description: prize.description ?? null,
                        amount_label: null,
                        discount_value: typeof prize.amount === "number" ? prize.amount : 0,
                        discount_value_deposit:
                            typeof discountValueDeposit === "number"
                                ? discountValueDeposit
                                : typeof prize.amount === "number"
                                    ? prize.amount
                                    : null,
                        discount_value_casco:
                            typeof discountValueCasco === "number"
                                ? discountValueCasco
                                : typeof prize.amount === "number"
                                    ? prize.amount
                                    : null,
                        eligible: true,
                    };
                    return {
                        id: prizeId,
                        value: String(prizeId),
                        label: `${period.name} • ${title}`,
                        summary,
                    };
                })
                .filter((entry): entry is WheelPrizeSelectOption => entry != null);
        });
        const unique = new Map<number, WheelPrizeSelectOption>();
        mapped.forEach((entry) => {
            if (!unique.has(entry.id)) {
                unique.set(entry.id, entry);
            }
        });
        const options = Array.from(unique.values()).sort((a, b) =>
            a.label.localeCompare(b.label, "ro", { sensitivity: "base" }),
        );
        const currentPrizeId = bookingInfo
            ? toOptionalNumber(
                  bookingInfo.wheel_of_fortune_prize_id ??
                      bookingInfo.wheel_prize?.wheel_of_fortune_prize_id ??
                      bookingInfo.wheel_prize?.prize_id,
              )
            : null;
        if (
            typeof currentPrizeId === "number" &&
            Number.isFinite(currentPrizeId) &&
            bookingInfo?.wheel_prize &&
            !options.some((option) => option.id === currentPrizeId)
        ) {
            options.unshift({
                id: currentPrizeId,
                value: String(currentPrizeId),
                label: `${bookingInfo.wheel_prize.title ?? `Premiu #${currentPrizeId}`} (în afara perioadei)`,
                summary: bookingInfo.wheel_prize,
                inactive: true,
            });
        }
        return options;
    }, [
        bookingInfo,
        rentalEndDateValue,
        rentalStartDateValue,
        wheelPeriods,
    ]);

    const offerSelectOptions = useMemo<OfferSelectOption[]>(() => {
        const activeOffers = offerOptions.filter((offer) =>
            isOfferActiveForRange(offer, rentalStartDateValue, rentalEndDateValue),
        );
        const sortedActive = [...activeOffers].sort((a, b) =>
            a.title.localeCompare(b.title, "ro", { sensitivity: "base" }),
        );
        const options: OfferSelectOption[] = sortedActive.map((offer) => ({
            ...offer,
            label: buildOfferLabel(offer),
            inactive: false,
        }));
        const currentOffer = Array.isArray(bookingInfo?.applied_offers)
            ? bookingInfo?.applied_offers.find(
                  (entry) => typeof entry?.id === "number" && Number.isFinite(entry.id),
              ) ?? null
            : null;
        const currentOfferId = currentOffer?.id ?? null;
        if (
            currentOffer &&
            typeof currentOfferId === "number" &&
            Number.isFinite(currentOfferId) &&
            !options.some((entry) => entry.id === currentOfferId)
        ) {
            const fallbackTitle = currentOffer.title.trim();
            const fallback: OfferSelectOption = {
                id: currentOfferId,
                title: fallbackTitle,
                status: null,
                starts_at: null,
                ends_at: null,
                discount_label: currentOffer.discount_label ?? null,
                badge: currentOffer.discount_label ?? null,
                offer_type: currentOffer.offer_type ?? null,
                offer_value: currentOffer.offer_value ?? null,
                label: `${currentOffer.title} (în afara perioadei)`,
                inactive: true,
            };
            options.unshift(fallback);
        }
        return options;
    }, [
        bookingInfo,
        offerOptions,
        rentalEndDateValue,
        rentalStartDateValue,
    ]);

    const selectedWheelPrizeValue = useMemo(() => {
        const prizeId = bookingInfo
            ? toOptionalNumber(
                  bookingInfo.wheel_of_fortune_prize_id ??
                      bookingInfo.wheel_prize?.wheel_of_fortune_prize_id ??
                      bookingInfo.wheel_prize?.prize_id,
              )
            : null;
        return typeof prizeId === "number" && Number.isFinite(prizeId) ? String(prizeId) : "";
    }, [bookingInfo]);

    const selectedOfferId = useMemo(() => {
        if (!bookingInfo || !Array.isArray(bookingInfo.applied_offers)) {
            return "";
        }
        const primaryOffer = bookingInfo.applied_offers.find(
            (offer) => typeof offer?.id === "number" && Number.isFinite(offer.id),
        );
        return primaryOffer ? String(primaryOffer.id) : "";
    }, [bookingInfo]);

    const appliedOffersQuoteKey = useMemo(() => {
        const sanitized = sanitizeAppliedOffersForQuote(bookingInfo?.applied_offers);
        return JSON.stringify(sanitized ?? []);
    }, [bookingInfo?.applied_offers]);

    useEffect(() => {
        setQuote(null);
        lastQuoteKeyRef.current = null;
        setPlanSnapshots({
            deposit: createEmptyPlanSnapshot(),
            casco: createEmptyPlanSnapshot(),
        });
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
                setQuote(data);
                let pendingSnapshotUpdates: {
                    deposit: Partial<PlanSnapshot>;
                    casco: Partial<PlanSnapshot>;
                } | null = null;

                updateBookingInfo((prev) => {
                    const preferCasco = prev.with_deposit === false;
                    const prevPricePerDay = toOptionalNumber(prev.price_per_day);
                    const prevOriginalPrice = toOptionalNumber(prev.original_price_per_day);
                    const depositRateCandidate =
                        toOptionalNumber(data.rental_rate) ??
                        toOptionalNumber(data.base_price) ??
                        toOptionalNumber((data as { price_per_day?: unknown }).price_per_day) ??
                        toOptionalNumber(prev.base_price);
                    const cascoRateCandidate =
                        toOptionalNumber(data.rental_rate_casco) ??
                        toOptionalNumber((data as { price_per_day_casco?: unknown }).price_per_day_casco) ??
                        toOptionalNumber(data.base_price_casco) ??
                        toOptionalNumber(prev.base_price_casco);
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
                    const normalizedSubtotalDeposit =
                        toOptionalNumber(data.sub_total) ?? toOptionalNumber(prev.sub_total);
                    const normalizedSubtotalCasco =
                        toOptionalNumber((data as { sub_total_casco?: unknown }).sub_total_casco) ??
                        toOptionalNumber(prev.sub_total);
                    const normalizedTotalDeposit =
                        toOptionalNumber(data.total) ?? toOptionalNumber(prev.total);
                    const normalizedTotalCasco =
                        toOptionalNumber((data as { total_casco?: unknown }).total_casco) ??
                        toOptionalNumber(prev.total);
                    const normalizedDiscount =
                        toOptionalNumber(data.discount) ??
                        (typeof prev.discount_applied === "number"
                            ? prev.discount_applied
                            : toOptionalNumber(prev.discount_applied));
                    const normalizedDiscountDeposit = toOptionalNumber(data.discount);
                    const normalizedDiscountCasco = toOptionalNumber(
                        (data as { discount_casco?: unknown }).discount_casco,
                    );
                    const normalizedWheelPrizeDiscount =
                        toOptionalNumber(data.wheel_prize_discount) ??
                        toOptionalNumber(prev.wheel_prize_discount) ??
                        0;
                    const normalizedTotalBefore =
                        toOptionalNumber(data.total_before_wheel_prize) ??
                        toOptionalNumber(prev.total_before_wheel_prize);
                    const normalizedTotalBeforeCasco = toOptionalNumber(
                        (data as { total_before_wheel_prize_casco?: unknown })
                            .total_before_wheel_prize_casco,
                    );
                    const normalizedDays =
                        typeof data.days === "number" && Number.isFinite(data.days)
                            ? data.days
                            : typeof prev.days === "number" && Number.isFinite(prev.days)
                                ? prev.days
                                : null;
                    const normalizedOffersDiscount =
                        toOptionalNumber(data.offers_discount) ??
                        (typeof prev.offers_discount === "number"
                            ? prev.offers_discount
                            : toOptionalNumber(prev.offers_discount) ?? 0);
                    const normalizedOfferFixedDiscount =
                        toOptionalNumber(data.offer_fixed_discount) ??
                        (typeof prev.offer_fixed_discount === "number"
                            ? prev.offer_fixed_discount
                            : toOptionalNumber(prev.offer_fixed_discount) ?? 0);
                    const normalizedTotalServices =
                        toOptionalNumber(data.total_services) ??
                        toOptionalNumber(prev.total_services);

                    const normalizedWheelPrize =
                        normalizeWheelPrizeSummary(data.wheel_prize) ?? prev.wheel_prize ?? null;
                    const normalizedAppliedOffers = normalizeAppliedOffers(data.applied_offers);
                    const nextAppliedOffers =
                        normalizedAppliedOffers.length > 0
                            ? normalizedAppliedOffers
                            : prev.applied_offers ?? [];
                    const normalizedDepositWaived =
                        typeof data.deposit_waived === "boolean"
                            ? data.deposit_waived
                            : prev.deposit_waived ?? false;
                    const normalizedWheelPrizeId =
                        toOptionalNumber(
                            (data as { wheel_of_fortune_prize_id?: unknown }).wheel_of_fortune_prize_id,
                        ) ??
                        toOptionalNumber(normalizedWheelPrize?.wheel_of_fortune_prize_id) ??
                        toOptionalNumber(normalizedWheelPrize?.prize_id) ??
                        toOptionalNumber(prev.wheel_of_fortune_prize_id);

                    const previousSubtotal = toOptionalNumber(prev.sub_total);
                    const previousTotal = toOptionalNumber(prev.total);
                    const nextSubtotal = preferCasco
                        ? normalizedSubtotalCasco ?? previousSubtotal ?? normalizedSubtotalDeposit
                        : normalizedSubtotalDeposit ?? previousSubtotal ?? normalizedSubtotalCasco;
                    const nextTotal = preferCasco
                        ? normalizedTotalCasco ?? previousTotal ?? normalizedTotalDeposit
                        : normalizedTotalDeposit ?? previousTotal ?? normalizedTotalCasco;

                    pendingSnapshotUpdates = {
                        deposit: {
                            pricePerDay: normalizedDepositRate ?? undefined,
                            subtotal:
                                typeof normalizedSubtotalDeposit === "number"
                                    ? Math.round(normalizedSubtotalDeposit * 100) / 100
                                    : undefined,
                            total:
                                typeof normalizedTotalDeposit === "number"
                                    ? Math.round(normalizedTotalDeposit * 100) / 100
                                    : undefined,
                            discount:
                                typeof normalizedDiscountDeposit === "number"
                                    ? Math.round(normalizedDiscountDeposit * 100) / 100
                                    : undefined,
                            totalBeforeWheel:
                                typeof normalizedTotalBefore === "number"
                                    ? Math.round(normalizedTotalBefore * 100) / 100
                                    : undefined,
                            days: normalizedDays ?? undefined,
                        },
                        casco: {
                            pricePerDay: normalizedCascoRate ?? undefined,
                            subtotal:
                                typeof normalizedSubtotalCasco === "number"
                                    ? Math.round(normalizedSubtotalCasco * 100) / 100
                                    : undefined,
                            total:
                                typeof normalizedTotalCasco === "number"
                                    ? Math.round(normalizedTotalCasco * 100) / 100
                                    : undefined,
                            discount:
                                typeof normalizedDiscountCasco === "number"
                                    ? Math.round(normalizedDiscountCasco * 100) / 100
                                    : undefined,
                            totalBeforeWheel:
                                typeof normalizedTotalBeforeCasco === "number"
                                    ? Math.round(normalizedTotalBeforeCasco * 100) / 100
                                    : undefined,
                            days: normalizedDays ?? undefined,
                        },
                    };

                    return {
                        ...prev,
                        days: typeof data.days === "number" ? data.days : prev.days ?? 0,
                        price_per_day: normalizedSelectedRate ?? prev.price_per_day,
                        original_price_per_day:
                            prevOriginalPrice ??
                            (typeof prevPricePerDay === "number" && Number.isFinite(prevPricePerDay)
                                ? Math.round(prevPricePerDay * 100) / 100
                                : normalizedSelectedRate ?? null),
                        base_price:
                            normalizedDepositRate ??
                            toOptionalNumber(prev.base_price) ??
                            toOptionalNumber(data.base_price) ??
                            null,
                        base_price_casco:
                            normalizedCascoRate ??
                            toOptionalNumber(prev.base_price_casco) ??
                            toOptionalNumber(data.base_price_casco) ??
                            null,
                        sub_total:
                            typeof nextSubtotal === "number" && Number.isFinite(nextSubtotal)
                                ? Math.round(nextSubtotal * 100) / 100
                                : prev.sub_total,
                        total:
                            typeof nextTotal === "number" && Number.isFinite(nextTotal)
                                ? Math.round(nextTotal * 100) / 100
                                : prev.total,
                        discount_applied: normalizedDiscount ?? null,
                        total_services:
                            typeof normalizedTotalServices === "number"
                                ? Math.round(normalizedTotalServices * 100) / 100
                                : prev.total_services,
                        wheel_prize: normalizedWheelPrize,
                        wheel_prize_discount: normalizedWheelPrizeDiscount,
                        total_before_wheel_prize:
                            typeof normalizedTotalBefore === "number"
                                ? Math.round(normalizedTotalBefore * 100) / 100
                                : prev.total_before_wheel_prize,
                        applied_offers: nextAppliedOffers,
                        offers_discount:
                            typeof normalizedOffersDiscount === "number"
                                ? Math.round(normalizedOffersDiscount * 100) / 100
                                : prev.offers_discount,
                        offer_fixed_discount:
                            typeof normalizedOfferFixedDiscount === "number"
                                ? Math.round(normalizedOfferFixedDiscount * 100) / 100
                                : typeof prev.offer_fixed_discount === "number"
                                  ? prev.offer_fixed_discount
                                  : 0,
                        deposit_waived: normalizedDepositWaived,
                        wheel_of_fortune_prize_id:
                            typeof normalizedWheelPrizeId === "number"
                                ? normalizedWheelPrizeId
                                : prev.wheel_of_fortune_prize_id ?? null,
                    };
                });

                if (pendingSnapshotUpdates) {
                    setPlanSnapshots((prevSnapshots) => ({
                        deposit: mergePlanSnapshot(
                            prevSnapshots.deposit,
                            pendingSnapshotUpdates?.deposit ?? {},
                        ),
                        casco: mergePlanSnapshot(
                            prevSnapshots.casco,
                            pendingSnapshotUpdates?.casco ?? {},
                        ),
                    }));
                }
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
        bookingInfo?.wheel_prize,
        bookingInfo?.wheel_prize_discount,
        appliedOffersQuoteKey,
        bookingInfo?.deposit_waived,
        bookingInfo?.total_before_wheel_prize,
    ]);

    useEffect(() => {
        if (!bookingInfo) {
            return;
        }
        const activePlan: "deposit" | "casco" = bookingInfo.with_deposit === false ? "casco" : "deposit";
        const updates: Partial<PlanSnapshot> = {};
        const pricePerDayValue = toOptionalNumber(bookingInfo.price_per_day);
        if (typeof pricePerDayValue === "number" && Number.isFinite(pricePerDayValue)) {
            updates.pricePerDay = Math.round(pricePerDayValue * 100) / 100;
        }
        const subtotalValue = toOptionalNumber(bookingInfo.sub_total);
        if (typeof subtotalValue === "number" && Number.isFinite(subtotalValue)) {
            updates.subtotal = Math.round(subtotalValue * 100) / 100;
        }
        const totalValue = toOptionalNumber(bookingInfo.total);
        if (typeof totalValue === "number" && Number.isFinite(totalValue)) {
            updates.total = Math.round(totalValue * 100) / 100;
        }
        const discountValue = toOptionalNumber(bookingInfo.discount_applied);
        if (typeof discountValue === "number" && Number.isFinite(discountValue)) {
            updates.discount = Math.round(discountValue * 100) / 100;
        }
        const totalBeforeValue = toOptionalNumber(bookingInfo.total_before_wheel_prize);
        if (typeof totalBeforeValue === "number" && Number.isFinite(totalBeforeValue)) {
            updates.totalBeforeWheel = Math.round(totalBeforeValue * 100) / 100;
        }
        if (typeof bookingInfo.days === "number" && Number.isFinite(bookingInfo.days)) {
            updates.days = bookingInfo.days;
        }
        if (Object.keys(updates).length > 0) {
            setPlanSnapshots((prev) => ({
                ...prev,
                [activePlan]: mergePlanSnapshot(prev[activePlan], updates),
            }));
        }
    }, [bookingInfo]);

    const recalcTotals = useCallback((info: AdminBookingFormValues): AdminBookingFormValues => {
        const normalizedType = normalizeManualCouponType(info.coupon_type);
        const parsedCouponAmount = toOptionalNumber(info.coupon_amount);
        const resolvedCouponAmount =
            normalizedType === "code"
                ? 0
                : parsedCouponAmount ?? (typeof info.coupon_amount === "number" ? info.coupon_amount : 0);

        const fallbackBase =
            toOptionalNumber(info.base_price) ??
            toOptionalNumber(info.price_per_day) ??
            toOptionalNumber(info.original_price_per_day);
        const fallbackCasco =
            toOptionalNumber(info.base_price_casco) ??
            toOptionalNumber(info.base_price) ??
            fallbackBase;

        const nextBase =
            normalizedType === "fixed_per_day" && resolvedCouponAmount > 0
                ? resolvedCouponAmount
                : fallbackBase ?? null;
        const nextBaseCasco =
            normalizedType === "fixed_per_day" && resolvedCouponAmount > 0
                ? resolvedCouponAmount
                : fallbackCasco ?? null;
        const nextOriginal = info.original_price_per_day ?? fallbackBase ?? null;

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

    const applyPlanSnapshot = useCallback(
        (prev: AdminBookingFormValues, nextWithDeposit: boolean): AdminBookingFormValues => {
            const targetPlan: "deposit" | "casco" = nextWithDeposit ? "deposit" : "casco";
            const snapshot = planSnapshots[targetPlan];
            const fallbackSnapshot = planSnapshots[nextWithDeposit ? "casco" : "deposit"];
            const nextPricePerDay =
                pickFirstNumber(
                    snapshot.pricePerDay,
                    nextWithDeposit
                        ? toOptionalNumber(prev.base_price)
                        : toOptionalNumber(prev.base_price_casco),
                    toOptionalNumber(prev.price_per_day),
                    fallbackSnapshot.pricePerDay,
                ) ?? toOptionalNumber(prev.price_per_day) ?? 0;

            const daysCount =
                typeof snapshot.days === "number" && Number.isFinite(snapshot.days)
                    ? snapshot.days
                    : typeof prev.days === "number" && Number.isFinite(prev.days)
                        ? prev.days
                        : 0;

            const snapshotSubtotal =
                snapshot.subtotal ??
                (typeof snapshot.pricePerDay === "number" && Number.isFinite(snapshot.pricePerDay)
                    ? Math.round(snapshot.pricePerDay * daysCount * 100) / 100
                    : null);

            const previousSubtotalValue =
                typeof prev.sub_total === "number"
                    ? prev.sub_total
                    : toOptionalNumber(prev.sub_total) ?? 0;
            const normalizedSubtotal =
                typeof snapshotSubtotal === "number" && Number.isFinite(snapshotSubtotal)
                    ? Math.round(snapshotSubtotal * 100) / 100
                    : previousSubtotalValue;

            const previousTotalValue =
                typeof prev.total === "number"
                    ? prev.total
                    : toOptionalNumber(prev.total) ?? previousSubtotalValue;
            const snapshotTotal = snapshot.total;
            const normalizedTotal =
                typeof snapshotTotal === "number" && Number.isFinite(snapshotTotal)
                    ? Math.round(snapshotTotal * 100) / 100
                    : previousTotalValue;

            const previousDiscountValue =
                typeof prev.discount_applied === "number"
                    ? prev.discount_applied
                    : toOptionalNumber(prev.discount_applied) ?? 0;
            const snapshotDiscount = snapshot.discount;
            const normalizedDiscount =
                typeof snapshotDiscount === "number" && Number.isFinite(snapshotDiscount)
                    ? Math.round(snapshotDiscount * 100) / 100
                    : Math.round(previousDiscountValue * 100) / 100;

            const normalizedTotalBefore =
                typeof snapshot.totalBeforeWheel === "number" &&
                Number.isFinite(snapshot.totalBeforeWheel)
                    ? Math.round(snapshot.totalBeforeWheel * 100) / 100
                    : prev.total_before_wheel_prize ?? null;

            const nextOriginal =
                toOptionalNumber(prev.original_price_per_day) ??
                (typeof snapshot.pricePerDay === "number" && Number.isFinite(snapshot.pricePerDay)
                    ? Math.round(snapshot.pricePerDay * 100) / 100
                    : prev.original_price_per_day ?? null);

            const nextBasePrice = nextWithDeposit ? nextPricePerDay : prev.base_price;
            const nextBasePriceCasco = nextWithDeposit ? prev.base_price_casco : nextPricePerDay;

            const snapshotUpdates: Partial<PlanSnapshot> = {
                pricePerDay:
                    typeof nextPricePerDay === "number" && Number.isFinite(nextPricePerDay)
                        ? Math.round(nextPricePerDay * 100) / 100
                        : undefined,
                subtotal:
                    typeof normalizedSubtotal === "number" && Number.isFinite(normalizedSubtotal)
                        ? Math.round(normalizedSubtotal * 100) / 100
                        : undefined,
                total:
                    typeof normalizedTotal === "number" && Number.isFinite(normalizedTotal)
                        ? Math.round(normalizedTotal * 100) / 100
                        : undefined,
                discount:
                    typeof normalizedDiscount === "number" && Number.isFinite(normalizedDiscount)
                        ? Math.round(normalizedDiscount * 100) / 100
                        : undefined,
                totalBeforeWheel:
                    typeof normalizedTotalBefore === "number" && Number.isFinite(normalizedTotalBefore)
                        ? Math.round(normalizedTotalBefore * 100) / 100
                        : undefined,
                days:
                    typeof daysCount === "number" && Number.isFinite(daysCount)
                        ? daysCount
                        : undefined,
            };

            const hasSnapshotUpdates = Object.values(snapshotUpdates).some(
                (value) => value !== undefined,
            );
            if (hasSnapshotUpdates) {
                setPlanSnapshots((currentSnapshots) => ({
                    ...currentSnapshots,
                    [targetPlan]: mergePlanSnapshot(currentSnapshots[targetPlan], snapshotUpdates),
                }));
            }

            return recalcTotals({
                ...prev,
                with_deposit: nextWithDeposit,
                price_per_day: nextPricePerDay,
                original_price_per_day: nextOriginal,
                base_price: nextBasePrice,
                base_price_casco: nextBasePriceCasco,
                sub_total: normalizedSubtotal,
                total: normalizedTotal,
                discount_applied: normalizedDiscount,
                total_before_wheel_prize: normalizedTotalBefore,
            });
        },
        [planSnapshots, recalcTotals, setPlanSnapshots],
    );


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
        if (!open) {
            return;
        }
        let cancelled = false;

        const loadSupportingData = async () => {
            try {
                const [periodResponse, offersResponse] = await Promise.all([
                    apiClient.getWheelOfFortunePeriods({
                        is_active: 1,
                        with: "wheelOfFortunes",
                        limit: 100,
                    }),
                    apiClient.getOffers({
                        status: "published",
                        audience: "admin",
                        limit: 100,
                    }),
                ]);
                if (cancelled) {
                    return;
                }
                const periodsList = extractList(periodResponse)
                    .map((entry) => mapPeriod(entry))
                    .filter((entry): entry is WheelOfFortunePeriod => entry != null);
                setWheelPeriods(periodsList);

                const offersList = extractList(offersResponse)
                    .map((entry) => {
                        if (!isRecord(entry)) {
                            return null;
                        }
                        const id = toOptionalNumber(entry.id);
                        if (typeof id !== "number" || Number.isNaN(id)) {
                            return null;
                        }
                        const title =
                            typeof entry.title === "string" && entry.title.trim().length > 0
                                ? entry.title.trim()
                                : typeof entry.name === "string" && entry.name.trim().length > 0
                                    ? entry.name.trim()
                                    : null;
                        if (!title) {
                            return null;
                        }
                        const option: AdminOfferOption = {
                            id,
                            title,
                            status: (entry as { status?: OfferStatus | null }).status ?? null,
                            starts_at: (entry as { starts_at?: string | null }).starts_at ?? null,
                            ends_at: (entry as { ends_at?: string | null }).ends_at ?? null,
                            discount_label: (entry as { discount_label?: string | null }).discount_label ?? null,
                            badge: (entry as { badge?: string | null }).badge ?? null,
                            offer_type: (entry as { offer_type?: string | null }).offer_type ?? null,
                            offer_value: (entry as { offer_value?: string | null }).offer_value ?? null,
                        };
                        return option;
                    })
                    .filter((entry): entry is AdminOfferOption => entry != null);
                setOfferOptions(offersList);
            } catch (error) {
                console.error("Error loading wheel prizes or offers:", error);
            }
        };

        loadSupportingData();

        return () => {
            cancelled = true;
        };
    }, [open]);

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

    const handleWheelPrizeChange = useCallback(
        (value: string) => {
            if (!hasBookingInfo) {
                return;
            }
            if (!value) {
            updateBookingInfo((prev) => ({
                ...prev,
                wheel_prize: null,
                wheel_prize_discount: 0,
                total_before_wheel_prize: null,
                wheel_of_fortune_prize_id: null,
            }));
            return;
        }
        const option = wheelPrizeOptions.find((entry) => entry.value === value);
        if (!option) {
            return;
        }
        const discountNumeric =
            toOptionalNumber(option.summary.discount_value) ??
            toOptionalNumber(option.summary.amount) ??
            0;
        const summary: ReservationWheelPrizeSummary = {
            ...option.summary,
            discount_value: discountNumeric,
            discount_value_deposit:
                toOptionalNumber(option.summary.discount_value_deposit) ?? discountNumeric,
            discount_value_casco:
                toOptionalNumber(option.summary.discount_value_casco) ?? discountNumeric,
        };
        updateBookingInfo((prev) => {
            const previousTotalBefore = toOptionalNumber(prev.total_before_wheel_prize);
            const nextTotalBefore =
                previousTotalBefore ??
                    (typeof prev.total === "number"
                        ? prev.total + discountNumeric
                        : null);
            return {
                ...prev,
                wheel_prize: summary,
                wheel_prize_discount: discountNumeric,
                total_before_wheel_prize: nextTotalBefore,
                wheel_of_fortune_prize_id:
                    summary.wheel_of_fortune_prize_id ?? summary.prize_id ?? prev.wheel_of_fortune_prize_id ?? null,
            };
        });
        },
        [hasBookingInfo, updateBookingInfo, wheelPrizeOptions],
    );

    const handleOfferChange = useCallback(
        (value: string) => {
            if (!hasBookingInfo) {
                return;
            }
            if (!value) {
                updateBookingInfo((prev) => ({
                    ...prev,
                    applied_offers: [],
                    offers_discount: 0,
                    offer_fixed_discount: 0,
                }));
                return;
            }
            const selected = offerSelectOptions.find((offer) => String(offer.id) === value);
            if (!selected) {
                return;
            }
            const sanitizedOffer: ReservationAppliedOffer = {
                id: selected.id,
                title: selected.title,
                offer_type: selected.offer_type ?? null,
                offer_value: selected.offer_value ?? null,
                discount_label: selected.discount_label ?? selected.badge ?? null,
            };
            updateBookingInfo((prev) => ({
                ...prev,
                applied_offers: [sanitizedOffer],
                offers_discount: 0,
                offer_fixed_discount: 0,
            }));
        },
        [hasBookingInfo, offerSelectOptions, updateBookingInfo],
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

    const pricePerDayValue = toOptionalNumber(bookingInfo.price_per_day);
    const originalRateFromBooking = toOptionalNumber(bookingInfo.original_price_per_day);
    const depositQuoteRate = pickFirstNumber(
        toOptionalNumber(quote?.rental_rate),
        toOptionalNumber(quote?.price_per_day),
        toOptionalNumber(quote?.base_price),
    );
    const cascoQuoteRate = pickFirstNumber(
        toOptionalNumber(quote?.rental_rate_casco),
        toOptionalNumber((quote as { price_per_day_casco?: unknown })?.price_per_day_casco),
        toOptionalNumber(quote?.base_price_casco),
    );
    const isWithDeposit = bookingInfo.with_deposit !== false;
    const depositPlanSnapshot = planSnapshots.deposit;
    const cascoPlanSnapshot = planSnapshots.casco;
    const activePlanSnapshot = isWithDeposit ? depositPlanSnapshot : cascoPlanSnapshot;
    const days =
        typeof activePlanSnapshot.days === "number" && Number.isFinite(activePlanSnapshot.days)
            ? activePlanSnapshot.days
            : quote?.days ?? bookingInfo.days ?? 0;
    const depositPlanBaseRate = pickFirstNumber(
        depositPlanSnapshot.pricePerDay,
        depositQuoteRate,
        toOptionalNumber(quote?.base_price),
        toOptionalNumber(bookingInfo.base_price),
        isWithDeposit ? pricePerDayValue : null,
        originalRateFromBooking,
    );
    const cascoPlanBaseRate = pickFirstNumber(
        cascoPlanSnapshot.pricePerDay,
        cascoQuoteRate,
        toOptionalNumber(quote?.base_price_casco),
        toOptionalNumber(bookingInfo.base_price_casco),
        !isWithDeposit ? pricePerDayValue : null,
        toOptionalNumber(bookingInfo.base_price),
        originalRateFromBooking,
    );
    const baseRate =
        (isWithDeposit ? depositPlanBaseRate : cascoPlanBaseRate) ??
        depositPlanBaseRate ??
        cascoPlanBaseRate ??
        0;
    const discountedRate = isWithDeposit
        ? pickFirstNumber(
              depositPlanSnapshot.pricePerDay,
              depositQuoteRate,
              toOptionalNumber(quote?.price_per_day),
              toOptionalNumber(bookingInfo.price_per_day),
              depositPlanBaseRate,
          ) ?? baseRate
        : pickFirstNumber(
              cascoPlanSnapshot.pricePerDay,
              cascoQuoteRate,
              toOptionalNumber((quote as { price_per_day_casco?: unknown })?.price_per_day_casco),
              toOptionalNumber(bookingInfo.price_per_day),
              cascoPlanBaseRate,
              depositPlanBaseRate,
          ) ?? baseRate;
    const discountedSubtotal = isWithDeposit
        ? pickFirstNumber(
              depositPlanSnapshot.subtotal,
              toOptionalNumber(quote?.sub_total),
              toOptionalNumber(bookingInfo.sub_total),
              toOptionalNumber((quote as { sub_total_casco?: unknown })?.sub_total_casco),
          )
        : pickFirstNumber(
              cascoPlanSnapshot.subtotal,
              toOptionalNumber((quote as { sub_total_casco?: unknown })?.sub_total_casco),
              toOptionalNumber(bookingInfo.sub_total),
              toOptionalNumber(quote?.sub_total),
          );
    const discount = isWithDeposit
        ? pickFirstNumber(
              depositPlanSnapshot.discount,
              toOptionalNumber(quote?.discount),
              toOptionalNumber(bookingInfo.discount_applied),
          ) ?? 0
        : pickFirstNumber(
              cascoPlanSnapshot.discount,
              toOptionalNumber((quote as { discount_casco?: unknown })?.discount_casco),
              toOptionalNumber(bookingInfo.discount_applied),
              toOptionalNumber(quote?.discount),
          ) ?? 0;
    const wheelPrizeDiscountValue =
        typeof quote?.wheel_prize_discount === "number"
            ? quote.wheel_prize_discount
            : toOptionalNumber(bookingInfo.wheel_prize_discount) ??
              toOptionalNumber(bookingInfo.wheel_prize?.discount_value) ??
              null;
    const normalizedWheelPrizeDiscount =
        typeof wheelPrizeDiscountValue === "number"
            ? Math.round(wheelPrizeDiscountValue * 100) / 100
            : null;
    const hasWheelPrizeDiscount =
        typeof normalizedWheelPrizeDiscount === "number" && normalizedWheelPrizeDiscount !== 0;
    const discountedTotalQuote = isWithDeposit
        ? pickFirstNumber(
              depositPlanSnapshot.total,
              toOptionalNumber(quote?.total),
              toOptionalNumber(bookingInfo.total),
              toOptionalNumber((quote as { total_casco?: unknown })?.total_casco),
          )
        : pickFirstNumber(
              cascoPlanSnapshot.total,
              toOptionalNumber((quote as { total_casco?: unknown })?.total_casco),
              toOptionalNumber(bookingInfo.total),
              toOptionalNumber(quote?.total),
          );
    const subtotalDisplay =
        typeof discountedSubtotal === "number"
            ? discountedSubtotal
            : Number(originalTotals.current.subtotal ?? 0);
    const totalDisplay =
        typeof discountedTotalQuote === "number"
            ? discountedTotalQuote
            : Number(originalTotals.current.total ?? 0);
    const advancePaymentValue = toOptionalNumber(bookingInfo.advance_payment) ?? 0;
    const totalServicesValue =
        typeof quote?.total_services === "number"
            ? quote.total_services
            : toOptionalNumber(bookingInfo.total_services) ?? 0;
    const totalServicesDisplay = Math.round(totalServicesValue * 100) / 100;
    const restToPay = totalDisplay - advancePaymentValue;
    const restToPayEuroDisplay = Number.isFinite(restToPay)
        ? Math.round(restToPay * 100) / 100
        : null;

    const depositWaived = bookingInfo.deposit_waived === true;
    const subtotalLei = formatLeiAmount(subtotalDisplay);
    const totalLei = formatLeiAmount(totalDisplay);
    const restToPayLei = formatLeiAmount(restToPay);
    const discountLei = formatLeiAmount(discount);
    const wheelPrizeDiscountLei = formatLeiAmount(normalizedWheelPrizeDiscount);
    const roundedBaseRate = Math.round(baseRate * 100) / 100;
    const baseRateLei = formatLeiAmount(baseRate);
    const roundedDiscountedRate = Math.round(discountedRate * 100) / 100;
    const roundedDiscountedRateLei = formatLeiAmount(roundedDiscountedRate);
    const advancePaymentLei = formatLeiAmount(advancePaymentValue);
    const hasDiscountDetails = discount !== 0 && (discountedTotalQuote ?? 0) > 0;
    const originalTotalValue = hasDiscountDetails ? totalDisplay + discount : totalDisplay;
    const originalTotalRounded = Math.round(originalTotalValue * 100) / 100;
    const originalTotalLei = formatLeiAmount(originalTotalRounded);
    const discountedTotalLei = formatLeiAmount(totalDisplay);

    const handleUpdateBooking = async () => {
        if (!bookingInfo || bookingInfo.id == null) {
            console.error("Booking information missing identifier; cannot update reservation.");
            return;
        }
        try {
            const serviceIds = resolveServiceSelection(bookingInfo);
            const payload = buildBookingUpdatePayload(bookingInfo, serviceIds);
            await apiClient.updateBooking(bookingInfo.id, payload);
            onClose();
            onUpdated?.();
        } catch (error) {
            console.error("Failed to update booking:", error);
        }
    }

    return (
        <Popup
            open={open}
            onClose={onClose}
            className="max-w-5xl w-full max-h-[80vh] overflow-y-auto"
        >
            <h3 className="text-lg font-poppins font-semibold text-berkeley mb-4">
                Editează rezervarea
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
                            <option value="fixed_per_day">Pret fix pe zi</option>
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
                            type={couponTypeValue === "code" ? "text" : "number"}
                            {...couponValueInputProps}
                            value={
                                couponTypeValue === "code"
                                    ? bookingInfo.coupon_code ?? ""
                                    : bookingInfo.coupon_amount ?? 0
                            }
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
                        <Label htmlFor="wheel-prize">Premiu roata norocului</Label>
                        <Select
                            id="wheel-prize"
                            value={selectedWheelPrizeValue}
                            onValueChange={handleWheelPrizeChange}
                            placeholder={
                                wheelPrizeOptions.length > 0
                                    ? "Selectează premiul"
                                    : "Nicio campanie activă"
                            }
                            disabled={wheelPrizeOptions.length === 0}
                        >
                            <option value="">Fără premiu</option>
                            {wheelPrizeOptions.map((option) => (
                                <option key={option.id} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="booking-offer">Ofertă aplicată</Label>
                        <Select
                            id="booking-offer"
                            value={selectedOfferId}
                            onValueChange={handleOfferChange}
                            placeholder={
                                offerSelectOptions.length > 0 ? "Selectează oferta" : "Nu există oferte"
                            }
                            disabled={offerSelectOptions.length === 0}
                        >
                            <option value="">Fără ofertă</option>
                            {offerSelectOptions.map((offer) => (
                                <option key={offer.id} value={String(offer.id)}>
                                    {offer.label}
                                </option>
                            ))}
                        </Select>
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
                                        updateBookingInfo((prev) => applyPlanSnapshot(prev, true))
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
                                        updateBookingInfo((prev) => applyPlanSnapshot(prev, false))
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
                            <Button className="!px-4 py-4" onClick={handleUpdateBooking}>
                                Salvează
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
                                }/>
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
                                        {baseRateLei ? `${baseRateLei} x ${days} zile` : "—"}
                                    </span>
                                </div>
                                {totalServicesDisplay > 0 && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Total Servicii:</span>
                                        <span>{formatLeiAmount(totalServicesDisplay) ?? "—"}</span>
                                    </div>
                                )}
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Subtotal:</span>
                                    <span>{subtotalLei ?? "—"}</span>
                                </div>
                                {discount !== 0 && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Discount:</span>
                                        <span>{discountLei ?? "—"}</span>
                                    </div>
                                )}
                                {hasWheelPrizeDiscount && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Reducere roata norocului:</span>
                                        <span>{wheelPrizeDiscountLei ?? "—"}</span>
                                    </div>
                                )}
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Total:</span>
                                    <span>{totalLei ?? "—"}</span>
                                </div>
                                {depositWaived && (
                                    <div className="font-dm-sans text-xs text-jade flex justify-between border-b border-b-1 mb-1">
                                        <span>Garanție:</span>
                                        <span>Eliminată prin promoție</span>
                                    </div>
                                )}
                                {advancePaymentValue > 0 && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Avans:</span>
                                        <span>{advancePaymentLei ?? "—"}</span>
                                    </div>
                                )}
                                {advancePaymentValue !== 0 && (
                                    <div className="font-dm-sans text-sm font-semibold flex justify-between border-b border-b-1 mb-1">
                                        <span>Rest de plată:</span>
                                        <span>{restToPayLei ?? "—"}</span>
                                    </div>
                                )}
                                {hasDiscountDetails && (
                                    <div className="font-dm-sans text-sm">
                                        Detalii discount:
                                        <ul className="list-disc">
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Preț inițial pe zi:</span>
                                                <span>
                                                    {baseRateLei ? `${baseRateLei} x ${days} zile` : "—"}
                                                </span>
                                            </li>
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Preț cu discount pe zi:</span>
                                                <span>
                                                    {roundedDiscountedRateLei
                                                        ? `${roundedDiscountedRateLei} x ${days} zile`
                                                        : "—"}
                                                </span>
                                            </li>
                                            {discount > 0 && (
                                                <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                    <span>Discount aplicat:</span>
                                                    <span>{discountLei ?? "—"}</span>
                                                </li>
                                            )}
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Total inițial:</span>
                                                <span>{originalTotalLei ?? "—"}</span>
                                            </li>
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Total cu discount:</span>
                                                <span>{discountedTotalLei ?? "—"}</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="pt-4 border-t border-gray-300">
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Preț per zi:</span>
                                    <span>{baseRate}€ x {days} zile</span>
                                </div>
                                {totalServicesDisplay > 0 && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Total Servicii:</span> <span>{totalServicesDisplay}€</span>
                                    </div>
                                )}
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Subtotal:</span>
                                    <span>{subtotalDisplay}€</span>
                                </div>
                                {discount !== 0 && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Discount:</span>
                                        <span>{discount}€</span>
                                    </div>
                                )}
                                {hasWheelPrizeDiscount && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Reducere roata norocului:</span>
                                        <span>{normalizedWheelPrizeDiscount}€</span>
                                    </div>
                                )}
                                {depositWaived && (
                                    <div className="font-dm-sans text-xs text-jade flex justify-between border-b border-b-1 mb-1">
                                        <span>Garanție:</span>
                                        <span>Eliminată prin promoție</span>
                                    </div>
                                )}
                                {advancePaymentValue > 0 && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Avans:</span> <span>{advancePaymentValue}€</span>
                                    </div>
                                )}
                                {advancePaymentValue !== 0 && (
                                    <div className="font-dm-sans text-sm font-semibold flex justify-between border-b border-b-1 mb-1">
                                        <span>Rest de plată:</span>
                                        <span>
                                            {restToPayEuroDisplay != null ? `${restToPayEuroDisplay}€` : "—"}
                                        </span>
                                    </div>
                                )}
                                <div className="font-dm-sans text-sm font-semibold flex justify-between">
                                    <span>Total:</span>
                                    <span>{totalDisplay}€</span>
                                </div>
                                {hasDiscountDetails && (
                                    <div className="font-dm-sans text-sm mt-3">
                                        Detalii discount:
                                        <ul className="list-disc">
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Preț inițial pe zi:</span>
                                                <span>{roundedBaseRate}€ x {days} zile</span>
                                            </li>
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Preț cu discount pe zi:</span>
                                                <span>{roundedDiscountedRate}€ x {days} zile</span>
                                            </li>
                                            {discount > 0 && (
                                                <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                    <span>Discount aplicat:</span>
                                                    <span>{discount}€</span>
                                                </li>
                                            )}
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Total inițial:</span>
                                                <span>{originalTotalRounded}€</span>
                                            </li>
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Total cu discount:</span>
                                                <span>{totalDisplay}€</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-between mt-6">

            </div>
        </Popup>
    );
};

export default BookingForm;

