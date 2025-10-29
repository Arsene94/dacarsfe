"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Fuel, Search, Settings, SlidersHorizontal, Users, X } from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { apiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { resolveMediaUrl } from "@/lib/media";
import { getImageSizesPreset } from "@/lib/images/sizePresets";
import { createVehicleItemListStructuredData } from "@/lib/seo/structuredData";
import { siteMetadata } from "@/lib/seo/siteMetadata";
import { useBooking } from "@/context/useBooking";
import { ApiCar, Car, CarCategory, type CarSearchUiPayload } from "@/types/car";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { trackMixpanelEvent } from "@/lib/mixpanelClient";
import { trackMetaPixelViewContent } from "@/lib/metaPixel";
import { trackTikTokSearch, trackTikTokViewContent } from "@/lib/tiktokPixel";
import { isAnalyticsTrackingEnabled, trackAnalyticsEvent } from "@/lib/analytics";
import { useLocaleHref } from "@/lib/i18n/useLocaleHref";

const siteUrl = siteMetadata.siteUrl;
const fleetPageUrl = `${siteUrl}/cars`;

const resolveCarImageUrl = (value?: string | null): string => {
    const resolved = resolveMediaUrl(value);
    return typeof resolved === "string" && resolved.trim().length > 0
        ? resolved
        : "/images/placeholder-car.svg";
};

const toFiniteInteger = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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
    try { return parsePrice(String(raw)); } catch { return 0; }
};

const toNumberOrNull = (value: unknown): number | null => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};

const toAnalyticsMetadataString = (value: Record<string, unknown>): string | undefined => {
    try {
        return JSON.stringify(value);
    } catch (error) {
        console.warn("Nu am putut serializa metadata pentru CTA car", error);
        return undefined;
    }
};

type FiltersState = {
    car_type: string;
    type: string;
    transmission: string;
    fuel: string;
    passengers: string;
    priceRange: string;
};

const FleetPage = () => {
    const { t, locale } = useTranslations("cars");
    const buildLocaleHref = useLocaleHref();
    const fallbackCarName = useMemo(() => t("fallbacks.carName"), [t]);
    const unknownValue = useMemo(() => t("fallbacks.unknownValue"), [t]);
    const formatCategoryFallback = useCallback(
        (id: number) => t("fallbacks.category", { values: { id } }),
        [t],
    );
    const formatPassengersLabel = useCallback(
        (value: string | number) => t("labels.passengers", { values: { count: value } }),
        [t],
    );

    const parseLicensePlate = useCallback((value: unknown): string | null => {
        if (typeof value !== "string") {
            return null;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }, []);

    const mapCar = useCallback(
        (c: ApiCar): Car => {
            const galleryCandidates: string[] = [];
            const registerImage = (value: unknown) => {
                if (typeof value !== "string") return;
                const trimmed = value.trim();
                if (!trimmed) return;
                galleryCandidates.push(trimmed);
            };
            registerImage(c.image_preview);
            registerImage(c.image);
            registerImage(c.thumbnail);
            registerImage(c.cover_image);
            if (Array.isArray(c.images)) {
                c.images.forEach(registerImage);
            } else if (c.images && typeof c.images === "object") {
                Object.values(c.images).forEach(registerImage);
            }

            const gallery = Array.from(
                new Set(
                    galleryCandidates
                        .map((candidate) => resolveMediaUrl(candidate))
                        .filter((src): src is string => typeof src === "string" && src.trim().length > 0),
                ),
            );
            if (gallery.length === 0) {
                gallery.push(resolveCarImageUrl(null));
            }
            const primaryImage = gallery[0] ?? resolveCarImageUrl(null);

            const resolvedName =
                typeof c.name === "string" && c.name.trim().length > 0
                    ? c.name
                    : fallbackCarName;

            const resolvedType =
                typeof c.type?.name === "string" && c.type.name.trim().length > 0
                    ? c.type.name.trim()
                    : unknownValue;

            const resolvedTransmission =
                typeof c.transmission === "string"
                    ? c.transmission
                    : typeof c.transmission?.name === "string" && c.transmission.name.trim().length > 0
                        ? c.transmission.name
                        : unknownValue;

            const transmissionId =
                typeof c.transmission === "object" && c.transmission !== null
                    ? c.transmission.id ?? null
                    : null;

            const resolvedFuel =
                typeof c.fuel === "string"
                    ? c.fuel
                    : typeof c.fuel?.name === "string" && c.fuel.name.trim().length > 0
                        ? c.fuel.name
                        : unknownValue;

            const fuelId =
                typeof c.fuel === "object" && c.fuel !== null
                    ? c.fuel.id ?? null
                    : null;

            const passengersCount = Number(c.number_of_seats) || 0;

            const licensePlate =
                parseLicensePlate(c.license_plate) ??
                parseLicensePlate(c.licensePlate) ??
                parseLicensePlate(c.plate);

            return {
                id: c.id,
                name: resolvedName,
                type: resolvedType,
                typeId: c.type?.id ?? null,
                image: primaryImage,
                gallery,
                licensePlate: licensePlate ?? null,
                price: parsePrice(
                    Math.round(Number(c.rental_rate)) ?? Math.round(Number(c.rental_rate_casco)),
                ),
                rental_rate: String(Number(c.rental_rate ?? 0)),
                rental_rate_casco: String(Number(c.rental_rate_casco ?? 0)),
                days: Number(c.days ?? 0),
                deposit: Number(c.deposit ?? 0),
                total_deposit: String(Number(c.total_deposit ?? 0)),
                total_without_deposit: String(Number(c.total_without_deposit ?? 0)),
                available: typeof c.available === "boolean" ? c.available : undefined,
                features: {
                    passengers: passengersCount,
                    transmission: resolvedTransmission,
                    transmissionId,
                    fuel: resolvedFuel,
                    fuelId,
                    doors: 4,
                    luggage: 2,
                },
                rating: Number(c.avg_review ?? 0) || 0,
                description: c.content ?? "",
                specs: [],
            };
        },
        [fallbackCarName, unknownValue, parseLicensePlate],
    );

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { booking, setBooking } = useBooking();

    const [filters, setFilters] = useState<FiltersState>(() => ({
        car_type: searchParams.get("car_type") || "all",
        type: searchParams.get("type") || "all",
        transmission: searchParams.get("transmission") || "all",
        fuel: searchParams.get("fuel") || "all",
        passengers: searchParams.get("passengers") || "all",
        priceRange: searchParams.get("priceRange") || "all",
    }));

    const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "cheapest");
    const [viewMode, setViewMode] = useState("grid");
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const [showFilters, setShowFilters] = useState(false);

    const startDate = searchParams.get("start_date") || "";
    const endDate   = searchParams.get("end_date") || "";
    const carTypeParam = searchParams.get("car_type") || "";
    const location  = searchParams.get("location") || "";

    const initialPage = Number(searchParams.get("page")) || 1;
    const [cars, setCars] = useState<Car[]>([]);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCars, setTotalCars] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const loadingRef = useRef(false);
    const hasMoreRef = useRef(true);
    const hasTrackedViewRef = useRef(false);
    const trackedCarImpressionsRef = useRef<Set<string>>(new Set());

    const [categories, setCategories] = useState<CarCategory[]>();
    const [availabilityFeedback, setAvailabilityFeedback] = useState<{
        carId: number | null;
        message: string | null;
    }>({ carId: null, message: null });
    const [checkingAvailabilityFor, setCheckingAvailabilityFor] = useState<number | null>(null);
    const [dateModalState, setDateModalState] = useState<{
        open: boolean;
        car: Car | null;
        withDeposit: boolean;
    }>({ open: false, car: null, withDeposit: false });
    const [dateModalDates, setDateModalDates] = useState<{ start: string; end: string }>({ start: "", end: "" });
    const [dateModalError, setDateModalError] = useState<string | null>(null);

    // derive filters from loaded cars (for dropdowns)
    const filterOptions = useMemo(() => {
        const types = new Map<number, string>();
        const transmissions = new Map<number, string>();
        const fuels = new Map<number, string>();
        const passengers = new Set<number>();

        cars.forEach((car) => {
            if (car.typeId && car.type && car.type !== unknownValue) types.set(car.typeId, car.type);
            if (car.features.transmissionId && car.features.transmission && car.features.transmission !== unknownValue)
                transmissions.set(car.features.transmissionId, car.features.transmission);
            if (car.features.fuelId && car.features.fuel && car.features.fuel !== unknownValue)
                fuels.set(car.features.fuelId, car.features.fuel);
            if (car.features.passengers) passengers.add(car.features.passengers);
        });

        return {
            types: Array.from(types, ([id, name]) => ({ id, name })).sort((a, b) =>
                a.name.localeCompare(b.name, locale, { sensitivity: "base" })
            ),
            transmissions: Array.from(transmissions, ([id, name]) => ({ id, name })).sort((a, b) =>
                a.name.localeCompare(b.name, locale, { sensitivity: "base" })
            ),
            fuels: Array.from(fuels, ([id, name]) => ({ id, name })).sort((a, b) =>
                a.name.localeCompare(b.name, locale, { sensitivity: "base" })
            ),
            passengers: Array.from(passengers).sort((a, b) => a - b),
        };
    }, [cars, locale, unknownValue]);

    // core fetcher (stabil)
    const fetchCars = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoading(p => (currentPage === 1 ? true : p));

        // construim payload doar cu valori „reale”
        const payload: CarSearchUiPayload = {
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            car_type: carTypeParam || undefined,
            location: location || undefined,
            page: currentPage,
            sort_by: sortBy,
            status: 'available'
        };
        if (filters.car_type !== "all")   payload.car_type = Number(filters.car_type);
        if (filters.type !== "all")       payload.vehicle_type = Number(filters.type);
        if (filters.transmission !== "all") payload.transmission = Number(filters.transmission);
        if (filters.fuel !== "all")       payload.fuel_type = Number(filters.fuel);
        if (filters.passengers !== "all") payload.seats = Number(filters.passengers);
        if (filters.priceRange !== "all") payload.price_range = filters.priceRange;
        if (searchTerm)                   payload.search = searchTerm;

        try {
            const resp = await apiClient.getCarsByDateCriteria(payload, locale);
            const list = extractList(resp);

            const mapped = list.map(mapCar);

            const respRecord =
                !Array.isArray(resp) && typeof resp === "object"
                    ? (resp as Record<string, unknown>)
                    : null;
            const meta = respRecord?.meta || respRecord?.pagination || {};
            const total =
                (meta as { total?: unknown })?.total ??
                (meta as { count?: unknown })?.count ??
                (respRecord as { total?: unknown })?.total ??
                (respRecord as { count?: unknown })?.count ??
                mapped.length;
            const lastPage =
                (meta as { last_page?: unknown })?.last_page ??
                (meta as { lastPage?: unknown })?.lastPage ??
                (respRecord as { last_page?: unknown })?.last_page ??
                (respRecord as { lastPage?: unknown })?.lastPage ??
                1;

            const totalNumber = toFiniteInteger(total, mapped.length);
            const lastPageNumber = Math.max(1, toFiniteInteger(lastPage, 1));

            setCars(prev => (currentPage === 1 ? mapped : [...prev, ...mapped]));
            setTotalCars(totalNumber);
            setTotalPages(lastPageNumber);

            const hasMore = currentPage < lastPageNumber;
            hasMoreRef.current = hasMore;
        } catch (e) {
            console.error(e);
            if (currentPage === 1) {
                setCars([]);
                setTotalCars(0);
                setTotalPages(1);
                hasMoreRef.current = false;
            }
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        currentPage,
        sortBy,
        filters,
        searchTerm,
        startDate,
        endDate,
        carTypeParam,
        location,
        locale,
        mapCar,
    ]);

    // trigger fetch la montare + când se schimbă pagina
    useEffect(() => { fetchCars(); }, [fetchCars]);

    // reset listă când se schimbă filtre/sort/search/date; menține pagina 1
    useEffect(() => {
        setCurrentPage(1);
        hasMoreRef.current = true;
        hasTrackedViewRef.current = false;
        trackedCarImpressionsRef.current.clear();
    }, [filters, sortBy, searchTerm, startDate, endDate, carTypeParam, location]);

    // categories (reîncărcare la schimbarea localei pentru fallback-uri)
    useEffect(() => {
        (async () => {
            try {
                const res = await apiClient.getCarCategories({ language: locale });
                const list = extractList(res);
                let cat: CarCategory[] = [];

                if (list.length > 0) {
                    cat = list
                        .map((entry) => {
                            const source = entry as Record<string, unknown>;
                            const idCandidate = source.id ?? source.value;
                            const id = Number(idCandidate);
                            if (!Number.isFinite(id)) {
                                return null;
                            }
                            const nameSource =
                                (typeof source.name === "string" && source.name) ||
                                (typeof source.title === "string" && source.title) ||
                                null;
                            return {
                                id,
                                name: nameSource ? String(nameSource) : formatCategoryFallback(id),
                            };
                        })
                        .filter((entry): entry is CarCategory => entry != null)
                        .sort((a, b) => a.id - b.id);
                } else if (!Array.isArray(res) && typeof res === "object") {
                    const record = res as Record<string, unknown>;
                    cat = Object.entries(record)
                        .map(([id, name]) => ({ id: Number(id), name: String(name) }))
                        .filter((entry) => Number.isFinite(entry.id) && entry.name.trim().length > 0)
                        .sort((a, b) => a.id - b.id);
                }

                setCategories(cat);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [formatCategoryFallback, locale]);

    // url sync cu filtrele
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        Object.entries(filters).forEach(([key, value]) => {
            if (value === "all") params.delete(key); else params.set(key, String(value));
        });
        if (searchTerm) params.set("search", searchTerm); else params.delete("search");
        params.set("sort_by", sortBy);
        params.set("page", String(currentPage));
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [filters, searchTerm, sortBy, currentPage, router, pathname]);

    // IntersectionObserver pentru infinite scroll
    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target) return;

        const onIntersect: IntersectionObserverCallback = (entries) => {
            const [entry] = entries;
            if (!entry.isIntersecting) return;
            if (loadingRef.current) return;
            if (!hasMoreRef.current) return;

            setCurrentPage(p => p + 1);
        };

        const observer = new IntersectionObserver(onIntersect, { root: null, rootMargin: "300px", threshold: 0 });
        observer.observe(target);
        return () => observer.disconnect();
    }, []);

    const handleFilterChange = (key: keyof FiltersState, value: string) => {
        let didChange = false;

        setFilters((prev) => {
            if (prev[key] === value) {
                return prev;
            }

            didChange = true;
            return { ...prev, [key]: value };
        });

        if (!didChange) {
            return;
        }

        setCurrentPage(1);
        hasMoreRef.current = true;

        trackMixpanelEvent("fleet_filters_updated", {
            filter_key: key,
            filter_value: value,
            view_mode: viewMode,
            search_term: searchTerm || null,
            sort_by: sortBy,
            page: 1,
            total_results: totalCars,
        });

    };

    const clearFilters = () => {
        setFilters({
            car_type: "all",
            type: "all",
            transmission: "all",
            fuel: "all",
            passengers: "all",
            priceRange: "all",
        });
        setSearchTerm("");
        setCurrentPage(1);
        hasMoreRef.current = true;
    };

    const activeFilters = useMemo(() => {
        const active: Array<{ key: keyof FiltersState; label: string }> = [];
        if (filters.car_type !== "all") {
            const label = categories?.find((c) => String(c.id) === filters.car_type)?.name;
            if (label) active.push({ key: "car_type", label });
        }
        if (filters.type !== "all") {
            const label = filterOptions.types.find((t) => String(t.id) === filters.type)?.name;
            if (label) active.push({ key: "type", label });
        }
        if (filters.transmission !== "all") {
            const label = filterOptions.transmissions.find((t) => String(t.id) === filters.transmission)?.name;
            if (label) active.push({ key: "transmission", label });
        }
        if (filters.fuel !== "all") {
            const label = filterOptions.fuels.find((f) => String(f.id) === filters.fuel)?.name;
            if (label) active.push({ key: "fuel", label });
        }
        if (filters.passengers !== "all") {
            active.push({ key: "passengers", label: formatPassengersLabel(filters.passengers) });
        }
        if (filters.priceRange !== "all") active.push({ key: "priceRange", label: String(filters.priceRange) });
        return active;
    }, [filters, categories, filterOptions, formatPassengersLabel]);

    const openDateModal = useCallback((car: Car, withDeposit: boolean) => {
        setDateModalState({ open: true, car, withDeposit });
        setDateModalDates({
            start: booking.startDate || startDate || "",
            end: booking.endDate || endDate || "",
        });
        setDateModalError(null);
        setAvailabilityFeedback({ carId: null, message: null });
    }, [booking.endDate, booking.startDate, endDate, startDate]);

    const closeDateModal = useCallback(() => {
        setDateModalState({ open: false, car: null, withDeposit: false });
        setDateModalError(null);
    }, []);

    const requestBooking = useCallback(
        async (
            car: Car,
            withDeposit: boolean,
            start: string,
            end: string,
            { fromModal }: { fromModal: boolean },
        ): Promise<boolean> => {
            const trimmedStart = start?.trim();
            const trimmedEnd = end?.trim();

            if (!trimmedStart || !trimmedEnd) {
                const message = t("card.availability.periodRequired", {
                    fallback: "Selectează o perioadă completă pentru a continua.",
                });
                if (fromModal) {
                    setDateModalError(message);
                } else {
                    openDateModal(car, withDeposit);
                    setDateModalError(message);
                }
                return false;
            }

            if (car.available === false) {
                const message = t("card.availability.unavailable", {
                    fallback: "Mașina nu este disponibilă în perioada selectată.",
                });
                if (fromModal) {
                    setDateModalError(message);
                } else {
                    setAvailabilityFeedback({ carId: car.id, message });
                }
                return false;
            }

            setCheckingAvailabilityFor(car.id);
            if (!fromModal) {
                setAvailabilityFeedback((prev) =>
                    prev.carId === car.id ? { carId: null, message: null } : prev,
                );
            } else {
                setDateModalError(null);
            }

            try {
                const availability = await apiClient.checkCarAvailability({
                    car_id: car.id,
                    start_date: trimmedStart,
                    end_date: trimmedEnd,
                });

                if (availability?.available === false) {
                    const message = availability.message?.trim() ||
                        t("card.availability.unavailable", {
                            fallback: "Mașina nu este disponibilă în perioada selectată.",
                        });
                    if (fromModal) {
                        setDateModalError(message);
                    } else {
                        setAvailabilityFeedback({ carId: car.id, message });
                    }
                    return false;
                }

                const pricePerDay = toNumberOrNull(
                    withDeposit ? car.rental_rate : car.rental_rate_casco,
                );
                const totalAmount = toNumberOrNull(
                    withDeposit ? car.total_deposit : car.total_without_deposit,
                );

                setBooking({
                    ...booking,
                    startDate: trimmedStart,
                    endDate: trimmedEnd,
                    withDeposit,
                    selectedCar: car,
                });

                trackMixpanelEvent("car_cta_clicked", {
                    car_id: car.id,
                    car_name: car.name,
                    with_deposit: withDeposit,
                    car_price_plan: withDeposit ? "with_deposit" : "no_deposit",
                    car_price_per_day: pricePerDay,
                    car_total: totalAmount,
                    start_date: trimmedStart,
                    end_date: trimmedEnd,
                    view_mode: viewMode,
                });

                if (fromModal || !startDate || !endDate) {
                    const params = new URLSearchParams(window.location.search);
                    params.set("start_date", trimmedStart);
                    params.set("end_date", trimmedEnd);
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                }

                setAvailabilityFeedback({ carId: null, message: null });
                closeDateModal();
                router.push(buildLocaleHref("/form"));
                return true;
            } catch (error) {
                console.error(error);
                const message = t("card.availability.error", {
                    fallback: "A apărut o eroare la verificarea disponibilității. Încearcă din nou.",
                });
                if (fromModal) {
                    setDateModalError(message);
                } else {
                    setAvailabilityFeedback({ carId: car.id, message });
                }
                return false;
            } finally {
                setCheckingAvailabilityFor(null);
            }
        },
        [
            booking,
            buildLocaleHref,
            closeDateModal,
            endDate,
            openDateModal,
            pathname,
            router,
            setBooking,
            startDate,
            t,
            viewMode,
        ],
    );

    const handleBooking = useCallback(
        (withDeposit: boolean, car: Car) => {
            if (!startDate || !endDate) {
                openDateModal(car, withDeposit);
                return;
            }

            void requestBooking(car, withDeposit, startDate, endDate, { fromModal: false });
        },
        [endDate, openDateModal, requestBooking, startDate],
    );

    const handleDateModalSubmit = useCallback(async () => {
        if (!dateModalState.car) {
            return;
        }
        await requestBooking(
            dateModalState.car,
            dateModalState.withDeposit,
            dateModalDates.start,
            dateModalDates.end,
            { fromModal: true },
        );
    }, [dateModalDates.end, dateModalDates.start, dateModalState, requestBooking]);

    useEffect(() => {
        if (loading) {
            return;
        }
        if (cars.length === 0) {
            return;
        }
        if (currentPage !== 1) {
            return;
        }
        if (hasTrackedViewRef.current) {
            return;
        }

        const contents = cars.slice(0, 5).map((car) => {
            const totalWithoutDeposit = toNumberOrNull(car.total_without_deposit);
            const fallbackTotal = toNumberOrNull(car.total_deposit);
            const resolvedPrice = totalWithoutDeposit ?? fallbackTotal ?? toNumberOrNull(car.price);

            return {
                content_id: car.id,
                content_name: car.name,
                quantity: 1,
                price: resolvedPrice ?? undefined,
            };
        });

        const metaContents = contents
            .filter((item) => typeof item.content_id === "number")
            .map((item) => ({
                id: item.content_id,
                quantity: item.quantity ?? 1,
                item_price:
                    typeof item.price === "number" && Number.isFinite(item.price)
                        ? item.price
                        : undefined,
            }));

        const metaContentIds = metaContents.map((item) => item.id);
        const primaryPrice =
            typeof contents[0]?.price === "number" && Number.isFinite(contents[0]?.price)
                ? (contents[0]?.price as number)
                : undefined;

        trackMetaPixelViewContent({
            content_type: "vehicle",
            content_ids: metaContentIds,
            contents: metaContents,
            currency: "RON",
            value: primaryPrice,
            total_results: totalCars,
            search_term: searchTerm || undefined,
            sort_by: sortBy,
        });

        const tikTokContents = contents.map((item, index) => {
            const resolvedId =
                typeof item.content_id === "string"
                    ? item.content_id
                    : typeof item.content_id === "number" && Number.isFinite(item.content_id)
                        ? String(item.content_id)
                        : item.content_name
                            ? `${item.content_name}-${index}`
                            : `car-${index}`;

            return {
                content_id: resolvedId,
                content_type: "product",
                ...(item.content_name ? { content_name: item.content_name } : {}),
            };
        });

        const tikTokBasePayload = {
            ...(tikTokContents.length > 0 ? { contents: tikTokContents } : {}),
            currency: "RON",
            ...(typeof primaryPrice === "number" ? { value: primaryPrice } : {}),
        };

        trackTikTokViewContent(tikTokBasePayload);
        trackTikTokSearch({
            ...tikTokBasePayload,
            ...(searchTerm ? { search_string: searchTerm } : {}),
        });

        hasTrackedViewRef.current = true;
    }, [cars, currentPage, loading, totalCars, searchTerm, sortBy]);

    const registerCarImpression = useCallback(
        (car: Car, index: number) => {
            if (!isAnalyticsTrackingEnabled()) {
                return;
            }

            const identifier =
                typeof car.id === "number" && Number.isFinite(car.id)
                    ? `car-${car.id}`
                    : `car-${car.name}-${index}`;

            if (trackedCarImpressionsRef.current.has(identifier)) {
                return;
            }

            trackedCarImpressionsRef.current.add(identifier);

            const activeFiltersSnapshot = Object.entries(filters).reduce<Record<string, string>>(
                (accumulator, [key, value]) => {
                    if (value && value !== "all") {
                        accumulator[key] = value as string;
                    }
                    return accumulator;
                },
                {},
            );

            const metadata = {
                interaction_target: `car-card:${typeof car.id === "number" ? car.id : index}`,
                interaction_label: car.name,
                additional: {
                    car_id: car.id ?? null,
                    car_name: car.name,
                    car_type: car.type,
                    car_license_plate: car.licensePlate ?? null,
                    price_per_day: car.price ?? null,
                    view_mode: viewMode,
                    card_index: index + 1,
                    total_results: totalCars,
                    sort_by: sortBy,
                    search_term: searchTerm || null,
                    active_filters: activeFiltersSnapshot,
                    has_dates: Boolean(startDate && endDate),
                },
            };

            trackAnalyticsEvent({ type: "custom:car_view", metadata });
        },
        [filters, viewMode, totalCars, sortBy, searchTerm, startDate, endDate],
    );

    const CarCard = ({
        car,
        index,
        isListView = false,
        onView,
        viewMode: cardViewMode,
    }: {
        car: Car;
        index: number;
        isListView?: boolean;
        onView: (car: Car, index: number) => void;
        viewMode: string;
    }) => {
        const cardRef = useRef<HTMLDivElement | null>(null);

        useEffect(() => {
            const element = cardRef.current;
            if (!element) {
                return;
            }

            if (typeof IntersectionObserver === "undefined") {
                onView(car, index);
                return;
            }

            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            onView(car, index);
                            observer.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.5 },
            );

            observer.observe(element);

            return () => {
                observer.disconnect();
            };
        }, [car, index, onView]);

        const scrollMetadata = toAnalyticsMetadataString({
            context: "car_card",
            car_id: car.id ?? null,
            car_name: car.name,
            car_type: car.type,
            car_license_plate: car.licensePlate ?? null,
            card_index: index + 1,
            view_mode: cardViewMode,
            price_per_day: car.price ?? null,
        });

        const noDepositMetadata = toAnalyticsMetadataString({
            action: "reserve_no_deposit",
            car_id: car.id ?? null,
            car_name: car.name,
            car_type: car.type,
            car_license_plate: car.licensePlate ?? null,
            with_deposit: false,
            price_per_day: car.price ?? null,
            view_mode: cardViewMode,
        });

        const withDepositMetadata = toAnalyticsMetadataString({
            action: "reserve_with_deposit",
            car_id: car.id ?? null,
            car_name: car.name,
            car_type: car.type,
            car_license_plate: car.licensePlate ?? null,
            with_deposit: true,
            price_per_day: car.price ?? null,
            view_mode: cardViewMode,
        });

        return (
            <div
                ref={cardRef}
                data-analytics-scroll-section="true"
                data-analytics-scroll-target={`car-card:${car.id ?? index}`}
                data-analytics-scroll-label={car.name}
                data-analytics-scroll-metadata={scrollMetadata}
                data-analytics-scroll-car-id={car.id != null ? String(car.id) : undefined}
                data-analytics-scroll-view-mode={cardViewMode}
                data-analytics-scroll-card-index={String(index + 1)}
                className={`bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100 ${
                    isListView ? "flex flex-col md:flex-row" : ""
                }`}
            >
                <div className={`relative overflow-hidden ${isListView ? "md:w-1/3 h-48 md:h-full" : "h-48"}`}>
                    <Image
                        src={car.image}
                        alt={car.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        sizes={getImageSizesPreset("carGridCard")}
                        loading="lazy"
                        quality={60}
                    />
                    <div className="absolute top-4 left-4 bg-jade text-white px-3 py-1 rounded-full text-sm font-dm-sans font-semibold">
                        {car.type}
                    </div>
                </div>

                <div className={`p-6 ${isListView ? "md:w-2/3 flex flex-col justify-between" : ""}`}>
                    <div>
                        <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">{car.name}</h3>
                        {isListView && <p className="text-gray-600 font-dm-sans mb-4 leading-relaxed">{car.description}</p>}

                        <div className={`${isListView ? "grid grid-cols-2 gap-4 mb-4" : "space-y-2 mb-6"}`}>
                            <div className="flex items-center justify-between text-sm text-gray-600 font-dm-sans">
                                <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4 text-jade" />
                                    <span>{formatPassengersLabel(car.features.passengers)}</span>
                                </div>
                                {!isListView && (
                                    <div className="flex items-center space-x-2">
                                        <Settings className="h-4 w-4 text-jade" />
                                        <span>{car.features.transmission}</span>
                                    </div>
                                )}
                            </div>
                            {isListView && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600 font-dm-sans">
                                    <Settings className="h-4 w-4 text-jade" />
                                    <span>{car.features.transmission}</span>
                                </div>
                            )}
                            <div className="flex items-center space-x-2 text-sm text-gray-600 font-dm-sans">
                                <Fuel className="h-4 w-4 text-jade" />
                                <span>{car.features.fuel}</span>
                            </div>
                        </div>
                    </div>

                    <>
                        <div className="flex items-center justify-between mb-5">
                            {Boolean(startDate && endDate) && (
                                <div className="me-1">
                                    <span className="text-jade font-bold font-dm-sans">{t("card.pricing.noDepositLabel")}</span>
                                    <span className="text-base font-poppins font-bold text-jade"> {" "}
                                        {car.rental_rate_casco}€
                                    </span>
                                    <span className="text-jade font-bold font-dm-sans"> {t("card.pricing.perDay")}</span>

                                    <div>
                                        <span className="text-jade font-bold font-dm-sans">
                                            {t("card.pricing.daysTotal", { values: { days: car.days } })}
                                        </span>
                                        <span className="text-base font-poppins font-bold text-jade"> {" "}
                                            {car.total_without_deposit}€
                                        </span>
                                    </div>
                                </div>
                            )}
                            <Button
                                onClick={() => handleBooking(false, car)}
                                disabled={checkingAvailabilityFor === car.id}
                                aria-busy={checkingAvailabilityFor === car.id}
                                className={`${!Boolean(startDate && endDate) ? 'w-full' : ''} !px-4 py-2 h-10 w-[140px] text-center text-xs bg-jade text-white font-dm-sans font-semibold rounded-lg transition-colors duration-300 ${
                                    checkingAvailabilityFor === car.id
                                        ? "opacity-75 cursor-not-allowed"
                                        : "hover:bg-jade/90"
                                }`}
                                aria-label={t("card.actions.reserveAria")}
                                data-analytics-event="cta_click"
                                data-analytics-label={t("card.actions.reserveNoDeposit")}
                                data-analytics-target={`car:${car.id ?? index}:reserve-no-deposit`}
                                data-analytics-metadata={noDepositMetadata}
                            >
                                {checkingAvailabilityFor === car.id
                                    ? t("card.availability.checking", { fallback: "Se verifică..." })
                                    : t("card.actions.reserveNoDeposit")}
                            </Button>
                        </div>

                        <div className="flex items-center justify-between">
                            {Boolean(startDate && endDate) && (
                                <div className="me-3">
                                    <span className="text-gray-600 font-dm-sans">{t("card.pricing.withDepositLabel")}</span>
                                    <span className="text-base font-poppins font-bold text-berkeley"> {" "}
                                        {car.rental_rate}€
                                    </span>
                                    <span className="text-gray-600 font-dm-sans"> {t("card.pricing.perDay")}</span>

                                    <div>
                                        <span className="text-gray-600 font-bold font-dm-sans">
                                            {t("card.pricing.daysTotal", { values: { days: car.days } })}
                                        </span>
                                        <span className="text-base font-poppins font-bold text-berkeley"> {" "}
                                            {car.total_deposit}€
                                        </span>
                                    </div>
                                </div>
                            )}
                            <Button
                                onClick={() => handleBooking(true, car)}
                                disabled={checkingAvailabilityFor === car.id}
                                aria-busy={checkingAvailabilityFor === car.id}
                                className={`${!Boolean(startDate && endDate) ? 'w-full' : ''} px-4 py-2 h-10 w-[140px] !bg-transparent text-center text-xs border border-jade !text-jade font-dm-sans font-semibold rounded-lg transition-colors duration-300 ${
                                    checkingAvailabilityFor === car.id
                                        ? "opacity-75 cursor-not-allowed"
                                        : "hover:!bg-jade/90 hover:!text-white"
                                }`}
                                aria-label={t("card.actions.reserveAria")}
                                data-analytics-event="cta_click"
                                data-analytics-label={t("card.actions.reserveWithDeposit")}
                                data-analytics-target={`car:${car.id ?? index}:reserve-with-deposit`}
                                data-analytics-metadata={withDepositMetadata}
                            >
                                {checkingAvailabilityFor === car.id
                                    ? t("card.availability.checking", { fallback: "Se verifică..." })
                                    : t("card.actions.reserveWithDeposit")}
                            </Button>
                        </div>

                        {availabilityFeedback.carId === car.id && availabilityFeedback.message && (
                            <p className="mt-4 text-sm text-red-600 font-dm-sans">
                                {availabilityFeedback.message}
                            </p>
                        )}
                    </>
                </div>
            </div>
        );
    };


    const vehicleStructuredData = useMemo(() => {
        if (cars.length === 0) {
            return null;
        }

        const structuredCars = cars.map((car) => {
            const casco = Number.parseFloat(car.rental_rate_casco);
            const standard = Number.parseFloat(car.rental_rate);
            const price = Number.isFinite(casco) && casco > 0
                ? casco
                : Number.isFinite(standard) && standard > 0
                    ? standard
                    : car.price;

            return {
                id: car.id,
                name: car.name,
                image: car.image,
                price,
                description: car.description || undefined,
                seats: car.features.passengers,
                transmission: car.features.transmission,
                fuel: car.features.fuel,
                availability: car.available !== false,
                url: `${fleetPageUrl}#car-${car.id}`,
                category: car.type,
            };
        });

        return createVehicleItemListStructuredData(structuredCars, {
            baseUrl: siteUrl,
            pageUrl: fleetPageUrl,
            name: t("structuredData.itemList.name"),
            description: t("structuredData.itemList.description"),
            currency: t("structuredData.itemList.currency"),
        });
    }, [cars, t]);

    return (
        <>
            {vehicleStructuredData && (
                <JsonLd data={vehicleStructuredData} id="dacars-cars-itemlist" />
            )}
            {/* spinner full-screen DOAR la prima pagină */}
            {loading && currentPage === 1 && (
                <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
                    <div className="h-12 w-12 border-4 border-jade border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            <div className="pt-16 lg:pt-20 min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Header */}
                    <div className="text-center mb-12 animate-fade-in">
                        <h1 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
                            {t("header.title.main")} <span className="text-jade">{t("header.title.highlight")}</span>
                        </h1>
                        <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto leading-relaxed">
                            {t("header.description")}
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-berkeley shadow-sm">
                                {t("interlink.title", { fallback: "Continuă către paginile cheie" })}
                            </span>
                                <Link
                                href={buildLocaleHref("/offers")}
                                className="inline-flex items-center rounded-full border border-berkeley px-4 py-2 text-sm font-semibold text-berkeley transition hover:bg-berkeley hover:text-white"
                            >
                                {t("interlink.offers", { fallback: "Promoții verificate" })}
                            </Link>
                                <Link
                                href={buildLocaleHref("/faq")}
                                className="inline-flex items-center rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                            >
                                {t("interlink.faq", { fallback: "Întrebări frecvente" })}
                            </Link>
                                <Link
                                href={buildLocaleHref("/contact")}
                                className="inline-flex items-center rounded-full border border-jade px-4 py-2 text-sm font-semibold text-jade transition hover:bg-jade hover:text-white"
                            >
                                {t("interlink.contact", { fallback: "Solicită un consultant" })}
                            </Link>
                        </div>
                    </div>

                    {/* Search & controls */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                            <div
                                className="relative flex-1 w-full"
                                data-analytics-scroll-section="true"
                                data-analytics-scroll-target="cars:search:query"
                                data-analytics-scroll-label={t("search.ariaLabel")}
                                data-analytics-scroll-metadata={toAnalyticsMetadataString({
                                    section: "search_input",
                                })}
                            >
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t("search.placeholder")}
                                    aria-label={t("search.ariaLabel")}
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                                />
                            </div>

                            <div className="flex items-center space-x-4">
                                <Select
                                    className="w-auto px-4 py-2 transition-all duration-300"
                                    value={sortBy}
                                    onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}
                                    aria-label={t("search.sortAria")}
                                    data-analytics-scroll-section="true"
                                    data-analytics-scroll-target="cars:search:sort"
                                    data-analytics-scroll-label={t("search.sortAria")}
                                    data-analytics-scroll-metadata={toAnalyticsMetadataString({
                                        section: "sort_select",
                                    })}
                                >
                                    <option value="cheapest">{t("search.sortOptions.cheapest")}</option>
                                    <option value="most_expensive">{t("search.sortOptions.mostExpensive")}</option>
                                </Select>

                                <button
                                    onClick={() => setShowFilters(s => !s)}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-300 ${
                                        showFilters ? "bg-jade text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                    aria-label={t("search.filtersAria")}
                                >
                                    <SlidersHorizontal className="h-5 w-5" />
                                    <span className="font-dm-sans">{t("search.filtersButton")}</span>
                                </button>
                            </div>
                        </div>

                        {showFilters && (
                            <div className="border-t border-gray-200 pt-6 animate-slide-up">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    <div
                                        data-analytics-scroll-section="true"
                                        data-analytics-scroll-target="cars:filters:category"
                                        data-analytics-scroll-label={t("filters.labels.category")}
                                        data-analytics-scroll-metadata={toAnalyticsMetadataString({
                                            filter: "category",
                                        })}
                                    >
                                        <Label htmlFor="filter-car-type" className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">{t("filters.labels.category")}</Label>
                                        <Select
                                            id="filter-car-type"
                                            className="px-3 py-2 transition-all duration-300"
                                            value={filters.car_type}
                                            onValueChange={(v) => handleFilterChange("car_type", v)}
                                        >
                                            <option value="all">{t("filters.allOption")}</option>
                                            {categories?.map((category) => (
                                                <option key={category.id} value={String(category.id)}>{category.name}</option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div
                                        data-analytics-scroll-section="true"
                                        data-analytics-scroll-target="cars:filters:type"
                                        data-analytics-scroll-label={t("filters.labels.type")}
                                        data-analytics-scroll-metadata={toAnalyticsMetadataString({
                                            filter: "type",
                                        })}
                                    >
                                        <Label htmlFor="filter-type" className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">{t("filters.labels.type")}</Label>
                                        <Select id="filter-type" className="px-3 py-2" value={filters.type} onValueChange={(v) => handleFilterChange("type", v)}>
                                            <option value="all">{t("filters.allOption")}</option>
                                            {filterOptions.types.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                                        </Select>
                                    </div>

                                    <div
                                        data-analytics-scroll-section="true"
                                        data-analytics-scroll-target="cars:filters:transmission"
                                        data-analytics-scroll-label={t("filters.labels.transmission")}
                                        data-analytics-scroll-metadata={toAnalyticsMetadataString({
                                            filter: "transmission",
                                        })}
                                    >
                                        <Label htmlFor="filter-transmission" className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">{t("filters.labels.transmission")}</Label>
                                        <Select id="filter-transmission" className="px-3 py-2" value={filters.transmission} onValueChange={(v) => handleFilterChange("transmission", v)}>
                                            <option value="all">{t("filters.allOption")}</option>
                                            {filterOptions.transmissions.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                                        </Select>
                                    </div>

                                    <div
                                        data-analytics-scroll-section="true"
                                        data-analytics-scroll-target="cars:filters:fuel"
                                        data-analytics-scroll-label={t("filters.labels.fuel")}
                                        data-analytics-scroll-metadata={toAnalyticsMetadataString({
                                            filter: "fuel",
                                        })}
                                    >
                                        <Label htmlFor="filter-fuel" className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">{t("filters.labels.fuel")}</Label>
                                        <Select id="filter-fuel" className="px-3 py-2" value={filters.fuel} onValueChange={(v) => handleFilterChange("fuel", v)}>
                                            <option value="all">{t("filters.allOption")}</option>
                                            {filterOptions.fuels.map(f => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {activeFilters.map((f) => (
                                        <span key={f.key} className="flex items-center px-3 py-1 bg-jade/10 text-jade text-sm font-dm-sans rounded-full">
                      {f.label}
                                            <button
                                                onClick={() => handleFilterChange(f.key, "all")}
                                                className="ml-2 hover:text-berkeley"
                                                aria-label={t("filters.removeAria", { values: { filter: f.label } })}
                                            >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                                    ))}
                                    <button
                                        onClick={clearFilters}
                                        className="px-4 py-2 text-jade font-dm-sans font-semibold hover:bg-jade/10 rounded-lg transition-colors duration-300"
                                        aria-label={t("filters.resetAria")}
                                    >
                                        {t("filters.reset")}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Results Count */}
                    <div
                        id="results-section"
                        className="flex items-center mb-8"
                        data-analytics-scroll-section="true"
                        data-analytics-scroll-target="cars:results:summary"
                        data-analytics-scroll-label={t("results.label")}
                    >
                        <p className="text-gray-600 font-dm-sans">
                            <span className="font-semibold text-berkeley">{totalCars}</span> {t("results.label")}
                        </p>
                    </div>

                    {/* Grid/List */}
                    {cars.length > 0 ? (
                        <div
                            className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}
                            data-analytics-scroll-section="true"
                            data-analytics-scroll-target="cars:results:list"
                            data-analytics-scroll-label={t("results.label")}
                            data-analytics-scroll-metadata={toAnalyticsMetadataString({
                                section: "results_list",
                                view_mode: viewMode,
                                total_results: totalCars,
                            })}
                        >
                            {cars.map((car, index) => (
                                <div key={car.id ?? index} className="animate-slide-up">
                                    <CarCard
                                        car={car}
                                        index={index}
                                        isListView={viewMode === "list"}
                                        onView={registerCarImpression}
                                        viewMode={viewMode}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div
                            className="text-center py-16"
                            data-analytics-scroll-section="true"
                            data-analytics-scroll-target="cars:results:empty"
                            data-analytics-scroll-label={t("list.empty.title")}
                        >
                            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Filter className="h-12 w-12 text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-4">{t("list.empty.title")}</h3>
                            <p className="text-gray-600 font-dm-sans mb-6 max-w-md mx-auto">
                                {t("list.empty.description")}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <Button onClick={clearFilters} className="px-6 py-3" aria-label={t("filters.resetAria")}>
                                    {t("filters.reset")}
                                </Button>
                                {activeFilters.map((f) => (
                                    <span key={f.key} className="flex items-center px-3 py-1 bg-jade/10 text-jade text-sm font-dm-sans rounded-full">
                    {f.label}
                                        <button
                                            onClick={() => handleFilterChange(f.key, "all")}
                                            className="ml-2 hover:text-berkeley"
                                            aria-label={t("filters.removeAria", { values: { filter: f.label } })}
                                        >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* sentinel */}
                    <div ref={loadMoreRef} className="h-6" />

                    {/* CTA */}
                    <div
                        className="mt-16 bg-gradient-to-r from-berkeley/5 to-jade/5 rounded-3xl p-8 lg:p-12 text-center"
                        data-analytics-scroll-section="true"
                        data-analytics-scroll-target="cars:cta:section"
                        data-analytics-scroll-label={t("cta.title")}
                        data-analytics-scroll-metadata={toAnalyticsMetadataString({
                            section: "cta_block",
                            search_term: searchTerm || null,
                            sort_by: sortBy,
                            view_mode: viewMode,
                        })}
                    >
                        <h3 className="text-3xl font-poppins font-bold text-berkeley mb-4">{t("cta.title")}</h3>
                        <p className="text-xl font-dm-sans text-gray-600 mb-8 max-w-2xl mx-auto">
                            {t("cta.description")}
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link href={buildLocaleHref("/form")} aria-label={t("cta.primary")}> 
                                <Button
                                    className="transform hover:scale-105 shadow-lg"
                                    aria-label={t("cta.primary")}
                                    data-analytics-event="cta_click"
                                    data-analytics-label={t("cta.primary")}
                                    data-analytics-target="cars:cta:primary"
                                    data-analytics-metadata={toAnalyticsMetadataString({
                                        action: "cta_primary",
                                        section: "fleet_bottom",
                                        search_term: searchTerm || null,
                                        sort_by: sortBy,
                                        view_mode: viewMode,
                                    })}
                                >
                                    {t("cta.primary")}
                                </Button>
                            </Link>
                            <a
                                href="#contact"
                                aria-label={t("cta.secondary")}
                                data-analytics-event="cta_click"
                                data-analytics-label={t("cta.secondary")}
                                data-analytics-target="cars:cta:contact"
                                data-analytics-metadata={toAnalyticsMetadataString({
                                    action: "cta_secondary",
                                    section: "fleet_bottom",
                                    search_term: searchTerm || null,
                                    sort_by: sortBy,
                                    view_mode: viewMode,
                                })}
                            >
                                <Button
                                    variant="outline"
                                    className="border-berkeley text-berkeley hover:bg-berkeley hover:text-white"
                                    aria-label={t("cta.secondary")}
                                >
                                    {t("cta.secondary")}
                                </Button>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <Popup open={dateModalState.open} onClose={closeDateModal} className="max-w-2xl">
                <div className="space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-poppins font-semibold text-berkeley">
                            {t("card.availability.title", { fallback: "Selectează perioada de închiriere" })}
                        </h2>
                        <p className="text-sm text-gray-600 font-dm-sans">
                            {t("card.availability.description", {
                                fallback: "Pentru a continua rezervarea, selectează datele de ridicare și returnare.",
                            })}
                        </p>
                    </div>

                    {dateModalState.car && (
                        <div className="rounded-lg bg-gray-50 px-4 py-3">
                            <p className="text-sm font-dm-sans text-gray-700">
                                {t("card.availability.selectedCar", {
                                    values: { car: dateModalState.car.name },
                                    fallback: `Mașină selectată: ${dateModalState.car.name}`,
                                })}
                            </p>
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="reserve-start-date" className="text-sm font-semibold text-gray-700 font-dm-sans">
                                {t("card.availability.startLabel", { fallback: "Data ridicare" })}
                            </Label>
                            <Input
                                id="reserve-start-date"
                                type="datetime-local"
                                value={dateModalDates.start}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setDateModalDates((prev) => ({ ...prev, start: value }));
                                    if (dateModalError) setDateModalError(null);
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reserve-end-date" className="text-sm font-semibold text-gray-700 font-dm-sans">
                                {t("card.availability.endLabel", { fallback: "Data returnare" })}
                            </Label>
                            <Input
                                id="reserve-end-date"
                                type="datetime-local"
                                value={dateModalDates.end}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setDateModalDates((prev) => ({ ...prev, end: value }));
                                    if (dateModalError) setDateModalError(null);
                                }}
                            />
                        </div>
                    </div>

                    {dateModalError && (
                        <p className="text-sm text-red-600 font-dm-sans">{dateModalError}</p>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={closeDateModal}
                            className="px-4"
                        >
                            {t("card.availability.cancel", { fallback: "Anulează" })}
                        </Button>
                        <Button
                            onClick={handleDateModalSubmit}
                            disabled={checkingAvailabilityFor === dateModalState.car?.id}
                            aria-busy={checkingAvailabilityFor === dateModalState.car?.id}
                            className={`px-4 ${
                                checkingAvailabilityFor === dateModalState.car?.id
                                    ? "opacity-75 cursor-not-allowed"
                                    : ""
                            }`}
                        >
                            {checkingAvailabilityFor === dateModalState.car?.id
                                ? t("card.availability.checking", { fallback: "Se verifică..." })
                                : t("card.availability.confirm", { fallback: "Verifică disponibilitatea" })}
                        </Button>
                    </div>
                </div>
            </Popup>
        </>
    );
};

export default FleetPage;
