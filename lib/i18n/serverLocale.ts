import { cookies, headers } from "next/headers";

import { AVAILABLE_LOCALES, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from "./config";
import { normalizeLocaleCandidate, parseAcceptLanguage, pickSupportedLocale } from "./localeDetection";

type ResolveRequestLocaleOptions = {
    fallbackLocale?: Locale;
    cookieKey?: string;
    headerName?: string;
};

export const resolveRequestLocale = async (
    options: ResolveRequestLocaleOptions = {},
): Promise<Locale> => {
    const fallbackLocale = options.fallbackLocale ?? DEFAULT_LOCALE;
    const cookieKey = options.cookieKey ?? LOCALE_STORAGE_KEY;
    const headerName = options.headerName ?? "accept-language";

    const cookieStore = await cookies();
    const cookieLocale = normalizeLocaleCandidate(cookieStore.get(cookieKey)?.value);
    if (cookieLocale) {
        return cookieLocale;
    }

    const headerList = await headers();
    const acceptedLocales = parseAcceptLanguage(headerList.get(headerName));
    return pickSupportedLocale(acceptedLocales, fallbackLocale);
};

export const getSupportedLocales = (): readonly Locale[] => AVAILABLE_LOCALES;
export const getFallbackLocale = (): Locale => DEFAULT_LOCALE;
