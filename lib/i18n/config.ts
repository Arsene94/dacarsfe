export const AVAILABLE_LOCALES = ["ro", "en", "it", "es", "fr", "de"] as const;

export type Locale = (typeof AVAILABLE_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ro";

export const LOCALE_STORAGE_KEY = "dacars.locale";
