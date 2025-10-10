import type { Metadata } from "next";
import BlogIndexPageContent from "@/components/blog/BlogIndexPageContent";
import { buildMetadata } from "@/lib/seo/meta";
import { resolveRequestLocale } from "@/lib/i18n/server";
import {
    BLOG_HREFLANG_LOCALES,
    buildBlogIndexStructuredData,
    getBlogIndexCopy,
    loadBlogPosts,
} from "@/lib/blog/publicBlog";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
    const locale = await resolveRequestLocale();
    const copy = getBlogIndexCopy(locale);

    return buildMetadata({
        title: copy.metaTitle,
        description: copy.metaDescription,
        path: "/blog",
        hreflangLocales: BLOG_HREFLANG_LOCALES,
        locale,
        openGraphTitle: copy.metaTitle,
        twitterTitle: copy.metaTitle,
    });
}

const BlogIndexPage = async () => {
    const locale = await resolveRequestLocale();
    const copy = getBlogIndexCopy(locale);
    const posts = await loadBlogPosts(locale);
    const structuredData = buildBlogIndexStructuredData(copy, posts);

    return (
        <BlogIndexPageContent
            initialLocale={locale}
            initialCopy={copy}
            initialPosts={posts}
            initialStructuredData={structuredData}
        />
    );
};

export default BlogIndexPage;
