"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import JsonLd from "@/components/seo/JsonLd";
import BlogPostCard from "@/components/blog/BlogPostCard";
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

    const interlink = copy.interlink;
    const interlinkLinks = Array.isArray(interlink?.links)
        ? interlink.links.filter((item) => item.href && item.label)
        : [];

    return (
        <main className="mx-auto max-w-5xl space-y-10 px-6 py-12">
            <JsonLd data={structuredData} id="blog-index-structured-data" />
            <header className="rounded-xl bg-berkeley px-6 py-12 text-white">
                <h1 className="text-3xl font-semibold sm:text-4xl">{copy.pageTitle}</h1>
                <p className="mt-3 max-w-3xl text-base text-white/80">{copy.pageDescription}</p>
            </header>

            {interlinkLinks.length > 0 && (
                <section className="rounded-3xl border border-berkeley/10 bg-white/70 p-8 shadow-sm">
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-semibold text-berkeley">{interlink.title}</h2>
                        <p className="mt-3 text-sm text-gray-600">{interlink.description}</p>
                    </div>
                    <nav
                        aria-label={interlink.ariaLabel}
                        className="mt-6"
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            {interlinkLinks.map((item) => (
                                <Link
                                    key={`${item.href}-${item.label}`}
                                    href={item.href}
                                    className="group flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white/90 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-berkeley/40 hover:shadow-lg"
                                >
                                    <div>
                                        <h3 className="text-lg font-semibold text-berkeley">{item.label}</h3>
                                        <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                                    </div>
                                    <span className="mt-5 inline-flex items-center text-sm font-semibold text-berkeley">
                                        {interlink.linkCta}
                                        <ArrowUpRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </nav>
                </section>
            )}

            <section className="grid gap-8 md:grid-cols-2" aria-busy={isLoading}>
                {showEmptyState ? (
                    <div className="col-span-full rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900">{copy.emptyStateTitle}</h2>
                        <p className="mt-2 text-sm text-gray-600">{copy.emptyStateDescription}</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <BlogPostCard key={post.id} post={post} locale={locale} ctaLabel={copy.readMoreLabel} />
                    ))
                )}
            </section>
        </main>
    );
};

export default BlogIndexPageContent;
