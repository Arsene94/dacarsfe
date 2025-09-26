import type { Metadata } from 'next';
import Link from 'next/link';

import { SEO } from '@/components/SEO';
import { SITE_NAME, SUPPORTED_LANGUAGES } from '@/lib/config';
import { blogJsonLd, blogPostingJsonLd, breadcrumbJsonLd, itemListJsonLd } from '@/lib/seo/jsonld';
import { absolute, canonical } from '@/lib/seo/url';
import { BLOG_POSTS } from '@/lib/seo/site-data';

const PATH = '/blog';
const TITLE = `Blog | Tips, Guides & News | ${SITE_NAME}`;
const DESCRIPTION =
    'Articole despre optimizarea rezervărilor, automatizarea comunicării și strategii de pricing pentru managerii de flotă.';

export const generateMetadata = (): Metadata => {
    const canonicalUrl = canonical(PATH);

    return {
        title: TITLE,
        description: DESCRIPTION,
        alternates: {
            canonical: canonicalUrl,
            languages: {
                'ro-RO': canonicalUrl,
                en: canonical('/en/blog'),
            },
        },
        openGraph: {
            title: TITLE,
            description: DESCRIPTION,
            url: canonicalUrl,
            type: 'website',
            images: [
                {
                    url: absolute('/images/bg-hero-820x380.webp'),
                    width: 820,
                    height: 380,
                    alt: 'Jurnal DaCars cu idei pentru managerii de flotă',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: TITLE,
            description: DESCRIPTION,
            images: [absolute('/images/bg-hero-820x380.webp')],
        },
    };
};

const blogJson = [
    blogJsonLd({
        name: `${SITE_NAME} Blog`,
        description: DESCRIPTION,
        path: PATH,
        posts: BLOG_POSTS.map((post) =>
            blogPostingJsonLd({
                title: post.title,
                description: post.excerpt,
                path: `/blog/${post.slug}`,
                image: post.coverImage.src,
                author: post.author,
                keywords: post.keywords,
                datePublished: post.publishedAt,
                dateModified: post.updatedAt,
            }),
        ),
    }),
    breadcrumbJsonLd([
        { name: 'Acasă', path: '/' },
        { name: 'Blog', path: PATH },
    ]),
    itemListJsonLd(
        BLOG_POSTS.map((post) => ({
            name: post.title,
            url: `/blog/${post.slug}`,
            image: post.coverImage.src,
        })),
    ),
];

export default function BlogIndexPage() {
    return (
        <div className="space-y-16">
            <SEO
                title={TITLE}
                description={DESCRIPTION}
                path={PATH}
                jsonLd={blogJson}
                hreflangLocales={Array.from(SUPPORTED_LANGUAGES)}
                openGraph={{
                    images: [
                        {
                            url: absolute('/images/bg-hero-820x380.webp'),
                            width: 820,
                            height: 380,
                            alt: 'Jurnal DaCars cu idei pentru managerii de flotă',
                        },
                    ],
                }}
                twitter={{ images: [absolute('/images/bg-hero-820x380.webp')] }}
            />

            <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
                <ol className="flex flex-wrap items-center gap-2">
                    <li>
                        <Link href="/" className="hover:text-berkeley-600">
                            Acasă
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li className="font-semibold text-gray-900">Blog</li>
                </ol>
            </nav>

            <header className="space-y-4">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Idei și noutăți pentru închirieri auto agile</h1>
                <p className="max-w-2xl text-lg text-gray-600">
                    Descoperă cum să îți crești gradul de ocupare, să îți fidelizezi clienții și să implementezi procese automate
                    care scad timpul de răspuns.
                </p>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                    <span className="rounded-full border border-gray-300 px-4 py-2">Strategie</span>
                    <span className="rounded-full border border-gray-300 px-4 py-2">Operațional</span>
                    <span className="rounded-full border border-gray-300 px-4 py-2">Marketing</span>
                </div>
            </header>

            <section className="grid gap-6 md:grid-cols-3">
                {BLOG_POSTS.map((post) => (
                    <article key={post.slug} className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                            {new Date(post.publishedAt).toLocaleDateString('ro-RO')} · {post.category}
                        </p>
                        <h2 className="mt-4 text-xl font-semibold text-gray-900">
                            <Link href={`/blog/${post.slug}`} className="hover:text-berkeley-600">
                                {post.title}
                            </Link>
                        </h2>
                        <p className="mt-3 flex-1 text-sm text-gray-600">{post.excerpt}</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
                            {post.tags.map((tag) => (
                                <span key={tag} className="rounded-full border border-gray-300 px-3 py-1">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <span className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{post.author}</span>
                    </article>
                ))}
            </section>

            <section className="rounded-2xl bg-berkeley-50 p-8">
                <h2 className="text-xl font-semibold text-berkeley-700">Ghiduri recomandate</h2>
                <p className="mt-2 text-sm text-berkeley-800">
                    Pentru implementare rapidă consultă și paginile despre{' '}
                    <Link href="/offers" className="font-semibold underline decoration-berkeley-500 decoration-2 underline-offset-4">
                        oferte flexibile
                    </Link>{' '}
                    și{' '}
                    <Link href="/cars" className="font-semibold underline decoration-berkeley-500 decoration-2 underline-offset-4">
                        segmentarea flotei
                    </Link>
                    .
                </p>
            </section>
        </div>
    );
}
