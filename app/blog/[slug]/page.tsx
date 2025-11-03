import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostPageContent from "@/components/blog/BlogPostPageContent";
import { SITE_NAME } from "@/lib/config";
import { resolveRequestLocale } from "@/lib/i18n/server";
import {
    BLOG_HREFLANG_LOCALES,
    buildBlogPostStructuredData,
    extractBlogSummary,
    getBlogPostCopy,
    loadBlogPost,
    resolveBlogPostPreviewImage,
} from "@/lib/blog/publicBlog";
import { buildMetadata } from "@/lib/seo/meta";
import type { JsonLd } from "@/lib/seo/jsonld";

export const revalidate = 300;

type BlogPostPageProps = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const locale = await resolveRequestLocale();
    const copy = getBlogPostCopy(locale);
    const post = await loadBlogPost(slug, locale);

    if (!post) {
        return buildMetadata({
            title: copy.notFoundTitle,
            description: copy.notFoundDescription,
            path: `/blog/${slug}`,
            noIndex: true,
            hreflangLocales: BLOG_HREFLANG_LOCALES,
            locale,
        });
    }

    const summary = extractBlogSummary(post);
    const resolvedTitle = post.meta_title?.trim().length ? post.meta_title : `${post.title} | ${SITE_NAME}`;
    const ogImage = resolveBlogPostPreviewImage(post) ?? undefined;
    const keywords = post.tags?.map((tag) => tag.name).filter(Boolean);

    return buildMetadata({
        title: resolvedTitle,
        description: post.meta_description?.trim().length ? post.meta_description : summary || post.title,
        path: `/blog/${post.slug}`,
        ogImage,
        hreflangLocales: BLOG_HREFLANG_LOCALES,
        locale,
        keywords,
        openGraphTitle: post.og_title?.trim().length ? post.og_title : resolvedTitle,
        twitterTitle: post.twitter_title?.trim().length ? post.twitter_title : resolvedTitle,
    });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const locale = await resolveRequestLocale();
    const copy = getBlogPostCopy(locale);
    const post = await loadBlogPost(slug, locale);

    if (!post) {
        notFound();
    }

    const summary = extractBlogSummary(post);
    const structuredData = buildBlogPostStructuredData(post, copy, summary);
    let faqStructuredData: JsonLd | null = null;
    const sanitizedStructuredData = structuredData.filter((entry) => {
        if (isFaqStructuredData(entry)) {
            if (!faqStructuredData) {
                faqStructuredData = entry;
            }
            return false;
        }
        return true;
    });
    const faqJson = faqStructuredData ? safeJsonStringify(faqStructuredData) : null;

    return (
        <>
            {faqJson ? (
                <script
                    id="blog-post-faq-structured-data"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: faqJson }}
                />
            ) : null}
            <BlogPostPageContent
                slug={slug}
                initialLocale={locale}
                initialCopy={copy}
                initialPost={post}
                initialSummary={summary}
                initialStructuredData={sanitizedStructuredData}
            />
        </>
    );
}

const isFaqStructuredData = (entry: JsonLd): boolean => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return false;
    }

    const type = Reflect.get(entry, "@type");
    return type === "FAQPage";
};

const safeJsonStringify = (value: JsonLd): string | null => {
    try {
        return JSON.stringify(value);
    } catch (error) {
        console.error("Nu am putut serializa schema FAQ pentru blog", error);
        return null;
    }
};
