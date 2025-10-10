"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/context/LocaleContext";
import type { Locale } from "@/lib/i18n/config";

import {
    TERMS_CONTENT_CLASSNAME,
    TERMS_CONTENT_STYLE_ID,
    TERMS_CONTENT_STYLES,
} from "./termsStyles";

type TermsContentProps = {
    initialLocale: Locale;
    htmlByLocale: Record<Locale, string>;
    fallbackLocale: Locale;
};

const TermsContent = ({ initialLocale, htmlByLocale, fallbackLocale }: TermsContentProps) => {
    const { locale } = useLocale();
    const [activeLocale, setActiveLocale] = useState<Locale>(initialLocale);

    useEffect(() => {
        setActiveLocale(locale);
    }, [locale]);

    const resolvedLocale = useMemo(() => {
        if (htmlByLocale[activeLocale]) {
            return activeLocale;
        }
        if (htmlByLocale[initialLocale]) {
            return initialLocale;
        }
        return fallbackLocale;
    }, [activeLocale, htmlByLocale, initialLocale, fallbackLocale]);

    const content = htmlByLocale[resolvedLocale] ?? "";

    useEffect(() => {
        if (typeof document === "undefined") {
            return;
        }

        const existing = document.getElementById(TERMS_CONTENT_STYLE_ID);
        if (existing) {
            return;
        }

        const style = document.createElement("style");
        style.id = TERMS_CONTENT_STYLE_ID;
        style.textContent = TERMS_CONTENT_STYLES;
        document.head.appendChild(style);
    }, []);

    return <div className={TERMS_CONTENT_CLASSNAME} dangerouslySetInnerHTML={{ __html: content }} />;
};

export default TermsContent;
