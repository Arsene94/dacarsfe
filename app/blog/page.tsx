import Link from "next/link";
import type { Metadata } from "next";
import SEO from "@/components/SEO";
import { STATIC_BLOG_POSTS, resolveStaticUrl } from "@/lib/content/staticEntries";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/meta";
import { siteMetadata } from "@/lib/seo/siteMetadata";

const PAGE_TITLE = "Blog DaCars";
const PAGE_DESCRIPTION = "Informații fresh despre mobilitate, predare rapidă și optimizarea flotei DaCars.";

export const generateMetadata = (): Metadata =>
    buildMetadata({
        title: `${PAGE_TITLE} | DaCars`,
        description: PAGE_DESCRIPTION,
        path: "/blog",
    });

const BlogIndexPage = () => {
    const breadcrumbJson = buildBreadcrumbJsonLd([
        { name: "Acasă", url: siteMetadata.siteUrl },
        { name: PAGE_TITLE, url: resolveStaticUrl("/blog") },
    ]);

    return (
        <main className="mx-auto max-w-5xl space-y-10 px-6 py-12">
            <SEO title={PAGE_TITLE} description={PAGE_DESCRIPTION} path="/blog" jsonLd={breadcrumbJson ? [breadcrumbJson] : []} />
            <header className="rounded-xl bg-berkeley px-6 py-12 text-white">
                <h1 className="text-3xl font-semibold sm:text-4xl">{PAGE_TITLE}</h1>
                <p className="mt-3 max-w-3xl text-base text-white/80">{PAGE_DESCRIPTION}</p>
            </header>

            <section className="grid gap-8 md:grid-cols-2">
                {STATIC_BLOG_POSTS.map((post) => (
                    <article key={post.slug} className="flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Publicat la {post.publishedAt}</p>
                            <h2 className="text-2xl font-semibold text-gray-900">
                                <Link href={`/blog/${post.slug}`} className="hover:text-berkeley">
                                    {post.title}
                                </Link>
                            </h2>
                            <p className="text-sm text-gray-600">{post.excerpt}</p>
                        </div>
                        <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
                            <span>de {post.author}</span>
                            <Link href={`/blog/${post.slug}`} className="font-medium text-berkeley hover:underline">
                                Citește articolul
                            </Link>
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
};

export default BlogIndexPage;
