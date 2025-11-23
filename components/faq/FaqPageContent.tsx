"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import JsonLd from "@/components/seo/JsonLd";
import { useLocale } from "@/context/LocaleContext";
import { apiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { type Locale } from "@/lib/i18n/config";
import { buildFaqJsonLd } from "@/lib/seo/jsonld";
import type { FaqCategory } from "@/types/faq";
import {
    FALLBACK_LOCALE,
    FAQ_SEO_COPY,
    buildFallbackCategory,
    extractPlainText,
    normalizeFaqCategories,
    type FaqSeoCopy,
    type NormalizedFaqCategory,
} from "@/lib/faq/publicFaq";
import { useLocaleHref } from "@/lib/i18n/useLocaleHref";
import { stripTitleTags } from "@/lib/content/sanitizeHtml";

type FaqPageContentProps = {
    initialLocale: Locale;
    initialCopy: FaqSeoCopy;
    initialCategories: NormalizedFaqCategory[];
};

const FaqPageContent = ({ initialLocale, initialCopy, initialCategories }: FaqPageContentProps) => {
    const { locale } = useLocale();
    const buildLocaleHref = useLocaleHref();
    const [copy, setCopy] = useState<FaqSeoCopy>(initialCopy);
    const [categories, setCategories] = useState<NormalizedFaqCategory[]>(initialCategories);
    const [isLoading, setIsLoading] = useState(false);

    const cacheRef = useRef<Map<Locale, NormalizedFaqCategory[]>>(
        new Map([[initialLocale, initialCategories]]),
    );

    useEffect(() => {
        cacheRef.current.set(initialLocale, initialCategories);
        setCopy(initialCopy);
        setCategories(initialCategories);
    }, [initialCategories, initialCopy, initialLocale]);

    useEffect(() => {
        const nextCopy = FAQ_SEO_COPY[locale] ?? FAQ_SEO_COPY[FALLBACK_LOCALE];
        setCopy(nextCopy);

        const cachedCategories = cacheRef.current.get(locale);
        if (cachedCategories) {
            setCategories(cachedCategories);
            setIsLoading(false);
            return;
        }

        let isActive = true;
        setIsLoading(true);
        setCategories([]);
        apiClient.setLanguage(locale);

        (async () => {
            try {
                const response = await apiClient.getFaqCategories({
                    language: locale,
                    include: "faqs",
                    status: "published",
                    limit: 100,
                });
                const normalized = normalizeFaqCategories(extractList<FaqCategory>(response));
                if (!isActive) {
                    return;
                }
                if (normalized.length > 0) {
                    cacheRef.current.set(locale, normalized);
                }
                setCategories(normalized);
            } catch (error) {
                console.error("Nu am putut reîncărca FAQ-urile traduse", error);
                if (!isActive) {
                    return;
                }
                setCategories([]);
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            isActive = false;
        };
    }, [locale]);

    const categoriesToRender = useMemo(() => {
        const source = categories.length > 0 ? categories : [buildFallbackCategory(copy)];

        return source.map((category) => ({
            ...category,
            faqs: category.faqs.map((item) => ({
                ...item,
                answer: stripTitleTags(item.answer),
            })),
        }));
    }, [categories, copy]);

    const faqItems = useMemo(() => {
        if (categories.length > 0) {
            return categoriesToRender.flatMap((category) =>
                category.faqs.map((item) => ({
                    question: item.question,
                    answer: item.answer,
                })),
            );
        }

        return copy.items.map((item) => ({
            question: item.question,
            answer: stripTitleTags(item.answer),
        }));
    }, [categories.length, categoriesToRender, copy.items]);

    const faqJsonLd = useMemo(
        () =>
            buildFaqJsonLd(
                faqItems.map((item) => ({
                    question: item.question,
                    answer: extractPlainText(item.answer) || item.answer,
                })),
            ),
        [faqItems],
    );

    return (
        <main className="mx-auto max-w-4xl px-6 py-16">
            {faqJsonLd && <JsonLd data={faqJsonLd} id="faq-structured-data" />}
            <header className="mb-10 text-center">
                <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">{copy.pageTitle}</h1>
                <p className="mt-4 text-base text-gray-600">{copy.pageDescription}</p>
            </header>

            <nav
                aria-label="Legături rapide către paginile principale DaCars"
                className="mb-12 rounded-2xl border border-berkeley/20 bg-white/70 p-6 shadow-sm"
            >
                <p className="mb-4 text-sm text-gray-700">
                    Ai răspunsul și vrei să mergi mai departe? Continuă către paginile noastre esențiale.
                </p>
                <div className="flex flex-wrap gap-3">
                    <Link
                        href={buildLocaleHref("/offers")}
                        className="inline-flex items-center rounded-full bg-berkeley px-4 py-2 text-sm font-semibold text-white transition hover:bg-berkeley/90"
                    >
                        Vezi promoțiile active DaCars
                    </Link>
                    <Link
                        href={buildLocaleHref("/cars")}
                        className="inline-flex items-center rounded-full border border-berkeley px-4 py-2 text-sm font-semibold text-berkeley transition hover:bg-berkeley hover:text-white"
                    >
                        Explorează flota completă
                    </Link>
                    <Link
                        href={buildLocaleHref("/contact")}
                        className="inline-flex items-center rounded-full border border-jade px-4 py-2 text-sm font-semibold text-jade transition hover:bg-jade hover:text-white"
                    >
                        Contactează un consultant 24/7
                    </Link>
                </div>
            </nav>

            <section className="space-y-10" aria-label={copy.pageTitle} aria-busy={isLoading}>
                {categoriesToRender.map((category) => (
                    <article key={category.id} className="space-y-4">
                        <div className="text-left">
                            <h2 className="text-2xl font-semibold text-gray-900">{category.name}</h2>
                            {category.description && (
                                <p className="mt-2 text-base text-gray-600">{category.description}</p>
                            )}
                        </div>
                        <div className="space-y-4">
                            {category.faqs.map((item, index) => (
                                <details
                                    key={`${category.id}-${item.id}`}
                                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                                >
                                    <summary className="cursor-pointer text-lg font-medium text-gray-900">
                                        <span className="flex items-center justify-between">
                                            <span>
                                                {index + 1}. {item.question}
                                            </span>
                                            <span aria-hidden="true" className="text-berkeley">
                                                +
                                            </span>
                                        </span>
                                    </summary>
                                    <div className="mt-3 text-base text-gray-700">
                                        <div
                                            className="faq-answer-content"
                                            dangerouslySetInnerHTML={{ __html: item.answer }}
                                        />
                                    </div>
                                </details>
                            ))}
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
};

export default FaqPageContent;
