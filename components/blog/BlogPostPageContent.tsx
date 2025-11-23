"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
    FaFacebookF,
    FaInstagram,
    FaTiktok,
    FaXTwitter,
} from "react-icons/fa6";
import JsonLd from "@/components/seo/JsonLd";
import { useLocale } from "@/context/LocaleContext";
import { SITE_NAME, SITE_TWITTER, SITE_URL } from "@/lib/config";
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
import { stripTitleTags } from "@/lib/content/sanitizeHtml";
import { cn } from "@/lib/utils";

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

type ShareButton = {
    id: string;
    label: string;
    href: string;
    icon: IconType;
    className: string;
};

const SHARE_BUTTON_BASE_CLASS =
    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const SHARE_ICON_CLASS = "h-4 w-4";

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

    const sharePath = useMemo(() => buildLocaleHref(`/blog/${post.slug}`), [buildLocaleHref, post.slug]);

    const shareUrl = useMemo(() => {
        try {
            return new URL(sharePath, SITE_URL).toString();
        } catch (error) {
            console.error("Nu am putut construi URL-ul absolut pentru distribuirea articolului", error);
            const normalizedSiteUrl = SITE_URL.endsWith("/") ? SITE_URL.slice(0, -1) : SITE_URL;
            return `${normalizedSiteUrl}${sharePath}`;
        }
    }, [sharePath]);

    const shareTitle = useMemo(() => {
        if (post.meta_title && post.meta_title.trim().length > 0) {
            return post.meta_title;
        }
        return `${post.title} | ${SITE_NAME}`;
    }, [post.meta_title, post.title]);

    const sanitizedContent = useMemo(() => stripTitleTags(post.content), [post.content]);

    const { shareFacebookLabel, shareInstagramLabel, shareTikTokLabel, shareTwitterLabel } = copy;

    const shareButtons = useMemo<ShareButton[]>(() => {
        const encodedShareUrl = encodeURIComponent(shareUrl);
        const encodedShareTitle = encodeURIComponent(shareTitle);

        const twitterUrl = new URL("https://twitter.com/intent/tweet");
        twitterUrl.searchParams.set("url", shareUrl);
        twitterUrl.searchParams.set("text", shareTitle);

        const normalizedTwitterHandle = SITE_TWITTER.replace(/^@/, "").trim();
        if (normalizedTwitterHandle.length > 0) {
            twitterUrl.searchParams.set("via", normalizedTwitterHandle);
        }

        return [
            {
                id: "facebook",
                label: shareFacebookLabel,
                href: `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`,
                icon: FaFacebookF,
                className: "bg-[#1877F2] text-white hover:bg-[#166FE5] focus-visible:ring-[#1877F2]",
            },
            {
                id: "tiktok",
                label: shareTikTokLabel,
                href: `https://www.tiktok.com/share/url?url=${encodedShareUrl}&text=${encodedShareTitle}`,
                icon: FaTiktok,
                className: "bg-[#010101] text-white hover:bg-[#111111] focus-visible:ring-[#010101]",
            },
            {
                id: "instagram",
                label: shareInstagramLabel,
                href: `https://www.instagram.com/?url=${encodedShareUrl}`,
                icon: FaInstagram,
                className: "bg-[#E4405F] text-white hover:bg-[#d73756] focus-visible:ring-[#E4405F]",
            },
            {
                id: "twitter",
                label: shareTwitterLabel,
                href: twitterUrl.toString(),
                icon: FaXTwitter,
                className: "bg-[#1DA1F2] text-white hover:bg-[#1A94DA] focus-visible:ring-[#1DA1F2]",
            },
        ];
    }, [shareFacebookLabel, shareInstagramLabel, shareTikTokLabel, shareTitle, shareTwitterLabel, shareUrl]);

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

            {sanitizedContent && (
                <div
                    className="prose prose-slate max-w-none text-base leading-relaxed text-gray-700 prose-a:text-berkeley"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
            )}

            <footer className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">{copy.shareTitle}</h2>
                <p className="mt-2 text-sm text-gray-600">{copy.shareDescription}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                    {shareButtons.map(({ id, label, href, icon: Icon, className }) => (
                        <a
                            key={id}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(SHARE_BUTTON_BASE_CLASS, className)}
                            aria-label={label}
                            title={label}
                        >
                            <Icon aria-hidden="true" className={SHARE_ICON_CLASS} />
                            <span>{label}</span>
                        </a>
                    ))}
                </div>
            </footer>
        </article>
    );
};

export default BlogPostPageContent;
