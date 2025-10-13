"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, Car, CheckCircle, Clock, Gift, Home, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReservationPayload } from "@/types/reservation";
import type { WheelPrize } from "@/types/wheel";
import { formatWheelPrizeExpiry } from "@/lib/wheelFormatting";
import { useTranslations } from "@/lib/i18n/useTranslations";
import type { Locale } from "@/lib/i18n/config";
import successMessagesRo from "@/messages/success/ro.json";
import {
    buildMetaPixelAdvancedMatchingFromCustomer,
    hasTrackedMetaPixelLead,
    markMetaPixelLeadTracked,
    trackMetaPixelLead,
    updateMetaPixelAdvancedMatching,
    resolveMetaPixelNameParts,
} from "@/lib/metaPixel";
import { useAuth } from "@/context/AuthContext";

type SuccessMessages = typeof successMessagesRo;

const LOCALE_TO_INTL: Record<Locale, string> = {
    ro: "ro-RO",
    en: "en-US",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    it: "it-IT",
};

const DEFAULT_CURRENCY = "EUR";
const IN_MEMORY_META_LEAD_FALLBACK_KEY = "__fallback__";
const trackedMetaLeadIdentifiers = new Set<string>();

type TikTokQueue = {
    identify?: (payload: Record<string, unknown>) => void;
    track?: (event: string, payload?: Record<string, unknown>) => void;
};

declare global {
    interface Window {
        ttq?: TikTokQueue;
    }
}

const resolveSubtleCrypto = (): SubtleCrypto | null => {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
        return window.crypto.subtle;
    }
    if (typeof globalThis !== "undefined") {
        const cryptoLike = (globalThis as typeof globalThis & { crypto?: Crypto }).crypto;
        if (cryptoLike?.subtle) {
            return cryptoLike.subtle;
        }
    }
    return null;
};

const sha256Hex = async (value: string): Promise<string | null> => {
    if (!value) {
        return null;
    }
    const subtle = resolveSubtleCrypto();
    if (!subtle) {
        return null;
    }
    const encoded = new TextEncoder().encode(value);
    const digest = await subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
};

const hashEmailForTikTok = async (value: unknown): Promise<string | null> => {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return null;
    }
    return sha256Hex(normalized);
};

const hashPhoneForTikTok = async (value: unknown): Promise<string | null> => {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.replace(/[^0-9+]/g, "");
    if (!normalized) {
        return null;
    }
    return sha256Hex(normalized);
};

const hashExternalIdForTikTok = async (value: unknown): Promise<string | null> => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return sha256Hex(String(value));
    }
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (!normalized) {
            return null;
        }
        return sha256Hex(normalized);
    }
    return null;
};

const parseMaybeNumber = (value: unknown): number | null => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const normalized = Number(trimmed.replace(/,/g, "."));
        return Number.isFinite(normalized) ? normalized : null;
    }
    return null;
};

const resolveReservationTrackingIdentifier = (
    reservation: ReservationPayload | null,
): string | null => {
    if (!reservation) {
        return null;
    }

    const directReservationId =
        typeof reservation.reservationId === "string" ? reservation.reservationId.trim() : "";
    if (directReservationId.length > 0) {
        return directReservationId;
    }

    const bookingNumber = (reservation as { booking_number?: unknown }).booking_number;
    if (typeof bookingNumber === "string") {
        const normalized = bookingNumber.trim();
        if (normalized.length > 0) {
            return normalized;
        }
    }

    const fallbackId = (reservation as { id?: unknown }).id;
    if (typeof fallbackId === "string" || typeof fallbackId === "number") {
        const normalized = String(fallbackId).trim();
        if (normalized.length > 0) {
            return normalized;
        }
    }

    return null;
};

const SuccessPage = () => {
    const [reservationData, setReservationData] = useState<ReservationPayload | null>(null);
    const { locale, messages, t } = useTranslations<SuccessMessages>("success");
    const { user } = useAuth();
    const intlLocale = LOCALE_TO_INTL[locale] ?? LOCALE_TO_INTL.ro;
    const hasTrackedMetaLeadRef = useRef(false);
    const hasTrackedTikTokRef = useRef(false);
    const reservationTrackingIdentifier = useMemo(
        () => resolveReservationTrackingIdentifier(reservationData),
        [reservationData],
    );

    const priceFormatter = useMemo(
        () =>
            new Intl.NumberFormat(intlLocale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }),
        [intlLocale],
    );

    const dateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(intlLocale, {
                day: "numeric",
                month: "long",
                year: "numeric",
            }),
        [intlLocale],
    );

    const formatPrice = useCallback(
        (value: number): string => {
            if (!Number.isFinite(value)) {
                return "0";
            }
            const normalized = Math.round(value * 100) / 100;
            return priceFormatter.format(normalized);
        },
        [priceFormatter],
    );

    const formatReservationDate = useCallback(
        (value: string): string => {
            const parsed = Date.parse(value);
            if (Number.isNaN(parsed)) {
                return value;
            }
            try {
                return dateFormatter.format(new Date(parsed));
            } catch (error) {
                console.warn("Nu s-a putut formata data rezervării", error);
                return new Date(parsed).toLocaleDateString(intlLocale);
            }
        },
        [dateFormatter, intlLocale],
    );

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        const storedData = window.localStorage.getItem("reservationData");
        if (storedData) {
            try {
                setReservationData(JSON.parse(storedData));
            } catch (error) {
                console.warn("Nu s-au putut citi detaliile rezervării din localStorage", error);
            }
        }
    }, []);

    useEffect(() => {
        if (!reservationData) {
            return;
        }

        const { firstName, lastName } = resolveMetaPixelNameParts(
            (reservationData as { customer_name?: unknown }).customer_name,
        );

        const customerEmailRaw = (reservationData as { customer_email?: unknown }).customer_email;
        const customerPhoneRaw = (reservationData as { customer_phone?: unknown }).customer_phone;

        const customerDetailsPayload = buildMetaPixelAdvancedMatchingFromCustomer(
            reservationData,
            (reservationData as { customer?: unknown }).customer,
            user,
        );

        const advancedMatchingPayload = {
            ...customerDetailsPayload,
            em: typeof customerEmailRaw === "string" ? customerEmailRaw : undefined,
            ph: typeof customerPhoneRaw === "string" ? customerPhoneRaw : undefined,
        };

        if (!advancedMatchingPayload.fn && firstName) {
            advancedMatchingPayload.fn = firstName;
        }

        if (!advancedMatchingPayload.ln && lastName) {
            advancedMatchingPayload.ln = lastName;
        }

        updateMetaPixelAdvancedMatching(advancedMatchingPayload);

        if (hasTrackedMetaLeadRef.current) {
            return;
        }

        const leadIdentifier = reservationTrackingIdentifier ?? null;
        const leadTrackingKey =
            typeof reservationTrackingIdentifier === "string" && reservationTrackingIdentifier.trim().length > 0
                ? reservationTrackingIdentifier.trim()
                : IN_MEMORY_META_LEAD_FALLBACK_KEY;

        if (trackedMetaLeadIdentifiers.has(leadTrackingKey)) {
            hasTrackedMetaLeadRef.current = true;
            return;
        }

        if (hasTrackedMetaPixelLead(leadIdentifier)) {
            hasTrackedMetaLeadRef.current = true;
            trackedMetaLeadIdentifiers.add(leadTrackingKey);
            return;
        }

        const totalAmountRaw = reservationData.total;
        const totalAmount =
            typeof totalAmountRaw === "number" && Number.isFinite(totalAmountRaw)
                ? totalAmountRaw
                : parseMaybeNumber(totalAmountRaw);

        const car = reservationData.selectedCar ?? null;
        const carId =
            car && typeof (car as { id?: unknown }).id === "number" && Number.isFinite((car as { id: number }).id)
                ? (car as { id: number }).id
                : undefined;

        const rentalStartRaw = (reservationData as { rental_start_date?: unknown }).rental_start_date;
        const rentalEndRaw = (reservationData as { rental_end_date?: unknown }).rental_end_date;
        const fallbackStartRaw = (reservationData as { start_date?: unknown }).start_date;
        const fallbackEndRaw = (reservationData as { end_date?: unknown }).end_date;
        const withDepositRaw = (reservationData as { with_deposit?: unknown }).with_deposit;

        const startDate =
            typeof rentalStartRaw === "string"
                ? rentalStartRaw
                : typeof fallbackStartRaw === "string"
                    ? fallbackStartRaw
                    : undefined;
        const endDate =
            typeof rentalEndRaw === "string"
                ? rentalEndRaw
                : typeof fallbackEndRaw === "string"
                    ? fallbackEndRaw
                    : undefined;
        const withDeposit = typeof withDepositRaw === "boolean" ? withDepositRaw : undefined;

        const serviceIdsPayload = Array.isArray(reservationData.service_ids)
            ? reservationData.service_ids
            : undefined;

        trackMetaPixelLead({
            value: totalAmount ?? undefined,
            currency: DEFAULT_CURRENCY,
            content_type: "vehicle",
            content_ids: carId ? [carId] : undefined,
            contents: carId
                ? [
                      {
                          id: carId,
                          quantity: 1,
                          item_price: totalAmount ?? undefined,
                      },
                  ]
                : undefined,
            reservation_id: reservationTrackingIdentifier ?? undefined,
            start_date: startDate,
            end_date: endDate,
            with_deposit: withDeposit,
            service_ids: serviceIdsPayload,
        });

        markMetaPixelLeadTracked(leadIdentifier);
        trackedMetaLeadIdentifiers.add(leadTrackingKey);
        hasTrackedMetaLeadRef.current = true;
    }, [reservationData, reservationTrackingIdentifier, user]);

    useEffect(() => {
        if (!reservationData || typeof window === "undefined") {
            return;
        }

        if (hasTrackedTikTokRef.current) {
            return;
        }

        const ttqQueue = window.ttq;
        if (!ttqQueue) {
            return;
        }

        const track = ttqQueue.track;
        if (typeof track !== "function") {
            return;
        }

        const trackTikTokEvents = async () => {
            try {
                const customerEmailRaw = (reservationData as { customer_email?: unknown }).customer_email;
                const customerPhoneRaw = (reservationData as { customer_phone?: unknown }).customer_phone;
                const customer = (reservationData as { customer?: unknown }).customer;

                const customerIdFromRelation =
                    customer && typeof (customer as { id?: unknown }).id !== "undefined"
                        ? (customer as { id?: unknown }).id
                        : undefined;
                const externalIdSource =
                    reservationTrackingIdentifier ??
                    customerIdFromRelation ??
                    (reservationData as { customer_id?: unknown }).customer_id ??
                    (user ? user.id : null);

                const [hashedEmail, hashedPhone, hashedExternalId] = await Promise.all([
                    hashEmailForTikTok(customerEmailRaw),
                    hashPhoneForTikTok(customerPhoneRaw),
                    hashExternalIdForTikTok(externalIdSource),
                ]);

                // add this before event code to all pages where PII data postback is expected and appropriate
                const identify = typeof ttqQueue.identify === "function" ? ttqQueue.identify.bind(ttqQueue) : null;
                if (identify) {
                    const identifyPayload: Record<string, string> = {};
                    if (hashedEmail) {
                        identifyPayload.email = hashedEmail;
                    }
                    if (hashedPhone) {
                        identifyPayload.phone_number = hashedPhone;
                    }
                    if (hashedExternalId) {
                        identifyPayload.external_id = hashedExternalId;
                    }

                    if (Object.keys(identifyPayload).length > 0) {
                        identify(identifyPayload);
                    }
                }

                const totalAmount = parseMaybeNumber(reservationData.total);
                const currencyRaw = (reservationData as { currency?: unknown }).currency;
                const currency =
                    typeof currencyRaw === "string" && currencyRaw.trim().length >= 3
                        ? currencyRaw.trim().slice(0, 3).toUpperCase()
                        : DEFAULT_CURRENCY;
                const selectedCar = reservationData.selectedCar ?? null;
                const carIdRaw = (selectedCar as { id?: unknown } | null)?.id;
                const carId =
                    typeof carIdRaw === "number" && Number.isFinite(carIdRaw)
                        ? String(carIdRaw)
                        : typeof carIdRaw === "string"
                            ? carIdRaw
                            : reservationTrackingIdentifier ?? undefined;
                const carNameRaw = (selectedCar as { name?: unknown } | null)?.name;
                const carName =
                    typeof carNameRaw === "string" && carNameRaw.trim().length > 0
                        ? carNameRaw
                        : undefined;
                const locationRaw = (reservationData as { location?: unknown }).location;
                const locationLabel =
                    typeof locationRaw === "string" && locationRaw.trim().length > 0 ? locationRaw : undefined;

                const contents =
                    carId || carName
                        ? [
                              {
                                  content_id: carId ?? (reservationTrackingIdentifier ?? "reservation"),
                                  content_type: selectedCar ? "product" : "product_group",
                                  content_name:
                                      carName ?? locationLabel ?? "Rezervare auto",
                              },
                          ]
                        : undefined;

                const searchParts = [
                    carName,
                    locationLabel,
                    typeof reservationData.rental_start_date === "string" ? reservationData.rental_start_date : undefined,
                    typeof reservationData.rental_end_date === "string" ? reservationData.rental_end_date : undefined,
                ]
                    .map((part) => (typeof part === "string" ? part.trim() : ""))
                    .filter((part) => part.length > 0);

                const searchString = searchParts.length > 0 ? searchParts.join(" | ") : undefined;

                const baseEventPayload: Record<string, unknown> = {
                    currency,
                    ...(contents ? { contents } : {}),
                    ...(typeof totalAmount === "number" ? { value: totalAmount } : {}),
                };

                const boundTrack = track.bind(ttqQueue);
                boundTrack("ViewContent", baseEventPayload);
                boundTrack("Search", {
                    ...baseEventPayload,
                    ...(searchString ? { search_string: searchString } : {}),
                });
                boundTrack("Lead", baseEventPayload);

                hasTrackedTikTokRef.current = true;
            } catch (error) {
                console.error("Nu s-a putut trimite evenimentele TikTok Pixel", error);
            }
        };

        void trackTikTokEvents();
    }, [reservationData, reservationTrackingIdentifier, user]);

    const wheelPrize = reservationData?.wheel_prize ?? null;
    const wheelPrizeDiscountRaw = reservationData?.wheel_prize_discount ??
        (wheelPrize as { discount_value?: unknown } | null)?.discount_value ??
        0;
    const wheelPrizeDiscount = parseMaybeNumber(wheelPrizeDiscountRaw) ?? 0;

    const wheelPrizeDescriptionSource = useMemo<WheelPrize | null>(() => {
        if (!wheelPrize) {
            return null;
        }

        const prizeId = parseMaybeNumber((wheelPrize as { prize_id?: unknown }).prize_id) ?? 0;
        const periodId = parseMaybeNumber((wheelPrize as { wheel_of_fortune_id?: unknown }).wheel_of_fortune_id) ?? 0;
        const titleSource = (wheelPrize as { title?: unknown }).title;
        const descriptionSource = (wheelPrize as { description?: unknown }).description;
        const amountSource = (wheelPrize as { amount?: unknown }).amount ??
            (wheelPrize as { discount_value?: unknown }).discount_value ??
            null;
        const typeSource = (wheelPrize as { type?: unknown }).type;
        const amountValue = parseMaybeNumber(amountSource);
        const hasRelevantData = [
            prizeId > 0,
            periodId > 0,
            typeof titleSource === "string" && titleSource.trim().length > 0,
            typeof descriptionSource === "string" && descriptionSource.trim().length > 0,
            typeof amountValue === "number" && Number.isFinite(amountValue) && amountValue !== 0,
            typeof typeSource === "string" && typeSource.trim().length > 0,
        ].some(Boolean);

        if (!hasRelevantData) {
            return null;
        }

        const titleValue = typeof titleSource === "string" ? titleSource.trim() : "";
        const descriptionValue = typeof descriptionSource === "string" && descriptionSource.trim().length > 0
            ? descriptionSource
            : null;
        const typeValue = typeof typeSource === "string" && typeSource.trim().length > 0
            ? typeSource
            : "other";

        return {
            id: prizeId,
            period_id: periodId,
            title: titleValue,
            description: descriptionValue,
            amount: amountValue,
            color: "#1E7149",
            probability: 0,
            type: typeValue,
        };
    }, [wheelPrize]);

    const wheelPrizeAmountLabel = useMemo(() => {
        if (!wheelPrizeDescriptionSource) {
            return wheelPrize?.amount_label ?? null;
        }
        const { amount, type } = wheelPrizeDescriptionSource;
        if (typeof amount !== "number" || !Number.isFinite(amount)) {
            return wheelPrize?.amount_label ?? null;
        }
        const formatted = new Intl.NumberFormat(intlLocale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(Math.round(amount * 100) / 100);
        const normalizedType = typeof type === "string" ? type : "other";
        if (normalizedType === "percentage_discount") {
            return t("wheelPrize.amount.percentage_discount", { values: { amount: formatted } });
        }
        if (normalizedType === "fixed_discount") {
            return t("wheelPrize.amount.fixed_discount", { values: { amount: formatted } });
        }
        if (normalizedType === "extra_rental_day") {
            const pluralKey = Math.abs(amount) === 1 ? "one" : "other";
            return t(`wheelPrize.amount.extra_rental_day.${pluralKey}` as const, {
                values: { amount: formatted },
            });
        }
        return t("wheelPrize.amount.other", { values: { amount: formatted } });
    }, [intlLocale, t, wheelPrize, wheelPrizeDescriptionSource]);

    const wheelPrizeExpiryRaw = (wheelPrize as { expires_at?: unknown } | null)?.expires_at;
    const wheelPrizeExpiryLabel =
        typeof wheelPrizeExpiryRaw === "string" && wheelPrizeExpiryRaw.trim().length > 0
            ? formatWheelPrizeExpiry(wheelPrizeExpiryRaw, intlLocale)
            : null;
    const wheelPrizeAmountSuffix =
        typeof wheelPrizeAmountLabel === "string" && wheelPrizeAmountLabel.length > 0
            ? t("wheelPrize.amountSuffix", { values: { amount: wheelPrizeAmountLabel } })
            : "";

    const wheelPrizeTitle = useMemo(() => {
        const titleSource = (wheelPrize as { title?: unknown } | null)?.title;
        if (typeof titleSource === "string") {
            const trimmed = titleSource.trim();
            if (trimmed.length > 0) {
                return trimmed;
            }
        }

        return wheelPrizeDescriptionSource?.title ?? "";
    }, [wheelPrize, wheelPrizeDescriptionSource]);

    const hasWheelPrize = useMemo(() => {
        if (!wheelPrize) {
            return false;
        }

        const titleSource = (wheelPrize as { title?: unknown }).title;
        const amountLabelSource = (wheelPrize as { amount_label?: unknown }).amount_label;
        const discountSource = parseMaybeNumber((wheelPrize as { discount_value?: unknown }).discount_value);
        const hasTitle = typeof titleSource === "string" && titleSource.trim().length > 0;
        const hasAmountLabel = typeof amountLabelSource === "string" && amountLabelSource.trim().length > 0;
        const hasDiscount = (discountSource ?? 0) > 0 || wheelPrizeDiscount > 0;
        const hasAmountSuffix = wheelPrizeAmountSuffix.trim().length > 0;
        const hasExpiry = typeof wheelPrizeExpiryLabel === "string" && wheelPrizeExpiryLabel.trim().length > 0;

        return hasTitle || hasAmountLabel || hasDiscount || hasAmountSuffix || hasExpiry;
    }, [wheelPrize, wheelPrizeDiscount, wheelPrizeAmountSuffix, wheelPrizeExpiryLabel]);

    const selectedCar = reservationData?.selectedCar ?? null;
    const selectedCarName = typeof (selectedCar as { name?: unknown } | null)?.name === "string"
        ? ((selectedCar as { name: string }).name)
        : "";

    const reservationReference = reservationTrackingIdentifier ?? "—";

    const locationOptions =
        (messages.summary?.location?.options as SuccessMessages["summary"]["location"]["options"]) ?? {};
    const instructionsSteps = messages.instructions?.steps ?? [];
    const contactPhone = messages.contact?.phone ?? "+40 723 817 551";
    const contactAriaLabel = t("contact.ariaLabel", { values: { phone: contactPhone } });

    const rentalDaysValue = useMemo(() => {
        if (!reservationData) {
            return null;
        }

        const daySources: unknown[] = [
            (reservationData as { total_days?: unknown }).total_days,
            (reservationData as { days?: unknown }).days,
            (reservationData as { rental_days?: unknown }).rental_days,
            (reservationData.selectedCar as { days?: unknown } | null)?.days,
        ];

        for (const candidate of daySources) {
            const parsed = parseMaybeNumber(candidate);
            if (parsed && parsed > 0) {
                return Math.round(parsed);
            }
        }

        const startDateRaw = reservationData.rental_start_date;
        const endDateRaw = reservationData.rental_end_date;
        if (typeof startDateRaw !== "string" || typeof endDateRaw !== "string") {
            return null;
        }

        const startTimestamp = Date.parse(startDateRaw);
        const endTimestamp = Date.parse(endDateRaw);
        if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp)) {
            return null;
        }

        const diffMs = endTimestamp - startTimestamp;
        if (diffMs <= 0) {
            return null;
        }

        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return days > 0 ? days : null;
    }, [reservationData]);

    const rentalDaysLabel = useMemo(() => {
        if (!rentalDaysValue || rentalDaysValue <= 0) {
            return null;
        }

        const pluralKey = Math.abs(rentalDaysValue) === 1 ? "one" : "other";
        const fallbackBase = (() => {
            switch (locale) {
                case "ro":
                    return `${rentalDaysValue} ${pluralKey === "one" ? "zi" : "zile"}`;
                case "de":
                    return `${rentalDaysValue} ${pluralKey === "one" ? "Tag" : "Tage"}`;
                case "fr":
                    return `${rentalDaysValue} ${pluralKey === "one" ? "jour" : "jours"}`;
                case "es":
                    return `${rentalDaysValue} ${pluralKey === "one" ? "día" : "días"}`;
                case "it":
                    return `${rentalDaysValue} ${pluralKey === "one" ? "giorno" : "giorni"}`;
                case "en":
                default:
                    return `${rentalDaysValue} ${pluralKey === "one" ? "day" : "days"}`;
            }
        })();

        const label = t(`summary.pricing.dayCount.${pluralKey}`, {
            values: { count: rentalDaysValue },
            fallback: fallbackBase,
        });

        return label || fallbackBase;
    }, [locale, rentalDaysValue, t]);

    if (!reservationData) {
        return (
            <div className="pt-16 lg:pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 font-dm-sans">{t("loading")}</p>
                </div>
            </div>
        );
    }

    const customerName = reservationData.customer_name?.trim().length
        ? reservationData.customer_name
        : t("fallbacks.guestName");
    const locationKey = reservationData.location as keyof typeof locationOptions;
    const locationLabel =
        locationOptions[locationKey] ?? locationOptions.other ?? reservationData.location ?? "";

    const pickupDate = formatReservationDate(reservationData.rental_start_date);
    const dropoffDate = formatReservationDate(reservationData.rental_end_date);

    const subtotalValue = parseMaybeNumber(reservationData.sub_total) ?? 0;
    const servicesValue = parseMaybeNumber(reservationData.total_services) ?? 0;
    const couponAmountValue = parseMaybeNumber(reservationData.coupon_amount) ?? 0;
    const totalValue = parseMaybeNumber(reservationData.total) ?? 0;
    const pricePerDayValue = parseMaybeNumber(reservationData.price_per_day) ?? 0;
    const shouldShowPerDayBreakdown = pricePerDayValue > 0 && (rentalDaysValue ?? 0) > 0;

    return (
        <div className="pt-16 lg:pt-20 min-h-screen bg-gradient-to-br from-jade/5 to-berkeley/5">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Success Header */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="bg-jade/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-12 w-12 text-jade" />
                    </div>

                    <h1 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
                        {t("header.title.prefix")} <span className="text-jade">{t("header.title.highlight")}</span>
                    </h1>

                    <p className="text-xl lg:text-2xl font-dm-sans text-gray-700 leading-relaxed max-w-3xl mx-auto">
                        {t("header.thanks", { values: { name: customerName } })}
                        <br className="hidden sm:block" />
                        <span className="text-jade font-semibold">{t("header.tagline")}</span>
                    </p>

                    <div className="mt-8 inline-flex items-center px-6 py-3 bg-jade/10 rounded-full">
                        <span className="text-jade font-dm-sans font-semibold">
                            {t("header.reference", { values: { id: reservationReference } })}
                        </span>
                    </div>
                </div>

                {/* Reservation Details */}
                <div className="bg-white rounded-3xl shadow-xl p-8 lg:p-12 mb-12 animate-slide-up">
                    {hasWheelPrize && (
                        <div className="mb-8 flex items-start gap-4 rounded-2xl border border-jade/30 bg-jade/10 p-6">
                            <div className="rounded-full bg-white/70 p-3">
                                <Gift className="h-5 w-5 text-jade" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-poppins font-semibold text-berkeley text-lg">
                                    {t("wheelPrize.title")}
                                </h3>
                                <p className="font-dm-sans text-gray-700">
                                    {t("wheelPrize.applied", {
                                        values: {
                                            title: wheelPrizeTitle,
                                            amount: wheelPrizeAmountSuffix,
                                        },
                                    })}
                                </p>
                                {wheelPrizeDiscount > 0 && (
                                    <p className="font-dm-sans text-sm font-semibold text-jade">
                                        {t("wheelPrize.savings", {
                                            values: { amount: formatPrice(wheelPrizeDiscount) },
                                        })}
                                    </p>
                                )}
                                <p className="font-dm-sans text-xs text-gray-600">
                                    {wheelPrizeExpiryLabel
                                        ? t("wheelPrize.expiry.withDate", { values: { date: wheelPrizeExpiryLabel } })
                                        : t("wheelPrize.expiry.fallback")}
                                </p>
                            </div>
                        </div>
                    )}
                    <h2 className="text-3xl font-poppins font-bold text-berkeley mb-8 text-center">
                        {t("summary.title")}
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-6">
                            <div className="flex items-start space-x-4">
                                <div className="bg-jade/10 p-3 rounded-xl">
                                    <Car className="h-6 w-6 text-jade" />
                                </div>
                                <div>
                                    <h3 className="font-poppins font-semibold text-berkeley text-lg">
                                        {t("summary.car.title")}
                                    </h3>
                                    <p className="font-dm-sans text-gray-600 capitalize">{selectedCarName}</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <div className="bg-jade/10 p-3 rounded-xl">
                                    <Calendar className="h-6 w-6 text-jade" />
                                </div>
                                <div>
                                    <h3 className="font-poppins font-semibold text-berkeley text-lg">
                                        {t("summary.period.title")}
                                    </h3>
                                    <p className="font-dm-sans text-gray-600">
                                        <strong>{t("summary.period.pickupLabel")}</strong> {pickupDate} · {reservationData.rental_start_time}
                                    </p>
                                    <p className="font-dm-sans text-gray-600">
                                        <strong>{t("summary.period.dropoffLabel")}</strong> {dropoffDate} · {reservationData.rental_end_time}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <div className="bg-jade/10 p-3 rounded-xl">
                                    <MapPin className="h-6 w-6 text-jade" />
                                </div>
                                <div>
                                    <h3 className="font-poppins font-semibold text-berkeley text-lg">
                                        {t("summary.location.title")}
                                    </h3>
                                    <p className="font-dm-sans text-gray-600">{locationLabel}</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            <div className="bg-jade/5 rounded-2xl p-6">
                                <h3 className="font-poppins font-semibold text-berkeley text-lg mb-4">
                                    {t("summary.pricing.title")}
                                </h3>
                                {shouldShowPerDayBreakdown && (
                                    <div className="text-lg font-dm-sans text-gray-600 mb-1">
                                        {t("summary.pricing.perDayLabel")} {formatPrice(pricePerDayValue)}€
                                        {rentalDaysLabel ? ` x ${rentalDaysLabel}` : ""}
                                    </div>
                                )}
                                <div className="text-lg font-dm-sans text-gray-600 mb-1">
                                    {t("summary.pricing.subtotalLabel")} {formatPrice(subtotalValue)}€
                                </div>
                                {servicesValue > 0 && (
                                    <div className="text-lg font-dm-sans text-gray-600 mb-1">
                                        {t("summary.pricing.servicesLabel")} +{formatPrice(servicesValue)}€
                                    </div>
                                )}
                                {wheelPrizeDiscount > 0 && (
                                    <div className="text-lg font-dm-sans text-jade mb-1">
                                        {t("summary.pricing.wheelPrizeLabel")} -{formatPrice(wheelPrizeDiscount)}€
                                    </div>
                                )}
                                {couponAmountValue > 0 && (
                                    <div className="text-lg font-dm-sans text-jade mb-2">
                                        {t("summary.pricing.discountLabel")} -{formatPrice(couponAmountValue)}€
                                    </div>
                                )}
                                <div className="text-4xl font-poppins font-bold text-jade mb-2">
                                    {formatPrice(totalValue)}€
                                </div>
                                <p className="font-dm-sans text-gray-600 text-sm">{t("summary.pricing.note")}</p>
                            </div>

                            {reservationData.flight_number && (
                                <div className="flex items-start space-x-4">
                                    <div className="bg-jade/10 p-3 rounded-xl">
                                        <Clock className="h-6 w-6 text-jade" />
                                    </div>
                                    <div>
                                        <h3 className="font-poppins font-semibold text-berkeley text-lg">
                                            {t("summary.flight.title")}
                                        </h3>
                                        <p className="font-dm-sans text-gray-600">{reservationData.flight_number}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Important Information */}
                <div
                    className="bg-berkeley text-white rounded-3xl p-8 lg:p-12 mb-12 animate-slide-up"
                    style={{ animationDelay: "0.2s" }}
                >
                    <h2 className="text-3xl font-poppins font-bold mb-8 text-center">{t("instructions.title")}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {instructionsSteps.map((step, index) => (
                            <div className="text-center" key={step?.title ?? index}>
                                <div className="bg-jade w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-poppins font-bold">{index + 1}</span>
                                </div>
                                <h3 className="font-poppins font-semibold text-xl mb-2">{step?.title}</h3>
                                <p className="font-dm-sans text-gray-300">{step?.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-8 p-6 bg-jade/20 rounded-2xl">
                        <Phone className="h-8 w-8 text-jade mx-auto mb-3" />
                        <p className="font-dm-sans text-lg mb-2">{t("contact.title")}</p>
                        <a
                            href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                            className="text-jade font-poppins font-bold text-2xl hover:text-jade/80 transition-colors duration-300"
                            aria-label={contactAriaLabel}
                        >
                            {contactPhone}
                        </a>
                        <p className="font-dm-sans text-sm text-gray-300 mt-2">{t("contact.availability")}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.4s" }}>
                    <Button
                        onClick={() => window.print()}
                        variant="outline"
                        className="border-berkeley text-berkeley hover:bg-berkeley hover:text-white"
                        aria-label={t("actions.print.aria")}
                    >
                        <Calendar className="h-5 w-5 mr-2" />
                        {t("actions.print.label")}
                    </Button>

                    <Link href="/" aria-label={t("actions.home.aria")}>
                        <Button className="transform hover:scale-105 shadow-lg">
                            <Home className="h-5 w-5 mr-2" />
                            {t("actions.home.label")}
                        </Button>
                    </Link>
                </div>

                {/* Footer note */}
                <div className="text-center mt-12">
                    <p className="font-dm-sans text-gray-600">{t("footer.message")}</p>
                </div>
            </div>
        </div>
    );
};

export default SuccessPage;
