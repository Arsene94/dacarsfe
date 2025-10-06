"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    Calendar,
    Clock,
    MapPin,
    Shield,
    Star,
    Users,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useBooking } from "@/context/useBooking";
import { CarCategory } from "@/types/car";
import type { ApiListResult } from "@/types/api";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { trackMixpanelEvent } from "@/lib/mixpanelClient";
import { trackTikTokEvent, TIKTOK_EVENTS } from "@/lib/tiktokPixel";
import { trackMetaPixelEvent, META_PIXEL_EVENTS } from "@/lib/metaPixel";

import heroMobile3x from "@/public/images/bg-hero-mobile-960x1759.webp";
import heroDesktop from "@/public/images/bg-hero-1920x1080.webp";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const HeroSection = () => {
    const { messages, t, locale } = useTranslations("home");
    const heroMessages = (messages.hero ?? {}) as Record<string, unknown>;
    const heroForm = (heroMessages.form ?? {}) as Record<string, unknown>;
    const heroFormLabels = (heroForm.labels ?? {}) as Record<string, string>;
    const heroFormPlaceholders = (heroForm.placeholders ?? {}) as Record<string, string>;
    const heroOptions = (heroForm.options ?? {}) as Record<string, unknown>;
    const heroLocations = Array.isArray(heroOptions.locations)
        ? (heroOptions.locations as Array<{ value?: string; label?: string }>)
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

    const formatDate = (date: Date) => {
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const startOfDay = (date: Date) => {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    };

    const defaultDateRange = useMemo(() => {
        const now = new Date();
        const pickup = formatDate(now);
        const ret = formatDate(addDays(now, 1));
        return { pickup, ret };
    }, []);

    const [formData, setFormData] = useState(() => ({
        start_date: defaultDateRange.pickup,
        end_date: defaultDateRange.ret,
        location: resolvedLocations[0]?.value ?? "otopeni",
        car_type: "",
    }));
    const { booking, setBooking } = useBooking();

    const [categories, setCategories] = useState<CarCategory[]>([]);
    const router = useRouter();

    const minstart_date = defaultDateRange.pickup;

    const minend_date = formData.start_date
        ? formatDate(startOfDay(addDays(new Date(formData.start_date), 1)))
        : defaultDateRange.ret;

    const hasSyncedInitialBooking = useRef(false);

    useEffect(() => {
        if (!formData.start_date || !formData.end_date) {
            return;
        }

        const pickup = formData.start_date;
        const dropoff = formData.end_date;

        if (!hasSyncedInitialBooking.current) {
            hasSyncedInitialBooking.current = true;
            return;
        }

        if (booking.startDate === pickup && booking.endDate === dropoff) {
            return;
        }

        setBooking({
            ...booking,
            startDate: pickup,
            endDate: dropoff,
        });

        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("booking:dates-adjusted", {
                    detail: { startDate: pickup, endDate: dropoff },
                }),
            );
        }
    }, [booking, formData.end_date, formData.start_date, setBooking]);

    useEffect(() => {
        let cancelled = false;

        const getCategories = async () => {
            const res = await apiClient.getCarCategories({ language: locale });
            const list = extractList<Record<string, unknown>>(
                res as ApiListResult<Record<string, unknown>>,
            );

            const normalized: Array<{
                id: number;
                name: string;
                order?: number;
                status?: string | null;
            }> = [];

            list.forEach((entry) => {
                if (!isRecord(entry)) return;
                const idCandidate = entry.id ?? entry.value ?? entry.key;
                const id = Number(idCandidate);
                if (!Number.isFinite(id)) return;
                const nameSource = entry.name ?? entry.title ?? entry.label;
                if (typeof nameSource !== "string" || nameSource.trim().length === 0) return;
                normalized.push({
                    id,
                    name: nameSource.trim(),
                    order:
                        typeof entry.order === "number"
                            ? entry.order
                            : Number.isFinite(Number(entry.order))
                                ? Number(entry.order)
                                : undefined,
                    status:
                        typeof entry.status === "string"
                            ? entry.status
                            : null,
                });
            });

            if (
                normalized.length === 0 &&
                isRecord(res) &&
                !("data" in res) &&
                !("items" in res) &&
                !("results" in res) &&
                !("payload" in res)
            ) {
                Object.entries(res).forEach(([id, name]) => {
                    const numericId = Number(id);
                    if (!Number.isFinite(numericId)) return;
                    const title = typeof name === "string" ? name : String(name);
                    if (title.trim().length === 0) return;
                    normalized.push({ id: numericId, name: title.trim() });
                });
            }

            const cat: CarCategory[] = normalized
                .filter((item) => !item.status || item.status === "published")
                .map(({ id, name, order }) => ({ id, name, order }));

            cat.sort((a, b) => {
                const ao = a.order ?? Number.POSITIVE_INFINITY;
                const bo = b.order ?? Number.POSITIVE_INFINITY;
                return ao - bo || a.id - b.id;
            });

            if (!cancelled) {
                setCategories(cat);
            }
        };

        getCategories();
        return () => {
            cancelled = true;
        };
    }, [locale]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSelectChange = (name: string) => (value: string) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const params = new URLSearchParams();
        params.set("start_date", formData.start_date);
        params.set("end_date", formData.end_date);

        if (formData.car_type) params.set("car_type", formData.car_type);
        if (formData.location) params.set("location", formData.location);

        trackMixpanelEvent("hero_search_submitted", {
            start_date: formData.start_date,
            end_date: formData.end_date,
            location: formData.location || null,
            car_type: formData.car_type || null,
            booking_synced:
                booking.startDate === formData.start_date &&
                booking.endDate === formData.end_date,
        });

        trackTikTokEvent(TIKTOK_EVENTS.SEARCH, {
            search_type: "hero_form",
            start_date: formData.start_date,
            end_date: formData.end_date,
            location: formData.location || undefined,
            car_type: formData.car_type || undefined,
        });

        const searchString = [formData.location, formData.car_type]
            .filter((value) => typeof value === "string" && value.trim().length > 0)
            .join(" | ");

        trackMetaPixelEvent(META_PIXEL_EVENTS.SEARCH, {
            search_source: "hero_form",
            start_date: formData.start_date || undefined,
            end_date: formData.end_date || undefined,
            location: formData.location || undefined,
            car_type: formData.car_type || undefined,
            search_string: searchString.length > 0 ? searchString : undefined,
        });

        router.push(`/cars?${params.toString()}`);
    };

    const fieldWrapperClass = "space-y-2 w-full";
    const controlClass = "h-12 w-full text-sm sm:text-base min-h-[3rem] max-h-[3rem]";
    const dateTimeControlClass = `${controlClass} pl-10 pr-4 datetime-field`;
    const selectControlClass = `${controlClass} pl-10 pr-10 text-[#191919]`;

    return (
        <section className="relative bg-berkeley text-white overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
                <div className="relative h-full w-full sm:hidden">
                    <Image
                        src={heroMobile3x}
                        alt="Fundal aeroport"
                        fill
                        priority
                        placeholder="blur"
                        fetchPriority="high"
                        sizes="100vw"
                        quality={70}
                        className="object-cover"
                    />
                </div>
                <div className="relative hidden h-full w-full sm:block">
                    <Image
                        src={heroDesktop}
                        alt="Fundal aeroport"
                        fill
                        priority
                        placeholder="blur"
                        fetchPriority="high"
                        sizes="100vw"
                        quality={70}
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

                        {/*<div className="hidden sm:flex flex-col sm:flex-row gap-4 mb-8">*/}
                        {/*  <Link href="/checkout" aria-label="Rezervă mașina">*/}
                        {/*    <Button*/}
                        {/*      className="transform hover:scale-105 shadow-xl group"*/}
                        {/*      aria-label="Rezervă mașina"*/}
                        {/*    >*/}
                        {/*      Rezervă mașina*/}
                        {/*      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />*/}
                        {/*    </Button>*/}
                        {/*  </Link>*/}

                        {/*  <Button*/}
                        {/*    variant="outline"*/}
                        {/*    className="border-white/30 text-white hover:bg-white/10"*/}
                        {/*    aria-label="Vezi flota"*/}
                        {/*  >*/}
                        {/*    Vezi flota*/}
                        {/*  </Button>*/}
                        {/*</div>*/}

                        {/* Features */}
                        <div className="hidden sm:grid sm:grid-cols-3 gap-6">
                            {heroFeatures.map(
                                (feature, index) => (
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
                                ),
                            )}
                        </div>
                    </div>

                    {/*<div className="hidden sm:block animate-slide-in-right">*/}
                    {/*  <div className="relative">*/}
                    {/*    <div className="absolute -inset-4 bg-gradient-to-r from-jade/20 to-transparent rounded-2xl blur-2xl"></div>*/}
                    {/*    <Image*/}
                    {/*      src="https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=600"*/}
                    {/*      alt="Mașină elegantă"*/}
                    {/*      width={600}*/}
                    {/*      height={400}*/}
                    {/*      className="relative rounded-2xl shadow-2xl"*/}
                    {/*      loading="lazy"*/}
                    {/*    />*/}
                    {/*  </div>*/}
                    {/*</div>*/}
                </div>

                <div className="mt-5">
                    <form
                        onSubmit={handleSubmit}
                        className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5"
                    >
                        <div className={fieldWrapperClass}>
                            <Label
                                htmlFor="hero-pickup-date"
                                className="text-sm text-white font-medium font-['DM_Sans']"
                            >
                                {heroFormLabels.pickup ?? "Data ridicare"}
                            </Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    id="hero-pickup-date"
                                    type="datetime-local"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleInputChange}
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                    min={minstart_date}
                                    className={`${dateTimeControlClass} appearance-none flex items-center`}
                                    style={{
                                        minHeight: '3rem',
                                        maxHeight: '3rem',
                                        height: '3rem',
                                        lineHeight: '1.5'
                                    }}
                                />
                            </div>
                        </div>

                        <div className={fieldWrapperClass}>
                            <Label
                                htmlFor="hero-return-date"
                                className="text-sm text-white font-medium font-['DM_Sans']"
                            >
                                {heroFormLabels.return ?? "Data returnare"}
                            </Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    id="hero-return-date"
                                    type="datetime-local"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleInputChange}
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                    min={minend_date}
                                    className={`${dateTimeControlClass} appearance-none flex items-center`}
                                    style={{
                                        minHeight: '3rem',
                                        maxHeight: '3rem',
                                        height: '3rem',
                                        lineHeight: '1.5'
                                    }}
                                />
                            </div>
                        </div>

                        <div className={fieldWrapperClass}>
                            <Label
                                htmlFor="hero-location"
                                className="text-sm text-white font-medium font-['DM_Sans']"
                            >
                                {heroFormLabels.location ?? "Locația"}
                            </Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Select
                                    id="hero-location"
                                    className={selectControlClass}
                                    value={formData.location}
                                    onValueChange={handleSelectChange("location")}
                                    placeholder={heroFormPlaceholders.location ?? "Alege locația"}
                                    style={{
                                        minHeight: '3rem',
                                        maxHeight: '3rem',
                                        height: '3rem',
                                        lineHeight: '1.5'
                                    }}
                                >
                                    {resolvedLocations.map((option) => (
                                        <option key={option.value ?? "default"} value={option.value ?? ""}>
                                            {option.label ?? option.value}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div className={fieldWrapperClass}>
                            <Label
                                htmlFor="hero-car-type"
                                className="text-sm text-white font-medium font-['DM_Sans']"
                            >
                                {heroFormLabels.carType ?? "Tip mașină"}
                            </Label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Select
                                    id="hero-car-type"
                                    className={selectControlClass}
                                    value={formData.car_type}
                                    onValueChange={handleSelectChange("car_type")}
                                    style={{
                                        minHeight: '3rem',
                                        maxHeight: '3rem',
                                        height: '3rem',
                                        lineHeight: '1.5'
                                    }}
                                >
                                    <option value="">{heroFormPlaceholders.carType ?? "Toate tipurile"}</option>
                                    {categories?.map((category) => {
                                        return (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        );
                                    })}
                                </Select>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="px-6 py-3 self-end"
                            aria-label={heroAria?.submit ?? heroSubmitLabel}
                        >
                            {heroSubmitLabel}
                        </Button>
                    </form>
                </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-20 right-10 w-20 h-20 bg-jade/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-20 left-10 w-32 h-32 bg-jade/5 rounded-full blur-2xl"></div>
        </section>
    );
};

export default HeroSection;
