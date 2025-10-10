"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import BenefitsSection from "@/components/BenefitsSection";
import ContactSection from "@/components/ContactSection";
import FleetSection from "@/components/FleetSection";
import OffersSection from "@/components/OffersSection";
import ProcessSection from "@/components/ProcessSection";
import apiClient from "@/lib/api";
import { extractArray, isPeriodActive, mapPeriod } from "@/lib/wheelNormalization";
import { useBooking } from "@/context/useBooking";
import type { WheelOfFortunePeriod } from "@/types/wheel";
import { trackMixpanelEvent } from "@/lib/mixpanelClient";
import { trackTikTokEvent, TIKTOK_CONTENT_TYPE, TIKTOK_EVENTS } from "@/lib/tiktokPixel";
import { trackMetaPixelEvent, META_PIXEL_EVENTS } from "@/lib/metaPixel";

const ElfsightWidget = dynamic(() => import("@/components/ElfsightWidget"), {
    ssr: false,
});

const LazyWheelOfFortune = dynamic(() => import("@/components/WheelOfFortune"), {
    loading: () => null,
    ssr: false,
});

type LazyVisibleSectionProps = {
    children: ReactNode;
    className?: string;
    intrinsicSize?: CSSProperties["containIntrinsicSize"];
};

const LazyVisibleSection = ({
    children,
    className,
    intrinsicSize = "720px",
}: LazyVisibleSectionProps) => {
    const style: CSSProperties = {
        contentVisibility: "auto",
        containIntrinsicSize: intrinsicSize,
    };

    return (
        <div className={className} style={style}>
            {children}
        </div>
    );
};

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
    const [hasUserAdjustedBookingRange, setHasUserAdjustedBookingRange] = useState(false);
    const [shouldRenderElfsight, setShouldRenderElfsight] = useState(false);
    const landingTrackedRef = useRef(false);

    const scheduleIdle = useCallback(
        (callback: () => void, options?: { timeout?: number }) => {
            if (typeof window === "undefined") {
                return undefined;
            }

            const win = window as typeof window & {
                requestIdleCallback?: (
                    cb: IdleRequestCallback,
                    idleOptions?: IdleRequestOptions,
                ) => number;
                cancelIdleCallback?: (handle: number) => void;
            };

            if (typeof win.requestIdleCallback === "function") {
                const handle = win.requestIdleCallback(
                    () => {
                        callback();
                    },
                    options?.timeout !== undefined
                        ? { timeout: options.timeout }
                        : undefined,
                );

                return () => {
                    win.cancelIdleCallback?.(handle);
                };
            }

            const timeout = window.setTimeout(callback, options?.timeout ?? 200);

            return () => {
                window.clearTimeout(timeout);
            };
        },
        [],
    );

    const hasBookingRange = Boolean(booking.startDate && booking.endDate);
    const bookingRangeKey = hasBookingRange
        ? `${booking.startDate ?? ""}|${booking.endDate ?? ""}`
        : null;

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const markAdjusted = () => {
            setHasUserAdjustedBookingRange(true);
        };

        window.addEventListener("booking:dates-adjusted", markAdjusted);

        return () => {
            window.removeEventListener("booking:dates-adjusted", markAdjusted);
        };
    }, []);

    useEffect(() => {
        if (!hasBookingRange && hasUserAdjustedBookingRange) {
            setHasUserAdjustedBookingRange(false);
        }
    }, [hasBookingRange, hasUserAdjustedBookingRange]);

    useEffect(() => {
        if (!hasBookingRange && isLoadingPeriod) {
            setIsLoadingPeriod(false);
        }
    }, [hasBookingRange, isLoadingPeriod]);

    useEffect(() => {
        if (!hasBookingRange || !bookingRangeKey || !hasUserAdjustedBookingRange) {
            return;
        }

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

                if (!controller.signal.aborted) {
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

                if (!controller.signal.aborted) {
                    setActivePeriod(null);
                    setPeriodError(error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingPeriod(false);
                }
            }
        };

        fetchActivePeriod();

        return () => {
            controller.abort();
        };
    }, [
        bookingRangeKey,
        hasBookingRange,
        hasUserAdjustedBookingRange,
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

    const hasResolvedActivePeriod = useMemo(() => {
        if (!hasBookingRange) {
            return true;
        }

        return !isLoadingPeriod;
    }, [hasBookingRange, isLoadingPeriod]);

    useEffect(() => {
        if (landingTrackedRef.current) {
            return;
        }

        if (!hasResolvedActivePeriod) {
            return;
        }

        const cancelIdle = scheduleIdle(
            () => {
                trackMixpanelEvent("landing_view", {
                    has_booking_range: Boolean(hasBookingRange),
                    booking_range_key: bookingRangeKey ?? null,
                    wheel_popup_shown: Boolean(showWheelPopup),
                    wheel_period_id: activePeriod?.id ?? null,
                    wheel_active_month_match: Boolean(isBookingWithinActiveMonths),
                });

                trackTikTokEvent(TIKTOK_EVENTS.VIEW_CONTENT, {
                    content_id: "landing_home",
                    content_name: "Landing Page",
                    content_type: TIKTOK_CONTENT_TYPE,
                    has_booking_range: Boolean(hasBookingRange),
                    booking_range_key: bookingRangeKey || undefined,
                    wheel_popup_shown: Boolean(showWheelPopup),
                    wheel_period_id: activePeriod?.id ?? undefined,
                });

                trackMetaPixelEvent(META_PIXEL_EVENTS.VIEW_CONTENT, {
                    content_name: "Landing Page",
                    content_category: "home",
                    content_type: "landing_page",
                    has_booking_range: Boolean(hasBookingRange),
                    booking_range_key: bookingRangeKey || undefined,
                    wheel_popup_shown: Boolean(showWheelPopup),
                    wheel_period_id: activePeriod?.id ?? undefined,
                });

                landingTrackedRef.current = true;
            },
            { timeout: 2000 },
        );

        return cancelIdle;
    }, [
        activePeriod?.id,
        bookingRangeKey,
        hasBookingRange,
        hasResolvedActivePeriod,
        isBookingWithinActiveMonths,
        showWheelPopup,
        scheduleIdle,
    ]);

    useEffect(() => {
        if (shouldRenderElfsight) {
            return;
        }

        if (process.env.NODE_ENV === "test") {
            setShouldRenderElfsight(true);
            return;
        }

        return scheduleIdle(
            () => {
                setShouldRenderElfsight(true);
            },
            { timeout: 3000 },
        );
    }, [scheduleIdle, shouldRenderElfsight]);

    useEffect(() => {
        if (!hasUserAdjustedBookingRange) {
            if (showWheelPopup) {
                setShowWheelPopup(false);
            }
            if (hasManuallyClosed) {
                setHasManuallyClosed(false);
            }
            return;
        }

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
        hasUserAdjustedBookingRange,
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
        <div>
            <LazyVisibleSection intrinsicSize="960px">
                <FleetSection />
            </LazyVisibleSection>
            <LazyVisibleSection intrinsicSize="860px">
                <BenefitsSection />
            </LazyVisibleSection>
            <LazyVisibleSection intrinsicSize="820px">
                <OffersSection />
            </LazyVisibleSection>
            {shouldRenderElfsight ? <ElfsightWidget /> : null}
            {/*<TestimonialsSection />*/}
            <LazyVisibleSection intrinsicSize="900px">
                <ProcessSection />
            </LazyVisibleSection>
            <LazyVisibleSection intrinsicSize="880px">
                <ContactSection />
            </LazyVisibleSection>

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
