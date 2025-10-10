"use client";

import React, {useEffect, useState, useRef, useMemo, useCallback} from "react";
import {useRouter} from "next/navigation";
import {Calendar, Gift, Plane, User,} from "lucide-react";
import {Label} from "@/components/ui/label";
import PhoneInput from "@/components/PhoneInput";
import {useBooking} from "@/context/useBooking";
import { apiClient } from "@/lib/api";
import { trackMixpanelEvent } from "@/lib/mixpanelClient";
import { trackTikTokEvent, TIKTOK_EVENTS } from "@/lib/tiktokPixel";
import { trackMetaPixelEvent, META_PIXEL_EVENTS } from "@/lib/metaPixel";
import { extractItem, extractList } from "@/lib/apiResponse";
import { extractFirstCar } from "@/lib/adminBookingHelpers";
import { describeWheelPrizeAmount } from "@/lib/wheelFormatting";
import { normalizeManualCouponType } from "@/lib/bookingDiscounts";
import { resolveMediaUrl } from "@/lib/media";
import {
    getStoredWheelPrize,
    isStoredWheelPrizeActive,
    clearStoredWheelPrize,
    type StoredWheelPrizeEntry,
} from "@/lib/wheelStorage";
import {ApiCar, Car} from "@/types/car";
import type { BookingAppliedOffer } from "@/types/booking";
import {
    ReservationFormData,
    Service,
    type CouponTotalDiscountDetails,
    type DiscountValidationPayload,
    type QuotePricePayload,
    type QuotePriceResponse,
    type ReservationAppliedOffer,
    type ReservationPayload,
} from "@/types/reservation";
import SelectedCarGallery from "@/components/checkout/SelectedCarGallery";
import {Button} from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/useTranslations";
import checkoutMessagesRo from "@/messages/checkout/ro.json";

type CheckoutMessages = typeof checkoutMessagesRo;

const DEFAULT_CURRENCY = "RON";

const toImageUrl = (value?: string | null): string => {
    const resolved = resolveMediaUrl(value);
    return typeof resolved === "string" && resolved.trim().length > 0
        ? resolved
        : "/images/placeholder-car.svg";
};

const parsePrice = (raw: unknown): number => {
    if (raw == null) return 0;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
    if (typeof raw === "string") {
        const m = raw.match(/[\d.,]+/);
        if (!m) return 0;
        const n = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
        return Number.isFinite(n) ? n : 0;
    }
    try {
        return parsePrice(String(raw));
    } catch {
        return 0;
    }
};

const resolveCouponTypeValue = (value: unknown): string | null => {
    const normalized = normalizeManualCouponType(value);
    return normalized.length > 0 ? normalized : null;
};

const sanitizeCouponDiscountDetails = (
    raw: unknown,
): CouponTotalDiscountDetails | null => {
    if (!raw || typeof raw !== "object") {
        return null;
    }

    const normalized: CouponTotalDiscountDetails = {};
    let hasEntries = false;

    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        const parsed = parseMaybeNumber(value);
        if (parsed !== null) {
            normalized[key] = parsed;
            hasEntries = true;
        }
    }

    return hasEntries ? normalized : {};
};

const parseMaybeNumber = (value: unknown): number | null => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length === 0) return null;
        const normalized = Number(trimmed.replace(/,/g, "."));
        if (Number.isFinite(normalized)) {
            return normalized;
        }
        const parsed = parsePrice(trimmed);
        if (!Number.isFinite(parsed)) {
            return null;
        }
        if (parsed === 0 && !/[\d]/.test(trimmed)) {
            return null;
        }
        return parsed;
    }
    return null;
};

const coerceNumber = (value: unknown, fallback = 0): number => {
    const parsed = parseMaybeNumber(value);
    return parsed !== null ? parsed : fallback;
};

const coerceId = (value: unknown): number | null => {
    const parsed = parseMaybeNumber(value);
    if (parsed === null) return null;
    const rounded = Math.trunc(parsed);
    return Number.isFinite(rounded) ? rounded : null;
};

const resolveFirstString = (...values: Array<unknown>): string | null => {
    for (const value of values) {
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed.length > 0) {
                return trimmed;
            }
        }
    }
    return null;
};

const resolveLookupName = (value: unknown): string | null => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if (value && typeof value === "object" && "name" in value) {
        const name = (value as { name?: unknown }).name;
        if (typeof name === "string") {
            const trimmed = name.trim();
            return trimmed.length > 0 ? trimmed : null;
        }
    }

    return null;
};

const resolveLookupId = (value: unknown): number | null => {
    if (value && typeof value === "object" && "id" in value) {
        return coerceId((value as { id?: unknown }).id);
    }

    return coerceId(value);
};

const parseReservationIdentifier = (value: unknown): string | null => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    return null;
};

const resolveReservationIdentifier = (record: unknown): string | null => {
    if (!record || typeof record !== "object") {
        return null;
    }

    const source = record as Record<string, unknown>;
    return (
        parseReservationIdentifier(source.booking_number) ??
        parseReservationIdentifier(source.bookingNumber) ??
        parseReservationIdentifier(source.id)
    );
};

const mapApiCarToCar = (apiCar: ApiCar, fallbackName: string): Car => {
    const extras = apiCar as Record<string, unknown>;
    const galleryCandidates: string[] = [];
    const registerImage = (value: unknown) => {
        if (typeof value !== "string") return;
        const trimmed = value.trim();
        if (!trimmed) return;
        galleryCandidates.push(trimmed);
    };
    registerImage(apiCar.image_preview);
    registerImage(apiCar.image);
    registerImage(apiCar.thumbnail);
    registerImage(apiCar.cover_image);
    if (Array.isArray(apiCar.images)) {
        apiCar.images.forEach(registerImage);
    } else if (apiCar.images && typeof apiCar.images === "object") {
        Object.values(apiCar.images).forEach(registerImage);
    }
    if (typeof apiCar.type?.image === "string") {
        registerImage(apiCar.type.image);
    }
    const gallery = Array.from(
        new Set(
            galleryCandidates
                .map((candidate) => resolveMediaUrl(candidate))
                .filter((src): src is string => typeof src === "string" && src.trim().length > 0),
        ),
    );
    if (gallery.length === 0) {
        gallery.push(toImageUrl(null));
    }
    const primaryImage = gallery[0] ?? toImageUrl(null);

    const typeName = resolveFirstString(apiCar.type?.name) ?? "—";
    const typeId = coerceId(apiCar.type?.id);

    const rentalRateValue = parseMaybeNumber(apiCar.rental_rate);
    const rentalRateCascoValue = parseMaybeNumber(apiCar.rental_rate_casco);
    const fallbackPrice = parseMaybeNumber(apiCar.price);
    const normalizedPrice = Math.round(
        rentalRateValue ?? rentalRateCascoValue ?? fallbackPrice ?? 0,
    );

    const rentalRateLabel =
        rentalRateValue !== null ? String(Math.round(rentalRateValue)) : "";
    const rentalRateCascoLabel =
        rentalRateCascoValue !== null
            ? String(Math.round(rentalRateCascoValue))
            : "";

    const passengers = Math.max(0, Math.round(coerceNumber(apiCar.number_of_seats)));
    const transmissionName =
        resolveFirstString(
            resolveLookupName(apiCar.transmission),
            extras["transmission_name"],
            extras["transmissionName"],
        ) ?? "—";
    const transmissionId =
        resolveLookupId(apiCar.transmission) ?? coerceId(extras["transmission_id"]);

    const fuelName =
        resolveFirstString(
            resolveLookupName(apiCar.fuel),
            extras["fuel_name"],
            extras["fuelName"],
        ) ?? "—";
    const fuelId = resolveLookupId(apiCar.fuel) ?? coerceId(extras["fuel_id"]);

    const totalDepositRaw =
        apiCar.total_deposit ?? (extras["totalDeposit"] as unknown);
    const totalWithoutDepositRaw =
        apiCar.total_without_deposit ??
        (extras["totalWithoutDeposit"] as unknown);

    const ratingSource =
        apiCar.avg_review ?? (extras["avg_review"] as unknown ?? extras["avgReview"]);

    return {
        id: apiCar.id,
        name:
            typeof apiCar.name === "string" && apiCar.name.trim().length > 0
                ? apiCar.name
                : fallbackName,
        type: typeName,
        typeId,
        image: primaryImage,
        gallery,
        price: Number.isFinite(normalizedPrice) ? normalizedPrice : 0,
        rental_rate: rentalRateLabel,
        rental_rate_casco: rentalRateCascoLabel,
        days: Math.max(0, Math.round(coerceNumber(apiCar.days))),
        deposit: coerceNumber(apiCar.deposit),
        total_deposit:
            typeof totalDepositRaw === "number" || typeof totalDepositRaw === "string"
                ? totalDepositRaw
                : 0,
        total_without_deposit:
            typeof totalWithoutDepositRaw === "number" ||
            typeof totalWithoutDepositRaw === "string"
                ? totalWithoutDepositRaw
                : 0,
        available:
            typeof apiCar.available === "boolean"
                ? apiCar.available
                : typeof extras["available"] === "boolean"
                    ? (extras["available"] as boolean)
                    : undefined,
        features: {
            passengers,
            transmission: transmissionName,
            transmissionId,
            fuel: fuelName,
            fuelId,
            doors: 4,
            luggage: 2,
        },
        rating: coerceNumber(ratingSource),
        description: typeof apiCar.content === "string" ? apiCar.content : "",
        specs: Array.isArray(extras["specs"]) ? (extras["specs"] as string[]) : [],
    };
};

const ReservationPage = () => {
    const router = useRouter();
    const { booking, setBooking } = useBooking();
    const { t, locale, messages } = useTranslations<CheckoutMessages>("checkout");

    const fallbackCarName = useMemo(() => t("fallbacks.carName"), [t]);
    const resolvedNumberLocale = locale === "ro" ? "ro-RO" : "en-US";
    const resolvedDateLocale = locale === "ro" ? "ro-RO" : "en-GB";
    const priceFormatter = useMemo(
        () =>
            new Intl.NumberFormat(resolvedNumberLocale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }),
        [resolvedNumberLocale],
    );
    const summaryDateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(resolvedDateLocale, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }),
        [resolvedDateLocale],
    );
    const wheelPrizeDateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(resolvedDateLocale, {
                day: "numeric",
                month: "long",
                year: "numeric",
            }),
        [resolvedDateLocale],
    );
    const formatCurrency = useCallback(
        (value: number) => {
            if (!Number.isFinite(value)) return "0";
            const normalized = Math.round(value * 100) / 100;
            return priceFormatter.format(normalized);
        },
        [priceFormatter],
    );
    const formatSummaryDate = useCallback(
        (value: string) => {
            if (!value) return "";
            const parsed = Date.parse(value);
            if (Number.isNaN(parsed)) return value;
            try {
                return summaryDateFormatter.format(new Date(parsed));
            } catch {
                return new Date(parsed).toLocaleDateString(resolvedDateLocale);
            }
        },
        [resolvedDateLocale, summaryDateFormatter],
    );
    const formatWheelPrizeDate = useCallback(
        (value?: string | null) => {
            if (!value) return null;
            const parsed = Date.parse(value);
            if (Number.isNaN(parsed)) return null;
            try {
                return wheelPrizeDateFormatter.format(new Date(parsed));
            } catch {
                return new Date(parsed).toLocaleDateString(resolvedDateLocale);
            }
        },
        [resolvedDateLocale, wheelPrizeDateFormatter],
    );
    const mapApiCar = useCallback(
        (car: ApiCar) => mapApiCarToCar(car, fallbackCarName),
        [fallbackCarName],
    );
    const discountMessages = useMemo(
        () => ({
            success: t("form.discount.messages.success"),
            error: t("form.discount.messages.error"),
        }),
        [t],
    );
    const phoneNoResultsLabel = useMemo(
        () => t("form.personalInfo.feedback.noResults"),
        [t],
    );
    const phoneInvalidMessage = useCallback(
        (country: string) =>
            t("form.personalInfo.feedback.invalid", {
                values: { country },
            }),
        [t],
    );
    const phoneExampleLabel = useCallback(
        (prefix: string) =>
            t("form.personalInfo.feedback.example", {
                values: { prefix },
            }),
        [t],
    );
    const includesList = messages.footer?.includes ?? [];
    const getDayLabel = useCallback(
        (count: number) =>
            t(`summary.days.${count === 1 ? "one" : "other"}` as const, {
                values: { count },
            }),
        [t],
    );

    type StoredDiscountData = {
        code?: string;
        discount?: string | number;
        discountCasco?: string | number;
        couponType?: string | null;
    };

    const storedDiscount: StoredDiscountData | null =
        typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("discount") || "null")
            : null;
    const storedCouponType = resolveCouponTypeValue(storedDiscount?.couponType);
    const storedOriginalCar =
        typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("originalCar") || "null")
            : null;
    const [formData, setFormData] = useState<ReservationFormData>({
        customer_name: "",
        customer_email: "",
        customer_phone: "+40",
        flight_number: "",
        rental_start_date: "",
        rental_start_time: "",
        rental_end_date: "",
        rental_end_time: "",
        location: "aeroport",
        car_id: null,
        coupon_code: storedDiscount?.code || "",
    });
    useEffect(() => {
        if (booking.startDate && booking.endDate && booking.selectedCar) {
            const [rental_start_date, rental_start_time] = booking.startDate.split("T");
            const [rental_end_date, rental_end_time] = booking.endDate.split("T");
            const selectedCar = booking.selectedCar;
            setFormData((prev) => {
                if (
                    prev.rental_start_date === rental_start_date &&
                    prev.rental_start_time === rental_start_time &&
                    prev.rental_end_date === rental_end_date &&
                    prev.rental_end_time === rental_end_time &&
                    prev.car_id === selectedCar.id
                ) {
                    return prev;
                }
                return {
                    ...prev,
                    rental_start_date,
                    rental_start_time,
                    rental_end_date,
                    rental_end_time,
                    car_id: selectedCar.id,
                };
            });
        }
    }, [booking.startDate, booking.endDate, booking.selectedCar]);

    const [services, setServices] = useState<Service[]>([]);
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [wheelPrizeRecord, setWheelPrizeRecord] = useState<StoredWheelPrizeEntry | null>(null);
    const [quoteResult, setQuoteResult] = useState<QuotePriceResponse | null>(null);
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);
    const [quoteErrorKey, setQuoteErrorKey] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchServices = async () => {
            try {
                const res = await apiClient.getServices({ language: locale });
                const mapped = extractList(res)
                    .map<Service | null>((entry) => {
                        if (!entry || typeof entry !== "object") return null;
                        const source = entry as Record<string, unknown>;
                        const idCandidate = source.id ?? source.service_id ?? source.value;
                        const numericId =
                            typeof idCandidate === "number"
                                ? idCandidate
                                : typeof idCandidate === "string"
                                    ? Number(idCandidate)
                                    : NaN;
                        if (!Number.isFinite(numericId)) return null;
                        const name = typeof source.name === "string" ? source.name : "";
                        const price = parsePrice(
                            source.price ?? source.amount ?? source.value ?? source.price_per_day,
                        );
                        return {
                            id: numericId,
                            name,
                            price,
                        };
                    })
                    .filter((service): service is Service => service !== null);

                if (cancelled) {
                    return;
                }

                setServices(mapped);
                if (mapped.length > 0) {
                    setSelectedServices((prev) => {
                        if (prev.length === 0) {
                            return prev;
                        }
                        const nextById = new Map(mapped.map((service) => [service.id, service]));
                        return prev
                            .map((service) => nextById.get(service.id) ?? service)
                            .filter((service, index, self) =>
                                self.findIndex((item) => item.id === service.id) === index,
                            );
                    });
                }
            } catch (error) {
                console.error(error);
            }
        };

        fetchServices();

        return () => {
            cancelled = true;
        };
    }, [locale]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = getStoredWheelPrize();
        if (!stored) {
            setWheelPrizeRecord(null);
            return;
        }
        if (isStoredWheelPrizeActive(stored)) {
            setWheelPrizeRecord(stored);
        } else {
            clearStoredWheelPrize();
            setWheelPrizeRecord(null);
        }
    }, []);

    const [isSubmitting, setIsSubmitting] = useState(false);
    type AvailabilityErrorKey = "invalidDates" | "unavailable";
    const [availabilityErrorKey, setAvailabilityErrorKey] = useState<AvailabilityErrorKey | null>(null);
    type DiscountStatus = {
        isValid: boolean;
        messageKey: "success" | "error";
        discount: string;
        discountCasco: string;
        couponType?: string | null;
    };
    const [discountStatus, setDiscountStatus] = useState<DiscountStatus | null>(
        storedDiscount
            ? {
                isValid: true,
                messageKey: "success",
                discount: String(storedDiscount.discount ?? "0"),
                discountCasco: String(storedDiscount.discountCasco ?? "0"),
                couponType: storedCouponType,
            }
            : null,
    );
    const [isValidatingCode, setIsValidatingCode] = useState(false);
    const [originalCar, setOriginalCar] = useState<Car | null>(storedOriginalCar);
    const checkoutLoadedTrackedRef = useRef(false);
    const lastValidatedRef = useRef<{ carId: number | null; withDeposit: boolean | null }>({
        carId: null,
        withDeposit: null,
    });
    const previousLocaleRef = useRef(locale);
    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        const updated = { ...formData, [name]: value };
        setFormData(updated);
        if (
            ["rental_start_date", "rental_start_time", "rental_end_date", "rental_end_time"].includes(
                name,
            )
        ) {
            const { rental_start_date, rental_start_time, rental_end_date, rental_end_time } = updated;
            if (rental_start_date && rental_end_date) {
                const start = new Date(`${rental_start_date}T${rental_start_time || "00:00"}`);
                const end = new Date(`${rental_end_date}T${rental_end_time || "00:00"}`);
                if (end <= start) {
                    setAvailabilityErrorKey("invalidDates");
                    return;
                }
            }
            setAvailabilityErrorKey(null);
        }
    };

    const handleDepositChange = (withDeposit: boolean) => {
        setBooking({
            ...booking,
            withDeposit,
        });
    };

    const toggleService = (service: Service) => {
        setSelectedServices((prev) =>
            prev.some((s) => s.id === service.id)
                ? prev.filter((s) => s.id !== service.id)
                : [...prev, service],
        );
    };

    useEffect(() => {
        let ignore = false;
        const fetchUpdatedCar = async () => {
            if (
                !booking.selectedCar ||
                !formData.rental_start_date ||
                !formData.rental_start_time ||
                !formData.rental_end_date ||
                !formData.rental_end_time ||
                discountStatus?.isValid
            ) {
                return;
            }

            const start = `${formData.rental_start_date}T${formData.rental_start_time}`;
            const end = `${formData.rental_end_date}T${formData.rental_end_time}`;

            if (new Date(end) <= new Date(start)) {
                setAvailabilityErrorKey("invalidDates");
                return;
            }

            const payload = {
                car_id: booking.selectedCar.id,
                start_date: start,
                end_date: end,
            };
            const checkAvailability = await apiClient.checkCarAvailability(payload);

            if (checkAvailability.available === false) {
                setAvailabilityErrorKey("unavailable");
                return;
            }
            setAvailabilityErrorKey(null);
            setBooking({
                ...booking,
                startDate: start,
                endDate: end,
                selectedCar: booking.selectedCar,
            });
            try {
                const info = await apiClient.getCarForBooking(
                    {
                        car_id: booking.selectedCar.id,
                        start_date: start,
                        end_date: end,
                    },
                    locale,
                );
                if (ignore) return;
                const apiCar = extractFirstCar(info);
                if (!apiCar) return;
                const mapped = mapApiCar(apiCar);
                const resolvedCar: Car = {
                    ...mapped,
                    available:
                        typeof info.available === "boolean"
                            ? info.available
                            : mapped.available,
                };

                setBooking({
                    ...booking,
                    startDate: start,
                    endDate: end,
                    selectedCar: resolvedCar,
                });
            } catch (error) {
                console.error(error);
            }
        };

        fetchUpdatedCar();
        return () => {
            ignore = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        formData.rental_start_date,
        formData.rental_start_time,
        formData.rental_end_date,
        formData.rental_end_time,
        discountStatus?.isValid,
    ]);

    useEffect(() => {
        if (previousLocaleRef.current === locale) {
            return;
        }
        previousLocaleRef.current = locale;

        const selectedCar = booking.selectedCar;
        if (!selectedCar) {
            return;
        }

        const start = booking.startDate;
        const end = booking.endDate;

        if (!start || !end) {
            return;
        }

        let cancelled = false;

        const refreshSelection = async () => {
            try {
                if (discountStatus?.isValid) {
                    const couponCode = formData.coupon_code?.trim();
                    if (!couponCode) {
                        return;
                    }

                    const payload: DiscountValidationPayload = {
                        code: couponCode,
                        car_id: selectedCar.id,
                        start_date: start,
                        end_date: end,
                        price: selectedCar.rental_rate ?? 0,
                        price_casco: selectedCar.rental_rate_casco ?? 0,
                        total_price: selectedCar.total_deposit ?? 0,
                        total_price_casco: selectedCar.total_without_deposit ?? 0,
                    };

                    if (normalizedCustomerEmail) {
                        payload.customer_email = normalizedCustomerEmail;
                    }

                    const data = await apiClient.validateDiscountCode(payload);
                    if (cancelled) {
                        return;
                    }

                    setOriginalCar(selectedCar);

                    if (data.valid === false) {
                        setDiscountStatus({
                            isValid: false,
                            messageKey: "error",
                            discount: "0",
                            discountCasco: "0",
                        });
                        return;
                    }

                    const discountCar = data.data ? mapApiCar(data.data) : selectedCar;
                    setBooking({
                        ...booking,
                        startDate: start,
                        endDate: end,
                        selectedCar: discountCar,
                    });
                    lastValidatedRef.current = {
                        carId: discountCar.id,
                        withDeposit: booking.withDeposit ?? null,
                    };
                    const coupon = data.data?.coupon;
                    const couponTypeCandidate =
                        typeof coupon?.discount_type === "string"
                            ? coupon.discount_type
                            : typeof coupon?.type === "string"
                                ? coupon.type
                                : null;
                    const normalizedCouponType = resolveCouponTypeValue(
                        couponTypeCandidate,
                    );
                    const discountData = {
                        code: couponCode,
                        discount: coupon?.discount_deposit ?? "0",
                        discountCasco: coupon?.discount_casco ?? "0",
                        couponType: normalizedCouponType,
                    };
                    localStorage.setItem("discount", JSON.stringify(discountData));
                    localStorage.setItem("originalCar", JSON.stringify(selectedCar));
                    setDiscountStatus({
                        isValid: true,
                        messageKey: "success",
                        discount: String(discountData.discount),
                        discountCasco: String(discountData.discountCasco),
                        couponType: normalizedCouponType,
                    });
                    return;
                }

                const info = await apiClient.getCarForBooking(
                    {
                        car_id: selectedCar.id,
                        start_date: start,
                        end_date: end,
                    },
                    locale,
                );
                if (cancelled) {
                    return;
                }
                const apiCar = extractFirstCar(info);
                if (!apiCar) {
                    return;
                }
                const mapped = mapApiCar(apiCar);
                const resolvedCar: Car = {
                    ...mapped,
                    available:
                        typeof info.available === "boolean"
                            ? info.available
                            : mapped.available,
                };
                setBooking({
                    ...booking,
                    startDate: start,
                    endDate: end,
                    selectedCar: resolvedCar,
                });
            } catch (error) {
                console.error(error);
            }
        };

        refreshSelection();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locale]);

    const servicesTotal = useMemo(
        () => selectedServices.reduce((sum, service) => sum + service.price, 0),
        [selectedServices],
    );

    const selectedCar = booking.selectedCar;
    const selectedCarGallery = useMemo(() => {
        if (!selectedCar) {
            return [] as string[];
        }
        const gallery = Array.isArray(selectedCar.gallery)
            ? selectedCar.gallery.filter((src) => typeof src === "string" && src.trim().length > 0)
            : [];
        if (gallery.length > 0) {
            return gallery;
        }
        const fallbackImage = typeof selectedCar.image === "string" ? selectedCar.image.trim() : "";
        return fallbackImage.length > 0 ? [fallbackImage] : [];
    }, [selectedCar]);
    const appliedOffersSummary = useMemo(() => {
        const quoteOffers = Array.isArray(quoteResult?.applied_offers)
            ? quoteResult?.applied_offers
            : null;
        if (quoteOffers && quoteOffers.length > 0) {
            return quoteOffers
                .map((offer): BookingAppliedOffer | null => {
                    if (!offer || typeof offer !== "object") return null;
                    if (typeof offer.id !== "number" || !Number.isFinite(offer.id)) {
                        return null;
                    }
                    const title = typeof offer.title === "string" ? offer.title.trim() : "";
                    if (!title) return null;
                    return {
                        id: offer.id,
                        title,
                        kind: offer.offer_type ?? null,
                        value: offer.offer_value ?? null,
                        badge: offer.discount_label ?? null,
                    };
                })
                .filter(
                    (offer): offer is BookingAppliedOffer =>
                        offer !== null && typeof offer.id === "number" && offer.title.length > 0,
                );
        }

        return (booking.appliedOffers ?? []).filter(
            (offer) => typeof offer.id === "number" && Number.isFinite(offer.id) && offer.title?.trim(),
        );
    }, [booking.appliedOffers, quoteResult?.applied_offers]);

    const quoteAppliedOffersPayload = useMemo(() => {
        if (appliedOffersSummary.length === 0) {
            return [] as ReservationAppliedOffer[];
        }

        return appliedOffersSummary
            .map((offer): ReservationAppliedOffer | null => {
                if (typeof offer.id !== "number" || !Number.isFinite(offer.id)) {
                    return null;
                }
                const title = typeof offer.title === "string" ? offer.title.trim() : "";
                if (!title) {
                    return null;
                }
                return {
                    id: offer.id,
                    title,
                    offer_type: offer.kind ?? null,
                    offer_value: offer.value ?? null,
                    discount_label: offer.badge ?? null,
                } satisfies ReservationAppliedOffer;
            })
            .filter((offer): offer is ReservationAppliedOffer => offer !== null);
    }, [appliedOffersSummary]);
    const quoteAppliedOffersPayloadKey = useMemo(
        () => JSON.stringify(quoteAppliedOffersPayload),
        [quoteAppliedOffersPayload],
    );

    const hasWheelPrize = wheelPrizeRecord ? isStoredWheelPrizeActive(wheelPrizeRecord) : false;
    const wheelPrizeAmountLabel = useMemo(() => {
        if (!hasWheelPrize) return null;
        const prize = wheelPrizeRecord?.prize ?? null;
        const fallback = describeWheelPrizeAmount(prize);
        if (!prize) return fallback;
        const amount = parseMaybeNumber(prize.amount);
        const type = typeof prize.type === "string" ? prize.type : "other";
        if (type === "percentage_discount" && amount !== null) {
            return t("wheelPrize.amount.percentage", {
                values: { amount: priceFormatter.format(amount) },
                fallback: fallback ?? undefined,
            });
        }
        if ((type === "fixed_discount" || type === "voucher") && amount !== null) {
            return t("wheelPrize.amount.fixed", {
                values: { amount: priceFormatter.format(amount) },
                fallback: fallback ?? undefined,
            });
        }
        if (type === "extra_rental_day" && amount !== null) {
            const normalized = Math.round(amount * 100) / 100;
            const formatted = Number.isInteger(normalized)
                ? String(normalized)
                : priceFormatter.format(normalized);
            const key = normalized === 1 ? "one" : "other";
            return t(`wheelPrize.amount.extraDay.${key}` as const, {
                values: { amount: formatted },
                fallback: fallback ?? undefined,
            });
        }
        if (amount !== null) {
            return t("wheelPrize.amount.other", {
                values: { amount: priceFormatter.format(amount) },
                fallback: fallback ?? undefined,
            });
        }
        return fallback ?? null;
    }, [hasWheelPrize, priceFormatter, t, wheelPrizeRecord]);
    const wheelPrizeExpiryLabel = useMemo(() => {
        if (!hasWheelPrize) return null;
        return formatWheelPrizeDate(
            wheelPrizeRecord?.expires_at ?? wheelPrizeRecord?.expiration_date ?? null,
        );
    }, [formatWheelPrizeDate, hasWheelPrize, wheelPrizeRecord]);

    useEffect(() => {
        if (checkoutLoadedTrackedRef.current) {
            return;
        }

        if (!selectedCar) {
            return;
        }

        const bookingStartDate = typeof booking.startDate === "string" && booking.startDate.trim().length > 0
            ? booking.startDate
            : undefined;
        const bookingEndDate = typeof booking.endDate === "string" && booking.endDate.trim().length > 0
            ? booking.endDate
            : undefined;

        const serviceIds = selectedServices
            .map((service) => service.id)
            .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
        const appliedOfferIds = appliedOffersSummary
            .map((offer) => offer.id)
            .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
        const wheelPrizeId = wheelPrizeRecord?.prize_id ??
            (typeof wheelPrizeRecord?.prize?.id === "number"
                ? wheelPrizeRecord.prize.id
                : null);

        const estimatedCheckoutValue = (() => {
            const totalWithDeposit = parsePrice(selectedCar.total_deposit);
            const totalWithoutDeposit = parsePrice(selectedCar.total_without_deposit);
            if (typeof booking.withDeposit === "boolean") {
                return booking.withDeposit ? totalWithDeposit : totalWithoutDeposit;
            }
            return totalWithoutDeposit || totalWithDeposit || 0;
        })();

        const estimatedMetaPayload = {
            value: Number.isFinite(estimatedCheckoutValue) ? estimatedCheckoutValue : undefined,
            currency: DEFAULT_CURRENCY,
            content_ids: [String(selectedCar.id)],
            content_name: selectedCar.name,
            content_type: "car",
            contents: [
                {
                    id: String(selectedCar.id),
                    quantity: 1,
                    item_price: Number.isFinite(estimatedCheckoutValue) ? estimatedCheckoutValue : undefined,
                    title: selectedCar.name,
                },
            ],
            start_date: bookingStartDate,
            end_date: bookingEndDate,
            with_deposit: typeof booking.withDeposit === "boolean" ? booking.withDeposit : undefined,
            service_ids: serviceIds,
            applied_offer_ids: appliedOfferIds,
        } as const;

        trackMixpanelEvent("checkout_loaded", {
            selected_car_id: selectedCar.id,
            selected_car_name: selectedCar.name,
            with_deposit:
                typeof booking.withDeposit === "boolean" ? booking.withDeposit : null,
            booking_start: bookingStartDate ?? null,
            booking_end: bookingEndDate ?? null,
            preselected_service_ids: serviceIds,
            applied_offer_ids: appliedOfferIds,
            has_wheel_prize: hasWheelPrize,
            wheel_prize_id: wheelPrizeId,
            quote_ready: Boolean(quoteResult),
        });

        trackTikTokEvent(TIKTOK_EVENTS.INITIATE_CHECKOUT, {
            value: Number.isFinite(estimatedCheckoutValue) ? estimatedCheckoutValue : undefined,
            currency: DEFAULT_CURRENCY,
            contents: [
                {
                    content_id: selectedCar.id,
                    content_name: selectedCar.name,
                    quantity: 1,
                    price: Number.isFinite(estimatedCheckoutValue) ? estimatedCheckoutValue : undefined,
                },
            ],
            start_date: bookingStartDate,
            end_date: bookingEndDate,
            with_deposit: typeof booking.withDeposit === "boolean" ? booking.withDeposit : undefined,
            service_ids: serviceIds,
            applied_offer_ids: appliedOfferIds,
        });

        trackMetaPixelEvent(META_PIXEL_EVENTS.INITIATE_CHECKOUT, estimatedMetaPayload);

        trackMetaPixelEvent(META_PIXEL_EVENTS.LEAD, {
            ...estimatedMetaPayload,
            lead_stage: "checkout_view",
        });

        checkoutLoadedTrackedRef.current = true;
    }, [
        appliedOffersSummary,
        booking.endDate,
        booking.startDate,
        booking.withDeposit,
        hasWheelPrize,
        quoteResult,
        selectedCar,
        selectedServices,
        wheelPrizeRecord,
    ]);

    const estimatedRentalSubtotal = useMemo(() => {
        const selectedCar = booking.selectedCar;
        if (!selectedCar || !booking.startDate || !booking.endDate) return 0;

        const startDate = new Date(booking.startDate);
        const endDate = new Date(booking.endDate);
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const bookingWithDeposit = booking.withDeposit;
        const totalWithDeposit = parsePrice(selectedCar.total_deposit);
        const totalWithoutDeposit = parsePrice(selectedCar.total_without_deposit);

        if (bookingWithDeposit && daysDiff > 0) {
            return totalWithDeposit;
        }

        return totalWithoutDeposit;
    }, [booking.selectedCar, booking.startDate, booking.endDate, booking.withDeposit]);

    const rentalDays = useMemo(() => {
        const carDays = selectedCar?.days;
        if (typeof carDays === "number" && Number.isFinite(carDays) && carDays > 0) {
            return carDays;
        }
        if (!booking.startDate || !booking.endDate) return 0;
        const startDate = new Date(booking.startDate);
        const endDate = new Date(booking.endDate);
        const diff = endDate.getTime() - startDate.getTime();
        if (diff <= 0) return 0;
        return Math.ceil(diff / (1000 * 3600 * 24));
    }, [booking.startDate, booking.endDate, selectedCar]);

    const estimatedPerDayPrice = useMemo(() => {
        if (!selectedCar) return 0;
        const rawPerDay = booking.withDeposit
            ? selectedCar.rental_rate
            : selectedCar.rental_rate_casco;
        const parsedPerDay = parsePrice(rawPerDay);
        if (parsedPerDay > 0) {
            return parsedPerDay;
        }
        if (rentalDays > 0) {
            return estimatedRentalSubtotal / rentalDays;
        }
        return 0;
    }, [selectedCar, booking.withDeposit, rentalDays, estimatedRentalSubtotal]);

    const estimatedTotalBeforeWheel = estimatedRentalSubtotal + servicesTotal;

    const calculateWheelPrizeDiscount = useCallback(
        (baseAmount: number, perDayAmount: number) => {
            if (!hasWheelPrize || !wheelPrizeRecord) return 0;
            if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
                return 0;
            }

            const prize = wheelPrizeRecord.prize;
            const type = typeof prize.type === "string" ? prize.type : "other";
            const amount = parseMaybeNumber(prize.amount);

            let discountValue = 0;

            if (type === "percentage_discount" && typeof amount === "number" && amount > 0) {
                discountValue = (baseAmount * amount) / 100;
            } else if (
                (type === "fixed_discount" || type === "voucher") && typeof amount === "number" && amount > 0
            ) {
                discountValue = amount;
            } else if (type === "extra_rental_day" && typeof amount === "number" && amount > 0) {
                const bonusDays = Math.max(0, amount);
                const effectivePerDay = perDayAmount > 0
                    ? perDayAmount
                    : rentalDays > 0
                        ? baseAmount / rentalDays
                        : 0;
                const applicableDays = rentalDays > 0 ? Math.min(bonusDays, rentalDays) : bonusDays;
                discountValue = effectivePerDay * applicableDays;
            }

            if (!Number.isFinite(discountValue) || discountValue <= 0) {
                return 0;
            }

            const capped = Math.min(baseAmount, discountValue);
            return Math.round(Math.round(capped * 100) / 100);
        },
        [hasWheelPrize, rentalDays, wheelPrizeRecord],
    );

    const wheelPrizeDiscountForRequest = useMemo(() => {
        if (!hasWheelPrize) return 0;
        return calculateWheelPrizeDiscount(estimatedTotalBeforeWheel, estimatedPerDayPrice);
    }, [
        calculateWheelPrizeDiscount,
        estimatedPerDayPrice,
        estimatedTotalBeforeWheel,
        hasWheelPrize,
    ]);

    const wheelPrizeDiscount = useMemo(() => {
        if (!hasWheelPrize || !wheelPrizeRecord) return 0;
        if (quoteResult?.wheel_prize?.eligible === false) {
            return 0;
        }
        if (typeof quoteResult?.wheel_prize_discount === "number") {
            const normalized = Math.round(quoteResult.wheel_prize_discount * 100) / 100;
            return normalized > 0 ? normalized : 0;
        }
        const baseAmount = quoteResult?.total_before_wheel_prize ?? estimatedTotalBeforeWheel;
        const perDayAmount = quoteResult?.price_per_day ?? estimatedPerDayPrice;
        return calculateWheelPrizeDiscount(baseAmount, perDayAmount);
    }, [
        calculateWheelPrizeDiscount,
        estimatedPerDayPrice,
        estimatedTotalBeforeWheel,
        hasWheelPrize,
        quoteResult?.price_per_day,
        quoteResult?.total_before_wheel_prize,
        quoteResult?.wheel_prize?.eligible,
        quoteResult?.wheel_prize_discount,
        wheelPrizeRecord,
    ]);
    const wheelPrizeApplied = wheelPrizeDiscount > 0;
    const wheelPrizeValidityMessage = useMemo(() => {
        if (!hasWheelPrize) return null;
        return wheelPrizeExpiryLabel
            ? t("wheelPrize.validUntil", { values: { date: wheelPrizeExpiryLabel } })
            : t("wheelPrize.validDefault");
    }, [hasWheelPrize, t, wheelPrizeExpiryLabel]);
    const wheelPrizeSavingsMessage = useMemo(() => {
        if (!wheelPrizeApplied || wheelPrizeDiscount <= 0) return null;
        if (quoteResult?.wheel_prize?.eligible === false) return null;
        return t("wheelPrize.savings", {
            values: { amount: formatCurrency(wheelPrizeDiscount) },
        });
    }, [
        formatCurrency,
        quoteResult?.wheel_prize?.eligible,
        t,
        wheelPrizeApplied,
        wheelPrizeDiscount,
    ]);
    const normalizedCouponCode = formData.coupon_code.trim();
    const normalizedCustomerEmail = formData.customer_email.trim();

    useEffect(() => {
        if (!booking.selectedCar || !booking.startDate || !booking.endDate) {
            setQuoteResult(null);
            return;
        }

        if (availabilityErrorKey) {
            setQuoteResult(null);
            return;
        }

        const selectedCar = booking.selectedCar;
        const rentalStart = booking.startDate;
        const rentalEnd = booking.endDate;

        let ignore = false;

        const fetchQuote = async () => {
            setIsQuoteLoading(true);
            setQuoteErrorKey(null);
            try {
                const payload: QuotePricePayload = {
                    car_id: selectedCar.id,
                    rental_start_date: rentalStart,
                    rental_end_date: rentalEnd,
                };

                if (typeof booking.withDeposit === "boolean") {
                    payload.with_deposit = booking.withDeposit;
                }

                if (normalizedCustomerEmail) {
                    payload.customer_email = normalizedCustomerEmail;
                }

                if (normalizedCouponCode) {
                    payload.coupon_code = normalizedCouponCode;
                    if (discountStatus?.isValid) {
                        const couponAmountCandidate = booking.withDeposit
                            ? parseMaybeNumber(discountStatus.discount)
                            : parseMaybeNumber(discountStatus.discountCasco);
                        if (couponAmountCandidate !== null && couponAmountCandidate > 0) {
                            payload.coupon_amount = Math.round(couponAmountCandidate * 100) / 100;
                        }
                        const couponTypeForPayload = resolveCouponTypeValue(
                            discountStatus.couponType,
                        );
                        if (couponTypeForPayload) {
                            payload.coupon_type = couponTypeForPayload;
                        }
                    }
                }

                if (selectedServices.length > 0) {
                    payload.service_ids = selectedServices.map((service) => service.id);
                }
                payload.total_services = Math.round(servicesTotal * 100) / 100;

                if (quoteAppliedOffersPayload.length > 0) {
                    payload.applied_offers = quoteAppliedOffersPayload;
                }

                if (hasWheelPrize && wheelPrizeRecord) {
                    const prizeId = wheelPrizeRecord.prize_id ?? wheelPrizeRecord.prize.id;
                    payload.wheel_prize_discount = wheelPrizeDiscountForRequest;
                    payload.wheel_of_fortune_prize_id = prizeId;
                    payload.wheel_prize = {
                        prize_id: prizeId,
                        wheel_of_fortune_id: wheelPrizeRecord.wheel_of_fortune_id,
                        discount_value: wheelPrizeDiscountForRequest,
                        eligible: true,
                    };
                } else {
                    payload.wheel_prize_discount = 0;
                }

                const response = await apiClient.quotePrice(payload);
                if (ignore) return;
                setQuoteResult(response);
                setQuoteErrorKey(null);
            } catch (error) {
                if (ignore) return;
                console.error("Nu am putut obține oferta de preț", error);
                setQuoteResult(null);
                setQuoteErrorKey("quoteFailed");
            } finally {
                if (!ignore) {
                    setIsQuoteLoading(false);
                }
            }
        };

        fetchQuote();

        return () => {
            ignore = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        availabilityErrorKey,
        booking.endDate,
        booking.selectedCar,
        booking.startDate,
        booking.withDeposit,
        discountStatus?.couponType,
        discountStatus?.discount,
        discountStatus?.discountCasco,
        discountStatus?.isValid,
        hasWheelPrize,
        normalizedCustomerEmail,
        normalizedCouponCode,
        quoteAppliedOffersPayloadKey,
        selectedServices,
        servicesTotal,
        wheelPrizeDiscountForRequest,
        wheelPrizeRecord,
    ]);

    const quoteSubtotal = typeof quoteResult?.sub_total === "number"
        ? quoteResult.sub_total
        : estimatedRentalSubtotal;
    const servicesAmount = typeof quoteResult?.total_services === "number"
        ? quoteResult.total_services
        : servicesTotal;
    const offersDiscount = typeof quoteResult?.offers_discount === "number"
        ? quoteResult.offers_discount
        : 0;
    const rawCouponAmount = typeof quoteResult?.coupon_amount === "number"
        ? quoteResult.coupon_amount
        : discountStatus?.isValid
            ? (() => {
                const value = booking.withDeposit
                    ? parseMaybeNumber(discountStatus.discount)
                    : parseMaybeNumber(discountStatus.discountCasco);
                return value ?? 0;
            })()
            : 0;
    const couponAmount = Math.max(0, Math.round((rawCouponAmount ?? 0) * 100) / 100);
    const depositWaived = quoteResult?.deposit_waived === true;
    const totalBeforeWheel = typeof quoteResult?.total_before_wheel_prize === "number"
        ? quoteResult.total_before_wheel_prize
        : estimatedTotalBeforeWheel;
    const totalValue = typeof quoteResult?.total === "number"
        ? quoteResult.total
        : Math.max(0, totalBeforeWheel - wheelPrizeDiscount);
    const displayPerDayPrice = typeof quoteResult?.price_per_day === "number"
        ? quoteResult.price_per_day
        : estimatedPerDayPrice;
    const quoteCouponType = resolveCouponTypeValue(
        quoteResult?.coupon_type ?? discountStatus?.couponType ?? null,
    );
    const quoteWheelPrizeDetails = quoteResult?.wheel_prize ?? null;
    const isQuoteWheelPrizeEligible = quoteWheelPrizeDetails?.eligible !== false;
    const quoteCouponTotalDiscount =
        typeof quoteResult?.coupon_total_discount === "number"
            ? quoteResult.coupon_total_discount
            : null;
    const quoteCouponTotalDiscountDetails = sanitizeCouponDiscountDetails(
        quoteResult?.coupon_total_discount_details,
    );

    const handleDiscountCodeValidation = async (
        force = false,
        baseCar?: Car | null,
    ) => {
        if (isValidatingCode) return;
        if (discountStatus?.isValid && !force) return;
        if (!formData.coupon_code.trim()) {
            setDiscountStatus(null);
            return;
        }

        const carForValidation = baseCar ?? booking.selectedCar;
        if (!carForValidation) return;

        setIsValidatingCode(true);
        try {
            const payload: DiscountValidationPayload = {
                code: formData.coupon_code,
                car_id: carForValidation.id,
                start_date: booking?.startDate ?? null,
                end_date: booking?.endDate ?? null,
                price: carForValidation.rental_rate ?? 0,
                price_casco: carForValidation.rental_rate_casco ?? 0,
                total_price: carForValidation.total_deposit ?? 0,
                total_price_casco: carForValidation.total_without_deposit ?? 0,
            };
            if (normalizedCustomerEmail) {
                payload.customer_email = normalizedCustomerEmail;
            }
            const data = await apiClient.validateDiscountCode(payload);
            setOriginalCar(carForValidation);
            if (data.valid === false) {
                setDiscountStatus({
                    isValid: false,
                    messageKey: "error",
                    discount: "0",
                    discountCasco: "0",
                });
            } else {
                const discountCar = data.data
                    ? mapApiCar(data.data)
                    : carForValidation;
                setBooking({
                    ...booking,
                    selectedCar: discountCar,
                });
                lastValidatedRef.current = {
                    carId: discountCar.id,
                    withDeposit: booking?.withDeposit ?? null,
                };
                const coupon = data.data?.coupon;
                const couponTypeCandidate =
                    typeof coupon?.discount_type === "string"
                        ? coupon.discount_type
                        : typeof coupon?.type === "string"
                            ? coupon.type
                            : null;
                const normalizedCouponType = resolveCouponTypeValue(
                    couponTypeCandidate,
                );
                const discountData = {
                    code: formData.coupon_code,
                    discount: coupon?.discount_deposit ?? "0",
                    discountCasco: coupon?.discount_casco ?? "0",
                    couponType: normalizedCouponType,
                };
                localStorage.setItem("discount", JSON.stringify(discountData));
                localStorage.setItem("originalCar", JSON.stringify(carForValidation));
                setDiscountStatus({
                    isValid: true,
                    messageKey: "success",
                    discount: String(discountData.discount),
                    discountCasco: String(discountData.discountCasco),
                    couponType: normalizedCouponType,
                });
            }
        } catch (error) {
            setDiscountStatus({
                isValid: false,
                messageKey: "error",
                discount: "0",
                discountCasco: "0",
            });
        } finally {
            setIsValidatingCode(false);
        }
    };

    const handleRemoveDiscountCode = () => {
        if (originalCar) {
            setBooking({
                ...booking,
                selectedCar: originalCar,
            });
        }
        setOriginalCar(null);
        setDiscountStatus(null);
        setFormData((prev) => ({ ...prev, coupon_code: "" }));
        localStorage.removeItem("discount");
        localStorage.removeItem("originalCar");
        lastValidatedRef.current = { carId: null, withDeposit: null };
    };
    useEffect(() => {
        if (
            !booking.selectedCar ||
            !discountStatus?.isValid ||
            !formData.coupon_code ||
            isValidatingCode
        ) {
            return;
        }

        const alreadyValidated =
            lastValidatedRef.current.carId === booking.selectedCar.id &&
            lastValidatedRef.current.withDeposit === booking.withDeposit;

        if (alreadyValidated) {
            return;
        }

        lastValidatedRef.current = {
            carId: booking.selectedCar.id,
            withDeposit: booking.withDeposit,
        };

        handleDiscountCodeValidation(true, originalCar || booking.selectedCar);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [booking.selectedCar, booking.withDeposit, isValidatingCode]);

    if (!booking.startDate || !booking.endDate || !booking.selectedCar) {
        return (
            <div className="pt-16 lg:pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-xl font-dm-sans text-gray-600">
                    {t("emptyState.message")}
                </p>
            </div>
        );
    }
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (availabilityErrorKey || !booking.startDate || !booking.endDate || !selectedCar) return;
        setIsSubmitting(true);

        const start = new Date(booking.startDate);
        const end = new Date(booking.endDate);
        const daysDiff = Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 3600 * 24),
        );
        const normalizedSubtotal = Math.round(quoteSubtotal * 100) / 100;
        const normalizedServicesAmount = Math.round(servicesAmount * 100) / 100;
        const totalBeforeWheelPrize = Math.round(totalBeforeWheel * 100) / 100;
        const totalAfterAdjustments = Math.round(totalValue * 100) / 100;
        const pricePerDay = displayPerDayPrice > 0
            ? Math.round(displayPerDayPrice * 100) / 100
            : daysDiff > 0
                ? Math.round((normalizedSubtotal / daysDiff) * 100) / 100
                : 0;
        const wheelPrizeDiscountValue = Math.round(wheelPrizeDiscount * 100) / 100;
        const couponAmountValue = couponAmount;
        const offersDiscountValue = Math.max(0, Math.round(offersDiscount * 100) / 100);
        const serviceIds = selectedServices.map((service) => service.id);

        const quoteOffersPayload: ReservationAppliedOffer[] = Array.isArray(quoteResult?.applied_offers)
            ? quoteResult.applied_offers
                .map((offer): ReservationAppliedOffer | null => {
                    if (
                        !offer ||
                        typeof offer.id !== "number" ||
                        !Number.isFinite(offer.id) ||
                        typeof offer.title !== "string"
                    ) {
                        return null;
                    }
                    const title = offer.title.trim();
                    if (!title) return null;
                    return {
                        id: offer.id,
                        title,
                        offer_type: offer.offer_type ?? null,
                        offer_value: offer.offer_value ?? null,
                        discount_label: offer.discount_label ?? null,
                    };
                })
                .filter((offer): offer is ReservationAppliedOffer => offer !== null)
            : [];

        const fallbackAppliedOffers = quoteOffersPayload.length > 0
            ? quoteOffersPayload
            : appliedOffersSummary.map<ReservationAppliedOffer>((offer) => ({
                id: offer.id,
                title: offer.title.trim(),
                offer_type: offer.kind ?? null,
                offer_value: offer.value ?? null,
                discount_label: offer.badge ?? null,
            }));

        const appliedOffersPayload = Array.from(
            new Map(fallbackAppliedOffers.map((offer) => [offer.id, offer])).values(),
        ).filter(
            (offer) => typeof offer.id === "number" && Number.isFinite(offer.id) && offer.title.length > 0,
        );

        const fallbackWheelPrizeDetails = hasWheelPrize && wheelPrizeRecord
            ? {
                wheel_of_fortune_prize_id: wheelPrizeRecord.prize_id ?? wheelPrizeRecord.prize.id ?? null,
                wheel_of_fortune_id: wheelPrizeRecord.wheel_of_fortune_id,
                prize_id: wheelPrizeRecord.prize_id ?? wheelPrizeRecord.prize.id ?? null,
                title: wheelPrizeRecord.prize.title ?? "",
                type: wheelPrizeRecord.prize.type ?? undefined,
                amount: parseMaybeNumber(wheelPrizeRecord.prize.amount) ?? null,
                description: wheelPrizeRecord.prize.description ?? null,
                amount_label: wheelPrizeAmountLabel,
                expires_at: wheelPrizeRecord.expires_at,
                discount_value: wheelPrizeDiscountValue,
                eligible: true,
            }
            : null;

        const wheelPrizeDetails = quoteWheelPrizeDetails
            ? {
                ...quoteWheelPrizeDetails,
                discount_value: wheelPrizeDiscountValue,
                eligible: quoteWheelPrizeDetails.eligible ?? true,
            }
            : fallbackWheelPrizeDetails;

        const wheelPrizeIdForPayloadRaw =
            (wheelPrizeDetails as { wheel_of_fortune_prize_id?: unknown })?.wheel_of_fortune_prize_id ??
            wheelPrizeRecord?.prize_id ??
            wheelPrizeRecord?.prize.id ??
            null;
        const wheelPrizeIdForPayload = parseMaybeNumber(wheelPrizeIdForPayloadRaw);

        const payload: ReservationPayload = {
            ...formData,
            car_id: selectedCar.id,
            service_ids: serviceIds,
            price_per_day: pricePerDay,
            total_services: normalizedServicesAmount,
            coupon_amount: couponAmountValue,
            coupon_code: formData.coupon_code,
            coupon_type: quoteCouponType ?? undefined,
            coupon_total_discount:
                typeof quoteCouponTotalDiscount === "number"
                    ? quoteCouponTotalDiscount
                    : undefined,
            coupon_total_discount_details:
                quoteCouponTotalDiscountDetails ?? undefined,
            offers_discount: offersDiscountValue,
            deposit_waived: depositWaived,
            total: totalAfterAdjustments,
            sub_total: normalizedSubtotal,
            total_before_wheel_prize: totalBeforeWheelPrize,
            wheel_prize_discount: wheelPrizeDiscountValue,
            wheel_prize: wheelPrizeDetails,
            with_deposit: typeof booking.withDeposit === "boolean" ? booking.withDeposit : null,
            applied_offers: appliedOffersPayload.length > 0 ? appliedOffersPayload : undefined,
            wheel_of_fortune_prize_id:
                typeof wheelPrizeIdForPayload === "number" && Number.isFinite(wheelPrizeIdForPayload)
                    ? wheelPrizeIdForPayload
                    : undefined,
        };

        trackTikTokEvent(TIKTOK_EVENTS.SUBMIT_FORM, {
            form_name: "checkout_reservation",
            value: totalAfterAdjustments,
            currency: DEFAULT_CURRENCY,
            with_deposit: typeof booking.withDeposit === "boolean" ? booking.withDeposit : undefined,
            start_date: booking.startDate || undefined,
            end_date: booking.endDate || undefined,
            contents: [
                {
                    content_id: selectedCar.id,
                    content_name: selectedCar.name,
                    quantity: 1,
                    price: totalAfterAdjustments,
                },
            ],
            service_ids: serviceIds,
            applied_offer_ids: appliedOffersPayload.map((offer) => offer.id),
        });

        trackMetaPixelEvent(META_PIXEL_EVENTS.LEAD, {
            form_name: "checkout_reservation",
            value: totalAfterAdjustments,
            currency: DEFAULT_CURRENCY,
            content_ids: [String(selectedCar.id)],
            content_name: selectedCar.name,
            content_type: "car",
            contents: [
                {
                    id: String(selectedCar.id),
                    quantity: 1,
                    item_price: totalAfterAdjustments,
                    title: selectedCar.name,
                },
            ],
            lead_stage: "form_submit",
            with_deposit: typeof booking.withDeposit === "boolean" ? booking.withDeposit : undefined,
            start_date: booking.startDate || undefined,
            end_date: booking.endDate || undefined,
            service_ids: serviceIds,
            applied_offer_ids: appliedOffersPayload.map((offer) => offer.id),
        });

        try {
            const res = await apiClient.createBooking(payload);
            const bookingRecord = extractItem(res);
            const reservationId =
                resolveReservationIdentifier(bookingRecord) ??
                resolveReservationIdentifier(res) ??
                `#${Math.floor(1000000 + Math.random() * 9000000)}`;
            const appliedOfferIds = Array.isArray(payload.applied_offers)
                ? payload.applied_offers
                    .map((offer) => offer.id)
                    .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
                : [];

            trackMixpanelEvent("checkout_submitted", {
                reservation_id: reservationId,
                car_id: selectedCar.id,
                with_deposit:
                    typeof payload.with_deposit === "boolean" ? payload.with_deposit : null,
                price_per_day: payload.price_per_day ?? null,
                sub_total: payload.sub_total,
                total: payload.total,
                total_services: payload.total_services,
                coupon_amount: payload.coupon_amount ?? null,
                offers_discount: payload.offers_discount ?? null,
                wheel_prize_discount: payload.wheel_prize_discount ?? null,
                deposit_waived: payload.deposit_waived === true,
                wheel_prize_id: payload.wheel_of_fortune_prize_id ?? null,
                applied_offer_ids: appliedOfferIds,
            });
            localStorage.setItem(
                "reservationData",
                JSON.stringify({
                    ...formData,
                    services: selectedServices,
                    service_ids: serviceIds,
                    price_per_day: pricePerDay,
                    total_services: normalizedServicesAmount,
                    coupon_amount: couponAmountValue,
                    coupon_type: quoteCouponType,
                    coupon_total_discount:
                        typeof quoteCouponTotalDiscount === "number"
                            ? quoteCouponTotalDiscount
                            : undefined,
                    coupon_total_discount_details:
                        quoteCouponTotalDiscountDetails ?? undefined,
                    offers_discount: offersDiscountValue,
                    deposit_waived: depositWaived,
                    selectedCar: selectedCar,
                    total: totalAfterAdjustments,
                    sub_total: normalizedSubtotal,
                    total_before_wheel_prize: totalBeforeWheelPrize,
                    wheel_prize_discount: wheelPrizeDiscountValue,
                    wheel_prize: wheelPrizeDetails,
                    applied_offers: appliedOffersPayload,
                    reservationId,
                }),
            );
            const cooldownMinutes = wheelPrizeRecord?.period_cooldown_minutes;
            const clearOptions: Parameters<typeof clearStoredWheelPrize>[0] = {
                startCooldown: true,
                reason: "reservation_completed",
            };
            if (
                typeof cooldownMinutes === "number"
                && Number.isFinite(cooldownMinutes)
                && cooldownMinutes > 0
            ) {
                clearOptions.cooldownMs = cooldownMinutes * 60 * 1000;
            }
            clearStoredWheelPrize(clearOptions);
            setWheelPrizeRecord(null);
            router.push("/success");
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const rentalSubtotal = Math.round(quoteSubtotal * 100) / 100;
    const offersDiscountDisplay = Math.round(Math.max(0, offersDiscount) * 100) / 100;
    const total = Math.round(totalValue * 100) / 100;
    const couponAmountDisplay = couponAmount;
    const depositAmount = parsePrice(selectedCar?.deposit);

    return (
        <div className="pt-16 lg:pt-20 min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
                        {t("hero.title")} <span className="text-jade">{t("hero.highlight")}</span>
                    </h1>
                    <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto">
                        {t("hero.subtitle")}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Reservation Form */}
                    <div className="lg:col-span-2 space-y-8">
                        {selectedCarGallery.length > 0 && selectedCar ? (
                            <SelectedCarGallery
                                images={selectedCarGallery}
                                carName={selectedCar.name}
                            />
                        ) : null}
                        <div className="bg-white rounded-2xl shadow-lg p-8">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Personal Information */}
                                <div>
                                    <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6 flex items-center">
                                        <User className="h-6 w-6 text-jade mr-3" />
                                        {t("form.personalInfo.title")}
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label
                                                htmlFor="reservation-name"
                                                className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                            >
                                                {t("form.personalInfo.labels.name")}
                                            </Label>
                                            <input
                                                id="reservation-name"
                                                type="text"
                                                name="customer_name"
                                                value={formData.customer_name}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                                                placeholder={t("form.personalInfo.placeholders.name")}
                                            />
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="reservation-email"
                                                className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                            >
                                                {t("form.personalInfo.labels.email")}
                                            </Label>
                                            <input
                                                id="reservation-email"
                                                type="email"
                                                name="customer_email"
                                                value={formData.customer_email}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                                                placeholder={t("form.personalInfo.placeholders.email")}
                                            />
                                        </div>

                                        <PhoneInput
                                            value={formData.customer_phone}
                                            onChange={(val) =>
                                                setFormData((prev) => ({ ...prev, customer_phone: val }))
                                            }
                                            required
                                            placeholder={t("form.personalInfo.placeholders.phone")}
                                            label={t("form.personalInfo.labels.phone")}
                                            searchPlaceholder={t("form.personalInfo.searchPlaceholder")}
                                            noResultsLabel={phoneNoResultsLabel}
                                            invalidFormatMessage={phoneInvalidMessage}
                                            exampleLabel={phoneExampleLabel}
                                        />
                                      </div>
                                        <div className="mt-6">
                                        <Label
                                            htmlFor="reservation-flight"
                                            className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                        >
                                            <Plane className="h-4 w-4 inline text-jade mr-1" />
                                            {t("form.personalInfo.labels.flight")}
                                        </Label>
                                        <input
                                            id="reservation-flight"
                                            type="text"
                                            name="flight_number"
                                            value={formData.flight_number}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                                            placeholder={t("form.personalInfo.placeholders.flight")}
                                        />
                                    </div>

                                    {/* Discount Code */}
                                    <div className="mt-6">
                                        <Label
                                            htmlFor="reservation-discount"
                                            className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                        >
                                            <Gift className="h-4 w-4 inline text-jade mr-1" />
                                            {t("form.discount.title")}
                                        </Label>
                                        {discountStatus?.isValid ? (
                                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                                <input
                                                    id="reservation-discount"
                                                    type="text"
                                                    name="coupon_code"
                                                    value={formData.coupon_code}
                                                    disabled={true}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300 md:w-auto md:flex-1"
                                                    placeholder={t("form.discount.placeholder")}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveDiscountCode}
                                                    className="w-full px-4 py-3 bg-red-500 text-white font-dm-sans font-semibold rounded-lg hover:bg-red-600 transition-all duration-300 md:w-auto"
                                                >
                                                    {t("form.discount.remove")}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                                <input
                                                    id="reservation-discount"
                                                    type="text"
                                                    name="coupon_code"
                                                    value={formData.coupon_code}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300 md:w-auto md:flex-1"
                                                    placeholder={t("form.discount.placeholder")}
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={() => handleDiscountCodeValidation()}
                                                    disabled={
                                                        isValidatingCode || !formData.coupon_code.trim()
                                                    }
                                                    className="w-full px-4 py-3 bg-berkeley text-white font-dm-sans font-semibold rounded-lg hover:bg-berkeley/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 md:w-auto"
                                                    aria-label={t("form.discount.ariaLabel")}
                                                >
                                                    {isValidatingCode ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    ) : (
                                                        t("form.discount.validate")
                                                    )}
                                                </Button>
                                            </div>
                                        )}

                                        {discountStatus && (
                                            <div
                                                className={`mt-2 p-3 rounded-lg ${
                                                    discountStatus.isValid
                                                        ? "bg-jade/10 text-jade"
                                                        : "bg-red-50 text-red-600"
                                                }`}
                                            >
                                                <p className="text-sm font-dm-sans font-semibold">
                                                    {discountMessages[discountStatus.messageKey]}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Extra Services */}
                                <div>
                                    <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6 flex items-center">
                                        <Gift className="h-6 w-6 text-jade mr-3" />
                                        {t("form.services.title")}
                                    </h3>
                                    <div className="space-y-4">
                                        {services.map((service) => (
                                            <div
                                                key={service.id}
                                                className="flex items-center space-x-3"
                                            >
                                                <input
                                                    id={`service-${service.id}`}
                                                    type="checkbox"
                                                    checked={selectedServices.some((s) => s.id === service.id)}
                                                    onChange={() => toggleService(service)}
                                                    className="h-4 w-4 text-jade border-gray-300 rounded"
                                                />
                                                <Label
                                                    htmlFor={`service-${service.id}`}
                                                    className="font-dm-sans text-gray-700 font-normal"
                                                >
                                                    {service.name} - {formatCurrency(service.price)}€
                                                </Label>
                                            </div>
                                        ))}
                                        {services.length === 0 && (
                                            <p className="font-dm-sans text-gray-600">
                                                {t("form.services.empty")}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Reservation Details */}
                                <div>
                                    <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6 flex items-center">
                                        <Calendar className="h-6 w-6 text-jade mr-3" />
                                        {t("form.reservationDetails.title")}
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label
                                                htmlFor="reservation-pickup-date"
                                                className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                            >
                                                {t("form.reservationDetails.labels.pickupDate")}
                                            </Label>
                                              <input
                                                  id="reservation-pickup-date"
                                                  type="date"
                                                  name="rental_start_date"
                                                  value={formData.rental_start_date}
                                                  onChange={handleInputChange}
                                                  required
                                                  min={new Date().toISOString().split("T")[0]}
                                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300 ${availabilityErrorKey ? "border-red-500" : "border-gray-300"}`}
                                              />
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="reservation-pickup-time"
                                                className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                            >
                                                {t("form.reservationDetails.labels.pickupTime")}
                                            </Label>
                                              <input
                                                  id="reservation-pickup-time"
                                                  type="time"
                                                  name="rental_start_time"
                                                  value={formData.rental_start_time}
                                                  onChange={handleInputChange}
                                                  required
                                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300 ${availabilityErrorKey ? "border-red-500" : "border-gray-300"}`}
                                                  />
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="reservation-dropoff-date"
                                                className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                            >
                                                {t("form.reservationDetails.labels.dropoffDate")}
                                            </Label>
                                              <input
                                                  id="reservation-dropoff-date"
                                                  type="date"
                                                  name="rental_end_date"
                                                  value={formData.rental_end_date}
                                                  onChange={handleInputChange}
                                                  required
                                                  min={
                                                      formData.rental_start_date ||
                                                      new Date().toISOString().split("T")[0]
                                                  }
                                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300 ${availabilityErrorKey ? "border-red-500" : "border-gray-300"}`}
                                              />
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="reservation-dropoff-time"
                                                className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                            >
                                                {t("form.reservationDetails.labels.dropoffTime")}
                                            </Label>
                                              <input
                                                  id="reservation-dropoff-time"
                                                  type="time"
                                                  name="rental_end_time"
                                                  value={formData.rental_end_time}
                                                  onChange={handleInputChange}
                                                  required
                                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300 ${availabilityErrorKey ? "border-red-500" : "border-gray-300"}`}
                                              />
                                        </div>
                                      </div>
                                      {availabilityErrorKey && (
                                          <p className="text-red-500 text-sm mt-2">{t(`form.reservationDetails.errors.${availabilityErrorKey}`)}</p>
                                      )}

                                      <div className="mt-6">
                                        <Label
                                          htmlFor="deposit-none"
                                          className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                        >
                                          {t("form.deposit.title")}
                                        </Label>
                                        <div className="flex items-center space-x-6">
                                          <div className="flex items-center space-x-2">
                                            <input
                                              id="deposit-none"
                                              type="radio"
                                              name="depositOption"
                                              checked={!booking.withDeposit}
                                              onChange={() => handleDepositChange(false)}
                                              className="h-4 w-4 text-jade focus:ring-jade border-gray-300"
                                            />
                                            <Label
                                              htmlFor="deposit-none"
                                              className="font-dm-sans text-gray-700 font-normal"
                                            >
                                              {t("form.deposit.without")}
                                            </Label>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <input
                                              id="deposit-yes"
                                              type="radio"
                                              name="depositOption"
                                              checked={!!booking.withDeposit}
                                              onChange={() => handleDepositChange(true)}
                                              className="h-4 w-4 text-jade focus:ring-jade border-gray-300"
                                            />
                                            <Label
                                              htmlFor="deposit-yes"
                                              className="font-dm-sans text-gray-700 font-normal"
                                            >
                                              {t("form.deposit.with")}
                                            </Label>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || isQuoteLoading || !!availabilityErrorKey}
                                    className="w-full py-4 bg-jade text-white font-dm-sans font-semibold text-lg rounded-lg hover:bg-jade/90 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg flex items-center justify-center space-x-2"
                                    aria-label={t("form.submit.ariaLabel")}
                                >
                                    {isSubmitting || isQuoteLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            <span>{t("form.submit.processing")}</span>
                                        </>
                                    ) : (
                                        <span>{t("form.submit.label")}</span>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Reservation Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-24">
                            <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6">
                                {t("summary.title")}
                            </h3>

                            {quoteErrorKey === "quoteFailed" && (
                                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {t("summary.quoteError", {
                                        fallback: "Nu am putut actualiza estimarea. Verifică datele și reîncearcă.",
                                    })}
                                </p>
                            )}

                            {hasWheelPrize && wheelPrizeRecord && (
                                <div className="mb-6 rounded-xl border border-jade/30 bg-jade/10 p-4">
                                    <div className="flex items-start gap-3">
                                        <Gift className="mt-1 h-5 w-5 text-jade" />
                                        <div className="space-y-1">
                                            <p className="font-poppins text-sm font-semibold text-berkeley">
                                                {t("wheelPrize.title")}
                                            </p>
                                            <p className="font-dm-sans text-sm text-gray-700">
                                                {wheelPrizeRecord.prize.title}
                                                {wheelPrizeAmountLabel ? ` — ${wheelPrizeAmountLabel}` : ""}
                                            </p>
                                            <p className="font-dm-sans text-xs text-gray-600">
                                                {wheelPrizeValidityMessage} {t("wheelPrize.note")}
                                            </p>
                                            {wheelPrizeSavingsMessage && (
                                                <p className="font-dm-sans text-xs font-semibold text-jade">
                                                    {wheelPrizeSavingsMessage}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 mb-6">
                                {selectedCar && (
                                    <div className="flex justify-between items-center">
                                        <span className="font-dm-sans text-gray-600">{t("summary.car")}</span>
                                        <span className="font-dm-sans font-semibold text-berkeley">
                      {selectedCar.name.split(" - ")[0]}
                    </span>
                                    </div>
                                )}

                                {formData.rental_start_date && (
                                    <div className="flex justify-between items-center">
                                        <span className="font-dm-sans text-gray-600">{t("summary.from")}</span>
                                        <span className="font-dm-sans font-semibold text-berkeley">
                      {formatSummaryDate(formData.rental_start_date)} {formData.rental_start_time}
                    </span>
                                    </div>
                                )}

                                {formData.rental_end_date && (
                                    <div className="flex justify-between items-center">
                                        <span className="font-dm-sans text-gray-600">{t("summary.to")}</span>
                                        <span className="font-dm-sans font-semibold text-berkeley">
                      {formatSummaryDate(formData.rental_end_date)} {formData.rental_end_time}
                    </span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    <span className="font-dm-sans text-gray-600">{t("summary.location")}</span>
                                    <span className="font-dm-sans font-semibold text-berkeley text-end">
                    {t("summary.locationName")}
                  </span>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <div className="flex justify-between items-center text-xl">
                                    <span className="font-poppins font-semibold text-berkeley">
                                        {t("summary.overviewLabel")}
                                    </span>
                                    <span className="font-poppins font-bold text-jade">
                                        {`${formatCurrency(displayPerDayPrice)}€ x ${getDayLabel(selectedCar?.days ?? rentalDays)}`}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-dm-sans text-gray-600">{t("summary.subtotal")}</span>
                                    <span className="font-dm-sans font-semibold text-berkeley">
                                        {formatCurrency(rentalSubtotal)}€
                                    </span>
                                </div>
                                {selectedServices.length > 0 && (
                                    <div className="mt-2">
                    <span className="font-poppins font-semibold text-berkeley">
                      {t("summary.servicesLabel")}
                    </span>
                                        <div className="mt-2 space-y-1">
                                            {selectedServices.map((service) => (
                                                <div
                                                    key={service.id}
                                                    className="flex justify-between items-center"
                                                >
                          <span className="font-dm-sans text-gray-600">
                            {service.name}
                          </span>
                                                    <span className="font-dm-sans font-semibold text-berkeley">
                            {formatCurrency(service.price)}€
                          </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <hr className="my-2" />
                                {offersDiscountDisplay > 0 && (
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-dm-sans text-jade">
                                            {t("summary.offersDiscount", { fallback: "Reducere oferte" })}
                                        </span>
                                        <span className="font-dm-sans text-jade">
                                            -{formatCurrency(offersDiscountDisplay)}€
                                        </span>
                                    </div>
                                )}
                                {couponAmountDisplay > 0 && (
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-dm-sans text-jade">
                                            {t("summary.couponDiscount", { fallback: "Reducere cupon" })}
                                        </span>
                                        <span className="font-dm-sans text-jade">
                                            -{formatCurrency(couponAmountDisplay)}€
                                        </span>
                                    </div>
                                )}
                                {appliedOffersSummary.length > 0 && (
                                    <div className="mt-4 rounded-lg border border-jade/30 bg-jade/5 p-4">
                                        <span className="font-poppins font-semibold text-berkeley">
                                            {t("summary.offersApplied.title", {
                                                fallback: "Oferte aplicate",
                                            })}
                                        </span>
                                        <ul className="mt-3 space-y-2">
                                            {appliedOffersSummary.map((offer) => {
                                                const badge = offer.badge?.trim() ?? "";
                                                const title = offer.title.trim();
                                                const showBadge =
                                                    badge.length > 0 && badge.toLowerCase() !== title.toLowerCase();
                                                return (
                                                    <li
                                                        key={`applied-offer-${offer.id}`}
                                                        className="rounded-md bg-white/80 px-3 py-2 text-sm shadow-sm"
                                                    >
                                                        <span className="font-dm-sans font-semibold text-berkeley">
                                                            {title}
                                                        </span>
                                                        {showBadge && (
                                                            <span className="block text-xs text-gray-600">{badge}</span>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                        <p className="mt-3 text-xs text-gray-600">
                                            {t("summary.offersApplied.note", {
                                                fallback:
                                                    "Beneficiile selectate se confirmă de consultant înainte de emiterea contractului.",
                                            })}
                                        </p>
                                    </div>
                                )}
                                {wheelPrizeApplied && wheelPrizeDiscount > 0 && (
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-dm-sans text-jade">
                                            {t("summary.wheelPrizeLabel")}
                                        </span>
                                        <span className="font-dm-sans text-jade">
                                            -{formatCurrency(wheelPrizeDiscount)}€
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xl">
                                    <span className="font-poppins font-semibold text-berkeley">
                                        {t("summary.total")}
                                    </span>
                                    <span className="font-poppins font-bold text-jade">
                                        {formatCurrency(total)}€
                                    </span>
                                </div>
                                {booking.withDeposit && !depositWaived && Number.isFinite(depositAmount) && depositAmount > 0 && (
                                    <p className="mt-1 text-xs font-dm-sans text-gray-600">
                                        {t("summary.depositNote", {
                                            values: { amount: formatCurrency(depositAmount) },
                                        })}
                                    </p>
                                )}
                                {depositWaived && (
                                    <p className="mt-1 text-xs font-dm-sans text-jade">
                                        {t("summary.depositWaived", {
                                            fallback: "Depozitul a fost eliminat datorită ofertei validate.",
                                        })}
                                    </p>
                                )}
                                <p className="text-sm text-gray-600 font-dm-sans mt-2">
                                    {t("footer.disclaimer")}
                                </p>
                            </div>

                            {/* Benefits reminder */}
                            <div className="mt-8 p-4 bg-jade/5 rounded-lg">
                                <h4 className="font-poppins font-semibold text-berkeley mb-2">
                                    {t("footer.includesTitle")}
                                </h4>
                                <ul className="text-sm font-dm-sans text-gray-600 space-y-1">
                                    {includesList.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReservationPage;
