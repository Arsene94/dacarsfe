"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { Clock, Shield, Star } from "lucide-react";
import { useTranslations } from "@/lib/i18n/useTranslations";
import type { HeroBookingFormProps, LocationOption } from "./HeroBookingForm";

import heroBackground from "@/public/images/bg-hero-1920x1080.webp";

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

const HeroBookingForm = dynamic<HeroBookingFormProps>(
    () => import("./HeroBookingForm"),
    {
        loading: () => <HeroBookingFormSkeleton />,
    },
);

const HeroSection = () => {
    const { messages, t, locale } = useTranslations("home");
    const heroMessages = (messages.hero ?? {}) as Record<string, unknown>;
    const heroForm = (heroMessages.form ?? {}) as Record<string, unknown>;
    const heroFormLabels = (heroForm.labels ?? {}) as Record<string, string>;
    const heroFormPlaceholders = (heroForm.placeholders ?? {}) as Record<string, string>;
    const heroOptions = (heroForm.options ?? {}) as Record<string, unknown>;
    const heroLocations = Array.isArray(heroOptions.locations)
        ? (heroOptions.locations as LocationOption[])
        : [];
    const resolvedLocations = heroLocations.length > 0
        ? heroLocations
        : [{ value: "otopeni", label: "Aeroport Otopeni" }];
    const heroFeatures = Array.isArray(heroMessages.features)
        ? (heroMessages.features as Array<{ title?: string; description?: string }>)
        : [];
    const heroAria =
        heroForm.aria && typeof heroForm.aria === "object"
            ? (heroForm.aria as Record<string, string>)
            : undefined;
    const heroSubmitLabel =
        typeof heroForm.submit === "string" ? heroForm.submit : "Caută mașini";

    return (
        <section className="relative bg-berkeley text-white overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
                <div className="relative h-full w-full">
                    <Image
                        src={heroBackground}
                        alt="Fundal aeroport"
                        fill
                        priority
                        loading="eager"
                        fetchPriority="high"
                        placeholder="blur"
                        sizes="(max-width: 639px) 100vw, (max-width: 1279px) 100vw, 100vw"
                        quality={60}
                        className="object-cover"
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-berkeley/90 to-berkeley/70 z-10"></div>
            </div>

            {/* Content */}
            <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:pt-32">
                <div className="grid lg:grid-cols-1 gap-12 items-center">
                    <div className="animate-slide-in-left">
                        <div className="inline-flex items-center px-4 py-2 bg-jade/40 rounded-full mb-6">
                            <Star className="h-4 w-4 text-white mr-2" />
                            <span className="text-white font-dm-sans font-medium">
                                {t("hero.badge", { fallback: "Te ținem aproape de casă" })}
                            </span>
                        </div>

                        <h1 className="text-4xl lg:text-6xl font-poppins font-bold leading-tight mb-6">
                            {t("hero.title", { fallback: "Închiriere auto București - Otopeni" })}{" "}
                        </h1>

                        <p className="text-xl lg:text-2xl font-dm-sans text-gray-200 mb-8 leading-relaxed">
                            {t("hero.subtitle.lead", {
                                fallback: "Predare în aeroport în sub 5 minute.",
                            })}
                            <br />
                            <span className="text-jadeLight font-semibold">
                                {t("hero.subtitle.highlight", { fallback: "Fără taxe ascunse." })}
                            </span>
                        </p>

                        <div className="hidden sm:grid sm:grid-cols-3 gap-6">
                            {heroFeatures.map((feature, index) => (
                                <div key={`${feature.title}-${index}`} className="flex items-center space-x-3">
                                    <div className="bg-jade/20 p-2 rounded-lg">
                                        {index === 0 ? (
                                            <Clock className="h-5 w-5 text-jade" aria-hidden="true" />
                                        ) : index === 1 ? (
                                            <Shield className="h-5 w-5 text-jade" aria-hidden="true" />
                                        ) : (
                                            <Star className="h-5 w-5 text-jade" aria-hidden="true" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-dm-sans font-semibold">{feature.title}</p>
                                        <p className="text-sm text-gray-300">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-5">
                    <HeroBookingForm
                        labels={heroFormLabels}
                        placeholders={heroFormPlaceholders}
                        ariaLabels={heroAria}
                        submitLabel={heroSubmitLabel}
                        locale={locale}
                        locations={resolvedLocations}
                    />
                </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-20 right-10 w-20 h-20 bg-jade/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-20 left-10 w-32 h-32 bg-jade/5 rounded-full blur-2xl"></div>
        </section>
    );
};

export default HeroSection;
