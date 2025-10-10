import { cookies, headers } from "next/headers";
import * as React from "react";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { isLocale } from "@/lib/i18n/utils";

const LOCALE_COOKIE_KEYS = ["dacars.locale", "NEXT_LOCALE", "locale"] as const;

const LOCALE_ALIASES: Record<string, Locale> = {
    "ro-ro": "ro",
    "ro": "ro",
    "en-us": "en",
    "en-gb": "en",
    "en": "en",
    "it-it": "it",
    "it": "it",
    "es-es": "es",
    "es": "es",
    "fr-fr": "fr",
    "fr": "fr",
    "de-de": "de",
    "de": "de",
};

const normalizeLocaleCandidate = (candidate: string | undefined | null): Locale | null => {
    if (!candidate) {
        return null;
    }

    const lower = candidate.trim().toLowerCase();
    if (lower.length === 0) {
        return null;
    }

    if (LOCALE_ALIASES[lower]) {
        return LOCALE_ALIASES[lower];
    }

    const base = lower.split(/[\-_]/)[0];
    if (base && LOCALE_ALIASES[base]) {
        return LOCALE_ALIASES[base];
    }

    if (isLocale(lower)) {
        return lower;
    }

    if (base && isLocale(base)) {
        return base;
    }

    return null;
};

const ACCEPT_LANGUAGE_SPLITTER = /\s*,\s*/;

const parseAcceptLanguage = (headerValue: string | null): Locale | null => {
    if (!headerValue) {
        return null;
    }

    const entries = headerValue.split(ACCEPT_LANGUAGE_SPLITTER);
    for (const entry of entries) {
        const [languagePart] = entry.split(";");
        const locale = normalizeLocaleCandidate(languagePart);
        if (locale) {
            return locale;
        }
    }

    return null;
};

const resolveRequestLocaleUncached = async (): Promise<Locale> => {
    const cookieStore = await cookies();
    for (const key of LOCALE_COOKIE_KEYS) {
        const value = cookieStore.get(key)?.value;
        const locale = normalizeLocaleCandidate(value);
        if (locale) {
            return locale;
        }
    }

    const headerList = await headers();
    const headerLocale = parseAcceptLanguage(headerList.get("accept-language"));
    if (headerLocale) {
        return headerLocale;
    }

    if (isLocale(DEFAULT_LOCALE)) {
        return DEFAULT_LOCALE;
    }

    return AVAILABLE_LOCALES[0];
};

const createCache = <TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
) => {
    if (typeof React.cache === "function") {
        return React.cache(fn);
    }

    let cachedPromise: Promise<TResult> | null = null;

    return (...args: TArgs) => {
        if (!cachedPromise) {
            cachedPromise = fn(...args);
        }
        return cachedPromise;
    };
};

export const resolveRequestLocale = createCache(resolveRequestLocaleUncached);

export const isSupportedLocale = (value: string): value is Locale => {
    return normalizeLocaleCandidate(value) != null;
};
