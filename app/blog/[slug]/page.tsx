import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SEO } from '@/components/SEO';
import { SITE_NAME, SUPPORTED_LANGUAGES } from '@/lib/config';
import { blogPostingJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { absolute, canonical } from '@/lib/seo/url';
import { BLOG_POSTS } from '@/lib/seo/site-data';

type Params = { slug: string };

export function generateStaticParams() {
    return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

function resolvePost(slug: string) {
    return BLOG_POSTS.find((post) => post.slug === slug);
}

export function generateMetadata({ params }: { params: Params }): Metadata {
    const post = resolvePost(params.slug);
    if (!post) {
        return {};
    }

    const path = `/blog/${post.slug}`;
    const canonicalUrl = canonical(path);
    const imageUrl = absolute(post.coverImage.src);
    const title = `${post.title} | ${SITE_NAME}`;

    return {
        title,
        description: post.excerpt,
        alternates: {
            canonical: canonicalUrl,
            languages: {
                'ro-RO': canonicalUrl,
                en: canonical(`/en/blog/${post.slug}`),
            },
        },
        openGraph: {
            title,
            description: post.excerpt,
            url: canonicalUrl,
            type: 'article',
            images: [
                {
                    url: imageUrl,
                    width: post.coverImage.width,
                    height: post.coverImage.height,
                    alt: post.coverImage.alt,
                },
            ],
            tags: post.tags,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description: post.excerpt,
            images: [imageUrl],
        },
    };
}

export default function BlogPostPage({ params }: { params: Params }) {
    const post = resolvePost(params.slug);

    if (!post) {
        notFound();
    }

    const path = `/blog/${post.slug}`;
    const jsonLd = [
        blogPostingJsonLd({
            title: post.title,
            description: post.excerpt,
            path,
            image: post.coverImage.src,
            author: post.author,
            keywords: post.keywords,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
        }),
        breadcrumbJsonLd([
            { name: 'Acasă', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: post.title, path },
        ]),
    ];

    const currentIndex = BLOG_POSTS.findIndex((item) => item.slug === post.slug);
    const previous = BLOG_POSTS[currentIndex - 1];
    const next = BLOG_POSTS[currentIndex + 1];
    const related = BLOG_POSTS.filter((item) => item.slug !== post.slug).slice(0, 2);

    return (
        <article className="space-y-12">
            <SEO
                title={`${post.title} | ${SITE_NAME}`}
                description={post.excerpt}
                path={path}
                jsonLd={jsonLd}
                hreflangLocales={Array.from(SUPPORTED_LANGUAGES)}
                openGraph={{
                    type: 'article',
                    images: [
                        {
                            url: absolute(post.coverImage.src),
                            width: post.coverImage.width,
                            height: post.coverImage.height,
                            alt: post.coverImage.alt,
                        },
                    ],
                }}
                twitter={{ images: [absolute(post.coverImage.src)] }}
            />

            <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
                <ol className="flex flex-wrap items-center gap-2">
                    <li>
                        <Link href="/" className="hover:text-berkeley-600">
                            Acasă
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li>
                        <Link href="/blog" className="hover:text-berkeley-600">
                            Blog
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li className="font-semibold text-gray-900">{post.title}</li>
                </ol>
            </nav>

            <header className="space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-berkeley-500">
                    {new Date(post.publishedAt).toLocaleDateString('ro-RO')} · {post.category}
                </p>
                <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">{post.title}</h1>
                <p className="max-w-2xl text-lg text-gray-600">{post.excerpt}</p>
                <div className="text-sm text-gray-500">
                    Scris de {post.author} · Actualizat la{' '}
                    {new Date(post.updatedAt).toLocaleDateString('ro-RO')}
                </div>
            </header>

            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-gray-50">
                <Image
                    src={post.coverImage.src}
                    alt={post.coverImage.alt}
                    fill
                    sizes="(min-width: 1024px) 960px, 100vw"
                    className="object-cover"
                    priority
                />
            </div>

            <div className="prose prose-lg max-w-none text-gray-700 prose-headings:text-gray-900">
                {post.content.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                ))}
            </div>

            <div className="flex flex-col gap-6 border-t border-gray-200 pt-8 text-sm text-gray-600 md:flex-row md:justify-between">
                <div>
                    {previous ? (
                        <Link href={`/blog/${previous.slug}`} className="group inline-flex flex-col">
                            <span className="text-xs uppercase tracking-[0.3em] text-gray-400">Articol anterior</span>
                            <span className="text-base font-semibold text-berkeley-600 group-hover:text-berkeley-500">
                                {previous.title}
                            </span>
                        </Link>
                    ) : (
                        <span className="text-gray-400">Acesta este primul articol</span>
                    )}
                </div>
                <div className="text-right">
                    {next ? (
                        <Link href={`/blog/${next.slug}`} className="group inline-flex flex-col">
                            <span className="text-xs uppercase tracking-[0.3em] text-gray-400">Articol următor</span>
                            <span className="text-base font-semibold text-berkeley-600 group-hover:text-berkeley-500">
                                {next.title}
                            </span>
                        </Link>
                    ) : (
                        <span className="text-gray-400">Ai ajuns la cel mai nou articol</span>
                    )}
                </div>
            </div>

            <section className="space-y-4 rounded-2xl bg-berkeley-50 p-6">
                <h2 className="text-xl font-semibold text-berkeley-700">Articole conexe</h2>
                <ul className="grid gap-4 md:grid-cols-2">
                    {related.map((item) => (
                        <li key={item.slug} className="rounded-xl border border-berkeley-100 bg-white p-4 shadow-sm">
                            <Link href={`/blog/${item.slug}`} className="font-semibold text-berkeley-700 hover:text-berkeley-500">
                                {item.title}
                            </Link>
                            <p className="mt-1 text-sm text-gray-600">{item.excerpt}</p>
                        </li>
                    ))}
                </ul>
            </section>
        </article>
    );
}
