"use client";

import { HTMLAttributes } from "react";
import { useLocale } from "@/context/LocaleContext";
import { useTranslations } from "@/lib/i18n/useTranslations";

const toggleBaseClass =
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200";

const LanguageSwitcher = (props: HTMLAttributes<HTMLDivElement>) => {
    const { className, ...rest } = props;
    const { locale, setLocale, availableLocales } = useLocale();
    const { messages, t } = useTranslations("layout");

    const languageMessages = (messages.header ?? {}) as {
        languageSwitcher?: { labels?: Record<string, string> };
    };

    const labels = languageMessages.languageSwitcher?.labels ?? {};

    return (
        <div
            {...rest}
            className={`flex items-center gap-2 ${className ?? ""}`.trim()}
            role="group"
            aria-label={t("header.languageSwitcher.aria", { fallback: "Select language" })}
        >
            {availableLocales.map((item) => {
                const isActive = locale === item;
                const label = labels[item] ?? item.toUpperCase();
                return (
                    <button
                        key={item}
                        type="button"
                        onClick={() => setLocale(item)}
                        className={
                            toggleBaseClass +
                            (isActive
                                ? " border-jade bg-jade text-white"
                                : " border-gray-300 bg-white text-berkeley hover:border-jade hover:text-jade")
                        }
                        aria-pressed={isActive}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
};

export default LanguageSwitcher;
