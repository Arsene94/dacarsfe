import { AVAILABLE_LOCALES, DEFAULT_LOCALE, type Locale } from "./config";

const SUPPORTED_LOCALES = new Set<string>(AVAILABLE_LOCALES);

export const normalizeLocaleCandidate = (candidate: string | null | undefined): Locale | null => {
    if (!candidate) {
        return null;
    }

    const trimmed = candidate.trim().toLowerCase();
    if (!trimmed) {
        return null;
    }

    if (SUPPORTED_LOCALES.has(trimmed)) {
        return trimmed as Locale;
    }

    const base = trimmed.split(/[-_]/)[0];
    if (SUPPORTED_LOCALES.has(base)) {
        return base as Locale;
    }

    return null;
};

export const parseAcceptLanguage = (value: string | null | undefined): string[] => {
    if (!value) {
        return [];
    }

    return value
        .split(",")
        .map((part) => part.split(";")[0]?.trim())
        .filter((part): part is string => Boolean(part));
};

export const pickSupportedLocale = (
    candidates: Iterable<string | null | undefined>,
    fallbackLocale: Locale = DEFAULT_LOCALE,
): Locale => {
    for (const candidate of candidates) {
        const normalized = normalizeLocaleCandidate(candidate);
        if (normalized) {
            return normalized;
        }
    }

    return fallbackLocale;
};
