import { Clock, Shield, Star } from "lucide-react";

import { HeroBackground } from "@/components/HeroBackground";
import type { Locale } from "@/lib/i18n/config";

import HeroBookingForm from "./HeroBookingForm";
import type { HeroFeature } from "./hero/heroUtils";
import type { LocationOption } from "./HeroBookingForm";

const FEATURE_ICONS = [Clock, Shield, Star] as const;

type HeroSectionViewProps = {
    badge: string;
    title: string;
    subtitleLead: string;
    subtitleHighlight: string;
    features: HeroFeature[];
    form: {
        labels: Record<string, string>;
        placeholders: Record<string, string>;
        ariaLabels?: Record<string, string>;
        submitLabel: string;
        locale: Locale;
        locations: LocationOption[];
    };
};

const HeroSectionView = ({
    badge,
    title,
    subtitleLead,
    subtitleHighlight,
    features,
    form,
}: HeroSectionViewProps) => {
    return (
        <section className="relative bg-berkeley text-white overflow-hidden">
            <div className="absolute inset-0">
                <div className="relative h-full w-full">
                    <HeroBackground />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-berkeley/90 to-berkeley/70 z-10" />
            </div>

            <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:pt-32">
                <div className="grid lg:grid-cols-1 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center px-4 py-2 bg-jade/40 rounded-full mb-6">
                            <Star className="h-4 w-4 text-white mr-2" />
                            <span className="text-white font-dm-sans font-medium">{badge}</span>
                        </div>

                        <h1 className="text-4xl lg:text-6xl font-poppins font-bold leading-tight mb-6">
                            {title}
                        </h1>

                        <p className="text-xl lg:text-2xl font-dm-sans text-gray-200 mb-8 leading-relaxed">
                            {subtitleLead}
                            <br />
                            <span className="text-jadeLight font-semibold">{subtitleHighlight}</span>
                        </p>

                        <div
                            className="hidden sm:grid sm:grid-cols-3 gap-6"
                            style={{ contentVisibility: "auto", containIntrinsicSize: "240px" }}
                        >
                            {features.map((feature, index) => {
                                const Icon = FEATURE_ICONS[index] ?? Star;

                                return (
                                    <div key={`${feature.title}-${index}`} className="flex items-center space-x-3">
                                        <div className="bg-jade/20 p-2 rounded-lg">
                                            <Icon className="h-5 w-5 text-jade" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <p className="font-dm-sans font-semibold">{feature.title}</p>
                                            <p className="text-sm text-gray-300">{feature.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="mt-5">
                    <HeroBookingForm
                        labels={form.labels}
                        placeholders={form.placeholders}
                        ariaLabels={form.ariaLabels}
                        submitLabel={form.submitLabel}
                        locale={form.locale}
                        locations={form.locations}
                    />
                </div>
            </div>

            <div className="absolute top-20 right-10 w-20 h-20 bg-jade/10 rounded-full blur-xl" />
            <div className="absolute bottom-20 left-10 w-32 h-32 bg-jade/5 rounded-full blur-2xl" />
        </section>
    );
};

export type { HeroSectionViewProps };
export default HeroSectionView;
