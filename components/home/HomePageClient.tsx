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

const resolveMonthsInRange = (startIso: string, endIso: string): number[] => {
    const start = new Date(startIso);
    const end = new Date(endIso);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return [];
    }

    if (start > end) {
        return [];
    }

    const months = new Set<number>();
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const limit = new Date(end.getFullYear(), end.getMonth(), 1);

    let safety = 0;
    while (cursor <= limit && safety < 60) {
        months.add(cursor.getMonth() + 1);
        cursor.setMonth(cursor.getMonth() + 1, 1);
        cursor.setHours(0, 0, 0, 0);
        safety += 1;
    }

    return Array.from(months);
};

const doesPeriodMatchBookingMonths = (
    period: WheelOfFortunePeriod | null,
    months: readonly number[],
) => {
    if (!period) {
        return false;
    }

    if (!isPeriodActive(period)) {
        return false;
    }

    if (months.length === 0) {
        return false;
    }

    const periodMonths = Array.isArray(period.active_months) ? period.active_months : null;
    if (!periodMonths || periodMonths.length === 0) {
        return true;
    }

    return months.every((month) => periodMonths.includes(month));
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
    const bookingMonths = useMemo(() => {
        if (!booking.startDate || !booking.endDate) {
            return [] as number[];
        }

        return resolveMonthsInRange(booking.startDate, booking.endDate);
    }, [booking.endDate, booking.startDate]);
    const bookingRangeKey = hasBookingRange
        ? `${booking.startDate ?? ""}|${booking.endDate ?? ""}`
        : null;

    useEffect(() => {
        if (!hasBookingRange && lastFetchKey !== null) {
            setLastFetchKey(null);
        }
    }, [hasBookingRange, lastFetchKey]);

    useEffect(() => {
        if (!hasBookingRange || !bookingRangeKey || bookingMonths.length === 0) {
            return;
        }

        if (isLoadingPeriod) {
            return;
        }

        if (doesPeriodMatchBookingMonths(activePeriod, bookingMonths)) {
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

                const resolveMatchingPeriod = (
                    list: WheelOfFortunePeriod[],
                ): WheelOfFortunePeriod | null =>
                    list.find((item) => doesPeriodMatchBookingMonths(item, bookingMonths)) ?? null;

                let resolvedPeriod = resolveMatchingPeriod(activeCandidates);

                if (!resolvedPeriod) {
                    const fallbackResponse = await apiClient.getWheelOfFortunePeriods({
                        per_page: 20,
                        signal: controller.signal,
                    });
                    const fallbackList = extractArray(fallbackResponse)
                        .map(mapPeriod)
                        .filter((item): item is WheelOfFortunePeriod => item !== null);
                    resolvedPeriod = resolveMatchingPeriod(fallbackList);
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
        bookingMonths,
        bookingRangeKey,
        hasBookingRange,
        isLoadingPeriod,
        lastFetchKey,
    ]);

    const isBookingWithinActiveMonths = useMemo(() => {
        if (!booking.startDate || !booking.endDate) {
            return false;
        }

        return doesPeriodMatchBookingMonths(activePeriod, bookingMonths);
    }, [activePeriod, bookingMonths, booking.endDate, booking.startDate]);

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

export { doesPeriodMatchBookingMonths, resolveMonthsInRange };
