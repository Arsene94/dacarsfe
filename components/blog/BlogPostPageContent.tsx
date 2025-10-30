"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import JsonLd from "@/components/seo/JsonLd";
import { useLocale } from "@/context/LocaleContext";
import { SITE_NAME } from "@/lib/config";
import { formatDate } from "@/lib/datetime";
import {
    buildBlogPostStructuredData,
    extractBlogSummary,
    getBlogPostCopy,
    loadBlogPost,
    type BlogPostCopy,
} from "@/lib/blog/publicBlog";
import type { JsonLd as JsonLdPayload } from "@/lib/seo/jsonld";
import type { Locale } from "@/lib/i18n/config";
import { getUserDisplayName } from "@/lib/users";
import type { BlogPost } from "@/types/blog";
import { useLocaleHref } from "@/lib/i18n/useLocaleHref";

type BlogPostPageContentProps = {
    slug: string;
    initialLocale: Locale;
    initialCopy: BlogPostCopy;
    initialPost: BlogPost;
    initialSummary: string;
    initialStructuredData: JsonLdPayload[];
};

type CacheEntry = {
    post: BlogPost;
    summary: string;
    structuredData: JsonLdPayload[];
};

const isFaqStructuredData = (entry: JsonLdPayload): boolean => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return false;
    }

    const type = Reflect.get(entry, "@type");
    return type === "FAQPage";
};

const stripFaqStructuredData = (entries: JsonLdPayload[]): JsonLdPayload[] =>
    entries.filter((entry) => !isFaqStructuredData(entry));

const BlogPostPageContent = ({
    slug,
    initialLocale,
    initialCopy,
    initialPost,
    initialSummary,
    initialStructuredData,
}: BlogPostPageContentProps) => {
    const { locale } = useLocale();
    const buildLocaleHref = useLocaleHref();
    const [copy, setCopy] = useState(initialCopy);
    const [post, setPost] = useState<BlogPost>(initialPost);
    const [summary, setSummary] = useState(initialSummary);
    const [structuredData, setStructuredData] = useState<JsonLdPayload[]>(stripFaqStructuredData(initialStructuredData));
    const [isLoading, setIsLoading] = useState(false);

    const cacheRef = useRef<Map<Locale, CacheEntry>>(
        new Map([
            [
                initialLocale,
                {
                    post: initialPost,
                    summary: initialSummary,
                    structuredData: stripFaqStructuredData(initialStructuredData),
                },
            ],
        ]),
    );

    useEffect(() => {
        const sanitizedStructuredData = stripFaqStructuredData(initialStructuredData);
        cacheRef.current.set(initialLocale, {
            post: initialPost,
            summary: initialSummary,
            structuredData: sanitizedStructuredData,
        });
        setCopy(initialCopy);
        setPost(initialPost);
        setSummary(initialSummary);
        setStructuredData(sanitizedStructuredData);
    }, [initialCopy, initialLocale, initialPost, initialStructuredData, initialSummary]);

    useEffect(() => {
        const nextCopy = getBlogPostCopy(locale);
        setCopy(nextCopy);

        const cached = cacheRef.current.get(locale);
        if (cached) {
            setPost(cached.post);
            setSummary(cached.summary);
            setStructuredData(cached.structuredData);
            setIsLoading(false);
            return;
        }

        let isActive = true;
        setIsLoading(true);

        (async () => {
            try {
                const fetchedPost = await loadBlogPost(slug, locale);
                if (!isActive) {
                    return;
                }

                if (!fetchedPost) {
                    const fallbackSummary = extractBlogSummary(initialPost);
                    const fallbackStructuredData = buildBlogPostStructuredData(initialPost, nextCopy, fallbackSummary);
                    const sanitizedStructuredData = stripFaqStructuredData(fallbackStructuredData);
                    cacheRef.current.set(locale, {
                        post: initialPost,
                        summary: fallbackSummary,
                        structuredData: sanitizedStructuredData,
                    });
                    setPost(initialPost);
                    setSummary(fallbackSummary);
                    setStructuredData(sanitizedStructuredData);
                    return;
                }

                const fetchedSummary = extractBlogSummary(fetchedPost);
                const fetchedStructuredData = buildBlogPostStructuredData(fetchedPost, nextCopy, fetchedSummary);
                const sanitizedStructuredData = stripFaqStructuredData(fetchedStructuredData);
                cacheRef.current.set(locale, {
                    post: fetchedPost,
                    summary: fetchedSummary,
                    structuredData: sanitizedStructuredData,
                });
                setPost(fetchedPost);
                setSummary(fetchedSummary);
                setStructuredData(sanitizedStructuredData);
            } catch (error) {
                console.error("Nu am putut reîncărca articolul de blog pentru noua limbă", error);
                if (!isActive) {
                    return;
                }
                const fallbackSummary = extractBlogSummary(initialPost);
                const fallbackStructuredData = buildBlogPostStructuredData(initialPost, nextCopy, fallbackSummary);
                const sanitizedStructuredData = stripFaqStructuredData(fallbackStructuredData);
                cacheRef.current.set(locale, {
                    post: initialPost,
                    summary: fallbackSummary,
                    structuredData: sanitizedStructuredData,
                });
                setPost(initialPost);
                setSummary(fallbackSummary);
                setStructuredData(sanitizedStructuredData);
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            isActive = false;
        };
    }, [initialPost, locale, slug]);

    const publishedLabel = useMemo(
        () => formatDate(post.published_at ?? post.created_at, undefined, locale),
        [post.created_at, post.published_at, locale],
    );

    const authorName = useMemo(
        () => (post.author ? getUserDisplayName(post.author) : SITE_NAME),
        [post.author],
    );

    const hasPublishedDate = publishedLabel !== "—";

    return (
        <article className="mx-auto max-w-3xl space-y-8 px-6 py-12" aria-busy={isLoading}>
            <JsonLd data={structuredData} id="blog-post-structured-data" />
            <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
                <ol className="flex flex-wrap items-center gap-2">
                    <li>
                        <Link href={buildLocaleHref("/")} className="hover:text-berkeley">
                            {copy.breadcrumbHome}
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li>
                        <Link href={buildLocaleHref("/blog")} className="hover:text-berkeley">
                            {copy.breadcrumbBlog}
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li aria-current="page" className="font-medium text-gray-900">
                        {post.title}
                    </li>
                </ol>
            </nav>

            <header className="space-y-4">
                {hasPublishedDate && (
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                        {copy.publishedLabel} {publishedLabel}
                    </p>
                )}
                <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">{post.title}</h1>
                {summary && <p className="text-base text-gray-600">{summary}</p>}
                <p className="text-sm text-gray-500">
                    {copy.authorLabel}: {authorName}
                </p>
            </header>

            {post.content && (
                <div
                    className="prose prose-slate max-w-none text-base leading-relaxed text-gray-700 prose-a:text-berkeley"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />
            )}

            <footer className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">{copy.shareTitle}</h2>
                <p className="mt-2 text-sm text-gray-600">{copy.shareDescription}</p>
            </footer>
        </article>
    );
};

export default BlogPostPageContent;
