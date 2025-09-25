"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Gift, Heart, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatOfferBadge } from "@/lib/offers";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { useTranslations } from "@/lib/i18n/useTranslations";
import type { Offer, OfferKind } from "@/types/offer";

type OfferCard = {
    title?: string;
    discount?: string;
    description?: string;
    features?: string[];
    color?: string;
    textColor?: string;
    icon?: "heart" | "users" | "gift" | "calendar" | "sparkles";
    ctaLabel?: string;
    ctaHref?: string;
};

type OffersMessages = {
    title?: { main?: string; highlight?: string };
    description?: string;
    cards?: OfferCard[];
    cta?: {
        primary?: string;
        secondaryTitle?: string;
        secondaryDescription?: string;
        secondaryButton?: string;
    };
};

const iconMap = {
    heart: Heart,
    users: Users,
    gift: Gift,
    calendar: Calendar,
    sparkles: Sparkles,
} as const;

const collectStringValues = (raw: unknown): string[] => {
    if (raw == null) {
        return [];
    }

    if (typeof raw === "string") {
        return raw
            .split(/[,;\n]+/)
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
    }

    if (typeof raw === "number" || typeof raw === "boolean") {
        const normalized = String(raw).trim();
        return normalized.length > 0 ? [normalized] : [];
    }

    if (Array.isArray(raw)) {
        return raw.flatMap((entry) => collectStringValues(entry));
    }

    if (typeof raw === "object") {
        return collectStringValues(Object.values(raw as Record<string, unknown>));
    }

    return [];
};

const parseOptionalString = (value: unknown): string | undefined => {
    if (value == null) {
        return undefined;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        const normalized = String(value).trim();
        return normalized.length > 0 ? normalized : undefined;
    }
    return undefined;
};

const resolveIconKey = (value: unknown): OfferCard["icon"] => {
    const candidate = parseOptionalString(value);
    if (!candidate) {
        return undefined;
    }
    const normalized = candidate.toLowerCase();
    if (normalized in iconMap) {
        return normalized as OfferCard["icon"];
    }
    return undefined;
};

const mapOfferToCard = (entry: Offer | Record<string, unknown>): OfferCard | null => {
    const source = entry as Record<string, unknown>;
    const title = parseOptionalString(source.title ?? (source as { name?: unknown }).name);
    if (!title) {
        return null;
    }

    const description = parseOptionalString(source.description);
    const offerType = parseOptionalString(
        source.offer_type ?? (source as { offerType?: unknown }).offerType,
    ) as OfferKind | undefined;
    const offerValue = parseOptionalString(
        source.offer_value ?? (source as { offerValue?: unknown }).offerValue,
    );
    const discount =
        parseOptionalString(
            source.discount_label ??
                (source as { discountLabel?: unknown }).discountLabel ??
                (source as { badge?: unknown }).badge,
        ) ?? formatOfferBadge(offerType ?? null, offerValue ?? null) ?? undefined;
    const color = parseOptionalString(source.background_class ?? (source as { backgroundClass?: unknown }).backgroundClass);
    const textColor = parseOptionalString(source.text_class ?? (source as { textClass?: unknown }).textClass);
    const ctaLabel = parseOptionalString(
        source.primary_cta_label ?? (source as { primaryCtaLabel?: unknown }).primaryCtaLabel ?? (source as { cta_label?: unknown }).cta_label,
    );
    const ctaHref = parseOptionalString(
        source.primary_cta_url ?? (source as { primaryCtaUrl?: unknown }).primaryCtaUrl ?? (source as { cta_url?: unknown }).cta_url,
    );

    return {
        title,
        description,
        discount,
        features: (() => {
            const benefits = collectStringValues(
                source.benefits ??
                    (source as { offer_benefits?: unknown }).offer_benefits ??
                    (source as { benefits_list?: unknown }).benefits_list,
            );
            const fallback = collectStringValues(
                source.features ??
                    (source as { feature_list?: unknown }).feature_list ??
                    (source as { perks?: unknown }).perks ??
                    (source as { highlights?: unknown }).highlights,
            );
            return benefits.length > 0 ? benefits : fallback;
        })(),
        color: color ?? undefined,
        textColor: textColor ?? undefined,
        icon: resolveIconKey(source.icon ?? (source as { icon_name?: unknown }).icon_name),
        ctaLabel: ctaLabel ?? undefined,
        ctaHref: ctaHref ?? undefined,
    };
};

const OffersSection = () => {
    const { messages, t } = useTranslations("home");
    const offers = (messages.offers ?? {}) as OffersMessages;
    const cards = offers.cards ?? [];
    const secondaryButton = offers.cta?.secondaryButton ?? "Rezervă cu reducere";

    const [remoteOffers, setRemoteOffers] = useState<OfferCard[]>([]);

    useEffect(() => {
        let cancelled = false;

        const fetchOffers = async () => {
            try {
                const response = await apiClient.getOffers({
                    audience: "public",
                    status: "published",
                    limit: 4,
                    sort: "-starts_at,-created_at",
                });
                if (cancelled) {
                    return;
                }
                const rawList = extractList(response);
                const mapped = rawList
                    .map((item) => mapOfferToCard(item as Offer))
                    .filter((item): item is OfferCard => item !== null);
                if (mapped.length > 0) {
                    setRemoteOffers(mapped);
                }
            } catch (error) {
                console.error("Nu am putut încărca ofertele publice", error);
            }
        };

        fetchOffers();

        return () => {
            cancelled = true;
        };
    }, []);

    const displayedCards = remoteOffers.length > 0 ? remoteOffers : cards;
    const remotePrimaryCtaLabel = remoteOffers.find((card) => card.ctaLabel)?.ctaLabel ?? null;
    const remotePrimaryHref = remoteOffers.find((card) => card.ctaHref)?.ctaHref ?? null;
    const primaryCtaLabel = remotePrimaryCtaLabel ?? offers.cta?.primary ?? "Profită acum";
    const primaryCtaHref = remotePrimaryHref ?? "/checkout";

    return (
        <section id="oferte" className="py-20 bg-berkeley">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16 animate-fade-in">
                    <h2 className="text-4xl lg:text-5xl font-poppins font-bold text-white mb-6">
                        {offers.title?.main ?? "Oferte"}{" "}
                        <span className="text-jadeLight">{offers.title?.highlight ?? "speciale"}</span>
                    </h2>
                    <p className="text-xl font-dm-sans text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        {t("offers.description", {
                            fallback: "Promoții exclusive pentru momentele importante din viața ta.",
                        })}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                    {displayedCards.map((offer, index) => {
                        const Icon = iconMap[(offer.icon ?? "heart") as keyof typeof iconMap] ?? Heart;
                        const ctaLabel = offer.ctaLabel ?? primaryCtaLabel;
                        const ctaHref = offer.ctaHref ?? primaryCtaHref;
                        return (
                            <div
                                key={`${offer.title}-${index}`}
                                className={`${offer.color ?? "bg-gradient-to-br from-jade to-emerald-600"} rounded-3xl p-8 relative overflow-hidden group transform hover:scale-105 transition-all duration-300 animate-slide-up`}
                                style={{ animationDelay: `${index * 0.2}s` }}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>

                                <div className={`${offer.textColor ?? "text-white"} relative z-10`}>
                                    <div className="flex items-center space-x-4 mb-6">
                                        <div className="bg-white/20 p-3 rounded-2xl">
                                            <Icon className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-poppins font-bold">{offer.title}</h3>
                                            <div className="text-3xl font-poppins font-bold text-yellow-300">
                                                {offer.discount}
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-lg font-dm-sans mb-6 opacity-90 leading-relaxed">
                                        {offer.description}
                                    </p>

                                    <div className="space-y-2 mb-8">
                                        {offer.features?.map((feature, featureIndex) => (
                                            <div key={`${feature}-${featureIndex}`} className="flex items-center space-x-3">
                                                <Gift className="h-4 w-4 text-yellow-300" />
                                                <span className="font-dm-sans">{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <Link href={ctaHref} aria-label={ctaLabel ?? primaryCtaLabel}>
                                        <Button
                                            className="px-6 py-3 bg-white !text-berkeley hover:!bg-gray-100"
                                            aria-label={ctaLabel ?? primaryCtaLabel}
                                        >
                                            {ctaLabel ?? primaryCtaLabel}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="bg-gradient-to-r from-jade/20 to-jade/10 border border-jade/30 rounded-2xl p-8 text-center">
                    <Calendar className="h-12 w-12 text-jade mx-auto mb-4" />
                    <h3 className="text-2xl font-poppins font-bold text-white mb-4">
                        {offers.cta?.secondaryTitle ?? "Ofertă limitată de sezon"}
                    </h3>
                    <p className="text-gray-300 font-dm-sans mb-6 max-w-2xl mx-auto">
                        {offers.cta?.secondaryDescription ??
                            "Rezervă acum pentru perioada sărbătorilor și beneficiezi de tarife preferențiale și servicii premium incluse."}
                    </p>
                    <Link href="/checkout" aria-label={secondaryButton}>
                        <Button className="px-8 py-4" aria-label={secondaryButton}>
                            {secondaryButton}
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default OffersSection;
