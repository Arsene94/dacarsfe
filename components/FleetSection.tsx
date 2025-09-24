"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Users,
    Fuel,
    Settings,
    Star,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { extractList } from "@/lib/apiResponse";
import JsonLd from "@/components/seo/JsonLd";
import {
    createVehicleItemListStructuredData,
    mapFleetCarsToStructuredData,
} from "@/lib/seo/structuredData";
import { siteMetadata } from "@/lib/seo/siteMetadata";
import { ApiCar, FleetCar } from "@/types/car";
import { usePublicContentSection } from "@/context/PublicContentContext";
import { HOME_FLEET_COPY_FALLBACK } from "@/lib/publicContent/defaults";
import { formatTemplate } from "@/lib/publicContent/utils";

const STORAGE_BASE =
    process.env.NEXT_PUBLIC_STORAGE_URL ?? "https://backend.dacars.ro/storage";
const siteUrl = siteMetadata.siteUrl;
const featuredFleetUrl = `${siteUrl}/cars`;

const toImageUrl = (p?: string | null): string => {
    if (!p) return "/images/placeholder-car.svg";
    if (/^https?:\/\//i.test(p)) return p;
    const base = STORAGE_BASE.replace(/\/$/, "");
    const path = p.replace(/^\//, "");
    return `${base}/${path}`;
};

const parsePrice = (priceText?: string | null): number | undefined => {
    if (!priceText) return undefined;
    const m = priceText.match(/([\d.,]+)/);
    if (!m) return undefined;
    const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
};

const resolvePrimaryImage = (car: ApiCar): string | null => {
    const candidates: Array<unknown> = [
        car.image_preview,
        car.image,
        car.thumbnail,
        car.cover_image,
    ];
    if (Array.isArray(car.images)) {
        candidates.push(
            car.images.find((value) => typeof value === "string" && value.trim().length > 0) ?? null,
        );
    } else if (car.images && typeof car.images === "object") {
        candidates.push(
            Object.values(car.images).find(
                (value) => typeof value === "string" && value.trim().length > 0,
            ) ?? null,
        );
    }
    if (car.type && typeof car.type === "object" && car.type !== null) {
        candidates.push(car.type.image ?? null);
    }
    const primary = candidates.find(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
    );
    return primary ?? null;
};

const toSafeNumber = (value: unknown): number | undefined => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
};

const resolveRelationName = (relation: unknown, fallback: string): string => {
    if (typeof relation === "string") {
        const trimmed = relation.trim();
        return trimmed.length > 0 ? trimmed : fallback;
    }
    if (relation && typeof relation === "object" && "name" in relation) {
        const candidate = (relation as { name?: unknown }).name;
        if (typeof candidate === "string") {
            const trimmed = candidate.trim();
            if (trimmed.length > 0) {
                return trimmed;
            }
        }
    }
    return fallback;
};

const FleetSection = () => {
    const copy = usePublicContentSection("home.fleet", HOME_FLEET_COPY_FALLBACK);
    const [cars, setCars] = useState<FleetCar[]>([]);
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const response = await apiClient.getHomePageCars({ limit: 4 });
            const list = extractList<ApiCar>(response);

            const mapped: FleetCar[] = list.map((c) => ({
                id: c.id,
                name: c.name ?? "Autovehicul",
                type: (c.type?.name ?? "—").trim(),
                icon: toImageUrl(resolvePrimaryImage(c)),
                number_of_seats: toSafeNumber(c.number_of_seats) ?? 0,
                price:
                    c.rental_rate != null
                        ? Number(c.rental_rate)
                        : parsePrice(c.price_text),
                transmission: { name: resolveRelationName(c.transmission, "—") },
                fuel: { name: resolveRelationName(c.fuel, "—") },
                categories: {
                    id:
                        typeof c.categories?.[0]?.id === "number"
                            ? c.categories[0].id
                            : Number(c.categories?.[0]?.id ?? 0),
                    name: c.categories?.[0]?.name ?? "—",
                },
                rating: typeof c.avg_review === "number" ? c.avg_review : undefined,
            }));

            if (!cancelled) setCars(mapped);
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const nextSlide = useCallback(() => {
        setCurrent((prev) => (prev + 1) % Math.max(cars.length, 1));
    }, [cars.length]);
    const prevSlide = useCallback(() => {
        setCurrent((prev) =>
            (prev - 1 + Math.max(cars.length, 1)) % Math.max(cars.length, 1)
        );
    }, [cars.length]);

    useEffect(() => {
        if (cars.length <= 1) return;
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (mq.matches) return;
        const id = setInterval(nextSlide, 5000);
        return () => clearInterval(id);
    }, [cars.length, nextSlide]);

    const structuredData = useMemo(() => {
        if (cars.length === 0) {
            return null;
        }

        const mapped = mapFleetCarsToStructuredData(cars, siteUrl).map((item) => ({
            ...item,
            url: `${featuredFleetUrl}#car-${item.id}`,
        }));

        return createVehicleItemListStructuredData(mapped, {
            baseUrl: siteUrl,
            pageUrl: `${siteUrl}/`,
            name: "Mașini recomandate din flota DaCars",
            description: "Selecție curentă de vehicule populare disponibile pentru închiriere la DaCars.",
            currency: "EUR",
        });
    }, [cars]);

    const CarCard = ({ car, index }: { car: FleetCar; index: number }) => (
        <div
            className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100 animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            <div className="relative overflow-hidden h-48">
                <Image
                    src={car.icon}
                    alt={car.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    loading={index < 2 ? "eager" : "lazy"}
                    priority={index < 2}
                />
                <div className="absolute top-4 left-4 bg-jade text-white px-3 py-1 rounded-full text-sm font-dm-sans font-semibold">
                    {car.categories.name}
                </div>
                {/*<div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center space-x-1">*/}
                {/*    <Star className="h-4 w-4 text-yellow-400 fill-current" />*/}
                {/*    <span className="text-sm font-dm-sans font-semibold text-berkeley">*/}
                {/*        {car.rating ?? "—"}*/}
                {/*    </span>*/}
                {/*</div>*/}
            </div>

            <div className="p-6">
                <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">
                    {car.name}
                </h3>

                <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-600 font-dm-sans">
                        <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-jade" />
                            <span>
                                {formatTemplate(copy.passengersTemplate, {
                                    count: car.number_of_seats,
                                })}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Settings className="h-4 w-4 text-jade" />
                            <span>{car.transmission.name}</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 font-dm-sans">
                        <Fuel className="h-4 w-4 text-jade" />
                        <span>{car.fuel.name}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        {/*<span className="text-2xl font-poppins font-bold text-berkeley">*/}
                        {/*    {car.price != null ? ` de la ${car.price}€` : "—"}*/}
                        {/*</span>*/}
                        {/*<span className="text-gray-600 font-dm-sans">/zi</span>*/}
                    </div>

                    {/*<Link*/}
                    {/*    href="/checkout"*/}
                    {/*    className="px-4 py-2 bg-jade text-white font-dm-sans font-semibold rounded-lg hover:bg-jade/90 transition-colors duration-300"*/}
                    {/*    aria-label="Rezervă"*/}
                    {/*>*/}
                    {/*    Rezervă*/}
                    {/*</Link>*/}
                </div>
            </div>
        </div>
    );

    return (
        <section id="flota" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {structuredData && (
                    <JsonLd data={structuredData} id="dacars-featured-cars" />
                )}
                <div className="text-center mb-16 animate-fade-in">
                    <h2
                        className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6"
                        dangerouslySetInnerHTML={{ __html: copy.heading.title }}
                    />
                    <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        {copy.heading.description}
                    </p>
                </div>

                <div
                    className="md:hidden relative overflow-hidden"
                    role="region"
                    aria-label={copy.carousel.regionAriaLabel}
                >
                    <div
                        className="flex transition-transform duration-700 ease-out"
                        style={{ transform: `translateX(-${current * 100}%)` }}
                        aria-live="polite"
                    >
                        {cars.map((car, index) => (
                            <div
                                key={car.id}
                                className="min-w-full"
                                role="group"
                                aria-roledescription="slide"
                                aria-label={formatTemplate(copy.carousel.slideLabelTemplate, {
                                    current: index + 1,
                                    total: cars.length,
                                })}
                            >
                                <CarCard car={car} index={index} />
                            </div>
                        ))}
                    </div>

                    {cars.length > 1 && (
                        <>
                            <button
                                onClick={prevSlide}
                                aria-label={copy.carousel.previousAriaLabel}
                                className="absolute top-1/2 left-2 -translate-y-1/2 p-2 rounded-full bg-white/80 shadow hover:bg-white"
                            >
                                <ChevronLeft className="h-5 w-5 text-jade" />
                            </button>
                            <button
                                onClick={nextSlide}
                                aria-label={copy.carousel.nextAriaLabel}
                                className="absolute top-1/2 right-2 -translate-y-1/2 p-2 rounded-full bg-white/80 shadow hover:bg-white"
                            >
                                <ChevronRight className="h-5 w-5 text-jade" />
                            </button>
                        </>
                    )}
                </div>

                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {cars.map((car, index) => (
                        <CarCard key={car.id} car={car} index={index} />
                    ))}
                </div>

                <div className="text-center mt-12">
                    <Link href={copy.cta.href} aria-label={copy.cta.ariaLabel}>
                        <Button
                            aria-label={copy.cta.ariaLabel}
                            variant="outline"
                            className="border-jade text-jade hover:bg-jade hover:text-white"
                        >
                            {copy.cta.label}
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default FleetSection;
