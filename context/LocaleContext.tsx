"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
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

type LocaleProviderProps = {
    children: ReactNode;
    initialLocale?: Locale;
};

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

const resolveInitialLocale = (explicitLocale?: Locale): Locale => {
    if (explicitLocale) {
        return explicitLocale;
    }

    if (typeof document !== "undefined") {
        const dataLocale = document.documentElement.getAttribute("data-locale");
        if (dataLocale && isLocale(dataLocale)) {
            return dataLocale;
        }
    }

    if (typeof window !== "undefined") {
        try {
            const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
            if (storedLocale && isLocale(storedLocale)) {
                return storedLocale;
            }
        } catch (error) {
            console.warn("Nu am putut citi limba preferată din localStorage înainte de hidratare", error);
        }
    }

    return DEFAULT_LOCALE;
};

export const LocaleProvider = ({ children, initialLocale }: LocaleProviderProps) => {
    const [locale, setLocaleState] = useState<Locale>(() => resolveInitialLocale(initialLocale));
    const hasSyncedFromExternalSources = useRef(false);

    useEffect(() => {
        if (hasSyncedFromExternalSources.current) {
            return;
        }

        if (typeof window === "undefined" || typeof document === "undefined") {
            return;
        }

        hasSyncedFromExternalSources.current = true;

        const dataLocale = document.documentElement.getAttribute("data-locale");
        if (dataLocale && isLocale(dataLocale) && dataLocale !== locale) {
            setLocaleState(dataLocale);
            return;
        }

        try {
            const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
            if (storedLocale && isLocale(storedLocale) && storedLocale !== locale) {
                setLocaleState(storedLocale);
            }
        } catch (error) {
            console.warn("Nu am putut citi limba preferată din localStorage înainte de hidratare", error);
        }
    }, [locale]);

    useEffect(() => {
        apiClient.setLanguage(locale);
    }, [locale]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
        } catch (error) {
            console.warn("Nu am putut salva limba preferată în localStorage", error);
        }
        document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
        document.documentElement.lang = locale;
        document.documentElement.setAttribute("data-locale", locale);
    }, [locale]);

    const handleSetLocale = useCallback((nextLocale: Locale) => {
        setLocaleState((currentLocale) => (currentLocale === nextLocale ? currentLocale : nextLocale));
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
