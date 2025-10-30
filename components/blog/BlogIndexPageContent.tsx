"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JsonLd from "@/components/seo/JsonLd";
import BlogPostCard from "@/components/blog/BlogPostCard";
import InterlinkingSection, {
    type InterlinkingCopy,
    type InterlinkingLink,
} from "@/components/interlinking/InterlinkingSection";
import { useLocale } from "@/context/LocaleContext";
import {
    buildBlogIndexStructuredData,
    getBlogIndexCopy,
    loadBlogPosts,
    type BlogIndexCopy,
} from "@/lib/blog/publicBlog";
import type { JsonLd as JsonLdPayload } from "@/lib/seo/jsonld";
import type { Locale } from "@/lib/i18n/config";
import type { BlogPost } from "@/types/blog";

type BlogIndexPageContentProps = {
    initialLocale: Locale;
    initialCopy: BlogIndexCopy;
    initialPosts: BlogPost[];
    initialStructuredData: JsonLdPayload[];
};

type CacheEntry = {
    posts: BlogPost[];
    structuredData: JsonLdPayload[];
};

const BlogIndexPageContent = ({
    initialLocale,
    initialCopy,
    initialPosts,
    initialStructuredData,
}: BlogIndexPageContentProps) => {
    const { locale } = useLocale();
    const [copy, setCopy] = useState(initialCopy);
    const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
    const [structuredData, setStructuredData] = useState<JsonLdPayload[]>(initialStructuredData);
    const [isLoading, setIsLoading] = useState(false);

    const cacheRef = useRef<Map<Locale, CacheEntry>>(
        new Map([[initialLocale, { posts: initialPosts, structuredData: initialStructuredData }]]),
    );

    useEffect(() => {
        cacheRef.current.set(initialLocale, { posts: initialPosts, structuredData: initialStructuredData });
        setCopy(initialCopy);
        setPosts(initialPosts);
        setStructuredData(initialStructuredData);
    }, [initialCopy, initialPosts, initialStructuredData, initialLocale]);

    useEffect(() => {
        const nextCopy = getBlogIndexCopy(locale);
        setCopy(nextCopy);

        const cached = cacheRef.current.get(locale);
        if (cached) {
            setPosts(cached.posts);
            setStructuredData(cached.structuredData);
            setIsLoading(false);
            return;
        }

        let isActive = true;
        setIsLoading(true);

        (async () => {
            try {
                const fetchedPosts = await loadBlogPosts(locale);
                if (!isActive) {
                    return;
                }
                const computedStructuredData = buildBlogIndexStructuredData(nextCopy, fetchedPosts);
                cacheRef.current.set(locale, { posts: fetchedPosts, structuredData: computedStructuredData });
                setPosts(fetchedPosts);
                setStructuredData(computedStructuredData);
            } catch (error) {
                console.error("Nu am putut reîncărca articolele din blog pentru noua limbă", error);
                if (!isActive) {
                    return;
                }
                const fallbackStructuredData = buildBlogIndexStructuredData(nextCopy, []);
                cacheRef.current.set(locale, { posts: [], structuredData: fallbackStructuredData });
                setPosts([]);
                setStructuredData(fallbackStructuredData);
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

    const showEmptyState = !isLoading && posts.length === 0;

    const interlinkCopy: InterlinkingCopy | null = useMemo(() => {
        const interlink = copy.interlink;
        if (!interlink) {
            return null;
        }

        const links = Array.isArray(interlink.links)
            ? interlink.links
                  .map((item) => ({
                      ...item,
                      href: item.href?.trim() ?? "",
                      label: item.label?.trim() ?? "",
                  }))
                  .filter((item): item is InterlinkingLink => item.href.length > 0 && item.label.length > 0)
            : [];

        if (links.length === 0) {
            return null;
        }

        return {
            ...interlink,
            links,
        } satisfies InterlinkingCopy;
    }, [copy.interlink]);

    return (
        <main className="mx-auto max-w-5xl space-y-10 px-6 py-12">
            <JsonLd data={structuredData} id="blog-index-structured-data" />
            <header className="rounded-xl bg-berkeley px-6 py-12 text-white">
                <h1 className="text-3xl font-semibold sm:text-4xl">{copy.pageTitle}</h1>
                <p className="mt-3 max-w-3xl text-base text-white/80">{copy.pageDescription}</p>
            </header>

            <section className="grid gap-8 md:grid-cols-2" aria-busy={isLoading}>
                {showEmptyState ? (
                    <div className="col-span-full rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900">{copy.emptyStateTitle}</h2>
                        <p className="mt-2 text-sm text-gray-600">{copy.emptyStateDescription}</p>
                    </div>
                ) : (
                    posts.map((post, index) => (
                        <BlogPostCard
                            key={post.id}
                            post={post}
                            locale={locale}
                            ctaLabel={copy.readMoreLabel}
                            priority={index === 0}
                        />
                    ))
                )}
            </section>

            {interlinkCopy && <InterlinkingSection copy={interlinkCopy} className="py-12" />}

        </main>
    );
};

export default BlogIndexPageContent;
