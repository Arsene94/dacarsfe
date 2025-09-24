"use client";

import React, {useEffect, useState, useRef, useMemo} from "react";
import {useRouter} from "next/navigation";
import {Calendar, Gift, Plane, User,} from "lucide-react";
import {Label} from "@/components/ui/label";
import PhoneInput from "@/components/PhoneInput";
import {useBooking} from "@/context/BookingContext";
import { usePublicContentSection } from "@/context/PublicContentContext";
import { apiClient } from "@/lib/api";
import { extractItem, extractList } from "@/lib/apiResponse";
import { extractFirstCar } from "@/lib/adminBookingHelpers";
import { describeWheelPrizeAmount, formatWheelPrizeExpiry } from "@/lib/wheelFormatting";
import {
    getStoredWheelPrize,
    isStoredWheelPrizeActive,
    clearStoredWheelPrize,
    type StoredWheelPrizeEntry,
} from "@/lib/wheelStorage";
import {ApiCar, Car} from "@/types/car";
import {ReservationFormData, Service, type DiscountValidationPayload} from "@/types/reservation";
import {Button} from "@/components/ui/button";
import { CHECKOUT_PAGE_COPY_FALLBACK } from "@/lib/publicContent/defaults";
import { formatTemplate } from "@/lib/publicContent/utils";

const STORAGE_BASE = "https://backend.dacars.ro/storage";

const toImageUrl = (p?: string | null): string => {
    if (!p) return "/images/placeholder-car.svg";
    if (/^https?:\/\//i.test(p)) return p;
    const base = STORAGE_BASE.replace(/\/$/, "");
    const path = p.replace(/^\//, "");
    return `${base}/${path}`;
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

const priceFormatter = new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

const formatPrice = (value: number): string => {
    if (!Number.isFinite(value)) return "0";
    const normalized = Math.round(value * 100) / 100;
    return priceFormatter.format(normalized);
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

const mapApiCarToCar = (apiCar: ApiCar): Car => {
    const extras = apiCar as Record<string, unknown>;
    const imageCandidates: Array<unknown> = [
        apiCar.image_preview,
        apiCar.image,
        apiCar.thumbnail,
        apiCar.cover_image,
    ];
    if (Array.isArray(apiCar.images)) {
        imageCandidates.push(
            apiCar.images.find((value) => typeof value === "string" && value.trim().length > 0) ?? null,
        );
    } else if (apiCar.images && typeof apiCar.images === "object") {
        imageCandidates.push(
            Object.values(apiCar.images).find(
                (value) => typeof value === "string" && value.trim().length > 0,
            ) ?? null,
        );
    }
    if (typeof apiCar.type?.image === "string") {
        imageCandidates.push(apiCar.type.image);
    }
    const imageCandidate = imageCandidates.find(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
    );

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
                : "Autovehicul",
        type: typeName,
        typeId,
        image: toImageUrl((imageCandidate as string | null | undefined) ?? null),
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
    const copy = usePublicContentSection("checkout", CHECKOUT_PAGE_COPY_FALLBACK);
    const formCopy = copy.form;
    const summaryCopy = copy.summary;
    const wheelPrizeCopy = copy.wheelPrize;
    const heroCopy = copy.hero;
    const validationCopy = copy.validation;
    const guardCopy = copy.guard;

    const storedDiscount =
        typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("discount") || "null")
            : null;
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

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await apiClient.getServices();
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
                setServices(mapped);
            } catch (error) {
                console.error(error);
            }
        };
        fetchServices();
    }, []);

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
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);
    const [discountStatus, setDiscountStatus] = useState<{
        isValid: boolean;
        message: string;
        discount: string;
        discountCasco: string;
    } | null>(
        storedDiscount
            ? {
                isValid: true,
                message: formCopy.discount.successMessage,
                discount: String(storedDiscount.discount ?? "0"),
                discountCasco: String(storedDiscount.discountCasco ?? "0"),
            }
            : null,
    );
    const [isValidatingCode, setIsValidatingCode] = useState(false);
    const [originalCar, setOriginalCar] = useState<Car | null>(storedOriginalCar);
    const lastValidatedRef = useRef<{ carId: number | null; withDeposit: boolean | null }>({
        carId: null,
        withDeposit: null,
    });
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
                    setAvailabilityError(validationCopy.endBeforeStart);
                    return;
                }
            }
            setAvailabilityError(null);
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
                setAvailabilityError(validationCopy.endBeforeStart);
                return;
            }

            const payload = {
                car_id: booking.selectedCar.id,
                start_date: start,
                end_date: end,
            };
            const checkAvailability = await apiClient.checkCarAvailability(payload);

            if (checkAvailability.available === false) {
                setAvailabilityError(validationCopy.carUnavailable);
                return;
            }
            setAvailabilityError(null);
            setBooking({
                startDate: start,
                endDate: end,
                withDeposit: booking.withDeposit,
                selectedCar: booking.selectedCar,
            });
            try {
                const info = await apiClient.getCarForBooking({
                    car_id: booking.selectedCar.id,
                    start_date: start,
                    end_date: end,
                });
                if (ignore) return;
                const apiCar = extractFirstCar(info);
                if (!apiCar) return;
                const mapped = mapApiCarToCar(apiCar);
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

    const servicesTotal = selectedServices.reduce(
        (sum, service) => sum + service.price,
        0,
    );

    const selectedCar = booking.selectedCar;

    const hasWheelPrize = wheelPrizeRecord ? isStoredWheelPrizeActive(wheelPrizeRecord) : false;
    const wheelPrizeAmountLabel = hasWheelPrize ? describeWheelPrizeAmount(wheelPrizeRecord?.prize) : null;
    const wheelPrizeExpiryLabel = hasWheelPrize
        ? formatWheelPrizeExpiry(wheelPrizeRecord?.expires_at)
        : null;

    const baseTotal = useMemo(() => {
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

    const perDayPrice = useMemo(() => {
        if (!selectedCar) return 0;
        const rawPerDay = booking.withDeposit
            ? selectedCar.rental_rate
            : selectedCar.rental_rate_casco;
        const parsedPerDay = parsePrice(rawPerDay);
        if (parsedPerDay > 0) {
            return parsedPerDay;
        }
        if (rentalDays > 0) {
            return baseTotal / rentalDays;
        }
        return 0;
    }, [selectedCar, booking.withDeposit, rentalDays, baseTotal]);

    const totalBeforeWheel = baseTotal + servicesTotal;

    const wheelPrizeDiscount = useMemo(() => {
        if (!hasWheelPrize || !wheelPrizeRecord) return 0;
        if (totalBeforeWheel <= 0) return 0;

        const prize = wheelPrizeRecord.prize;
        const type = typeof prize.type === "string" ? prize.type : "other";
        const amount = typeof prize.amount === "number" && Number.isFinite(prize.amount)
            ? Math.round(prize.amount)
            : null;

        let discountValue = 0;

        if (type === "percentage_discount" && typeof amount === "number" && amount > 0) {
            discountValue = (totalBeforeWheel * amount) / 100;
        } else if (
            (type === "fixed_discount" || type === "voucher")
            && typeof amount === "number"
            && amount > 0
        ) {
            discountValue = amount;
        } else if (type === "extra_rental_day" && typeof amount === "number" && amount > 0) {
            const bonusDays = Math.max(0, amount);
            const applicableDays = rentalDays > 0 ? Math.min(bonusDays, rentalDays) : bonusDays;
            const effectivePerDay = perDayPrice > 0
                ? perDayPrice
                : rentalDays > 0
                    ? baseTotal / rentalDays
                    : 0;
            discountValue = effectivePerDay * applicableDays;
        }

        if (!Number.isFinite(discountValue) || discountValue <= 0) {
            return 0;
        }

        const capped = Math.min(totalBeforeWheel, discountValue);
        return Math.round(Math.round(capped * 100) / 100);
    }, [
        hasWheelPrize,
        wheelPrizeRecord,
        totalBeforeWheel,
        rentalDays,
        perDayPrice,
        baseTotal,
    ]);

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
            const data = await apiClient.validateDiscountCode(payload);
            setOriginalCar(carForValidation);
            if (data.valid === false) {
                setDiscountStatus({
                    isValid: false,
                    message: formCopy.discount.errorMessage,
                    discount: "0",
                    discountCasco: "0",
                });
            } else {
                const discountCar = data.data
                    ? mapApiCarToCar(data.data)
                    : carForValidation;
                setBooking({
                    startDate: booking?.startDate,
                    endDate: booking?.endDate,
                    withDeposit: booking?.withDeposit,
                    selectedCar: discountCar,
                });
                lastValidatedRef.current = {
                    carId: discountCar.id,
                    withDeposit: booking?.withDeposit ?? null,
                };
                const coupon = data.data?.coupon;
                const discountData = {
                    code: formData.coupon_code,
                    discount: coupon?.discount_deposit ?? "0",
                    discountCasco: coupon?.discount_casco ?? "0",
                };
                localStorage.setItem("discount", JSON.stringify(discountData));
                localStorage.setItem("originalCar", JSON.stringify(carForValidation));
                setDiscountStatus({
                    isValid: true,
                    message: formCopy.discount.successMessage,
                    discount: String(discountData.discount),
                    discountCasco: String(discountData.discountCasco),
                });
            }
        } catch (error) {
            setDiscountStatus({
                isValid: false,
                message: formCopy.discount.errorMessage,
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
                startDate: booking.startDate,
                endDate: booking.endDate,
                withDeposit: booking.withDeposit,
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
                    {guardCopy.missingSelection}
                </p>
            </div>
        );
    }
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (availabilityError || !booking.startDate || !booking.endDate) return;
        setIsSubmitting(true);

        const subTotal = baseTotal;
        const totalServices = servicesTotal;
        const totalBeforeWheelPrize = totalBeforeWheel;
        const totalAfterAdjustments = Math.max(0, totalBeforeWheelPrize - wheelPrizeDiscount);
        const start = new Date(booking.startDate);
        const end = new Date(booking.endDate);
        const daysDiff = Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 3600 * 24),
        );
        const pricePerDay = daysDiff > 0 ? subTotal / daysDiff : 0;
        const couponAmount = discountAmount;
        const wheelPrizeDiscountValue = wheelPrizeDiscount;
        const wheelPrizeDetails = hasWheelPrize && wheelPrizeRecord
            ? {
                wheel_of_fortune_id: wheelPrizeRecord.wheel_of_fortune_id,
                prize_id: wheelPrizeRecord.prize_id ?? wheelPrizeRecord.prize.id,
                title: wheelPrizeRecord.prize.title,
                type: wheelPrizeRecord.prize.type,
                amount:
                    typeof wheelPrizeRecord.prize.amount === "number"
                    && Number.isFinite(wheelPrizeRecord.prize.amount)
                        ? Math.round(wheelPrizeRecord.prize.amount * 100) / 100
                        : null,
                description: wheelPrizeRecord.prize.description ?? null,
                amount_label: wheelPrizeAmountLabel,
                expires_at: wheelPrizeRecord.expires_at,
                discount_value: wheelPrizeDiscountValue,
            }
            : null;
        const payload = {
            ...formData,
            service_ids: selectedServices.map((s) => s.id),
            price_per_day: pricePerDay,
            total_services: totalServices,
            coupon_amount: couponAmount,
            total: totalAfterAdjustments,
            sub_total: subTotal,
            total_before_wheel_prize: totalBeforeWheelPrize,
            wheel_prize_discount: wheelPrizeDiscountValue,
            wheel_prize: wheelPrizeDetails,
            with_deposit: booking.withDeposit,
        };

        try {
            const res = await apiClient.createBooking(payload);
            const bookingRecord = extractItem(res);
            const reservationId =
                resolveReservationIdentifier(bookingRecord) ??
                resolveReservationIdentifier(res) ??
                `#${Math.floor(1000000 + Math.random() * 9000000)}`;
            localStorage.setItem(
                "reservationData",
                JSON.stringify({
                    ...formData,
                    services: selectedServices,
                    price_per_day: pricePerDay,
                    total_services: totalServices,
                    coupon_amount: couponAmount,
                    selectedCar: selectedCar,
                    total: totalAfterAdjustments,
                    sub_total: subTotal,
                    total_before_wheel_prize: totalBeforeWheelPrize,
                    wheel_prize_discount: wheelPrizeDiscountValue,
                    wheel_prize: wheelPrizeDetails,
                    reservationId,
                }),
            );
            clearStoredWheelPrize();
            setWheelPrizeRecord(null);
            router.push("/success");
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const rentalSubtotal = baseTotal;
    const discountAmountRaw = discountStatus?.isValid
        ? booking.withDeposit
            ? parseFloat(discountStatus.discount)
            : parseFloat(discountStatus.discountCasco)
        : 0;
    const discountAmount = Number.isFinite(discountAmountRaw) ? discountAmountRaw : 0;
    const total = Math.max(0, totalBeforeWheel - wheelPrizeDiscount);
    const originalTotal = discountStatus?.isValid
        ? totalBeforeWheel + discountAmount
        : totalBeforeWheel;
    const wheelPrizeApplied = wheelPrizeDiscount > 0;

    const locationValues = summaryCopy.locationValues as Record<string, string>;
    const selectedLocationLabel =
        (formData.location && locationValues[formData.location]) ??
        locationValues.aeroport;
    const summaryPriceLabel = formatTemplate(summaryCopy.price.priceTemplate, {
        rate:
            booking.withDeposit
                ? booking.selectedCar?.rental_rate ?? booking.selectedCar?.price ?? 0
                : booking.selectedCar?.rental_rate_casco ?? booking.selectedCar?.price ?? 0,
        days: booking.selectedCar?.days ?? 0,
    });
    const wheelPrizeExpiryText = wheelPrizeExpiryLabel
        ? formatTemplate(wheelPrizeCopy.expiryWithDateTemplate, {
              date: wheelPrizeExpiryLabel,
          })
        : wheelPrizeCopy.expiryFallback;
    const wheelPrizeTitle = wheelPrizeRecord?.prize.title ?? wheelPrizeCopy.title;
    const wheelPrizeSavingsText =
        wheelPrizeApplied && wheelPrizeDiscount > 0
            ? formatTemplate(wheelPrizeCopy.savingsTemplate, {
                  amount: formatPrice(wheelPrizeDiscount),
              })
            : null;
    const depositSuffixLabel =
        booking.withDeposit && selectedCar
            ? formatTemplate(summaryCopy.price.depositSuffixTemplate, {
                  deposit: selectedCar.deposit ?? 0,
              })
            : null;

    return (
        <div className="pt-16 lg:pt-20 min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
                        {heroCopy.title.lead} <span className="text-jade">{heroCopy.title.highlight}</span>
                    </h1>
                    <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto">
                        {heroCopy.subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Reservation Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-lg p-8">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Personal Information */}
                                <div>
                                    <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6 flex items-center">
                                        <User className="h-6 w-6 text-jade mr-3" />
                                        {formCopy.personal.title}
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label
                                                htmlFor="reservation-name"
                                                className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                            >
                                                {formCopy.personal.name.label}
                                            </Label>
                                            <input
                                                id="reservation-name"
                                                type="text"
                                                name="customer_name"
                                                value={formData.customer_name}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                                                placeholder={formCopy.personal.name.placeholder}
                                            />
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="reservation-email"
                                                className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                            >
                                                {formCopy.personal.email.label}
                                            </Label>
                                            <input
                                                id="reservation-email"
                                                type="email"
                                                name="customer_email"
                                                value={formData.customer_email}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                                                placeholder={formCopy.personal.email.placeholder}
                                            />
                                        </div>

                                        <PhoneInput
                                            value={formData.customer_phone}
                                            onChange={(val) =>
                                                setFormData((prev) => ({ ...prev, customer_phone: val }))
                                            }
                                            required
                                            label={formCopy.personal.phone.label}
                                            placeholder={formCopy.personal.phone.placeholder}
                                        />
                                      </div>
                                        <div className="mt-6">
                                        <Label
                                            htmlFor="reservation-flight"
                                            className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                        >
                                            <Plane className="h-4 w-4 inline text-jade mr-1" />
                                            {formCopy.flight.label}
                                        </Label>
                                        <input
                                            id="reservation-flight"
                                            type="text"
                                            name="flight_number"
                                            value={formData.flight_number}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                                            placeholder={formCopy.flight.placeholder}
                                        />
                                    </div>

                                    {/* Discount Code */}
                                    <div className="mt-6">
                                        <Label
                                            htmlFor="reservation-discount"
                                            className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                        >
                                            <Gift className="h-4 w-4 inline text-jade mr-1" />
                                            {formCopy.discount.title}
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
                                                    placeholder={formCopy.discount.placeholder}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveDiscountCode}
                                                    className="w-full px-4 py-3 bg-red-500 text-white font-dm-sans font-semibold rounded-lg hover:bg-red-600 transition-all duration-300 md:w-auto"
                                                >
                                                    {formCopy.discount.removeLabel}
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
                                                    placeholder={formCopy.discount.placeholder}
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={() => handleDiscountCodeValidation()}
                                                    disabled={
                                                        isValidatingCode || !formData.coupon_code.trim()
                                                    }
                                                    className="w-full px-4 py-3 bg-berkeley text-white font-dm-sans font-semibold rounded-lg hover:bg-berkeley/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 md:w-auto"
                                                    aria-label={formCopy.discount.validateAriaLabel}
                                                >
                                                    {isValidatingCode ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    ) : (
                                                        formCopy.discount.validateLabel
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
                                                    {discountStatus.message}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Extra Services */}
                                <div>
                                    <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6 flex items-center">
                                        <Gift className="h-6 w-6 text-jade mr-3" />
                                        {formCopy.services.title}
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
                                                    {service.name} - {service.price}€
                                                </Label>
                                            </div>
                                        ))}
                                        {services.length === 0 && (
                                            <p className="font-dm-sans text-gray-600">
                                                {formCopy.services.emptyState}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Reservation Details */}
                                <div>
                                    <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6 flex items-center">
                                        <Calendar className="h-6 w-6 text-jade mr-3" />
                                        {formCopy.reservation.title}
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label
                                                htmlFor="reservation-pickup-date"
                                                className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                            >
                                                {formCopy.reservation.startDateLabel}
                                            </Label>
                                              <input
                                                  id="reservation-pickup-date"
                                                  type="date"
                                                  name="rental_start_date"
                                                  value={formData.rental_start_date}
                                                  onChange={handleInputChange}
                                                  required
                                                  min={new Date().toISOString().split("T")[0]}
                                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300 ${availabilityError ? "border-red-500" : "border-gray-300"}`}
                                              />
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="reservation-pickup-time"
                                                className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                            >
                                                {formCopy.reservation.startTimeLabel}
                                            </Label>
                                              <input
                                                  id="reservation-pickup-time"
                                                  type="time"
                                                  name="rental_start_time"
                                                  value={formData.rental_start_time}
                                                  onChange={handleInputChange}
                                                  required
                                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300 ${availabilityError ? "border-red-500" : "border-gray-300"}`}
                                                  />
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="reservation-dropoff-date"
                                                className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                            >
                                                {formCopy.reservation.endDateLabel}
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
                                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300 ${availabilityError ? "border-red-500" : "border-gray-300"}`}
                                              />
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="reservation-dropoff-time"
                                                className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                            >
                                                {formCopy.reservation.endTimeLabel}
                                            </Label>
                                              <input
                                                  id="reservation-dropoff-time"
                                                  type="time"
                                                  name="rental_end_time"
                                                  value={formData.rental_end_time}
                                                  onChange={handleInputChange}
                                                  required
                                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300 ${availabilityError ? "border-red-500" : "border-gray-300"}`}
                                              />
                                        </div>
                                      </div>
                                      {availabilityError && (
                                          <p className="text-red-500 text-sm mt-2">{availabilityError}</p>
                                      )}

                                      <div className="mt-6">
                                        <Label
                                          htmlFor="deposit-none"
                                          className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                                        >
                                          {formCopy.deposit.label}
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
                                              {formCopy.deposit.without}
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
                                              {formCopy.deposit.with}
                                            </Label>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !!availabilityError}
                                    className="w-full py-4 bg-jade text-white font-dm-sans font-semibold text-lg rounded-lg hover:bg-jade/90 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg flex items-center justify-center space-x-2"
                                    aria-label={formCopy.submit.ariaLabel}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            <span>{formCopy.submit.processing}</span>
                                        </>
                                    ) : (
                                        <span>{formCopy.submit.label}</span>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Reservation Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-24">
                            <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6">
                                {summaryCopy.title}
                            </h3>

                            {hasWheelPrize && wheelPrizeRecord && (
                                <div className="mb-6 rounded-xl border border-jade/30 bg-jade/10 p-4">
                                    <div className="flex items-start gap-3">
                                        <Gift className="mt-1 h-5 w-5 text-jade" />
                                        <div className="space-y-1">
                                            <p className="font-poppins text-sm font-semibold text-berkeley">
                                                {wheelPrizeCopy.title}
                                            </p>
                                            <p className="font-dm-sans text-sm text-gray-700">
                                                {wheelPrizeTitle}
                                                {wheelPrizeAmountLabel ? ` — ${wheelPrizeAmountLabel}` : ""}
                                            </p>
                                            <p className="font-dm-sans text-xs text-gray-600">
                                                {wheelPrizeExpiryText} {wheelPrizeCopy.applyNote}
                                            </p>
                                            {wheelPrizeSavingsText && (
                                                <p className="font-dm-sans text-xs font-semibold text-jade">
                                                    {wheelPrizeSavingsText}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 mb-6">
                                {selectedCar && (
                                    <div className="flex justify-between items-center">
                                        <span className="font-dm-sans text-gray-600">{summaryCopy.carLabel}</span>
                                        <span className="font-dm-sans font-semibold text-berkeley">
                      {selectedCar.name.split(" - ")[0]}
                    </span>
                                    </div>
                                )}

                                {formData.rental_start_date && (
                                    <div className="flex justify-between items-center">
                                        <span className="font-dm-sans text-gray-600">{summaryCopy.fromLabel}</span>
                                        <span className="font-dm-sans font-semibold text-berkeley">
                      {new Date(formData.rental_start_date).toLocaleDateString(
                          "ro-RO",
                      )} {formData.rental_start_time}
                    </span>
                                    </div>
                                )}

                                {formData.rental_end_date && (
                                    <div className="flex justify-between items-center">
                                        <span className="font-dm-sans text-gray-600">{summaryCopy.toLabel}</span>
                                        <span className="font-dm-sans font-semibold text-berkeley">
                      {new Date(formData.rental_end_date).toLocaleDateString(
                          "ro-RO",
                      )} {formData.rental_end_time}
                    </span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    <span className="font-dm-sans text-gray-600">{summaryCopy.locationLabel}</span>
                                    <span className="font-dm-sans font-semibold text-berkeley text-end">
                    {selectedLocationLabel}
                  </span>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <div className="flex justify-between items-center text-xl">
                  <span className="font-poppins font-semibold text-berkeley">
                    {summaryCopy.price.summaryLabel}
                  </span>
                                    <span className="font-poppins font-bold text-jade">
                    {summaryPriceLabel}
                  </span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-dm-sans text-gray-600">{summaryCopy.price.subtotalLabel}</span>
                                    <span className="font-dm-sans font-semibold text-berkeley">
                                        {formatPrice(rentalSubtotal)}€
                                    </span>
                                </div>
                                {selectedServices.length > 0 && (
                                    <div className="mt-2">
                    <span className="font-poppins font-semibold text-berkeley">
                      {summaryCopy.price.servicesLabel}
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
                            {service.price}€
                          </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <hr className="my-2" />
                                {wheelPrizeApplied && wheelPrizeDiscount > 0 && (
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-dm-sans text-jade">
                                            {summaryCopy.price.wheelPrizeLabel}
                                        </span>
                                        <span className="font-dm-sans text-jade">
                                            -{formatPrice(wheelPrizeDiscount)}€
                                        </span>
                                    </div>
                                )}
                                {discountStatus?.isValid && discountAmount > 0 && (
                                    <>
                                        <div className="flex justify-between items-center mb-2">
                        <span className="font-dm-sans text-gray-600">
                          {summaryCopy.price.totalBeforeDiscountLabel}
                        </span>
                                            <span className="font-dm-sans text-gray-600">
                                                {formatPrice(originalTotal)}€
                        </span>
                                        </div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-dm-sans text-jade">{summaryCopy.price.discountLabel}</span>
                                            <span className="font-dm-sans text-jade">
                                                -{formatPrice(discountAmount)}€
                        </span>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between items-center text-xl">
                  <span className="font-poppins font-semibold text-berkeley">
                    {summaryCopy.price.totalLabel}
                  </span>
                                    <span className="font-poppins font-bold text-jade">
                                        {formatPrice(total)}€
                                        {booking.withDeposit && selectedCar && (
                                            <span className="text-xs font-dm-sans text-gray-600">
                                                {depositSuffixLabel}
                                            </span>
                                        )}
                  </span>
                                </div>
                                {booking.withDeposit && selectedCar && (
                                    <div className="flex justify-between items-center text-xl">
                        <span className="font-poppins font-semibold text-berkeley">
                            {summaryCopy.price.depositLabel}
                        </span>
                                        <span className="font-poppins font-bold text-jade">
                                            {selectedCar.deposit}€
                                        </span>
                                    </div>
                                )}
                                <p className="text-sm text-gray-600 font-dm-sans mt-2">
                                    {summaryCopy.price.footnote}
                                </p>
                            </div>

                            {/* Benefits reminder */}
                            <div className="mt-8 p-4 bg-jade/5 rounded-lg">
                                <h4 className="font-poppins font-semibold text-berkeley mb-2">
                                    {summaryCopy.benefits.title}
                                </h4>
                                <ul className="text-sm font-dm-sans text-gray-600 space-y-1">
                                    {summaryCopy.benefits.items.map((item) => (
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
