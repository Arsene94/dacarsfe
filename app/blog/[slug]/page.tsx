import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { STATIC_BLOG_POSTS } from "@/lib/content/staticEntries";
import { buildMetadata } from "@/lib/seo/meta";
import { blogPosting, breadcrumb } from "@/lib/seo/jsonld";

type BlogPostPageProps = {
    params: Promise<{ slug: string }>;
};

const findPost = (slug: string) => STATIC_BLOG_POSTS.find((entry) => entry.slug === slug);

export const dynamicParams = false;

export function generateStaticParams() {
    return STATIC_BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

const resolveDescription = (post: (typeof STATIC_BLOG_POSTS)[number]): string => {
    if (post.excerpt && post.excerpt.trim().length > 0) {
        return post.excerpt;
    }

    const raw = post.content.join(" ").trim();
    return raw.length > 160 ? `${raw.slice(0, 157)}...` : raw;
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = findPost(slug);

    if (!post) {
        return buildMetadata({
            title: `Article not found | ${SITE_NAME}`,
            description: "The requested article is no longer available.",
            path: `/blog/${slug}`,
            noIndex: true,
            hreflangLocales: ["en", "ro"],
        });
    }

    const description = resolveDescription(post);

    return buildMetadata({
        title: `${post.title} | ${SITE_NAME}`,
        description,
        path: `/blog/${post.slug}`,
        ogImage: undefined,
        hreflangLocales: ["en", "ro"],
    });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const post = findPost(slug);

    if (!post) {
        notFound();
    }

    const description = resolveDescription(post);

    const structuredData = [
        blogPosting({
            slug: post.slug,
            title: post.title,
            description,
            author: { name: post.author },
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
        }),
        breadcrumb([
            { name: "Home", url: SITE_URL },
            { name: "Blog", url: `${SITE_URL}/blog` },
            { name: post.title, url: `${SITE_URL}/blog/${post.slug}` },
        ]),
    ];

    return (
        <article className="mx-auto max-w-3xl space-y-8 px-6 py-12">
            <StructuredData data={structuredData} id="blog-post-structured-data" />
            <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
                <ol className="flex flex-wrap items-center gap-2">
                    <li>
                        <Link href="/" className="hover:text-berkeley">
                            Acasă
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li>
                        <Link href="/blog" className="hover:text-berkeley">
                            Blog
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li aria-current="page" className="font-medium text-gray-900">
                        {post.title}
                    </li>
                </ol>
            </nav>

            <header className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Publicat la {post.publishedAt}</p>
                <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">{post.title}</h1>
                <p className="text-base text-gray-600">{description}</p>
                <p className="text-sm text-gray-500">Autor: {post.author}</p>
            </header>

            <div className="space-y-5 text-base leading-relaxed text-gray-700">
                {post.content.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                ))}
            </div>

            <footer className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Ți-a plăcut articolul?</h2>
                <p className="mt-2 text-sm text-gray-600">
                    Distribuie-l colegilor din flotă și revino pe blog pentru noi actualizări despre mobilitatea DaCars.
                </p>
            </footer>
        </article>
    );
}
