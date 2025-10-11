"use client";

import { useMemo } from "react";

import HeroSectionView from "./HeroSectionView";
import {
    ensureAriaRecord,
    ensureLocations,
    ensureStringRecord,
    normalizeFeatures,
} from "./hero/heroUtils";
import { useTranslations } from "@/lib/i18n/useTranslations";

const FALLBACK_SUBMIT_LABEL = "Caută mașini";
const FALLBACK_LOCATION = { value: "otopeni", label: "Aeroport Otopeni" } as const;

const HeroSectionClient = () => {
    const { messages, t, locale } = useTranslations("home");
    const heroMessagesRecord = (messages.hero ?? {}) as Record<string, unknown>;
    const heroFormRecord = (heroMessagesRecord.form ?? {}) as Record<string, unknown>;
    const heroOptionsRecord = (heroFormRecord.options ?? {}) as Record<string, unknown>;

    const labels = ensureStringRecord(heroFormRecord.labels);
    const placeholders = ensureStringRecord(heroFormRecord.placeholders);
    const ariaLabels = ensureAriaRecord(heroFormRecord.aria);
    const heroLocations = ensureLocations(heroOptionsRecord.locations);
    const resolvedLocations = heroLocations.length > 0 ? heroLocations : [FALLBACK_LOCATION];
    const heroSubmitLabel = typeof heroFormRecord.submit === "string"
        ? heroFormRecord.submit
        : FALLBACK_SUBMIT_LABEL;

    const heroFeatures = useMemo(
        () => normalizeFeatures(heroMessagesRecord.features),
        [heroMessagesRecord.features],
    );

    return (
        <HeroSectionView
            badge={t("hero.badge", { fallback: "Te ținem aproape de casă" })}
            title={t("hero.title", { fallback: "Închiriere auto București - Otopeni" })}
            subtitleLead={t("hero.subtitle.lead", { fallback: "Predare în aeroport în sub 5 minute." })}
            subtitleHighlight={t("hero.subtitle.highlight", { fallback: "Fără taxe ascunse." })}
            features={heroFeatures}
            form={{
                labels,
                placeholders,
                ariaLabels,
                submitLabel: heroSubmitLabel,
                locale,
                locations: resolvedLocations,
            }}
        />
    );
};

export default HeroSectionClient;
