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
import {
    extractFirstCar,
    mapCustomerSearchResults,
    normalizeAdminCarOption,
} from "@/lib/adminBookingHelpers";
import {
    describeWheelPrizeSummaryAmount,
    formatWheelPrizeExpiry,
} from "@/lib/wheelFormatting";
import type {
    AdminBookingCarOption,
    AdminBookingCustomerSummary,
    AdminBookingFormValues,
    AdminBookingLinkedService,
} from "@/types/admin";
import type { ApiCar } from "@/types/car";
import type { QuotePriceResponse, Service } from "@/types/reservation";

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

const convertEuroLabelToLei = (label: string | null | undefined): string | null => {
    if (typeof label !== "string") {
        return label ?? null;
    }
    if (!label.includes("€")) {
        return label;
    }
    return label.replace(/(-?\d+(?:[.,]\d+)?)\s?€/g, (_, value: string) => {
        const parsed = Number(value.replace(",", "."));
        if (!Number.isFinite(parsed)) {
            return `${value}€`;
        }
        const converted = convertEuroToLei(parsed);
        if (converted == null) {
            return `${value}€`;
        }
        return `${leiFormatter.format(converted)} lei`;
    });
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

    useEffect(() => {
        setQuote(null);
        lastQuoteKeyRef.current = null;
    }, [bookingInfo?.id]);

    useEffect(() => {
        if (!bookingInfo) {
            return;
        }

        const normalizedServiceIds = Array.isArray(bookingInfo.service_ids)
            ? bookingInfo.service_ids
                  .map((id) => (typeof id === "number" ? id : Number(id)))
                  .filter((id) => Number.isFinite(id))
                  .sort((a, b) => a - b)
            : [];

        if (
            !bookingInfo.car_id ||
            !bookingInfo.rental_start_date ||
            !bookingInfo.rental_end_date
        ) {
            return;
        }

        const quoteKey = JSON.stringify({
            car: bookingInfo.car_id,
            start: bookingInfo.rental_start_date,
            end: bookingInfo.rental_end_date,
            base: bookingInfo.base_price ?? null,
            casco: bookingInfo.base_price_casco ?? null,
            original: bookingInfo.original_price_per_day ?? null,
            couponType: bookingInfo.coupon_type ?? null,
            couponAmount: bookingInfo.coupon_amount ?? null,
            couponCode: bookingInfo.coupon_code ?? null,
            services: normalizedServiceIds,
            deposit: bookingInfo.with_deposit ? 1 : 0,
        });

        if (lastQuoteKeyRef.current === quoteKey) {
            return;
        }

        let cancelled = false;

        const quotePrice = async () => {
            try {
                lastQuoteKeyRef.current = quoteKey;
                const data = await apiClient.quotePrice({
                    car_id: bookingInfo.car_id ?? 0,
                    rental_start_date: bookingInfo.rental_start_date,
                    rental_end_date: bookingInfo.rental_end_date,
                    base_price: bookingInfo.base_price ?? undefined,
                    base_price_casco: bookingInfo.base_price_casco ?? undefined,
                    original_price_per_day: bookingInfo.original_price_per_day ?? undefined,
                    coupon_type: bookingInfo.coupon_type,
                    coupon_amount: bookingInfo.coupon_amount ?? undefined,
                    coupon_code: bookingInfo.coupon_code ?? undefined,
                    service_ids: normalizedServiceIds,
                    with_deposit: bookingInfo.with_deposit,
                });
                if (cancelled) {
                    return;
                }
                setQuote(data);
                updateBookingInfo((prev) => ({
                    ...prev,
                    days: typeof data.days === "number" ? data.days : prev.days ?? 0,
                    price_per_day: data.price_per_day,
                    base_price: typeof data.rental_rate === "number"
                        ? data.rental_rate
                        : prev.base_price ?? data.base_price ?? null,
                    base_price_casco: typeof data.rental_rate_casco === "number"
                        ? data.rental_rate_casco
                        : prev.base_price_casco ?? data.base_price_casco ?? null,
                    sub_total: prev.with_deposit
                        ? data.sub_total
                        : data.sub_total_casco ?? data.sub_total,
                    total: prev.with_deposit
                        ? data.total
                        : data.total_casco ?? data.total,
                    discount_applied: data.discount ?? null,
                    total_services: data.total_services ?? prev.total_services,
                }));
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
        bookingInfo?.service_ids,
        bookingInfo?.with_deposit,
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
        const type =
            info.coupon_type === "per_total"
                ? "from_total"
                : info.coupon_type || "fixed_per_day";

        let basePrice: number | null = info.base_price ?? null;
        let basePriceCasco: number | null = info.base_price_casco ?? null;

        if (type === "fixed_per_day") {
            const amount = parsePrice(info.coupon_amount);
            basePrice = amount;
            basePriceCasco = amount;
        } else if (info.original_price_per_day != null) {
            const original = parsePrice(info.original_price_per_day);
            basePrice = original;
            basePriceCasco = original;
        }

        const nextBasePrice = basePrice ?? 0;
        const nextBasePriceCasco = basePriceCasco ?? 0;

        if (
            info.coupon_type === type &&
            info.base_price === nextBasePrice &&
            info.base_price_casco === nextBasePriceCasco
        ) {
            return info;
        }

        return {
            ...info,
            coupon_type: type,
            base_price: nextBasePrice,
            base_price_casco: nextBasePriceCasco,
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

    const days = quote?.days ?? bookingInfo.days ?? 0;
    const baseRate = bookingInfo.with_deposit
        ? quote?.rental_rate ?? bookingInfo.price_per_day ?? 0
        : quote?.rental_rate_casco ?? bookingInfo.price_per_day ?? 0;
    const discountedRate = quote?.price_per_day ?? baseRate;
    const discountedSubtotal = bookingInfo.with_deposit
        ? quote?.sub_total ?? quote?.sub_total_casco ?? null
        : quote?.sub_total_casco ?? quote?.sub_total ?? null;
    const discount = quote?.discount ?? 0;
    const discountedTotalQuote = bookingInfo.with_deposit
        ? quote?.total ?? quote?.total_casco ?? null
        : quote?.total_casco ?? quote?.total ?? null;
    const subtotalDisplay = discountedSubtotal ?? originalTotals.current.subtotal;
    const totalDisplay = discountedTotalQuote ?? originalTotals.current.total;
    const advancePaymentValue = toOptionalNumber(bookingInfo.advance_payment) ?? 0;
    const totalServicesValue =
        typeof quote?.total_services === "number"
            ? quote.total_services
            : toOptionalNumber(bookingInfo.total_services) ?? 0;
    const totalServicesDisplay = Math.round(totalServicesValue * 100) / 100;
    const restToPay = totalDisplay - advancePaymentValue;

    const wheelPrizeSummary = bookingInfo.wheel_prize ?? null;
    const wheelPrizeDiscountRaw =
        bookingInfo.wheel_prize_discount ?? wheelPrizeSummary?.discount_value ?? null;
    const wheelPrizeDiscountValue =
        typeof wheelPrizeDiscountRaw === "number"
            ? wheelPrizeDiscountRaw
            : toOptionalNumber(wheelPrizeDiscountRaw) ?? 0;
    const wheelPrizeAmountLabel = describeWheelPrizeSummaryAmount(wheelPrizeSummary);
    const wheelPrizeExpiryLabel = wheelPrizeSummary?.expires_at
        ? formatWheelPrizeExpiry(wheelPrizeSummary.expires_at)
        : null;
    const totalBeforeWheelPrizeValue =
        typeof bookingInfo.total_before_wheel_prize === "number"
            ? bookingInfo.total_before_wheel_prize
            : toOptionalNumber(bookingInfo.total_before_wheel_prize);
    const wheelPrizeDiscountDisplay = Math.round(wheelPrizeDiscountValue * 100) / 100;
    const totalBeforeWheelPrizeDisplay =
        typeof totalBeforeWheelPrizeValue === "number"
            ? Math.round(totalBeforeWheelPrizeValue * 100) / 100
            : null;
    const hasWheelPrize = Boolean(wheelPrizeSummary);
    const wheelPrizeEligible = wheelPrizeSummary?.eligible !== false;
    const hasWheelPrizeDiscount = wheelPrizeDiscountDisplay > 0 && wheelPrizeEligible;
    const wheelPrizeEligibilityWarning = hasWheelPrize && !wheelPrizeEligible
        ? "Premiul nu este eligibil pentru intervalul curent."
        : null;
    const wheelPrizeTitle = hasWheelPrize
        ? wheelPrizeSummary?.title ?? "Premiu DaCars"
        : "—";
    const offersDiscountValue = toOptionalNumber(bookingInfo.offers_discount) ?? 0;
    const offersDiscountDisplay = Math.round(offersDiscountValue * 100) / 100;
    const depositWaived = bookingInfo.deposit_waived === true;
    const appliedOffersList = Array.isArray(bookingInfo.applied_offers)
        ? bookingInfo.applied_offers
        : [];
    const wheelPrizeAmountLabelLei = convertEuroLabelToLei(wheelPrizeAmountLabel);
    const subtotalLei = formatLeiAmount(subtotalDisplay);
    const totalLei = formatLeiAmount(totalDisplay);
    const totalBeforeWheelPrizeLei = formatLeiAmount(totalBeforeWheelPrizeDisplay ?? null);
    const wheelPrizeDiscountLei = formatLeiAmount(wheelPrizeDiscountDisplay);
    const restToPayLei = formatLeiAmount(restToPay);
    const discountedTotalLei = formatLeiAmount(totalDisplay);
    const discountLei = formatLeiAmount(discount);
    const baseRateLei = formatLeiAmount(baseRate);
    const roundedDiscountedRate = Math.round(discountedRate);
    const roundedDiscountedRateLei = formatLeiAmount(roundedDiscountedRate);
    const advancePaymentLei = formatLeiAmount(advancePaymentValue);
    const hasDiscountDetails = discount !== 0 && (discountedTotalQuote ?? 0) > 0;

    const handleUpdateBooking = async () => {
        if (!bookingInfo || bookingInfo.id == null) {
            console.error("Booking information missing identifier; cannot update reservation.");
            return;
        }
        try {
            const payload = { ...bookingInfo } as Record<string, unknown>;
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
                            value={bookingInfo.coupon_type || ""}
                            onValueChange={(value) =>
                                updateBookingInfo((prev) =>
                                    recalcTotals({
                                        ...prev,
                                        coupon_type: value,
                                        coupon_amount: 0,
                                        coupon_code: "",
                                    }),
                                )
                            }
                            placeholder="Selectează"
                        >
                            <option value="fixed_per_day">Pret fix pe zi</option>
                            <option value="per_day">Reducere pret pe zi</option>
                            <option value="days">Zile</option>
                            <option value="from_total">Din total</option>
                            <option value="code">Cupon</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="coupon-value">
                            {bookingInfo.coupon_type === "code" ? "Cod cupon" : "Valoare"}
                        </Label>
                        <Input
                            id="coupon-value"
                            type={bookingInfo.coupon_type === "code" ? "text" : "number"}
                            value={
                                bookingInfo.coupon_type === "code"
                                    ? bookingInfo.coupon_code ?? ""
                                    : bookingInfo.coupon_amount ?? 0
                            }
                            onChange={(e) => {
                                const rawValue = e.target.value;
                                updateBookingInfo((prev) => {
                                    const nextType = prev.coupon_type || "fixed_per_day";
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
                                                    quote?.rental_rate != null
                                                        ? parsePrice(quote.rental_rate)
                                                        : prev.price_per_day,
                                                original_price_per_day:
                                                    quote?.rental_rate != null
                                                        ? parsePrice(quote.rental_rate)
                                                        : prev.original_price_per_day,
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
                                                    quote?.rental_rate_casco != null
                                                        ? parsePrice(quote.rental_rate_casco)
                                                        : prev.price_per_day,
                                                original_price_per_day:
                                                    quote?.rental_rate_casco != null
                                                        ? parsePrice(quote.rental_rate_casco)
                                                        : prev.original_price_per_day,
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
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Premiu Roata Norocului:</span>
                                    <span>{wheelPrizeTitle}</span>
                                </div>
                                {typeof totalBeforeWheelPrizeDisplay === "number" && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Total înainte de premiu:</span>
                                        <span>{totalBeforeWheelPrizeLei ?? "—"}</span>
                                    </div>
                                )}
                                {hasWheelPrize && (wheelPrizeAmountLabelLei || wheelPrizeAmountLabel) && (
                                    <div className="font-dm-sans text-xs text-gray-600 flex justify-between border-b border-b-1 mb-1">
                                        <span>Detalii premiu:</span>
                                        <span className="text-right ms-2">
                                            {wheelPrizeAmountLabelLei ?? wheelPrizeAmountLabel}
                                        </span>
                                    </div>
                                )}
                                {wheelPrizeEligibilityWarning && (
                                    <div className="font-dm-sans text-xs text-amber-600 border-b border-b-1 mb-1">
                                        {wheelPrizeEligibilityWarning}
                                    </div>
                                )}
                                {hasWheelPrizeDiscount && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Reducere premiu:</span>
                                        <span>-{wheelPrizeDiscountLei ?? "—"}</span>
                                    </div>
                                )}
                                {hasWheelPrize && wheelPrizeExpiryLabel && (
                                    <div className="font-dm-sans text-xs text-gray-600 flex justify-between border-b border-b-1 mb-1">
                                        <span>Valabil până la:</span>
                                        <span>{wheelPrizeExpiryLabel}</span>
                                    </div>
                                )}
                                {offersDiscountValue > 0 && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Reduceri campanii:</span>
                                        <span>-{formatLeiAmount(offersDiscountDisplay) ?? "—"}</span>
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
                                        <span>Avans:</span>
                                        <span>{advancePaymentLei ?? "—"}</span>
                                    </div>
                                )}
                                <div className="font-dm-sans text-sm font-semibold flex justify-between">
                                    <span>Total:</span>
                                    <span>{totalLei ?? "—"}</span>
                                </div>
                                {appliedOffersList.length > 0 && (
                                    <div className="mt-3">
                                        <span className="font-dm-sans text-xs font-semibold text-gray-600 uppercase">
                                            Oferte aplicate
                                        </span>
                                        <ul className="mt-1 list-disc space-y-1 ps-5 text-xs text-gray-600">
                                            {appliedOffersList.map((offer) => (
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
                                {hasDiscountDetails && (
                                    <div className="font-dm-sans text-sm">
                                        Detalii discount:
                                        <ul className="list-disc">
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Preț nou pe zi:</span>
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
                                                <span>Total:</span>
                                                <span>{discountedTotalLei ?? "—"}</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                                {advancePaymentValue !== 0 && (
                                    <div className="font-dm-sans text-sm font-semibold flex justify-between border-b border-b-1 mb-1">
                                        <span>Rest de plată:</span>
                                        <span>{restToPayLei ?? "—"}</span>
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
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Premiu Roata Norocului:</span>
                                    <span>{wheelPrizeTitle}</span>
                                </div>
                                {typeof totalBeforeWheelPrizeDisplay === "number" && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Total înainte de premiu:</span>
                                        <span>{totalBeforeWheelPrizeDisplay}€</span>
                                    </div>
                                )}
                                {hasWheelPrize && wheelPrizeAmountLabel && (
                                    <div className="font-dm-sans text-xs text-gray-600 flex justify-between border-b border-b-1 mb-1">
                                        <span>Detalii premiu:</span>
                                        <span className="text-right ms-2">{wheelPrizeAmountLabel}</span>
                                    </div>
                                )}
                                {wheelPrizeEligibilityWarning && (
                                    <div className="font-dm-sans text-xs text-amber-600 border-b border-b-1 mb-1">
                                        {wheelPrizeEligibilityWarning}
                                    </div>
                                )}
                                {hasWheelPrizeDiscount && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Reducere premiu:</span>
                                        <span>-{wheelPrizeDiscountDisplay}€</span>
                                    </div>
                                )}
                                {hasWheelPrize && wheelPrizeExpiryLabel && (
                                    <div className="font-dm-sans text-xs text-gray-600 flex justify-between border-b border-b-1 mb-1">
                                        <span>Valabil până la:</span>
                                        <span>{wheelPrizeExpiryLabel}</span>
                                    </div>
                                )}
                                {offersDiscountValue > 0 && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Reduceri campanii:</span>
                                        <span>-{offersDiscountDisplay}€</span>
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
                                <div className="font-dm-sans text-sm font-semibold flex justify-between">
                                    <span>Total:</span>
                                    <span>{totalDisplay}€</span>
                                </div>
                                {appliedOffersList.length > 0 && (
                                    <div className="mt-3">
                                        <span className="font-dm-sans text-xs font-semibold text-gray-600 uppercase">
                                            Oferte aplicate
                                        </span>
                                        <ul className="mt-1 list-disc space-y-1 ps-5 text-xs text-gray-600">
                                            {appliedOffersList.map((offer) => (
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
                                {hasDiscountDetails && (
                                    <div className="font-dm-sans text-sm">
                                        Detalii discount:
                                        <ul className="list-disc">
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Preț nou pe zi:</span>
                                                <span>{Math.round(discountedRate)}€ x {days} zile</span>
                                            </li>
                                            {discount > 0 && (
                                                <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                    <span>Discount aplicat:</span>
                                                    <span>{discount}€</span>
                                                </li>
                                            )}
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Total:</span>
                                                <span>{totalDisplay}€</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                                {advancePaymentValue !== 0 && (
                                    <div className="font-dm-sans text-sm font-semibold flex justify-between border-b border-b-1 mb-1">
                                        <span>Rest de plată:</span>
                                        <span>{restToPay}€</span>
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

