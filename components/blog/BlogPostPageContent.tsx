"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Facebook, Instagram, Twitter } from "lucide-react";
import JsonLd from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/context/LocaleContext";
import { SITE_NAME, SITE_URL } from "@/lib/config";
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
import type { LucideProps } from "lucide-react";
import { ensureLocalePath } from "@/lib/i18n/routing";

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

type ShareIcon = (props: LucideProps) => JSX.Element;

type ShareOption = {
    label: string;
    href: string;
    icon: ShareIcon;
    ariaLabel: string;
};

const SHARE_LABEL_PREFIX: Record<Locale, string> = {
    ro: "Distribuie pe",
    en: "Share on",
    it: "Condividi su",
    es: "Comparte en",
    fr: "Partager sur",
    de: "Teilen auf",
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

const createAbsoluteUrl = (path: string): string => {
    try {
        return new URL(path, SITE_URL).toString();
    } catch (error) {
        console.error("Nu am putut construi URL-ul absolut pentru partajare", error);
        const normalizedBase = SITE_URL.replace(/\/+$/, "");
        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        return `${normalizedBase}${normalizedPath}`;
    }
};

const getShareAriaLabel = (locale: Locale, network: string): string => {
    const prefix = SHARE_LABEL_PREFIX[locale] ?? SHARE_LABEL_PREFIX.ro;
    return `${prefix} ${network}`;
};

const TikTokIcon = ({ className, ...props }: LucideProps): JSX.Element => (
    <svg
        {...props}
        className={className}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
);

const BlogPostPageContent = ({
    slug,
    initialLocale,
    initialCopy,
    initialPost,
    initialSummary,
    initialStructuredData,
}: BlogPostPageContentProps) => {
    const { locale, availableLocales } = useLocale();
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

    const shareUrl = useMemo(() => {
        const localizedPath = ensureLocalePath({
            href: `/blog/${post.slug}`,
            locale,
            availableLocales,
        });

        return createAbsoluteUrl(localizedPath);
    }, [availableLocales, locale, post.slug]);

    const shareOptions = useMemo<ShareOption[]>(() => {
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedTitle = encodeURIComponent(post.title);
        const options: Array<Omit<ShareOption, "ariaLabel">> = [
            {
                label: "Facebook",
                href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
                icon: Facebook,
            },
            {
                label: "TikTok",
                href: `https://www.tiktok.com/share?url=${encodedUrl}&title=${encodedTitle}`,
                icon: TikTokIcon,
            },
            {
                label: "Instagram",
                href: `https://www.instagram.com/?url=${encodedUrl}`,
                icon: Instagram,
            },
            {
                label: "Twitter",
                href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
                icon: Twitter,
            },
        ];

        return options.map((option) => ({
            ...option,
            ariaLabel: getShareAriaLabel(locale, option.label),
        }));
    }, [locale, post.title, shareUrl]);

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
                <ul className="mt-4 flex flex-wrap gap-3" role="list" aria-label={copy.shareTitle}>
                    {shareOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                            <li key={option.label}>
                                <Button
                                    asChild
                                    variant="secondary"
                                    size="sm"
                                    className="gap-2"
                                    aria-label={option.ariaLabel}
                                >
                                    <a href={option.href} target="_blank" rel="noopener noreferrer">
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                        <span>{option.label}</span>
                                    </a>
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            </footer>
        </article>
    );
};

export default BlogPostPageContent;
