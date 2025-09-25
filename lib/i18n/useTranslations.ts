"use client";

import { useCallback, useMemo } from "react";
import { useLocale } from "@/context/LocaleContext";
import { getNestedValue } from "./utils";
import { getPageMessages, type PageKey } from "./translations";
import type { Locale } from "./config";

type TranslationRecord = Record<string, unknown>;

type TranslateOptions = {
    values?: Record<string, string | number>;
    fallback?: string;
};

const formatMessage = (
    message: unknown,
    locale: Locale,
    options?: TranslateOptions,
): string => {
    if (typeof message === "string") {
        if (!options?.values) return message;
        return Object.entries(options.values).reduce((acc, [key, value]) => {
            return acc.replaceAll(`{{${key}}}`, String(value));
        }, message);
    }

    if (typeof message === "number") {
        return new Intl.NumberFormat(locale).format(message);
    }

    if (message == null) {
        return options?.fallback ?? "";
    }

    return String(message);
};

export const useTranslations = <T extends TranslationRecord = TranslationRecord>(
    page: PageKey,
) => {
    const { locale } = useLocale();

    const messages = useMemo(() => getPageMessages<T>(page, locale), [locale, page]);

    const t = useCallback(
        (path: string, options?: TranslateOptions) => {
            const raw = getNestedValue(messages as TranslationRecord, path);
            return formatMessage(raw, locale, options ?? {});
        },
        [locale, messages],
    );

    return {
        locale,
        messages,
        t,
    };
};
