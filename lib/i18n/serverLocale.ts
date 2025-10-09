import { cookies, headers } from "next/headers";

import {
    AVAILABLE_LOCALES,
    DEFAULT_LOCALE,
    LOCALE_STORAGE_KEY,
    type Locale,
} from "./config";

const SUPPORTED_LOCALES = new Set<string>(AVAILABLE_LOCALES);

const normalizeLocaleCandidate = (candidate: string | null | undefined): Locale | null => {
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

const parseAcceptLanguage = (value: string | null): string[] => {
    if (!value) {
        return [];
    }

    return value
        .split(",")
        .map((part) => part.split(";")[0]?.trim())
        .filter((part): part is string => Boolean(part));
};

type ResolveRequestLocaleOptions = {
    fallbackLocale?: Locale;
    cookieKey?: string;
    headerName?: string;
};

export const resolveRequestLocale = (
    options: ResolveRequestLocaleOptions = {},
): Locale => {
    const fallbackLocale = options.fallbackLocale ?? DEFAULT_LOCALE;
    const cookieKey = options.cookieKey ?? LOCALE_STORAGE_KEY;
    const headerName = options.headerName ?? "accept-language";

    const cookieStore = cookies();
    const cookieLocale = normalizeLocaleCandidate(cookieStore.get(cookieKey)?.value);
    if (cookieLocale) {
        return cookieLocale;
    }

    const acceptedLocales = parseAcceptLanguage(headers().get(headerName));
    for (const candidate of acceptedLocales) {
        const normalized = normalizeLocaleCandidate(candidate);
        if (normalized) {
            return normalized;
        }
    }

    return fallbackLocale;
};

export const getSupportedLocales = (): readonly Locale[] => AVAILABLE_LOCALES;

export const getFallbackLocale = (): Locale => DEFAULT_LOCALE;
