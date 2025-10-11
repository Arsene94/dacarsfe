"use client";

import { useCallback, useMemo } from "react";
import { useLocale } from "@/context/LocaleContext";
import { getNestedValue } from "./utils";
import { getPageMessages, type PageKey } from "./translations";
import { formatMessage, type TranslateOptions } from "./formatMessage";

type TranslationRecord = Record<string, unknown>;

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
