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
} from "@/lib/blog/publicBlog";
import { resolveMediaUrl } from "@/lib/media";
import { buildMetadata } from "@/lib/seo/meta";

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
    const ogImage = resolveMediaUrl(post.image ?? post.thumbnail ?? null) ?? undefined;
    const keywords = post.tags?.map((tag) => tag.name).filter(Boolean);

    return buildMetadata({
        title: resolvedTitle,
        description: summary || post.title,
        path: `/blog/${post.slug}`,
        ogImage,
        hreflangLocales: BLOG_HREFLANG_LOCALES,
        locale,
        keywords,
        openGraphTitle: resolvedTitle,
        twitterTitle: resolvedTitle,
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

    return (
        <BlogPostPageContent
            slug={slug}
            initialLocale={locale}
            initialCopy={copy}
            initialPost={post}
            initialSummary={summary}
            initialStructuredData={structuredData}
        />
    );
}
