import { AVAILABLE_LOCALES, type Locale } from "./config";

export const isLocale = (candidate: string): candidate is Locale => {
    return (AVAILABLE_LOCALES as readonly string[]).includes(candidate);
};

export const getNestedValue = (
    data: Record<string, unknown>,
    path: string,
): unknown => {
    const segments = path.split(".").filter(Boolean);
    return segments.reduce<unknown>((acc, segment) => {
        if (acc == null || typeof acc !== "object") {
            return undefined;
        }
        const next = (acc as Record<string, unknown>)[segment];
        return next;
    }, data);
};
