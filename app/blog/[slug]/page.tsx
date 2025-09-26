import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SEO from "@/components/SEO";
import { STATIC_BLOG_POSTS, resolveStaticUrl } from "@/lib/content/staticEntries";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/meta";
import { siteMetadata } from "@/lib/seo/siteMetadata";

const findPost = (slug: string) => STATIC_BLOG_POSTS.find((entry) => entry.slug === slug);

export const dynamicParams = false;

export function generateStaticParams() {
    return STATIC_BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
    const post = findPost(params.slug);
    if (!post) {
        return buildMetadata({
            title: "Articolul nu a fost găsit",
            description: "Conținutul solicitat nu mai este disponibil.",
            path: `/blog/${params.slug}`,
            noIndex: true,
        });
    }

    return buildMetadata({
        title: `${post.title} | Blog DaCars`,
        description: post.excerpt,
        path: `/blog/${post.slug}`,
        openGraphTitle: post.title,
        openGraphType: "article",
    });
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
    const post = findPost(params.slug);

    if (!post) {
        notFound();
    }

    const breadcrumbJson = buildBreadcrumbJsonLd([
        { name: "Acasă", url: siteMetadata.siteUrl },
        { name: "Blog", url: resolveStaticUrl("/blog") },
        { name: post.title, url: resolveStaticUrl(`/blog/${post.slug}`) },
    ]);

    const articleJson = buildArticleJsonLd({
        title: post.title,
        description: post.excerpt,
        slug: post.slug,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        author: {
            name: post.author,
        },
    });

    return (
        <article className="mx-auto max-w-3xl space-y-8 px-6 py-12">
            <SEO
                title={`${post.title} | Blog DaCars`}
                description={post.excerpt}
                path={`/blog/${post.slug}`}
                jsonLd={[articleJson, ...(breadcrumbJson ? [breadcrumbJson] : [])]}
            />
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
                <p className="text-base text-gray-600">{post.excerpt}</p>
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
