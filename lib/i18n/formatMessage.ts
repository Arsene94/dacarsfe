import type { Locale } from "./config";

export type TranslateOptions = {
    values?: Record<string, string | number>;
    fallback?: string;
};

export const formatMessage = (
    message: unknown,
    locale: Locale,
    options: TranslateOptions = {},
): string => {
    if (typeof message === "string") {
        if (!options.values) {
            return message;
        }

        return Object.entries(options.values).reduce((acc, [key, value]) => {
            return acc.replaceAll(`{{${key}}}`, String(value));
        }, message);
    }

    if (typeof message === "number") {
        return new Intl.NumberFormat(locale).format(message);
    }

    if (message == null) {
        return options.fallback ?? "";
    }

    return String(message);
};
