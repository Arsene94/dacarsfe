import HeroSectionClient, {
    type HeroSectionClientProps,
    type HeroSectionFeature,
} from "./HeroSectionClient";
import { resolveRequestLocale } from "@/lib/i18n/server";
import { getPageMessages } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/config";
import type { LocationOption } from "./HeroBookingForm";

type HeroMessages = {
    badge?: unknown;
    title?: unknown;
    subtitle?: unknown;
    features?: unknown;
    form?: unknown;
};

type HeroSubtitle = {
    lead?: unknown;
    highlight?: unknown;
};

type HeroFormMessages = {
    labels?: unknown;
    placeholders?: unknown;
    options?: unknown;
    submit?: unknown;
    aria?: unknown;
};

type HeroFormOptions = {
    locations?: unknown;
};

const DEFAULT_BADGE = "Te ținem aproape de casă";
const DEFAULT_TITLE = "Închiriere auto București - Otopeni";
const DEFAULT_SUBTITLE_LEAD = "Predare în aeroport în sub 5 minute.";
const DEFAULT_SUBTITLE_HIGHLIGHT = "Fără taxe ascunse.";
const DEFAULT_SUBMIT_LABEL = "Caută mașini";

const DEFAULT_FEATURES: HeroSectionFeature[] = [
    { title: "Sub 5 min", description: "Predare rapidă" },
    { title: "Fără taxe", description: "Preț transparent" },
    { title: "24/7", description: "Disponibil non-stop" },
];

const DEFAULT_FORM_LABELS: Record<string, string> = {
    pickup: "Data ridicare",
    return: "Data returnare",
    location: "Locația",
    carType: "Tip mașină",
};

const DEFAULT_FORM_PLACEHOLDERS: Record<string, string> = {
    location: "Alege locația",
    carType: "Toate tipurile",
};

const DEFAULT_FORM_ARIA: Record<string, string> = {
    submit: DEFAULT_SUBMIT_LABEL,
    location: "Alege locația de ridicare",
};

const DEFAULT_LOCATIONS: LocationOption[] = [
    { value: "otopeni", label: "Aeroport Otopeni" },
];

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value != null && !Array.isArray(value);
};

const pickString = (value: unknown, fallback: string): string => {
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
};

const toStringRecord = (
    value: unknown,
    fallback: Record<string, string>,
): Record<string, string> => {
    if (!isRecord(value)) {
        return fallback;
    }

    const entries = Object.entries(value).filter(([, entryValue]) => typeof entryValue === "string");

    if (entries.length === 0) {
        return fallback;
    }

    return entries.reduce<Record<string, string>>((acc, [key, entryValue]) => {
        acc[key] = entryValue as string;
        return acc;
    }, {});
};

const toOptionalStringRecord = (value: unknown): Record<string, string> | undefined => {
    if (!isRecord(value)) {
        return undefined;
    }

    const entries = Object.entries(value).filter(([, entryValue]) => typeof entryValue === "string");

    if (entries.length === 0) {
        return undefined;
    }

    return entries.reduce<Record<string, string>>((acc, [key, entryValue]) => {
        acc[key] = entryValue as string;
        return acc;
    }, {});
};

const toFeatures = (
    value: unknown,
    fallback: HeroSectionFeature[],
): HeroSectionFeature[] => {
    if (!Array.isArray(value)) {
        return fallback;
    }

    const features = value
        .map((entry) => {
            if (!isRecord(entry)) {
                return null;
            }

            const title = typeof entry.title === "string" ? entry.title : null;
            const description = typeof entry.description === "string" ? entry.description : null;

            if (!title || !description) {
                return null;
            }

            return { title, description } satisfies HeroSectionFeature;
        })
        .filter((entry): entry is HeroSectionFeature => entry != null);

    return features.length > 0 ? features : fallback;
};

const toLocations = (
    value: unknown,
    fallback: LocationOption[],
): LocationOption[] => {
    if (!Array.isArray(value)) {
        return fallback;
    }

    const locations = value
        .map((entry) => {
            if (!isRecord(entry)) {
                return null;
            }

            const optionValue = entry.value;
            const optionLabel = entry.label;

            if (typeof optionValue !== "string" || typeof optionLabel !== "string") {
                return null;
            }

            const location: LocationOption = { value: optionValue, label: optionLabel };

            return location;
        })
        .filter((entry): entry is LocationOption => entry != null);

    return locations.length > 0 ? locations : fallback;
};

export const buildHeroSectionProps = (
    locale: Locale,
): HeroSectionClientProps => {
    const messages = getPageMessages<Record<string, unknown>>("home", locale);
    const heroMessages = isRecord((messages.hero ?? {}) as unknown)
        ? ((messages.hero ?? {}) as HeroMessages)
        : {};

    const subtitle = isRecord(heroMessages.subtitle)
        ? (heroMessages.subtitle as HeroSubtitle)
        : {};

    const formMessages = isRecord(heroMessages.form)
        ? (heroMessages.form as HeroFormMessages)
        : {};

    const formOptions = isRecord(formMessages.options)
        ? (formMessages.options as HeroFormOptions)
        : {};

    const ariaLabels = toOptionalStringRecord(formMessages.aria) ?? DEFAULT_FORM_ARIA;

    return {
        locale,
        badge: pickString(heroMessages.badge, DEFAULT_BADGE),
        title: pickString(heroMessages.title, DEFAULT_TITLE),
        subtitleLead: pickString(subtitle.lead, DEFAULT_SUBTITLE_LEAD),
        subtitleHighlight: pickString(subtitle.highlight, DEFAULT_SUBTITLE_HIGHLIGHT),
        features: toFeatures(heroMessages.features, DEFAULT_FEATURES),
        formLabels: toStringRecord(formMessages.labels, DEFAULT_FORM_LABELS),
        formPlaceholders: toStringRecord(formMessages.placeholders, DEFAULT_FORM_PLACEHOLDERS),
        ariaLabels,
        submitLabel: pickString(formMessages.submit, DEFAULT_SUBMIT_LABEL),
        locations: toLocations(formOptions.locations, DEFAULT_LOCATIONS),
    } satisfies HeroSectionClientProps;
};

const HeroSection = async () => {
    const locale = await resolveRequestLocale();
    const heroProps = buildHeroSectionProps(locale);

    return <HeroSectionClient {...heroProps} />;
};

export default HeroSection;
