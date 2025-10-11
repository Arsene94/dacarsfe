import type { LocationOption } from "../HeroBookingForm";

type UnknownRecord = Record<string, unknown>;

export type HeroFeature = {
    title?: string;
    description?: string;
};

export const ensureStringRecord = (value: unknown): Record<string, string> => {
    if (!value || typeof value !== "object") {
        return {};
    }

    return Object.entries(value as UnknownRecord).reduce<Record<string, string>>(
        (acc, [key, entryValue]) => {
            if (typeof entryValue === "string") {
                acc[key] = entryValue;
            }
            return acc;
        },
        {},
    );
};

export const ensureAriaRecord = (value: unknown): Record<string, string> | undefined => {
    const record = ensureStringRecord(value);
    return Object.keys(record).length > 0 ? record : undefined;
};

export const ensureLocations = (value: unknown): LocationOption[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => {
            if (!entry || typeof entry !== "object") {
                return null;
            }

            const maybeLocation = entry as UnknownRecord;
            const label = maybeLocation.label;
            const locationValue = maybeLocation.value;

            const resolvedLabel = typeof label === "string" ? label : undefined;
            const resolvedValue = typeof locationValue === "string" ? locationValue : undefined;

            if (!resolvedLabel) {
                return null;
            }

            return {
                label: resolvedLabel,
                value: resolvedValue,
            } satisfies LocationOption;
        })
        .filter((entry): entry is LocationOption => entry !== null);
};

export const normalizeFeatures = (value: unknown): HeroFeature[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => {
            if (!entry || typeof entry !== "object") {
                return null;
            }

            const maybeFeature = entry as UnknownRecord;
            const title = maybeFeature.title;
            const description = maybeFeature.description;

            return {
                title: typeof title === "string" ? title : undefined,
                description: typeof description === "string" ? description : undefined,
            } satisfies HeroFeature;
        })
        .filter((entry): entry is HeroFeature => Boolean(entry?.title || entry?.description));
};
