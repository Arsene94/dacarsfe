"use client";

import React from "react";
import { FileX, Clock, Zap, DollarSign } from "lucide-react";
import { useTranslations } from "@/lib/i18n/useTranslations";

const iconSequence = [FileX, Clock, Zap, DollarSign];

type BenefitItem = { title?: string; description?: string };
type StatItem = { value?: string; label?: string };

type BenefitsMessages = {
    title?: { main?: string; highlight?: string };
    description?: string;
    items?: BenefitItem[];
    stats?: StatItem[];
};

const BenefitsSection = () => {
    const { messages, t } = useTranslations("home");
    const benefits = (messages.benefits ?? {}) as BenefitsMessages;
    const items = benefits.items ?? [];
    const stats = benefits.stats ?? [];

    return (
        <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16 animate-fade-in">
                    <h2 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
                        {benefits.title?.main ?? "De ce să alegi"}{" "}
                        <span className="text-jade">{benefits.title?.highlight ?? "DaCars"}</span>?
                    </h2>
                    <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        {t("benefits.description", {
                            fallback:
                                "Serviciu de încredere, creat special pentru românii care călătoresc și au nevoie de o mașină la întoarcerea acasă.",
                        })}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {items.map((benefit, index) => {
                        const Icon = iconSequence[index] ?? FileX;
                        return (
                            <div
                                key={`${benefit.title}-${index}`}
                                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group animate-slide-up"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="bg-jade/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-jade/20 transition-colors duration-300">
                                    <Icon className="h-8 w-8 text-jade" />
                                </div>

                                <h3 className="text-xl font-poppins font-semibold text-berkeley mb-4">
                                    {benefit.title}
                                </h3>

                                <p className="text-gray-600 font-dm-sans leading-relaxed">
                                    {benefit.description}
                                </p>

                                <div className="mt-6 w-0 h-1 bg-jade rounded-full group-hover:w-full transition-all duration-500"></div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {stats.map((entry, index) => (
                        <div className="text-center" key={`${entry.label}-${index}`}>
                            <div className="text-4xl font-poppins font-bold text-jade mb-2">{entry.value}</div>
                            <div className="text-gray-600 font-dm-sans">{entry.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default BenefitsSection;
