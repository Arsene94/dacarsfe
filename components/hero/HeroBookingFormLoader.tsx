"use client";

import dynamic from "next/dynamic";

import type { HeroBookingFormProps } from "../HeroBookingForm";

const HeroBookingForm = dynamic<HeroBookingFormProps>(
    () => import("../HeroBookingForm"),
    {
        loading: () => <HeroBookingFormSkeleton />,
        ssr: false,
    },
);

function HeroBookingFormSkeleton() {
    return (
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
}

const HeroBookingFormLoader = (props: HeroBookingFormProps) => {
    return <HeroBookingForm {...props} />;
};

export { HeroBookingFormLoader, HeroBookingFormSkeleton };
