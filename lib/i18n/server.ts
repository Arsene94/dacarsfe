import { cookies, headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import {
  normalizeLocaleCandidate,
  parseAcceptLanguage,
  pickSupportedLocale,
} from "@/lib/i18n/localeDetection";

const LOCALE_COOKIE_KEYS = ["dacars.locale", "NEXT_LOCALE", "locale"] as const;
const LOCALE_HEADER_KEYS = ["x-dacars-locale"] as const;

const resolveRequestLocaleUncached = async (): Promise<Locale> => {
  const headerList = await headers();

  for (const header of LOCALE_HEADER_KEYS) {
    const locale = normalizeLocaleCandidate(headerList.get(header));
    if (locale) {
      return locale;
    }
  }

  const cookieStore = await cookies();
  for (const key of LOCALE_COOKIE_KEYS) {
    const locale = normalizeLocaleCandidate(cookieStore.get(key)?.value);
    if (locale) {
      return locale;
    }
  }

  const acceptedLocales = parseAcceptLanguage(headerList.get("accept-language"));
  return pickSupportedLocale(acceptedLocales, DEFAULT_LOCALE);
};

export const resolveRequestLocale = cache(resolveRequestLocaleUncached);

export const isSupportedLocale = (value: string): value is Locale => {
  return normalizeLocaleCandidate(value) != null;
};
