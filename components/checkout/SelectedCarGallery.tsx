"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type SelectedCarGalleryProps = {
    images: string[];
    carName: string;
    priority?: boolean;
};

const SelectedCarGallery = ({ images, carName, priority = false }: SelectedCarGalleryProps) => {
    const normalizedImages = useMemo(
        () => images.filter((src) => typeof src === "string" && src.trim().length > 0),
        [images],
    );
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (normalizedImages.length === 0) {
            setCurrentIndex(0);
            return;
        }
        setCurrentIndex((prev) => {
            if (prev < normalizedImages.length) {
                return prev;
            }
            return normalizedImages.length - 1;
        });
    }, [normalizedImages]);

    if (normalizedImages.length === 0) {
        return null;
    }

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev === 0 ? normalizedImages.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === normalizedImages.length - 1 ? 0 : prev + 1));
    };

    const activeImage = normalizedImages[currentIndex];
    const showNavigation = normalizedImages.length > 1;

    return (
        <section className="space-y-4" aria-label={`Galerie ${carName}`}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-100">
                <Image
                    src={activeImage}
                    alt={`${carName} — imagine ${currentIndex + 1}`}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 640px, 100vw"
                    priority={priority}
                />
                {showNavigation && (
                    <>
                        <button
                            type="button"
                            onClick={handlePrev}
                            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-berkeley shadow-lg transition hover:bg-white"
                            aria-label="Imaginea anterioară"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-berkeley shadow-lg transition hover:bg-white"
                            aria-label="Imaginea următoare"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </>
                )}
                {showNavigation && (
                    <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
                        {currentIndex + 1}/{normalizedImages.length}
                    </div>
                )}
            </div>
            {showNavigation && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                    {normalizedImages.map((src, index) => (
                        <button
                            key={`${src}-${index}`}
                            type="button"
                            onClick={() => setCurrentIndex(index)}
                            className="focus:outline-none"
                            aria-label={`Afișează imaginea ${index + 1}`}
                            aria-current={index === currentIndex}
                        >
                            <div
                                className={cn(
                                    "relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition",
                                    index === currentIndex
                                        ? "border-jade shadow-md"
                                        : "border-transparent opacity-70 hover:opacity-100",
                                )}
                            >
                                <Image
                                    src={src}
                                    alt={`${carName} thumbnail ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="96px"
                                    loading="lazy"
                                />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
};

export default SelectedCarGallery;
