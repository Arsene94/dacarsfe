"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import BenefitsSection from "@/components/BenefitsSection";
import ContactSection from "@/components/ContactSection";
import FleetSection from "@/components/FleetSection";
import HeroSection from "@/components/HeroSection";
import OffersSection from "@/components/OffersSection";
import ProcessSection from "@/components/ProcessSection";
import WheelOfFortune from "@/components/WheelOfFortune";
import apiClient from "@/lib/api";
import { extractArray, isPeriodActive, mapPeriod } from "@/lib/wheelNormalization";
import { useBooking } from "@/context/BookingContext";
import type { WheelOfFortunePeriod } from "@/types/wheel";

const ElfsightWidget = dynamic(() => import("@/components/ElfsightWidget"), {
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

const HomePageClient = () => {
    const { booking } = useBooking();
    const [activePeriod, setActivePeriod] = useState<WheelOfFortunePeriod | null>(null);
    const [isLoadingPeriod, setIsLoadingPeriod] = useState(false);
    const [periodError, setPeriodError] = useState<unknown>(null);
    const [showWheelPopup, setShowWheelPopup] = useState(false);
    const [hasManuallyClosed, setHasManuallyClosed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const fetchActivePeriod = async () => {
            setIsLoadingPeriod(true);
            setPeriodError(null);
            try {
                const activePeriodResponse = await apiClient.getWheelOfFortunePeriods({
                    active: 1,
                    is_active: 1,
                    limit: 1,
                });
                const activeCandidates = extractArray(activePeriodResponse)
                    .map(mapPeriod)
                    .filter((item): item is WheelOfFortunePeriod => item !== null);

                let resolvedPeriod = activeCandidates.find((item) => isPeriodActive(item)) ?? null;

                if (!resolvedPeriod) {
                    const fallbackResponse = await apiClient.getWheelOfFortunePeriods({ per_page: 20 });
                    const fallbackList = extractArray(fallbackResponse)
                        .map(mapPeriod)
                        .filter((item): item is WheelOfFortunePeriod => item !== null);
                    resolvedPeriod = fallbackList.find((item) => isPeriodActive(item)) ?? null;
                }

                if (!cancelled) {
                    setActivePeriod(resolvedPeriod);
                }
            } catch (error) {
                console.error("Nu am putut încărca perioadele active pentru roata norocului", error);
                if (!cancelled) {
                    setActivePeriod(null);
                    setPeriodError(error);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingPeriod(false);
                }
            }
        };

        fetchActivePeriod();

        return () => {
            cancelled = true;
        };
    }, []);

    const activeMonths = activePeriod?.active_months ?? null;

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

        if (!activeMonths || activeMonths.length === 0) {
            return true;
        }

        return bookingMonths.every((month) => activeMonths.includes(month));
    }, [activeMonths, activePeriod, booking.endDate, booking.startDate]);

    useEffect(() => {
        if (isLoadingPeriod) {
            if (showWheelPopup) {
                setShowWheelPopup(false);
            }
            return;
        }

        if (!isBookingWithinActiveMonths) {
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
    }, [hasManuallyClosed, isBookingWithinActiveMonths, isLoadingPeriod, showWheelPopup]);

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
                <WheelOfFortune
                    isPopup={true}
                    onClose={handleWheelClose}
                />
            )}
        </div>
    );
};

export default HomePageClient;
