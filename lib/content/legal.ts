import { AVAILABLE_LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

export type LocaleHtmlContent = Partial<Record<Locale, string>>;

export type CreateLegalHtmlOptions = {
    defaultLocale?: Locale;
};

export const createLegalHtmlByLocale = (
    htmlByLocale: LocaleHtmlContent,
    { defaultLocale = DEFAULT_LOCALE }: CreateLegalHtmlOptions = {},
): Record<Locale, string> => {
    const fallbackHtml = htmlByLocale[defaultLocale] ?? "";

    return AVAILABLE_LOCALES.reduce((acc, locale) => {
        acc[locale] = htmlByLocale[locale] ?? fallbackHtml;
        return acc;
    }, {} as Record<Locale, string>);
};
