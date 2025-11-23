"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/context/LocaleContext";
import type { Locale } from "@/lib/i18n/config";
import { stripTitleTags } from "@/lib/content/sanitizeHtml";

const TERMS_CONTENT_CLASSNAME =
    "terms-content space-y-6 text-justify font-dm-sans text-base leading-relaxed text-slate-700";

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

    const sanitizedContent = useMemo(() => stripTitleTags(content), [content]);

    return <div className={TERMS_CONTENT_CLASSNAME} dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
};

export default TermsContent;
