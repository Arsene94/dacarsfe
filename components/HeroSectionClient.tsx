"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { HeroBookingFormProps, LocationOption } from "./HeroBookingForm";

import heroBackground from "@/public/images/bg-hero-1920x1080.webp";
import heroBackgroundMobile from "@/public/images/bg-hero-mobile-960x1759.webp";

const HeroBookingForm = dynamic<HeroBookingFormProps>(
    () => import("./HeroBookingForm"),
    {
        loading: () => <HeroBookingFormSkeleton />,
    },
);

export type HeroSectionFeature = {
    title: string;
    description: string;
};

export type HeroSectionClientProps = {
    locale: Locale;
    badge: string;
    title: string;
    subtitleLead: string;
    subtitleHighlight: string;
    features: HeroSectionFeature[];
    formLabels: Record<string, string>;
    formPlaceholders: Record<string, string>;
    ariaLabels: Record<string, string>;
    submitLabel: string;
    locations: LocationOption[];
};

const HeroBookingFormSkeleton = () => (
    <div
        role="status"
        aria-live="polite"
        className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5"
    >
        {[...Array(5)].map((_, index) => (
            <div key={`hero-form-skeleton-${index}`} className="space-y-2">
                <div className="h-4 w-28 rounded bg-white/30" />
                <div className="h-12 rounded-md bg-white/20" />
            </div>
        ))}
    </div>
);

type FeatureIconProps = {
    index: number;
    className?: string;
};

const ClockIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
    >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l2.75 2.75" />
    </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
    >
        <path d="M12 3.75 5.25 6v6.75C5.25 16.9 7.9 19.8 12 21c4.1-1.2 6.75-4.1 6.75-8.25V6L12 3.75Z" />
        <path d="M9.75 12.75 11.25 14.25 14.25 10.5" />
    </svg>
);

const StarIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
    >
        <path d="M12 3.75 14.2 9l5.3.45-4 3.5 1.25 5.25L12 15.9l-4.75 2.3L8.5 12.95l-4-3.5L9.8 9Z" />
    </svg>
);

const FeatureIcon = ({ index, className }: FeatureIconProps) => {
    if (index === 0) {
        return <ClockIcon className={className} />;
    }
    if (index === 1) {
        return <ShieldIcon className={className} />;
    }
    return <StarIcon className={className} />;
};

const HeroSectionClient = ({
    locale,
    badge,
    title,
    subtitleLead,
    subtitleHighlight,
    features,
    formLabels,
    formPlaceholders,
    ariaLabels,
    submitLabel,
    locations,
}: HeroSectionClientProps) => {
    const blurBackground = heroBackground.blurDataURL ?? undefined;
    const backgroundRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const backgroundNode = backgroundRef.current;
        if (!backgroundNode) {
            return;
        }

        const supportsMatchMedia = typeof window.matchMedia === "function";
        const dataSaverQuery = supportsMatchMedia ? window.matchMedia("(prefers-reduced-data: reduce)") : null;

        if (dataSaverQuery?.matches) {
            backgroundNode.dataset.loaded = "skipped";
            return;
        }

        const mobileQuery = supportsMatchMedia ? window.matchMedia("(max-width: 768px)") : null;
        const extendedWindow = window as Window & {
            requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
            cancelIdleCallback?: (handle: number) => void;
        };
        let idleCallbackId: number | null = null;
        let timeoutId: number | null = null;
        let cancelled = false;
        let currentSource: string | null = null;

        const applyBackground = (targetSrc: string) => {
            if (!backgroundRef.current) {
                return;
            }
            backgroundRef.current.style.backgroundImage = `url(${targetSrc})`;
            backgroundRef.current.dataset.loaded = "true";
        };

        const loadBackground = (targetSrc: string) => {
            if (!targetSrc || currentSource === targetSrc) {
                return;
            }

            currentSource = targetSrc;

            const image = new Image();
            image.decoding = "async";
            image.src = targetSrc;

            const finalize = () => {
                if (cancelled) {
                    return;
                }
                applyBackground(targetSrc);
            };

            image.onload = finalize;
            image.onerror = finalize;
        };

        const resolveTargetSource = () =>
            mobileQuery?.matches ? heroBackgroundMobile.src : heroBackground.src;

        const startLoading = () => {
            loadBackground(resolveTargetSource());
        };

        if (typeof extendedWindow.requestIdleCallback === "function") {
            idleCallbackId = extendedWindow.requestIdleCallback(startLoading, { timeout: 1200 });
        } else {
            timeoutId = window.setTimeout(startLoading, 200);
        }

        const handleViewportChange = () => {
            startLoading();
        };

        if (mobileQuery) {
            if (typeof mobileQuery.addEventListener === "function") {
                mobileQuery.addEventListener("change", handleViewportChange);
            } else if (typeof mobileQuery.addListener === "function") {
                mobileQuery.addListener(handleViewportChange);
            }
        }

        return () => {
            cancelled = true;
            if (idleCallbackId !== null && typeof extendedWindow.cancelIdleCallback === "function") {
                extendedWindow.cancelIdleCallback(idleCallbackId);
            }
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
            if (mobileQuery) {
                if (typeof mobileQuery.removeEventListener === "function") {
                    mobileQuery.removeEventListener("change", handleViewportChange);
                } else if (typeof mobileQuery.removeListener === "function") {
                    mobileQuery.removeListener(handleViewportChange);
                }
            }
        };
    }, []);

    return (
        <section className="relative overflow-hidden bg-berkeley text-white">
            <div className="absolute inset-0">
                {blurBackground ? (
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${blurBackground})` }}
                    />
                ) : null}
                <div
                    ref={backgroundRef}
                    aria-hidden="true"
                    data-loaded="false"
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-0 transition-opacity duration-700 data-[loaded=true]:opacity-100"
                />
                <div className="absolute inset-0 z-10 bg-gradient-to-r from-berkeley/90 to-berkeley/70" />
            </div>

            <div className="relative z-20 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:pt-32">
                <div className="grid items-center gap-12 lg:grid-cols-1">
                    <div className="animate-slide-in-left">
                        <div className="mb-6 inline-flex items-center rounded-full bg-jade/40 px-4 py-2">
                            <span className="mr-2 text-white">
                                <StarIcon className="h-4 w-4 text-white" />
                            </span>
                            <span className="font-dm-sans font-medium text-white">{badge}</span>
                        </div>

                        <h1 className="mb-6 font-poppins text-4xl font-bold leading-tight lg:text-6xl">{title}</h1>

                        <p className="mb-8 font-dm-sans text-xl leading-relaxed text-gray-200 lg:text-2xl">
                            {subtitleLead}
                            <br />
                            <span className="font-semibold text-jadeLight">{subtitleHighlight}</span>
                        </p>

                        {features.length > 0 ? (
                            <div className="hidden gap-6 sm:grid sm:grid-cols-3">
                                {features.map((feature, index) => (
                                    <div key={`${feature.title}-${index}`} className="flex items-center space-x-3">
                                        <div className="rounded-lg bg-jade/20 p-2">
                                            <FeatureIcon index={index} className="h-5 w-5 text-jade" />
                                        </div>
                                        <div>
                                            <p className="font-dm-sans font-semibold">{feature.title}</p>
                                            <p className="text-sm text-gray-300">{feature.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="mt-5">
                    <HeroBookingForm
                        labels={formLabels}
                        placeholders={formPlaceholders}
                        ariaLabels={ariaLabels}
                        submitLabel={submitLabel}
                        locale={locale}
                        locations={locations}
                    />
                </div>
            </div>

            <div className="absolute top-20 right-10 h-20 w-20 rounded-full bg-jade/10 blur-xl" />
            <div className="absolute bottom-20 left-10 h-32 w-32 rounded-full bg-jade/5 blur-2xl" />
        </section>
    );
};

export default HeroSectionClient;
