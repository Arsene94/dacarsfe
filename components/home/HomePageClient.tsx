"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import BenefitsSection from "@/components/BenefitsSection";
import ContactSection from "@/components/ContactSection";
import FleetSection from "@/components/FleetSection";
import HeroSection from "@/components/HeroSection";
import OffersSection from "@/components/OffersSection";
import ProcessSection from "@/components/ProcessSection";
import apiClient from "@/lib/api";
import { extractArray, isPeriodActive, mapPeriod } from "@/lib/wheelNormalization";
import { useBooking } from "@/context/useBooking";
import type { WheelOfFortunePeriod } from "@/types/wheel";

const ElfsightWidget = dynamic(() => import("@/components/ElfsightWidget"), {
    ssr: false,
});

const LazyWheelOfFortune = dynamic(() => import("@/components/WheelOfFortune"), {
    loading: () => null,
    ssr: false,
});

const parseYearMonth = (value: string): { year: number; month: number } | null => {
    if (typeof value !== "string") {
        return null;
    }

    const match = value.trim().match(/^(\d{4})-(\d{2})/);
    if (!match) {
        return null;
    }

    const [, yearRaw, monthRaw] = match;
    const year = Number(yearRaw);
    const month = Number(monthRaw);

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
        return null;
    }

    if (month < 1 || month > 12) {
        return null;
    }

    return { year, month };
};

const resolveMonthsInRange = (startIso: string, endIso: string): number[] => {
    const start = parseYearMonth(startIso);
    const end = parseYearMonth(endIso);

    if (!start || !end) {
        return [];
    }

    const startIndex = start.year * 12 + (start.month - 1);
    const endIndex = end.year * 12 + (end.month - 1);

    if (startIndex > endIndex) {
        return [];
    }

    const months: number[] = [];
    for (
        let index = startIndex;
        index <= endIndex && months.length < 120;
        index += 1
    ) {
        const month = (index % 12) + 1;
        months.push(month);
    }

    return Array.from(new Set(months));
};

const HomePageClient = () => {
    const { booking } = useBooking();
    const [activePeriod, setActivePeriod] = useState<WheelOfFortunePeriod | null>(null);
    const [isLoadingPeriod, setIsLoadingPeriod] = useState(false);
    const [periodError, setPeriodError] = useState<unknown>(null);
    const [showWheelPopup, setShowWheelPopup] = useState(false);
    const [hasManuallyClosed, setHasManuallyClosed] = useState(false);
    const [lastFetchKey, setLastFetchKey] = useState<string | null>(null);

    const hasBookingRange = Boolean(booking.startDate && booking.endDate);
    const bookingRangeKey = hasBookingRange
        ? `${booking.startDate ?? ""}|${booking.endDate ?? ""}`
        : null;

    useEffect(() => {
        if (!hasBookingRange && lastFetchKey !== null) {
            setLastFetchKey(null);
        }
    }, [hasBookingRange, lastFetchKey]);

    useEffect(() => {
        if (!hasBookingRange || !bookingRangeKey) {
            return;
        }

        if (isLoadingPeriod || activePeriod) {
            return;
        }

        if (bookingRangeKey === lastFetchKey) {
            return;
        }

        let cancelled = false;
        const controller = new AbortController();

        const fetchActivePeriod = async () => {
            setIsLoadingPeriod(true);
            setPeriodError(null);

            try {
                const activePeriodResponse = await apiClient.getWheelOfFortunePeriods({
                    active: 1,
                    is_active: 1,
                    limit: 1,
                    signal: controller.signal,
                });
                const activeCandidates = extractArray(activePeriodResponse)
                    .map(mapPeriod)
                    .filter((item): item is WheelOfFortunePeriod => item !== null);

                let resolvedPeriod = activeCandidates.find((item) => isPeriodActive(item)) ?? null;

                if (!resolvedPeriod) {
                    const fallbackResponse = await apiClient.getWheelOfFortunePeriods({
                        per_page: 20,
                        signal: controller.signal,
                    });
                    const fallbackList = extractArray(fallbackResponse)
                        .map(mapPeriod)
                        .filter((item): item is WheelOfFortunePeriod => item !== null);
                    resolvedPeriod = fallbackList.find((item) => isPeriodActive(item)) ?? null;
                }

                if (!cancelled) {
                    setActivePeriod(resolvedPeriod);
                }
            } catch (error) {
                if ((error as { name?: string }).name === "AbortError") {
                    return;
                }

                console.error(
                    "Nu am putut încărca perioadele active pentru roata norocului",
                    error,
                );

                if (!cancelled) {
                    setActivePeriod(null);
                    setPeriodError(error);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingPeriod(false);
                    setLastFetchKey(bookingRangeKey);
                }
            }
        };

        fetchActivePeriod();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [
        activePeriod,
        bookingRangeKey,
        hasBookingRange,
        isLoadingPeriod,
        lastFetchKey,
    ]);

    const activeMonthsSet = useMemo(() => {
        if (!activePeriod?.active_months || activePeriod.active_months.length === 0) {
            return null;
        }

        const normalized = activePeriod.active_months
            .map((month) => Number(month))
            .filter((month) => Number.isFinite(month) && month >= 1 && month <= 12);

        if (normalized.length === 0) {
            return null;
        }

        return new Set(normalized);
    }, [activePeriod?.active_months]);

    const isBookingWithinActiveMonths = useMemo(() => {
        if (!booking.startDate || !booking.endDate) {
            return false;
        }

        if (!activePeriod || !isPeriodActive(activePeriod)) {
            return false;
        }

        const bookingMonths = resolveMonthsInRange(booking.startDate, booking.endDate);
        if (bookingMonths.length === 0) {
            return false;
        }

        if (!activeMonthsSet || activeMonthsSet.size === 0) {
            return true;
        }

        return bookingMonths.some((month) => activeMonthsSet.has(month));
    }, [activeMonthsSet, activePeriod, booking.endDate, booking.startDate]);

    useEffect(() => {
        if (!hasBookingRange) {
            if (showWheelPopup) {
                setShowWheelPopup(false);
            }
            if (hasManuallyClosed) {
                setHasManuallyClosed(false);
            }
            return;
        }

        if (isLoadingPeriod) {
            if (showWheelPopup) {
                setShowWheelPopup(false);
            }
            return;
        }

        if (!isBookingWithinActiveMonths || periodError) {
            if (showWheelPopup) {
                setShowWheelPopup(false);
            }
            if (hasManuallyClosed) {
                setHasManuallyClosed(false);
            }
            return;
        }

        if (hasManuallyClosed) {
            if (showWheelPopup) {
                setShowWheelPopup(false);
            }
            return;
        }

        if (!showWheelPopup) {
            setShowWheelPopup(true);
        }
    }, [
        hasBookingRange,
        hasManuallyClosed,
        isBookingWithinActiveMonths,
        isLoadingPeriod,
        periodError,
        showWheelPopup,
    ]);

    const handleWheelClose = () => {
        setShowWheelPopup(false);
        setHasManuallyClosed(true);
    };

    return (
        <div className="pt-16 lg:pt-20">
            <HeroSection />
            <FleetSection />
            <BenefitsSection />
            <OffersSection />
            <ElfsightWidget />
            {/*<TestimonialsSection />*/}
            <ProcessSection />
            <ContactSection />

            {showWheelPopup && !periodError && (
                <LazyWheelOfFortune
                    isPopup={true}
                    onClose={handleWheelClose}
                />
            )}
        </div>
    );
};

export default HomePageClient;
