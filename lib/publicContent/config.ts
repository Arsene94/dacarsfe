import type { PublicLocale } from "@/types/public-content";

export const SUPPORTED_PUBLIC_LOCALES = [
  { code: "ro" as PublicLocale, label: "Română" },
  { code: "en" as PublicLocale, label: "English" },
] as const;

export const DEFAULT_PUBLIC_LOCALE: PublicLocale = SUPPORTED_PUBLIC_LOCALES[0].code;

export const PUBLIC_LOCALE_STORAGE_KEY = "dacars:locale";
export const PUBLIC_LOCALE_COOKIE_NAME = "dacars_locale";

export const isSupportedPublicLocale = (value: unknown): value is PublicLocale =>
  typeof value === "string" &&
  SUPPORTED_PUBLIC_LOCALES.some((entry) => entry.code === value);

export const normalizePublicLocale = (value: unknown): PublicLocale => {
  if (isSupportedPublicLocale(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return DEFAULT_PUBLIC_LOCALE;
};

