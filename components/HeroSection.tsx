import { resolveRequestLocale, getFallbackLocale } from "@/lib/i18n/serverLocale";
import { getPageMessages } from "@/lib/i18n/translations";
import { getNestedValue } from "@/lib/i18n/utils";
import { formatMessage, type TranslateOptions } from "@/lib/i18n/formatMessage";
import type { Locale } from "@/lib/i18n/config";
import HeroSectionView, { type HeroSectionViewProps } from "./HeroSectionView";
import {
    ensureAriaRecord,
    ensureLocations,
    ensureStringRecord,
    normalizeFeatures,
    type HeroFeature,
} from "./hero/heroUtils";
import type { LocationOption } from "./HeroBookingForm";

type HeroMessages = {
    hero?: {
        form?: {
            labels?: Record<string, unknown>;
            placeholders?: Record<string, unknown>;
            aria?: Record<string, unknown>;
            submit?: unknown;
            options?: {
                locations?: unknown;
            };
        };
        features?: HeroFeature[];
    };
};

const createTranslator = (
    messages: Record<string, unknown>,
    locale: Locale,
) => {
    return (path: string, options?: TranslateOptions) => {
        const raw = getNestedValue(messages, path);
        return formatMessage(raw, locale, options ?? {});
    };
};

const FALLBACK_SUBMIT_LABEL = "Caută mașini";
const FALLBACK_LOCATION: LocationOption = { value: "otopeni", label: "Aeroport Otopeni" };

const HeroSection = async () => {
    const locale = await resolveRequestLocale({ fallbackLocale: getFallbackLocale() });
    const pageMessages = getPageMessages<HeroMessages & Record<string, unknown>>("home", locale);
    const heroMessages = (pageMessages.hero ?? {}) as HeroMessages["hero"];
    const heroForm = heroMessages?.form ?? {};

    const translate = createTranslator(pageMessages, locale);

    const labels = ensureStringRecord(heroForm.labels);
    const placeholders = ensureStringRecord(heroForm.placeholders);
    const ariaLabels = ensureAriaRecord(heroForm.aria);
    const heroLocations = ensureLocations(heroForm.options?.locations);
    const resolvedLocations = heroLocations.length > 0 ? heroLocations : [FALLBACK_LOCATION];
    const heroSubmitLabel = formatMessage(
        heroForm.submit,
        locale,
        { fallback: FALLBACK_SUBMIT_LABEL },
    );
    const heroFeatures = normalizeFeatures(heroMessages?.features);

    const heroSectionProps: HeroSectionViewProps = {
        badge: translate("hero.badge", {
            fallback: "Te ținem aproape de casă",
        }),
        title: translate("hero.title", {
            fallback: "Închiriere auto București - Otopeni",
        }),
        subtitleLead: translate("hero.subtitle.lead", {
            fallback: "Predare în aeroport în sub 5 minute.",
        }),
        subtitleHighlight: translate("hero.subtitle.highlight", {
            fallback: "Fără taxe ascunse.",
        }),
        features: heroFeatures,
        form: {
            labels,
            placeholders,
            ariaLabels,
            submitLabel: heroSubmitLabel,
            locale,
            locations: resolvedLocations,
        },
    };

    return <HeroSectionView {...heroSectionProps} />;
};

export default HeroSection;
export { default as HeroSectionClient } from "./HeroSectionClient";
