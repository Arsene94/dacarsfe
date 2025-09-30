"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n/config";
import { apiClient } from "@/lib/api";
import { isLocale } from "@/lib/i18n/utils";

type LocaleContextValue = {
    locale: Locale;
    availableLocales: readonly Locale[];
    setLocale: (nextLocale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const getInitialLocale = (): Locale => {
    if (typeof document !== "undefined") {
        const dataLocale = document.documentElement.getAttribute("data-locale");
        if (dataLocale && isLocale(dataLocale)) {
            return dataLocale;
        }
    }
    return DEFAULT_LOCALE;
};

type LocaleProviderProps = {
    children: ReactNode;
    initialLocale?: Locale;
};

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

export const LocaleProvider = ({ children, initialLocale }: LocaleProviderProps) => {
    const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? getInitialLocale());

    useEffect(() => {
        apiClient.setLanguage(locale);
    }, [locale]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
        document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
        document.documentElement.lang = locale;
        document.documentElement.setAttribute("data-locale", locale);
    }, [locale]);

    const handleSetLocale = useCallback((nextLocale: Locale) => {
        setLocaleState(nextLocale);
    }, []);

    const value = useMemo<LocaleContextValue>(() => ({
        locale,
        availableLocales: AVAILABLE_LOCALES,
        setLocale: handleSetLocale,
    }), [handleSetLocale, locale]);

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
    const context = useContext(LocaleContext);
    if (!context) {
        throw new Error("useLocale trebuie folosit în interiorul LocaleProvider");
    }
    return context;
};
