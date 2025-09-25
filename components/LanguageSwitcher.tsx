"use client";

import { HTMLAttributes, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/context/LocaleContext";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";

const flagByLocale: Partial<Record<Locale, string>> = {
    ro: "🇷🇴",
    en: "🇬🇧",
    it: "🇮🇹",
    es: "🇪🇸",
};

const dropdownBaseItemClass =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-berkeley transition-colors duration-200 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none";

const LanguageSwitcher = (props: HTMLAttributes<HTMLDivElement>) => {
    const { className, ...rest } = props;
    const { locale, setLocale, availableLocales } = useLocale();
    const { messages, t } = useTranslations("layout");
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const languageMessages = (messages.header ?? {}) as {
        languageSwitcher?: { labels?: Record<string, string> };
    };

    const labels = languageMessages.languageSwitcher?.labels ?? {};

    const otherLocales = useMemo(
        () => availableLocales.filter((item) => item !== locale),
        [availableLocales, locale],
    );

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    const activeLabel = labels[locale] ?? locale.toUpperCase();
    const activeFlag = flagByLocale[locale] ?? "🌐";

    return (
        <div
            {...rest}
            ref={containerRef}
            className={cn("relative text-left", className)}
        >
            <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-berkeley shadow-sm transition hover:border-jade hover:text-jade focus:border-jade focus:outline-none"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <span aria-hidden>{activeFlag}</span>
                <span className="hidden sm:inline">{activeLabel}</span>
            </button>
            {isOpen && otherLocales.length > 0 && (
                <ul
                    role="listbox"
                    aria-label={t("header.languageSwitcher.aria", { fallback: "Select language" })}
                    className="absolute right-0 z-20 mt-2 w-40 origin-top-right rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
                >
                    {otherLocales.map((item) => {
                        const label = labels[item] ?? item.toUpperCase();
                        const flag = flagByLocale[item] ?? "🌐";
                        return (
                            <li key={item} role="presentation">
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected="false"
                                    onClick={() => {
                                        setLocale(item);
                                        setIsOpen(false);
                                    }}
                                    className={dropdownBaseItemClass}
                                >
                                    <span aria-hidden>{flag}</span>
                                    <span>{label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default LanguageSwitcher;
