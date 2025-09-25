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

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
    const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
        if (stored && isLocale(stored)) {
            setLocaleState(stored);
            document.documentElement.lang = stored;
        }
    }, []);

    useEffect(() => {
        apiClient.setLanguage(locale);
    }, [locale]);

    const handleSetLocale = useCallback((nextLocale: Locale) => {
        setLocaleState(nextLocale);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
            document.documentElement.lang = nextLocale;
        }
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
