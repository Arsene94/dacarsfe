"use client";

import React, {useState, useEffect, useCallback, useRef} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  CalendarPlus,
  Car,
  MapPin,
  X,
  Newspaper,
  Plus,
  Loader2,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/table";
import type { Column } from "@/types/ui";
import { extractList } from "@/lib/apiResponse";
import type {
  AdminBookingFormValues,
  AdminBookingResource,
  AdminReservation,
} from "@/types/admin";
import { createEmptyBookingForm } from "@/types/admin";
import type {
  ReservationAppliedOffer,
  ReservationWheelPrizeSummary,
  BookingExtendPayload,
} from "@/types/reservation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DateRangePicker from "@/components/ui/date-range-picker";
import { Popup } from "@/components/ui/popup";
import BookingForm from "@/components/admin/BookingForm";
import BookingContractForm from "@/components/admin/BookingContractForm";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api";
import { normalizeReservationExtension } from "@/lib/adminBookingHelpers";
import {
  describeWheelPrizeSummaryAmount,
  formatWheelPrizeExpiry,
} from "@/lib/wheelFormatting";
import { generatePaginationSequence } from "@/lib/pagination";
import { derivePercentageCouponInputValue, normalizeManualCouponType } from "@/lib/bookingDiscounts";

const EMPTY_BOOKING = createEmptyBookingForm();

const parseOptionalNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^0-9.,-]/g, "").replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toIdString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  return null;
};

const defaultDateTimeFormatter = new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTime = (
  value: string | null | undefined,
  formatter: Intl.DateTimeFormat = defaultDateTimeFormatter,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return formatter.format(parsed);
};

const mergeBookingRecord = (
  record: Record<string, unknown>,
): Record<string, unknown> => {
  const {
    booking,
    bookings: _bookings,
    reservations: _reservations,
    data: _data,
    item: _item,
    result: _result,
    resource: _resource,
    ...rest
  } = record;

  return {
    ...rest,
    ...(isRecord(booking) ? booking : {}),
  };
};

const resolveBookingResourcePayload = (
  raw: unknown,
  reservationId: string,
): AdminBookingResource | null => {
  const targetId = reservationId.trim();
  if (!targetId) {
    return null;
  }

  const visit = (value: unknown): Record<string, unknown> | null => {
    if (!value) return null;

    if (Array.isArray(value)) {
      for (const entry of value) {
        const found = visit(entry);
        if (found) {
          return found;
        }
      }
      return null;
    }

    if (!isRecord(value)) {
      return null;
    }

    const merged = mergeBookingRecord(value);
    const candidateId =
      toIdString(merged.id) ??
      toIdString((merged as { booking_id?: unknown }).booking_id) ??
      toIdString((merged as { bookingId?: unknown }).bookingId);
    const candidateNumber =
      toIdString((merged as { booking_number?: unknown }).booking_number) ??
      toIdString((merged as { bookingNumber?: unknown }).bookingNumber);

    if (
      (candidateId && candidateId === targetId) ||
      (candidateNumber && candidateNumber === targetId)
    ) {
      const {
        bookings: _bookings,
        reservations: _reservations,
        booking: _booking,
        ...rest
      } = merged;
      return rest;
    }

    const nestedSources: unknown[] = [
      (value as { data?: unknown }).data,
      (value as { item?: unknown }).item,
      (value as { resource?: unknown }).resource,
      (value as { result?: unknown }).result,
      (value as { booking?: unknown }).booking,
      (value as { reservation?: unknown }).reservation,
      (value as { reservations?: unknown }).reservations,
      (value as { booking_data?: unknown }).booking_data,
    ];

    for (const source of nestedSources) {
      const found = visit(source);
      if (found) {
        return found;
      }
    }

    return null;
  };

  const resolved = visit(raw);
  if (!resolved) {
    return null;
  }

  return resolved as AdminBookingResource;
};

const mergeBookingResourceIntoForm = (
  info: AdminBookingResource,
  base: AdminBookingFormValues,
): AdminBookingFormValues => {
  const rawServiceIds = Array.isArray(info.service_ids)
    ? info.service_ids
    : Array.isArray(info.services)
      ? info.services.map((service) =>
          service?.id ?? (service?.pivot ? (service.pivot as { service_id?: unknown }).service_id : null),
        )
      : [];
  const normalizedServiceIds = rawServiceIds
    .map((value) => parseOptionalNumber(value))
    .filter((value): value is number => value != null);

  const pricePerDayRaw = parseOptionalNumber(info?.price_per_day ?? info?.pricePerDay);
  const originalPricePerDayRaw = parseOptionalNumber(
    info?.original_price_per_day ?? info?.price_per_day ?? info?.pricePerDay,
  );
  const basePriceRaw = parseOptionalNumber(info?.base_price);
  const basePriceCascoRaw = parseOptionalNumber(info?.base_price_casco ?? info?.rental_rate_casco);
  let totalServicesRaw = parseOptionalNumber(info.total_services);
  if (totalServicesRaw == null && Array.isArray(info.services)) {
    totalServicesRaw = info.services.reduce((sum, svc) => {
      const directPrice = parseOptionalNumber(svc?.price);
      const pivotPrice = svc?.pivot ? parseOptionalNumber((svc.pivot as { price?: unknown }).price) : null;
      return sum + (directPrice ?? pivotPrice ?? 0);
    }, 0);
  }
  const totalBeforeWheelPrize =
    parseOptionalNumber(info.total_before_wheel_prize ?? (info as { totalBeforeWheelPrize?: unknown }).totalBeforeWheelPrize) ??
    null;
  const wheelPrize = normalizeWheelPrizeSummary(info.wheel_prize);
  const wheelPrizeDiscountRaw =
    parseOptionalNumber(info.wheel_prize_discount) ?? (wheelPrize?.discount_value ?? null);
  const advancePaymentRaw = parseOptionalNumber(
    info.advance_payment ?? (info as { advancePayment?: unknown }).advancePayment,
  );
  const couponAmountRaw = parseOptionalNumber(info.coupon_amount ?? info.discount);
  const discountAmountRaw =
    parseOptionalNumber((info as { discount?: unknown }).discount) ?? couponAmountRaw;
  const subTotalRaw =
    parseOptionalNumber(info.sub_total) ?? parseOptionalNumber((info as { subTotal?: unknown }).subTotal);
  const totalRaw = parseOptionalNumber(info.total) ?? parseOptionalNumber(info.total_price);
  const taxAmountRaw =
    parseOptionalNumber(info.tax_amount) ?? parseOptionalNumber((info as { taxAmount?: unknown }).taxAmount);
  const offersDiscountRaw = parseOptionalNumber(
    info.offers_discount ?? (info as { offersDiscount?: unknown }).offersDiscount,
  );
  const offerFixedDiscountRaw = parseOptionalNumber(
    info.offer_fixed_discount ?? (info as { offerFixedDiscount?: unknown }).offerFixedDiscount,
  );
  const depositWaived = normalizeBoolean(info.deposit_waived, base.deposit_waived ?? false);
  const withDepositValue = normalizeBoolean(info?.with_deposit, base.with_deposit ?? true);
  const appliedOffers = normalizeAppliedOffersList(info.applied_offers);
  const wheelOfFortunePrizeIdRaw = parseOptionalNumber(
    info.wheel_of_fortune_prize_id ?? (info as { wheelPrizeId?: unknown }).wheelPrizeId,
  );
  const resolvedWheelPrizeId =
    typeof wheelOfFortunePrizeIdRaw === "number"
      ? wheelOfFortunePrizeIdRaw
      : wheelPrize?.wheel_of_fortune_prize_id ?? wheelPrize?.prize_id ?? null;

  const carId = parseOptionalNumber(info?.car_id ?? info?.car?.id);

  const couponType =
    pickNonEmptyString(info?.coupon_type) ?? pickNonEmptyString(info?.discount_type) ?? base.coupon_type ?? "";
  const normalizedCouponType = normalizeManualCouponType(couponType);

  const carImage =
    pickNonEmptyString((info as { car_image?: unknown }).car_image) ??
    pickNonEmptyString(info?.car?.image_preview) ??
    pickNonEmptyString(info?.image_preview) ??
    pickNonEmptyString(info?.car?.image) ??
    null;
  const carLicensePlate =
    pickNonEmptyString(info?.car?.license_plate) ??
    pickNonEmptyString((info as { license_plate?: unknown }).license_plate) ??
    pickNonEmptyString(info?.car?.plate) ??
    null;
  const carTransmission =
    pickLookupName(info?.car?.transmission) ??
    pickNonEmptyString((info as { transmission_name?: unknown }).transmission_name) ??
    null;
  const carFuel =
    pickLookupName(info?.car?.fuel) ?? pickNonEmptyString((info as { fuel_name?: unknown }).fuel_name) ?? null;
  const carDeposit = parseOptionalNumber((info as { car_deposit?: unknown }).car_deposit ?? info?.car?.deposit);
  const locationValue = pickNonEmptyString(info?.location ?? null) ?? undefined;

  const pricePerDayResolved = pricePerDayRaw ?? base.price_per_day ?? EMPTY_BOOKING.price_per_day;
  const originalPricePerDayResolved = originalPricePerDayRaw ?? base.original_price_per_day ?? pricePerDayResolved;
  const basePriceResolved = basePriceRaw ?? base.base_price ?? pricePerDayResolved;
  const basePriceCascoResolved = basePriceCascoRaw ?? base.base_price_casco ?? basePriceResolved;

  const rentalDays =
    parseOptionalNumber(info?.days) ??
    parseOptionalNumber((info as { total_days?: unknown }).total_days) ??
    base.days;

  const resolvedCouponAmount =
    normalizedCouponType === "percentage"
      ? derivePercentageCouponInputValue({
          couponType: normalizedCouponType,
          couponAmount: couponAmountRaw,
          discountAmount: discountAmountRaw,
          days: rentalDays,
          depositRate: basePriceResolved,
          cascoRate: basePriceCascoResolved,
          withDeposit: withDepositValue,
        }) ?? (couponAmountRaw ?? base.coupon_amount)
      : couponAmountRaw ?? base.coupon_amount;

  return {
    ...base,
    id: info?.id ?? base.id,
    booking_number:
      toIdString(info?.booking_number) ?? toIdString(info?.id) ?? base.booking_number ?? EMPTY_BOOKING.booking_number,
    rental_start_date: toLocalDateTimeInput(info?.rental_start_date) ?? base.rental_start_date,
    rental_end_date: toLocalDateTimeInput(info?.rental_end_date) ?? base.rental_end_date,
    coupon_amount: resolvedCouponAmount,
    coupon_type: normalizedCouponType || base.coupon_type,
    coupon_code: pickNonEmptyString(info?.coupon_code) ?? base.coupon_code,
    customer_name:
      pickNonEmptyString(info?.customer_name) ?? pickNonEmptyString(info?.customer?.name) ?? base.customer_name,
    customer_email:
      pickNonEmptyString(info?.customer_email) ?? pickNonEmptyString(info?.customer?.email) ?? base.customer_email,
    customer_phone:
      pickNonEmptyString(info?.customer_phone) ?? pickNonEmptyString(info?.customer?.phone) ?? base.customer_phone,
    customer_age:
      pickNonEmptyString(info?.customer_age) ??
      toIdString(info?.customer_age) ??
      pickNonEmptyString(info?.customer?.age) ??
      toIdString(info?.customer?.age) ??
      base.customer_age,
    customer_id: toIdString(info?.customer_id) ?? toIdString(info?.customer?.id) ?? base.customer_id,
    car_id: carId ?? base.car_id,
    car_name: pickNonEmptyString(info?.car_name) ?? info?.car?.name ?? base.car_name,
    car_image: pickNonEmptyString(carImage) ?? base.car_image,
    car_license_plate: pickNonEmptyString(carLicensePlate) ?? base.car_license_plate,
    car_transmission: pickNonEmptyString(carTransmission) ?? base.car_transmission,
    car_fuel: pickNonEmptyString(carFuel) ?? base.car_fuel,
    car_deposit: carDeposit ?? base.car_deposit,
    service_ids: normalizedServiceIds.length > 0 ? normalizedServiceIds : base.service_ids ?? [],
    services: Array.isArray(info?.services) ? info.services : base.services,
    total_services: totalServicesRaw ?? base.total_services,
    sub_total: subTotalRaw ?? base.sub_total,
    total: totalRaw ?? base.total,
    tax_amount: taxAmountRaw ?? base.tax_amount,
    price_per_day: pricePerDayResolved,
    original_price_per_day: originalPricePerDayResolved,
    base_price: basePriceResolved,
    base_price_casco: basePriceCascoResolved,
    days: rentalDays,
    keep_old_price: normalizeBoolean(info?.keep_old_price, base.keep_old_price ?? true),
    send_email: normalizeBoolean(info?.send_email, base.send_email ?? false),
    with_deposit: withDepositValue,
    status: pickNonEmptyString(info?.status) ?? base.status,
    total_before_wheel_prize: totalBeforeWheelPrize ?? base.total_before_wheel_prize,
    wheel_prize_discount: wheelPrizeDiscountRaw ?? base.wheel_prize_discount,
    wheel_prize: wheelPrize ?? base.wheel_prize,
    offers_discount: offersDiscountRaw ?? base.offers_discount,
    offer_fixed_discount: offerFixedDiscountRaw ?? base.offer_fixed_discount,
    deposit_waived: depositWaived,
    applied_offers: appliedOffers.length > 0 ? appliedOffers : base.applied_offers,
    wheel_of_fortune_prize_id: resolvedWheelPrizeId ?? base.wheel_of_fortune_prize_id ?? null,
    advance_payment: advancePaymentRaw ?? base.advance_payment,
    note: pickNonEmptyString(info?.note) ?? pickNonEmptyString(info?.notes) ?? base.note,
    currency_id:
      toIdString(info?.currency_id) ?? toIdString((info as { currencyId?: unknown }).currencyId) ?? base.currency_id,
    location: locationValue ?? base.location,
  } as AdminBookingFormValues;
};

const formatTimeLabel = (iso?: string | null): string | undefined => {
  if (!iso) return undefined;
  const trimmed = iso.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.replace(" ", "T").replace(/\.\d+/, "");
  const directMatch = normalized.match(/T(\d{2}):(\d{2})(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?$/);
  if (directMatch) {
    const [, hours, minutes] = directMatch;
    return `${hours}:${minutes}`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(11, 16);
};

const pickNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const pickLookupName = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return pickNonEmptyString(value);
  }

  if (isRecord(value)) {
    return pickNonEmptyString(value.name);
  }

  return undefined;
};

const normalizeWheelPrizeSummary = (
  raw: unknown,
): ReservationWheelPrizeSummary | null => {
  if (!isRecord(raw)) return null;
  const wheelId =
    parseOptionalNumber(
      raw.wheel_of_fortune_id ??
        raw.period_id ??
        (raw as { wheelId?: unknown }).wheelId,
    ) ?? null;
  const pivotId =
    parseOptionalNumber(
      raw.wheel_of_fortune_prize_id ??
        raw.prize_id ??
        raw.id ??
        (raw as { prizeId?: unknown }).prizeId ??
        raw.slice_id,
    ) ?? null;
  const prizeId =
    parseOptionalNumber(
      raw.prize_id ?? raw.id ?? (raw as { prizeId?: unknown }).prizeId ?? raw.slice_id,
    ) ?? pivotId;
  const amount = parseOptionalNumber(
    raw.amount ?? raw.discount_value ?? (raw as { value?: unknown }).value,
  );
  const discountValue = parseOptionalNumber(
    raw.discount_value ?? raw.discount ?? (raw as { value?: unknown }).value,
  );
  const discountValueDeposit =
    parseOptionalNumber((raw as { discount_value_deposit?: unknown }).discount_value_deposit) ??
    parseOptionalNumber((raw as { discount_deposit?: unknown }).discount_deposit);
  const discountValueCasco =
    parseOptionalNumber((raw as { discount_value_casco?: unknown }).discount_value_casco) ??
    parseOptionalNumber((raw as { discount_casco?: unknown }).discount_casco);
  const wheelInfo = isRecord(raw.wheel_of_fortune) ? raw.wheel_of_fortune : null;
  const title =
    (typeof raw.title === "string" && raw.title.trim().length > 0
      ? raw.title.trim()
      : typeof raw.name === "string" && raw.name.trim().length > 0
        ? raw.name.trim()
        : null) ?? "Premiu DaCars";
  const prizeType =
    pickNonEmptyString(raw.type) ??
    pickNonEmptyString((raw as { prize_type?: unknown }).prize_type) ??
    (wheelInfo ? pickNonEmptyString((wheelInfo as { type?: unknown }).type) : undefined) ??
    "other";
  const typeLabel =
    pickNonEmptyString((raw as { type_label?: unknown }).type_label) ??
    pickNonEmptyString((raw as { typeLabel?: unknown }).typeLabel) ??
    (wheelInfo ? pickNonEmptyString((wheelInfo as { type_label?: unknown }).type_label) : undefined);
  const eligibleFlag =
    typeof (raw as { eligible?: unknown }).eligible === "boolean"
      ? (raw as { eligible: boolean }).eligible
      : typeof (raw as { is_eligible?: unknown }).is_eligible === "boolean"
        ? Boolean((raw as { is_eligible: boolean }).is_eligible)
        : undefined;
  const amountLabel =
    pickNonEmptyString((raw as { amount_label?: unknown }).amount_label) ??
    pickNonEmptyString((raw as { amountLabel?: unknown }).amountLabel);
  const expiresAt =
    pickNonEmptyString((raw as { expires_at?: unknown }).expires_at) ??
    pickNonEmptyString((raw as { expiresAt?: unknown }).expiresAt);
  const description = pickNonEmptyString(raw.description) ?? null;

  return {
    wheel_of_fortune_id: wheelId,
    wheel_of_fortune_prize_id: pivotId,
    prize_id: prizeId,
    title,
    type: prizeType,
    type_label: typeLabel ?? null,
    amount: typeof amount === "number" ? amount : null,
    description,
    amount_label: amountLabel ?? null,
    expires_at: expiresAt ?? null,
    discount_value: typeof discountValue === "number" ? discountValue : 0,
    discount_value_deposit:
      typeof discountValueDeposit === "number"
        ? discountValueDeposit
        : typeof discountValue === "number"
          ? discountValue
          : null,
    discount_value_casco:
      typeof discountValueCasco === "number"
        ? discountValueCasco
        : typeof discountValue === "number"
          ? discountValue
          : null,
    eligible: typeof eligibleFlag === "boolean" ? eligibleFlag : undefined,
  };
};

const normalizeAppliedOfferEntry = (
  raw: unknown,
): ReservationAppliedOffer | null => {
  if (!isRecord(raw)) return null;
  const idCandidate = parseOptionalNumber(
    raw.id ?? (raw as { offer_id?: unknown }).offer_id,
  );
  if (typeof idCandidate !== "number" || Number.isNaN(idCandidate)) {
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
  const offerType = pickNonEmptyString((raw as { offer_type?: unknown }).offer_type);
  const offerValue = pickNonEmptyString((raw as { offer_value?: unknown }).offer_value);
  const discountLabel =
    pickNonEmptyString((raw as { discount_label?: unknown }).discount_label) ??
    pickNonEmptyString((raw as { badge?: unknown }).badge);
  const percentDeposit = parseOptionalNumber(
    (raw as { percent_discount_deposit?: unknown }).percent_discount_deposit,
  );
  const percentCasco = parseOptionalNumber(
    (raw as { percent_discount_casco?: unknown }).percent_discount_casco,
  );
  const fixedDeposit = parseOptionalNumber(
    (raw as { fixed_discount_deposit?: unknown }).fixed_discount_deposit,
  );
  const fixedCasco = parseOptionalNumber(
    (raw as { fixed_discount_casco?: unknown }).fixed_discount_casco,
  );
  const fixedDepositApplied = parseOptionalNumber(
    (raw as { fixed_discount_deposit_applied?: unknown }).fixed_discount_deposit_applied,
  );
  const fixedCascoApplied = parseOptionalNumber(
    (raw as { fixed_discount_casco_applied?: unknown }).fixed_discount_casco_applied,
  );
  const discountAmountDeposit = parseOptionalNumber(
    (raw as { discount_amount_deposit?: unknown }).discount_amount_deposit,
  );
  const discountAmountCasco = parseOptionalNumber(
    (raw as { discount_amount_casco?: unknown }).discount_amount_casco,
  );
  const discountAmount = parseOptionalNumber(
    (raw as { discount_amount?: unknown }).discount_amount,
  );

  return {
    id: idCandidate,
    title: titleSource,
    offer_type: offerType ?? null,
    offer_value: offerValue ?? null,
    discount_label: discountLabel ?? null,
    percent_discount_deposit: percentDeposit ?? null,
    percent_discount_casco: percentCasco ?? null,
    fixed_discount_deposit: fixedDeposit ?? null,
    fixed_discount_casco: fixedCasco ?? null,
    fixed_discount_deposit_applied: fixedDepositApplied ?? null,
    fixed_discount_casco_applied: fixedCascoApplied ?? null,
    discount_amount_deposit: discountAmountDeposit ?? null,
    discount_amount_casco: discountAmountCasco ?? null,
    discount_amount: discountAmount ?? null,
  };
};

const normalizeAppliedOffersList = (
  raw: unknown,
): ReservationAppliedOffer[] => {
  if (!Array.isArray(raw)) return [];
  const normalized = raw
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

const extractWheelPrizeDisplay = (
  prize: ReservationWheelPrizeSummary | null | undefined,
  discount: unknown,
  totalBefore: unknown,
) => {
  const normalizedPrize = prize ?? null;
  const amountLabel = describeWheelPrizeSummaryAmount(normalizedPrize);
  const expiryLabel = normalizedPrize?.expires_at
    ? formatWheelPrizeExpiry(normalizedPrize.expires_at)
    : null;
  const discountRaw = discount ?? normalizedPrize?.discount_value ?? null;
  const discountValue =
    typeof discountRaw === "number"
      ? discountRaw
      : parseOptionalNumber(discountRaw) ?? 0;
  const totalBeforeValue =
    typeof totalBefore === "number"
      ? (Number.isFinite(totalBefore) ? totalBefore : null)
      : parseOptionalNumber(totalBefore);
  const eligible = normalizedPrize?.eligible !== false;

  return {
    prize: normalizedPrize,
    amountLabel,
    expiryLabel,
    discountValue: eligible ? discountValue : 0,
    totalBefore: totalBeforeValue ?? null,
    eligible,
  };
};

const euroFormatter = new Intl.NumberFormat("ro-RO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const EMPTY_WHEEL_PRIZE_DETAILS: ReturnType<typeof extractWheelPrizeDisplay> = {
  prize: null,
  amountLabel: null,
  expiryLabel: null,
  discountValue: 0,
  totalBefore: null,
  eligible: true,
};

const toLocalDateTimeInput = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(" ", "T").replace(/\.\d+/, "");
  const match = normalized.match(
    /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2})(?::\d{2})?)?(?:Z|[+-]\d{2}:?\d{2})?$/,
  );
  if (match) {
    const [, datePart, hours = "00", minutes = "00"] = match;
    return `${datePart}T${hours}:${minutes}`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const hours = parsed.getUTCHours().toString().padStart(2, "0");
  const minutes = parsed.getUTCMinutes().toString().padStart(2, "0");
  const datePart = `${parsed.getUTCFullYear()}-${(parsed.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${parsed.getUTCDate().toString().padStart(2, "0")}`;
  return `${datePart}T${hours}:${minutes}`;
};

const normalizeBoolean = (value: unknown, defaultValue = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "da", "yes"].includes(normalized)) return true;
    if (["0", "false", "nu", "no"].includes(normalized)) return false;
  }
  return defaultValue;
};

const buildBookingFormFromReservation = (
  reservation: AdminReservation,
): AdminBookingFormValues => {
  const base = createEmptyBookingForm();
  const rentalStart = toLocalDateTimeInput(reservation.startDate);
  const rentalEnd = toLocalDateTimeInput(reservation.endDate);

  const pricePerDay =
    typeof reservation.pricePerDay === "number"
      ? reservation.pricePerDay
      : base.price_per_day;
  const servicesTotal =
    typeof reservation.servicesPrice === "number"
      ? reservation.servicesPrice
      : base.total_services;
  const couponAmount =
    typeof reservation.couponAmount === "number"
      ? reservation.couponAmount
      : base.coupon_amount;
  const reservationPlan = reservation.plan;
  const withDeposit =
    reservationPlan === 1
      ? true
      : reservationPlan === 0
        ? false
        : base.with_deposit;

  return {
    ...base,
    id: reservation.id ?? base.id,
    booking_number:
      reservation.bookingNumber ?? reservation.id ?? base.booking_number,
    rental_start_date: rentalStart || base.rental_start_date,
    rental_end_date: rentalEnd || base.rental_end_date,
    customer_name: reservation.customerName || base.customer_name,
    customer_phone: reservation.phone || base.customer_phone,
    customer_email: reservation.email || base.customer_email,
    car_id: reservation.carId ?? base.car_id,
    car_name: reservation.carName || base.car_name,
    car_license_plate:
      reservation.carLicensePlate || base.car_license_plate,
    price_per_day: pricePerDay,
    original_price_per_day:
      typeof reservation.pricePerDay === "number"
        ? reservation.pricePerDay
        : base.original_price_per_day,
    base_price:
      typeof reservation.pricePerDay === "number"
        ? reservation.pricePerDay
        : base.base_price,
    base_price_casco:
      typeof reservation.pricePerDay === "number"
        ? reservation.pricePerDay
        : base.base_price_casco,
    total_services: servicesTotal,
    sub_total:
      typeof reservation.subTotal === "number"
        ? reservation.subTotal
        : base.sub_total,
    total:
      typeof reservation.total === "number"
        ? reservation.total
        : base.total,
    tax_amount:
      typeof reservation.taxAmount === "number"
        ? reservation.taxAmount
        : base.tax_amount,
    coupon_amount: couponAmount,
    coupon_code: reservation.discountCode || base.coupon_code,
    discount_applied:
      typeof reservation.discount === "number"
        ? reservation.discount
        : base.discount_applied,
    days:
      typeof reservation.days === "number"
        ? reservation.days
        : base.days,
    offers_discount:
      typeof reservation.offersDiscount === "number"
        ? reservation.offersDiscount
        : base.offers_discount,
    total_before_wheel_prize:
      typeof reservation.totalBeforeWheelPrize === "number"
        ? reservation.totalBeforeWheelPrize
        : base.total_before_wheel_prize,
    wheel_prize_discount:
      typeof reservation.wheelPrizeDiscount === "number"
        ? reservation.wheelPrizeDiscount
        : base.wheel_prize_discount,
    wheel_prize: reservation.wheelPrize ?? base.wheel_prize,
    applied_offers: reservation.appliedOffers ?? base.applied_offers,
    deposit_waived:
      typeof reservation.depositWaived === "boolean"
        ? reservation.depositWaived
        : base.deposit_waived,
    with_deposit: withDeposit,
    status: reservation.status ?? base.status,
    note: reservation.notes || base.note,
    location: reservation.location || base.location,
  };
};

const ReservationsPage = () => {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<AdminReservation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const paginationSegments = React.useMemo(
    () => generatePaginationSequence(currentPage, lastPage),
    [currentPage, lastPage],
  );
  const [totalReservations, setTotalReservations] = useState(0);
  const [contractOpen, setContractOpen] = useState(false);
  const [contractReservation, setContractReservation] =
    useState<AdminReservation | null>(null);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [bookingInfo, setBookingInfo] = useState<AdminBookingFormValues | null>(
    null,
  );
  const editingReservationIdRef = useRef<string | null>(null);
  const fallbackBookingRef = useRef<AdminBookingFormValues | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [extendPopupOpen, setExtendPopupOpen] = useState(false);
  const [extendReservation, setExtendReservation] =
    useState<AdminReservation | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [extendTime, setExtendTime] = useState("");
  const [extendPrice, setExtendPrice] = useState("");
  const [extendPaid, setExtendPaid] = useState(false);
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);

  const formatEuro = (value: number | string | null | undefined) => {
    if (typeof value === "string") {
      const parsed = parseOptionalNumber(value);
      if (typeof parsed === "number") {
        return `${euroFormatter.format(parsed)}€`;
      }
      return "—";
    }
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    return `${euroFormatter.format(value)}€`;
  };

  const handleCloseExtendPopup = useCallback(() => {
    if (extendLoading) {
      return;
    }
    setExtendPopupOpen(false);
    setExtendReservation(null);
    setExtendDate("");
    setExtendTime("");
    setExtendPrice("");
    setExtendPaid(false);
    setExtendError(null);
  }, [extendLoading]);

  const handleOpenExtendReservation = useCallback(
    (reservation: AdminReservation) => {
      const extension = reservation.extension ?? null;
      const baseDateTime =
        toLocalDateTimeInput(extension?.to ?? reservation.endDate) ??
        toLocalDateTimeInput(reservation.endDate);

      let datePart = "";
      let timePart = "";
      if (baseDateTime) {
        const [dateValue, timeValue = ""] = baseDateTime.split("T");
        datePart = dateValue;
        timePart = timeValue;
      }

      if (!timePart) {
        timePart =
          formatTimeLabel(extension?.to ?? reservation.endDate) ??
          reservation.dropoffTime ??
          "";
      }

      const priceSource =
        parseOptionalNumber(extension?.pricePerDay) ??
        parseOptionalNumber(reservation.pricePerDay);

      setExtendReservation(reservation);
      setExtendDate(datePart);
      setExtendTime(timePart ?? "");
      setExtendPrice(
        typeof priceSource === "number" && Number.isFinite(priceSource)
          ? String(priceSource)
          : "",
      );
      setExtendPaid(extension?.paid ?? false);
      setExtendError(null);
      setExtendLoading(false);
      setExtendPopupOpen(true);
    },
    [],
  );

  const handleSubmitExtend = useCallback(async () => {
    if (!extendReservation) {
      return;
    }

    const normalizedDate = extendDate.trim();
    if (!normalizedDate) {
      setExtendError("Selectează data de retur pentru prelungire.");
      return;
    }

    const normalizedId = extendReservation.id.trim();
    const normalizedBookingNumber =
      typeof extendReservation.bookingNumber === "string"
        ? extendReservation.bookingNumber.trim()
        : typeof extendReservation.bookingNumber === "number"
          ? String(extendReservation.bookingNumber)
          : null;
    const lookupId =
      normalizedId.length > 0
        ? normalizedId
        : normalizedBookingNumber
          ? normalizedBookingNumber
          : "";

    if (!lookupId) {
      setExtendError("Nu am putut identifica rezervarea pentru prelungire.");
      return;
    }

    const payload: BookingExtendPayload = {
      paid: extendPaid,
    };

    payload.extended_until_date = normalizedDate;
    if (extendTime.trim()) {
      payload.extended_until_time = extendTime.trim();
    }

    const priceValue = parseOptionalNumber(extendPrice);
    if (typeof priceValue === "number") {
      payload.price_per_day = priceValue;
    }

    setExtendLoading(true);
    setExtendError(null);

    try {
      const requestId = /^(?:\d+)$/.test(lookupId) ? Number(lookupId) : lookupId;
      await apiClient.extendBooking(requestId, payload);

      const updatedList = await fetchBookings();
      const targetReservation = extendReservation;
      const updatedReservation =
        updatedList.find((entry) => entry.id === targetReservation.id.trim()) ??
        (normalizedBookingNumber
          ? updatedList.find(
              (entry) =>
                (entry.bookingNumber &&
                  String(entry.bookingNumber).trim() === normalizedBookingNumber) ||
                entry.id === normalizedBookingNumber,
            )
          : undefined);

      if (updatedReservation) {
        setSelectedReservation((prev) => {
          if (!prev) {
            return prev;
          }
          const prevId = prev.id.trim();
          const prevBookingNumber =
            typeof prev.bookingNumber === "string"
              ? prev.bookingNumber.trim()
              : typeof prev.bookingNumber === "number"
                ? String(prev.bookingNumber)
                : null;
          const matchesId = prevId && prevId === updatedReservation.id;
          const matchesBookingNumber =
            prevBookingNumber &&
            (prevBookingNumber === normalizedBookingNumber ||
              prevBookingNumber === updatedReservation.bookingNumber);
          return matchesId || matchesBookingNumber ? updatedReservation : prev;
        });
      }

      setExtendPopupOpen(false);
      setExtendReservation(null);
      setExtendDate("");
      setExtendTime("");
      setExtendPrice("");
      setExtendPaid(false);
      setExtendError(null);
    } catch (error) {
      console.error("Nu am putut prelungi rezervarea", error);
      if (error instanceof Error && error.message.trim().length > 0) {
        setExtendError(error.message);
      } else {
        setExtendError("Nu am putut prelungi rezervarea. Încearcă din nou.");
      }
    } finally {
      setExtendLoading(false);
    }
  }, [
    extendReservation,
    extendDate,
    extendTime,
    extendPrice,
    extendPaid,
    fetchBookings,
    setSelectedReservation,
  ]);

  const selectedWheelPrizeDetails = selectedReservation
    ? extractWheelPrizeDisplay(
        selectedReservation.wheelPrize,
        selectedReservation.wheelPrizeDiscount,
        selectedReservation.totalBeforeWheelPrize,
      )
    : EMPTY_WHEEL_PRIZE_DETAILS;

  const {
    prize: selectedWheelPrize,
    amountLabel: selectedWheelPrizeAmountLabel,
    expiryLabel: selectedWheelPrizeExpiry,
    discountValue: selectedWheelPrizeDiscount,
    totalBefore: selectedTotalBeforeWheelPrize,
    eligible: selectedWheelPrizeEligible,
  } = selectedWheelPrizeDetails;

  const mapStatus = (status: string): AdminReservation["status"] => {
    switch (status) {
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

  const fetchBookings = useCallback(async (): Promise<AdminReservation[]> => {
    try {
      const params: {
        page: number;
        perPage: number;
        search?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
      } = { page: currentPage, perPage };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;
      if (startDateFilter) params.start_date = startDateFilter;
      if (endDateFilter) params.end_date = endDateFilter;
      const response = await apiClient.getBookings(params);
      const bookings = extractList<AdminBookingResource>(response);
      const mapped = bookings.map<AdminReservation>((booking) => {
        const wheelPrize = normalizeWheelPrizeSummary(booking.wheel_prize);
        const wheelPrizeDiscount =
          booking.wheel_prize_discount ?? wheelPrize?.discount_value ?? null;
        const normalizedDiscount =
          typeof wheelPrizeDiscount === "number"
            ? wheelPrizeDiscount
            : parseOptionalNumber(wheelPrizeDiscount);
        const totalBeforeWheelPrize = parseOptionalNumber(
          booking.total_before_wheel_prize,
        );
        const rawId =
          booking.id ??
          (booking as { booking_id?: unknown }).booking_id ??
          (booking as { bookingId?: unknown }).bookingId ??
          null;
        const id =
          toIdString(rawId) ??
          toIdString(booking.booking_number) ??
          toIdString((booking as { bookingNumber?: unknown }).bookingNumber) ??
          "";
        const bookingNumber =
          toIdString(booking.booking_number) ??
          toIdString((booking as { bookingNumber?: unknown }).bookingNumber) ??
          undefined;
        const customerName =
          booking.customer_name ?? booking.customer?.name ?? "";
        const phone = booking.customer_phone ?? booking.customer?.phone ?? "";
        const email = booking.customer_email ?? booking.customer?.email ?? undefined;
        const carId = parseOptionalNumber(booking.car_id) ?? 0;
        const carName = booking.car_name ?? booking.car?.name ?? "";
        const carLicensePlate =
          booking.car?.license_plate ??
          booking.car?.licensePlate ??
          booking.car_license_plate ??
          undefined;
        const startDate = booking.rental_start_date ?? "";
        const endDate = booking.rental_end_date ?? "";
        const pickupTime = formatTimeLabel(booking.rental_start_date);
        const dropoffTime = formatTimeLabel(booking.rental_end_date);
        const days = parseOptionalNumber(booking.days);
        const couponAmount = parseOptionalNumber(booking.coupon_amount) ?? 0;
        const subTotal =
          parseOptionalNumber(booking.sub_total ?? booking.subTotal) ?? 0;
        const taxAmount = parseOptionalNumber(booking.tax_amount) ?? 0;
        const location = booking.location ?? undefined;
        const status = mapStatus(booking.status ?? "pending");
        const total =
          parseOptionalNumber(booking.total ?? booking.total_price) ?? 0;
        const discountCode = booking.coupon_code ?? undefined;
        const createdAt = booking.created_at ?? undefined;
        const pricePerDay =
          parseOptionalNumber(
            booking.price_per_day ?? booking.original_price_per_day,
          ) ?? 0;
        const servicesPrice = parseOptionalNumber(booking.total_services) ?? 0;
        const discount =
          parseOptionalNumber(booking.discount ?? booking.coupon_amount) ??
          couponAmount;
        const offersDiscount =
          parseOptionalNumber(booking.offers_discount) ??
          parseOptionalNumber((booking as { offersDiscount?: unknown }).offersDiscount) ??
          null;
        const appliedOffers = normalizeAppliedOffersList(booking.applied_offers);
        const depositWaived = normalizeBoolean(booking.deposit_waived, false);
        const remainingBalance = parseOptionalNumber(
          booking.remaining_balance ??
            (booking as { remainingBalance?: unknown }).remainingBalance,
        );
        const extension = normalizeReservationExtension(booking.extension);

        return {
          id,
          bookingNumber,
          customerName,
          email,
          phone,
          carId,
          carName,
          carLicensePlate,
          startDate,
          endDate,
          plan: normalizeBoolean(booking.with_deposit, true) ? 1 : 0,
          pickupTime,
          dropoffTime,
          days: days ?? undefined,
          couponAmount,
          subTotal,
          taxAmount,
          location: location ?? "",
          status,
          total,
          discountCode,
          createdAt,
          pricePerDay,
          servicesPrice,
          discount,
          totalBeforeWheelPrize,
          wheelPrizeDiscount: normalizedDiscount ?? null,
          wheelPrize,
          offersDiscount,
          appliedOffers,
          depositWaived,
          remainingBalance: typeof remainingBalance === "number" ? remainingBalance : null,
          extension,
        };
      });
      const listMeta = !Array.isArray(response)
        ? response.meta ?? response.pagination ?? null
        : null;
      const total =
        listMeta?.total ??
        listMeta?.count ??
        (!Array.isArray(response)
          ? response.total ?? response.count ?? bookings.length
          : bookings.length);
      setReservations(mapped);
      const resolvedLastPage =
        listMeta?.last_page ??
        listMeta?.lastPage ??
        (!Array.isArray(response)
          ? response.last_page ?? response.lastPage ?? 1
          : 1);
      setLastPage(resolvedLastPage > 0 ? resolvedLastPage : 1);
      setTotalReservations(total);
      return mapped;
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [currentPage, perPage, searchTerm, statusFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleViewReservation = useCallback((reservation: AdminReservation) => {
    setSelectedReservation(reservation);
    setShowModal(true);
  }, []);

  const handleEditReservation = useCallback(
    async (reservationId: string) => {
      const trimmedId = reservationId.trim();
      const fallbackReservation = reservations.find(
        (reservation) => reservation.id === trimmedId,
      );
      const fallbackForm = fallbackReservation
        ? buildBookingFormFromReservation(fallbackReservation)
        : createEmptyBookingForm();

      const lookupId =
        trimmedId.length > 0
          ? trimmedId
          : toIdString(fallbackReservation?.bookingNumber) ?? "";

      if (!lookupId) {
        console.error("ID rezervare invalid pentru editare.");
        return;
      }

      const requestId = /^(?:\d+)$/.test(lookupId) ? Number(lookupId) : lookupId;

      editingReservationIdRef.current = lookupId;
      fallbackBookingRef.current = fallbackForm;

      setBookingInfo({ ...fallbackForm });
      setEditPopupOpen(true);
      setShowModal(false);

      try {
        const response = await apiClient.getBookingInfo(requestId);
        const info = resolveBookingResourcePayload(response, lookupId);
        if (!info) {
          throw new Error("Nu am putut găsi rezervarea solicitată.");
        }

        setBookingInfo((prev) => {
          if (editingReservationIdRef.current !== lookupId) {
            return prev;
          }
          const base = prev ?? fallbackBookingRef.current ?? fallbackForm;
          const next = mergeBookingResourceIntoForm(info, base);
          fallbackBookingRef.current = next;
          return next;
        });
      } catch (error) {
        console.error("Error fetching booking info", error);
      }
    },
    [reservations],
  );

  const handleDeleteReservation = useCallback(
    async (reservation: AdminReservation) => {
      if (deletingId) {
        return;
      }

      const trimmedId = reservation.id.trim();
      if (!trimmedId) {
        console.error("ID rezervare invalid pentru ștergere.");
        return;
      }

      const confirmationTarget = reservation.bookingNumber ?? trimmedId;
      const confirmed = window.confirm(
        `Ești sigur că vrei să ștergi rezervarea ${confirmationTarget}?`,
      );

      if (!confirmed) {
        return;
      }

      const requestId = /^(?:\d+)$/.test(trimmedId) ? Number(trimmedId) : trimmedId;
      setDeletingId(trimmedId);

      try {
        await apiClient.deleteBooking(requestId);

        const selectedId =
          selectedReservation?.id ? selectedReservation.id.trim() : null;
        if (selectedId === trimmedId) {
          setSelectedReservation(null);
          setShowModal(false);
        }

        await fetchBookings();
      } catch (error) {
        console.error("Nu am putut șterge rezervarea", error);
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, fetchBookings, selectedReservation],
  );

  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setDateRange({ startDate: null, endDate: null });
    setCurrentPage(1);
  }, []);

  const handleDateRangeChange = useCallback(
    (range: { startDate: Date | null; endDate: Date | null }) => {
      setDateRange(range);
      setStartDateFilter(
        range.startDate ? range.startDate.toISOString().split("T")[0] : "",
      );
      setEndDateFilter(
        range.endDate ? range.endDate.toISOString().split("T")[0] : "",
      );
      setCurrentPage(1);
    },
    [],
  );

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

  const getStatusText = (status: string) => {
    switch (status) {
      case "reserved":
        return "Rezervat";
      case "pending":
        return "În așteptare";
      case "cancelled":
        return "Anulat";
      case "completed":
        return "Finalizat";
      case "no_answer":
        return "Fără răspuns";
      case "waiting_advance_payment":
        return "Așteaptă avans";
      default:
        return status;
    }
  };

  const getPlanColor = (plan: number) => {
      switch (plan) {
          case 0:
              return "bg-lime-100 text-lime-800";
          case 1:
              return "bg-fuchsia-100 text-fuchsia-800";
      }
  }

  const getPlanText = (plan: number) => {
      switch (plan) {
          case 0:
              return 'Fara Garantie';
          case 1:
              return 'Cu Garantie';
      }
    }

  const reservationColumns = React.useMemo<Column<AdminReservation>[]>(
    () => [
      {
        id: "reservation",
        header: "Rezervare",
        accessor: (r) => r.id,
        sortable: true,
        cell: (r) => (
          <div>
            <div className="font-dm-sans font-semibold text-berkeley text-xs">
              {r.bookingNumber}
            </div>
            <div className="text-gray-500 font-dm-sans text-xs">
              {r.createdAt &&
                new Date(r.createdAt).toLocaleString("ro-RO")}{" "}{}
            </div>
          </div>
        ),
      },
      {
        id: "client",
        header: "Client",
        accessor: (r) => r.customerName,
        sortable: true,
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
        cell: (r) => (
          <div>
            <div className="font-dm-sans font-semibold text-gray-900 text-xs">
              {r.customerName}
            </div>
            <div className="text-gray-500 font-dm-sans text-xs">
              {r.phone}
            </div>
          </div>
        ),
      },
      {
        id: "car",
        header: "Mașină",
        accessor: (r) => r.carLicensePlate || r.carName,
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
        cell: (r) => (
          <div className="font-dm-sans text-gray-900 text-xs">
            {r.carLicensePlate || r.carName}
          </div>
        ),
      },
      {
        id: "period",
        header: "Perioada",
        accessor: (r) => new Date(r.startDate).getTime(),
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
        cell: (r) => (
          <div>
            <div className="font-dm-sans text-gray-900 text-xs">
              {new Date(r.startDate).toLocaleDateString("ro-RO")} -
              {" "}
              {new Date(r.endDate).toLocaleDateString("ro-RO")}
            </div>
            <div className="text-gray-500 font-dm-sans text-xs">
              {r.pickupTime} - {r.dropoffTime}
            </div>
          </div>
        ),
      },
      {
          id: "plan",
          header: "Tip Plan",
          accessor: (r) => r.plan,
          headerClassName: "hidden sm:table-cell flex flex-row",
          cellClassName: "hidden sm:table-cell",
          cell: (r) => (
              <span
                  className={`px-3 py-1 rounded-full text-xs font-dm-sans ${getPlanColor(
                      r.plan,
                  )}`}
              >
                {getPlanText(r.plan)}
              </span>
          ),
      },
      {
        id: "status",
        header: "Status",
        accessor: (r) => r.status,
        headerClassName: "hidden sm:table-cell flex flex-row",
        cellClassName: "hidden sm:table-cell",
        cell: (r) => (
          <span
            className={`px-3 py-1 rounded-full text-xs font-dm-sans ${getStatusColor(
              r.status,
            )}`}
          >
            {getStatusText(r.status)}
          </span>
        ),
      },
      {
        id: "total",
        header: "Total",
        accessor: (r) => r.total,
        sortable: true,
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
        cell: (r) => {
          const remainingLabel =
            typeof r.remainingBalance === "number" && r.remainingBalance > 0
              ? formatEuro(r.remainingBalance)
              : null;
          const extensionLabel = r.extension
            ? formatDateTime(r.extension.to, shortDateTimeFormatter)
            : null;
          const extensionClass = r.extension?.paid
            ? "text-emerald-600"
            : "text-amber-600";

          return (
            <div className="font-dm-sans text-xs text-gray-900">
              <div className="font-semibold text-berkeley">{formatEuro(r.total)}</div>
              {remainingLabel && (
                <div className="text-amber-600 font-semibold">Sold: {remainingLabel}</div>
              )}
              {extensionLabel && (
                <div className={`text-xs font-medium ${extensionClass}`}>
                  Extins până la {extensionLabel}
                </div>
              )}
              {r.discountCode && (
                <div className="text-jade font-dm-sans text-xs">Cod: {r.discountCode}</div>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Acțiuni",
        accessor: (r) => r.id,
        cell: (r) => {
          const normalizedId = r.id.trim();
          const isDeleting = deletingId === normalizedId;
          const isExtending =
            extendReservation?.id === normalizedId && extendLoading;

          return (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleViewReservation(r)}
                className="p-2 text-gray-600 hover:text-jade hover:bg-jade/10 rounded-lg transition-colors"
                aria-label="Vezi detalii"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleEditReservation(r.id)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label="Editează"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleOpenExtendReservation(r)}
                className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Prelungește"
                disabled={isExtending}
              >
                <CalendarPlus className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteReservation(r)}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Șterge"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [
      handleViewReservation,
      handleEditReservation,
      handleDeleteReservation,
      handleOpenExtendReservation,
      deletingId,
      extendReservation,
      extendLoading,
    ],
  );

  const renderReservationDetails = (r: AdminReservation) => {
    const { prize, amountLabel, expiryLabel, discountValue, totalBefore } =
      extractWheelPrizeDisplay(r.wheelPrize, r.wheelPrizeDiscount, r.totalBeforeWheelPrize);

    const remainingBalanceLabel =
      typeof r.remainingBalance === "number" && r.remainingBalance > 0
        ? formatEuro(r.remainingBalance)
        : null;
    const extension = r.extension ?? null;
    const extensionStartLabel = extension ? formatDateTime(extension.from) : null;
    const extensionEndLabel = extension ? formatDateTime(extension.to) : null;
    let extensionRemainingLabel: string | null = null;
    if (extension && !extension.paid) {
      const outstanding =
        typeof extension.remainingPayment === "number"
          ? extension.remainingPayment
          : typeof r.remainingBalance === "number"
            ? r.remainingBalance
            : null;
      if (typeof outstanding === "number") {
        extensionRemainingLabel = formatEuro(outstanding);
      }
    }
    const remainingBalanceRow =
      remainingBalanceLabel && (
        <div className="flex items-center justify-between">
          <span className="font-dm-sans text-gray-600">Sold rămas:</span>
          <span className="font-dm-sans font-semibold text-amber-600">
            {remainingBalanceLabel}
          </span>
        </div>
      );
    const extensionSummary = extension ? (
      <div
        className={`rounded-lg px-3 py-2 ${
          extension.paid
            ? "border border-emerald-200 bg-emerald-50"
            : "border border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-dm-sans font-semibold text-gray-800">
            Prelungire
            {typeof extension.days === "number" ? ` (+${extension.days} zile)` : ""}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              extension.paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {extension.paid ? "Achitată" : "Neachitată"}
          </span>
        </div>
        <div className="mt-2 space-y-1 text-sm text-gray-700">
          <div>
            Interval: {" "}
            <span className="font-medium text-gray-900">{extensionStartLabel ?? "—"}</span> → {" "}
            <span className="font-medium text-gray-900">{extensionEndLabel ?? "—"}</span>
          </div>
          <div>
            Tarif extindere: {" "}
            <span className="font-medium text-gray-900">{formatEuro(extension.pricePerDay)}</span>
          </div>
          <div>
            Total extindere: {" "}
            <span className="font-medium text-gray-900">{formatEuro(extension.total)}</span>
          </div>
          {!extension.paid && extensionRemainingLabel && (
            <div className="font-dm-sans font-semibold text-amber-700">
              Sold extindere: {extensionRemainingLabel}
            </div>
          )}
        </div>
      </div>
    ) : null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 text-sm text-gray-700 font-dm-sans sm:hidden">
          <div>
            <p className="font-semibold text-gray-900">Client</p>
            <p>{r.customerName}</p>
            <p className="text-xs text-gray-500">{r.phone}</p>
            {r.email && <p className="text-xs text-gray-500">{r.email}</p>}
          </div>
          <div>
            <p className="font-semibold text-gray-900">Mașină</p>
            <p>{r.carLicensePlate || r.carName}</p>
            {r.location && <p className="text-xs text-gray-500">{r.location}</p>}
          </div>
          <div>
            <p className="font-semibold text-gray-900">Perioada</p>
            <p>
              {new Date(r.startDate).toLocaleDateString("ro-RO")} - {""}
              {new Date(r.endDate).toLocaleDateString("ro-RO")}
            </p>
            {(r.pickupTime || r.dropoffTime) && (
              <p className="text-xs text-gray-500">
                {r.pickupTime} - {r.dropoffTime}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-dm-sans ${getPlanColor(r.plan)}`}>
              {getPlanText(r.plan)}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-dm-sans ${getStatusColor(r.status)}`}>
              {getStatusText(r.status)}
            </span>
            <span className="px-3 py-1 rounded-full bg-berkeley/10 text-berkeley font-semibold">
              {formatEuro(r.total)}
            </span>
            {remainingBalanceLabel && (
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
                Sold: {remainingBalanceLabel}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-700 font-dm-sans">
          <div className="flex items-center space-x-2">
            <span className="font-bold">Preț per zi:</span>
            <span>{formatEuro(r.pricePerDay ?? 0)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold">Zile:</span>
            <span>{r.days}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold">Servicii:</span>
            <span>{formatEuro(r.servicesPrice ?? 0)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold">Subtotal:</span>
            <span>{formatEuro(r.subTotal ?? 0)}</span>
          </div>
          {typeof totalBefore === "number" && (
            <div className="flex items-center space-x-2">
              <span className="font-bold">Total înainte premiu:</span>
              <span>{formatEuro(totalBefore)}</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <span className="font-bold">Roata Norocului:</span>
            <span>{prize ? prize.title : "—"}</span>
          </div>
          {prize && amountLabel && (
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <span className="font-semibold">Valoare premiu:</span>
              <span>{amountLabel}</span>
            </div>
          )}
          {prize && discountValue > 0 && (
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Reducere premiu:</span>
              <span>-{formatEuro(discountValue)}</span>
            </div>
          )}
          {prize && expiryLabel && (
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <span className="font-semibold">Valabil până la:</span>
              <span>{expiryLabel}</span>
            </div>
          )}
          {r.discountCode && (
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Reducere:</span>
              <span>{formatEuro(r.couponAmount ?? 0)}</span>
            </div>
          )}
          {r.notes && (
            <div className="md:col-span-4">
              <span className="font-semibold">Notițe: </span>
              {r.notes}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/admin"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Înapoi la dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-poppins font-semibold text-berkeley">
                Gestionare Rezervări
              </h1>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 justify-start sm:w-auto sm:flex-nowrap sm:gap-4 sm:justify-end">
              <Button
                variant="yellow"
                onClick={() => {
                  setContractReservation(null);
                  setContractOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2"
              >
                <Newspaper className="h-4 w-4 me-1" />
                Crează contract
              </Button>
              <Button
                onClick={() => {
                  editingReservationIdRef.current = "new";
                  fallbackBookingRef.current = { ...EMPTY_BOOKING };
                  setBookingInfo({ ...EMPTY_BOOKING });
                  setEditPopupOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2"
              >
                <Plus className="h-4 w-4 me-1" />
                Crează rezervare
              </Button>
              <button
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Exportă rezervări"
              >
                <Download className="h-4 w-4 text-gray-600" />
                <span className="font-dm-sans text-gray-600">Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Caută rezervări..."
                aria-label="Caută rezervări"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
              placeholder="Toate statusurile"
              aria-label="Filtrează după status"
            >
              <option value="all">Toate statusurile</option>
              <option value="pending">În așteptare</option>
              <option value="no_answer">Fără răspuns</option>
              <option value="waiting_advance_payment">Așteaptă avans</option>
              <option value="reserved">Rezervat</option>
              <option value="completed">Finalizat</option>
              <option value="cancelled">Anulat</option>
            </Select>

            <div className="relative">
              <button
                onClick={() => setShowCalendar(true)}
                className="w-full flex items-center pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-left hover:bg-gray-50"
                aria-label="Selectează perioada"
              >
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                {startDateFilter && endDateFilter ? (
                  <span>
                    {new Date(startDateFilter).toLocaleDateString("ro-RO")} - {""}
                    {new Date(endDateFilter).toLocaleDateString("ro-RO")}
                  </span>
                ) : (
                  <span className="text-gray-500">Perioada</span>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-dm-sans text-gray-600">
                {totalReservations} rezervări găsite
              </span>
            </div>
          </div>

          {(searchTerm || statusFilter !== "all" || (startDateFilter && endDateFilter)) && (
            <div className="flex items-center flex-wrap gap-2 mt-4">
              {searchTerm && (
                <span className="flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  Caută: {searchTerm}
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                    aria-label="Șterge filtrul de căutare"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  Status: {getStatusText(statusFilter)}
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setCurrentPage(1);
                    }}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                    aria-label="Șterge filtrul de status"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {startDateFilter && endDateFilter && (
                <span className="flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  {new Date(startDateFilter).toLocaleDateString("ro-RO")} - {""}
                  {new Date(endDateFilter).toLocaleDateString("ro-RO")}
                  <button
                    onClick={() => {
                      setStartDateFilter("");
                      setEndDateFilter("");
                      setDateRange({ startDate: null, endDate: null });
                      setCurrentPage(1);
                    }}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                    aria-label="Șterge filtrul de perioadă"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="ml-auto text-sm text-red-600 hover:underline"
                aria-label="Șterge toate filtrele"
              >
                Șterge filtrele
              </button>
            </div>
          )}
        </div>
        <Popup
          open={showCalendar}
          onClose={() => setShowCalendar(false)}
          className="p-0"
        >
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            onClose={() => setShowCalendar(false)}
          />
        </Popup>

        {/* Reservations Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <DataTable
            data={reservations}
            columns={reservationColumns}
            renderRowDetails={renderReservationDetails}
          />

          <div className="flex items-center justify-between py-2 px-4 text-sm">
            <div className="flex items-center space-x-2 w-[10rem]">
              <span className="text-gray-600 w-full">Pe pagină:</span>
              <Select
                value={perPage.toString()}
                onValueChange={(v) => {
                  setPerPage(Number(v));
                  setCurrentPage(1);
                }}
                aria-label="Rezervări pe pagină"
                className="w-20"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </Select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-gray-600 disabled:opacity-50"
                aria-label="Pagina anterioară"
              >
                Anterior
              </button>
              {paginationSegments.map((page, idx) =>
                page === "ellipsis" ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page as number)}
                    className={`px-2 py-1 rounded ${
                      currentPage === page
                        ? "bg-jade text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    aria-label={`Pagina ${page}`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, lastPage))}
                disabled={currentPage === lastPage}
                className="px-2 py-1 text-gray-600 disabled:opacity-50"
                aria-label="Pagina următoare"
              >
                Următoarea
              </button>
            </div>
          </div>

          {reservations.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-poppins font-semibold text-gray-600 mb-2">
                Nu există rezervări
              </h3>
              <p className="text-gray-500 font-dm-sans">
                Nu am găsit rezervări care să corespundă criteriilor de căutare.
              </p>
            </div>
          )}
        </div>

        {/* Reservation Details Modal */}
        {showModal && selectedReservation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-poppins font-bold text-berkeley">
                  Detalii Rezervare {selectedReservation.id}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Închide detaliile rezervării"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="space-y-4">
                  <h4 className="font-poppins font-semibold text-berkeley text-lg">
                    Informații Client
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-jade/10 p-2 rounded-lg">
                        <Phone className="h-4 w-4 text-jade" />
                      </div>
                      <div>
                        <p className="font-dm-sans font-semibold text-gray-900">
                          {selectedReservation.customerName}
                        </p>
                        <p className="text-sm text-gray-600 font-dm-sans">
                          {selectedReservation.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="bg-jade/10 p-2 rounded-lg">
                        <Mail className="h-4 w-4 text-jade" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-dm-sans">
                          Email
                        </p>
                        <p className="font-dm-sans text-gray-900">
                          {selectedReservation.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reservation Info */}
                <div className="space-y-4">
                  <h4 className="font-poppins font-semibold text-berkeley text-lg">
                    Detalii Rezervare
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-jade/10 p-2 rounded-lg">
                        <Car className="h-4 w-4 text-jade" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-dm-sans">
                          Mașină
                        </p>
                        <p className="font-dm-sans font-semibold text-gray-900">
                          {selectedReservation.carLicensePlate ||
                            selectedReservation.carName}
                        </p>
                        {selectedReservation.carLicensePlate &&
                          selectedReservation.carName && (
                            <p className="text-sm text-gray-600 font-dm-sans">
                              {selectedReservation.carName}
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="bg-jade/10 p-2 rounded-lg">
                        <Calendar className="h-4 w-4 text-jade" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-dm-sans">
                          Perioada
                        </p>
                        <p className="font-dm-sans text-gray-900">
                          {new Date(
                            selectedReservation.startDate,
                          ).toLocaleDateString("ro-RO")}{" "}
                          -{" "}
                          {new Date(
                            selectedReservation.endDate,
                          ).toLocaleDateString("ro-RO")}
                        </p>
                        <p className="text-sm text-gray-600 font-dm-sans">
                          {selectedReservation.pickupTime} -{" "}
                          {selectedReservation.dropoffTime}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="bg-jade/10 p-2 rounded-lg">
                        <MapPin className="h-4 w-4 text-jade" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-dm-sans">
                          Locație
                        </p>
                        <p className="font-dm-sans text-gray-900">
                          {selectedReservation.location}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-poppins font-semibold text-berkeley mb-3">
                      Status & Plată
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-dm-sans text-gray-600">
                          Status:
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-dm-sans ${getStatusColor(selectedReservation.status)}`}
                        >
                          {getStatusText(selectedReservation.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-dm-sans text-gray-600">
                          Preț/zi:
                        </span>
                        <span className="font-dm-sans text-gray-900">
                          {formatEuro(selectedReservation.pricePerDay ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-dm-sans text-gray-600">
                          Servicii:
                        </span>
                        <span className="font-dm-sans text-gray-900">
                          {formatEuro(selectedReservation.servicesPrice ?? 0)}
                        </span>
                      </div>
                      {typeof selectedTotalBeforeWheelPrize === "number" && (
                        <div className="flex items-center justify-between">
                          <span className="font-dm-sans text-gray-600">
                            Total înainte premiu:
                          </span>
                          <span className="font-dm-sans text-gray-900">
                            {formatEuro(selectedTotalBeforeWheelPrize)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-dm-sans text-gray-600">
                          Premiu Roata Norocului:
                        </span>
                        <div className="text-right">
                          <p className="font-dm-sans text-gray-900">
                            {selectedWheelPrize ? selectedWheelPrize.title : "—"}
                          </p>
                          {selectedWheelPrizeAmountLabel && (
                            <p className="text-xs text-gray-500">
                              {selectedWheelPrizeAmountLabel}
                            </p>
                          )}
                          {selectedWheelPrizeExpiry && (
                            <p className="text-xs text-gray-500">
                              Valabil până la {selectedWheelPrizeExpiry}
                            </p>
                          )}
                          {selectedWheelPrize && selectedWheelPrizeEligible === false && (
                            <p className="text-xs text-amber-600 font-medium">
                              Premiul nu este eligibil pentru intervalul acestei rezervări.
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedWheelPrizeDiscount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-dm-sans text-gray-600">
                            Reducere premiu:
                          </span>
                          <span className="font-dm-sans text-gray-900">
                            -{formatEuro(selectedWheelPrizeDiscount)}
                          </span>
                        </div>
                      )}
                      {typeof selectedReservation.offersDiscount === "number" &&
                        selectedReservation.offersDiscount > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="font-dm-sans text-gray-600">
                              Reduceri campanii:
                            </span>
                            <span className="font-dm-sans text-gray-900">
                              -{formatEuro(selectedReservation.offersDiscount)}
                            </span>
                          </div>
                        )}
                      {selectedReservation.depositWaived && (
                        <div className="flex items-center justify-between">
                          <span className="font-dm-sans text-gray-600">Garanție:</span>
                          <span className="font-dm-sans text-jade font-semibold">
                            Eliminată prin promoție
                          </span>
                        </div>
                      )}
                      {typeof selectedReservation.discount === "number" &&
                        selectedReservation.discount > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="font-dm-sans text-gray-600">
                              Discount:
                            </span>
                            <span className="font-dm-sans text-gray-900">
                              -{formatEuro(selectedReservation.discount)}
                            </span>
                          </div>
                        )}
                      {remainingBalanceRow}
                      <div className="flex items-center justify-between">
                        <span className="font-dm-sans text-gray-600">
                          Total:
                        </span>
                        <span className="font-dm-sans font-semibold text-berkeley text-lg">
                          {formatEuro(selectedReservation.total ?? 0)}
                        </span>
                      </div>
                      {selectedReservation.appliedOffers &&
                        selectedReservation.appliedOffers.length > 0 && (
                          <div className="mt-3 text-left">
                            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Oferte aplicate
                            </span>
                            <ul className="mt-1 list-disc space-y-1 ps-5 text-xs text-gray-600">
                              {selectedReservation.appliedOffers.map((offer) => (
                                <li key={offer.id}>
                                  <span className="font-medium text-gray-700">{offer.title}</span>
                                  {offer.discount_label && (
                                    <span className="ms-1 text-emerald-600">{offer.discount_label}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                      )}
                  </div>
                  {extensionSummary && <div className="mt-4">{extensionSummary}</div>}
                </div>

                {selectedReservation.notes && (
                  <div>
                      <h4 className="font-poppins font-semibold text-berkeley mb-3">
                        Notițe
                      </h4>
                      <p className="font-dm-sans text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {selectedReservation.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  className="flex-1 bg-jade text-white py-3 rounded-lg font-semibold font-dm-sans hover:bg-jade/90 transition-colors"
                  aria-label="Confirmă Rezervarea"
                >
                  Confirmă Rezervarea
                </button>
                <button
                  onClick={() => handleOpenExtendReservation(r)}
                  className="flex-1 border-2 border-amber-300 text-amber-700 py-3 rounded-lg font-semibold font-dm-sans hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Prelungește rezervarea"
                  disabled={extendLoading && extendReservation?.id === r.id}
                >
                  Prelungește
                </button>
                <button
                  onClick={() => handleEditReservation(selectedReservation.id)}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold font-dm-sans hover:bg-gray-50 transition-colors"
                  aria-label="Editează rezervarea"
                >
                  Editează
                </button>
                <button
                  className="flex-1 border-2 border-red-300 text-red-600 py-3 rounded-lg font-semibold font-dm-sans hover:bg-red-50 transition-colors"
                  aria-label="Anulează rezervarea"
                >
                  Anulează
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
        {extendReservation && (
          <Popup
            open={extendPopupOpen}
            onClose={handleCloseExtendPopup}
            className="max-w-xl"
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-poppins font-semibold text-berkeley">
                  Prelungește rezervarea {extendReservation.bookingNumber ?? extendReservation.id}
                </h3>
                <p className="mt-1 text-sm font-dm-sans text-gray-600">
                  Returnare curentă:{" "}
                  <span className="font-semibold text-gray-900">
                    {formatDateTime(extendReservation.endDate) ?? "—"}
                  </span>
                </p>
                {extendReservation.extension && (
                  <div
                    className={`mt-4 rounded-lg border px-3 py-2 ${
                      extendReservation.extension.paid
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-dm-sans font-semibold text-gray-800">
                        Prelungire existentă
                        {typeof extendReservation.extension.days === "number"
                          ? ` (+${extendReservation.extension.days} zile)`
                          : ""}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          extendReservation.extension.paid
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {extendReservation.extension.paid ? "Achitată" : "Neachitată"}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-700">
                      <div>
                        Interval:{" "}
                        <span className="font-medium text-gray-900">
                          {formatDateTime(extendReservation.extension.from) ?? "—"}
                        </span>{" "}→{" "}
                        <span className="font-medium text-gray-900">
                          {formatDateTime(extendReservation.extension.to) ?? "—"}
                        </span>
                      </div>
                      <div>
                        Tarif extindere:{" "}
                        <span className="font-medium text-gray-900">
                          {formatEuro(extendReservation.extension.pricePerDay)}
                        </span>
                      </div>
                      <div>
                        Total extindere:{" "}
                        <span className="font-medium text-gray-900">
                          {formatEuro(extendReservation.extension.total)}
                        </span>
                      </div>
                      {!extendReservation.extension.paid &&
                        typeof extendReservation.extension.remainingPayment === "number" &&
                        extendReservation.extension.remainingPayment > 0 && (
                          <div className="font-dm-sans font-semibold text-amber-700">
                            Sold extindere:{" "}
                            {formatEuro(extendReservation.extension.remainingPayment)}
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor={`extend-date-${extendReservation.id}`}>
                    Dată retur extinsă
                  </Label>
                  <Input
                    id={`extend-date-${extendReservation.id}`}
                    type="date"
                    value={extendDate}
                    onChange={(event) => setExtendDate(event.target.value)}
                    disabled={extendLoading}
                  />
                </div>
                <div>
                  <Label htmlFor={`extend-time-${extendReservation.id}`}>
                    Oră retur extinsă
                  </Label>
                  <Input
                    id={`extend-time-${extendReservation.id}`}
                    type="time"
                    value={extendTime}
                    onChange={(event) => setExtendTime(event.target.value)}
                    disabled={extendLoading}
                  />
                </div>
                <div>
                  <Label htmlFor={`extend-price-${extendReservation.id}`}>
                    Tarif extindere (€/zi)
                  </Label>
                  <Input
                    id={`extend-price-${extendReservation.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={extendPrice}
                    onChange={(event) => setExtendPrice(event.target.value)}
                    placeholder="Lasă gol pentru tariful curent"
                    disabled={extendLoading}
                  />
                  <p className="mt-1 text-xs font-dm-sans text-gray-500">
                    Dacă nu introduci un tarif nou, folosim prețul standard al rezervării.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-dm-sans text-gray-700">
                  <input
                    type="checkbox"
                    checked={extendPaid}
                    onChange={(event) => setExtendPaid(event.target.checked)}
                    disabled={extendLoading}
                  />
                  Marchează prelungirea ca achitată
                </label>
              </div>

              {extendError && (
                <p className="text-sm font-dm-sans text-red-600">{extendError}</p>
              )}

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseExtendPopup}
                  disabled={extendLoading}
                >
                  Renunță
                </Button>
                <Button onClick={handleSubmitExtend} disabled={extendLoading}>
                  {extendLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvăm...
                    </span>
                  ) : (
                    "Salvează prelungirea"
                  )}
                </Button>
              </div>

              <p className="text-xs font-dm-sans text-gray-500">
                Prelungirile marcate ca neachitate sunt incluse automat în soldul rezervării din listă și dashboard.
              </p>
            </div>
          </Popup>
        )}
        {bookingInfo && (
          <BookingForm
            open={editPopupOpen}
            onClose={() => {
              setEditPopupOpen(false);
              setBookingInfo(null);
              editingReservationIdRef.current = null;
              fallbackBookingRef.current = null;
            }}
            bookingInfo={bookingInfo}
            setBookingInfo={setBookingInfo}
            onUpdated={fetchBookings}
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

export default ReservationsPage;
