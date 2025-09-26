import type { Metadata } from 'next';
import Link from 'next/link';

import { SEO } from '@/components/SEO';
import { BLOG_POSTS } from '@/lib/seo/content';
import { buildCanonicalUrl, buildHreflangLinks } from '@/lib/seo/url';

const TITLE = 'Blog DaCars: insights pentru managerii de flotă';
const DESCRIPTION = 'Analize, bune practici și studii de caz despre optimizarea flotelor de închirieri auto.';

export const generateMetadata = (): Metadata => {
    const canonical = buildCanonicalUrl('/blog');
    const hreflangEntries = buildHreflangLinks('/blog');

    return {
        title: TITLE,
        description: DESCRIPTION,
        alternates: {
            canonical,
            languages: Object.fromEntries(hreflangEntries.map((entry) => [entry.hrefLang, entry.href])),
        },
        openGraph: {
            title: TITLE,
            description: DESCRIPTION,
            url: canonical,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: TITLE,
            description: DESCRIPTION,
        },
    };
};

export default function BlogIndexPage() {
    return (
        <div className="space-y-12">
            <SEO title={TITLE} description={DESCRIPTION} path="/blog" hreflang />
            <header className="space-y-4">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Noutăți și resurse</h1>
                <p className="max-w-2xl text-lg text-gray-600">
                    Explorează cele mai noi strategii de creștere, automatizări și indicatori de performanță pentru a-ți eficientiza operațiunile.
                </p>
            </header>

            <div className="grid gap-6 md:grid-cols-3">
                {BLOG_POSTS.map((post) => (
                    <article key={post.slug} className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-berkeley-300">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berkeley-500">
                            Publicat în {new Date(post.publishedAt).toLocaleDateString('ro-RO')}
                        </p>
                        <h2 className="mt-3 text-xl font-semibold text-gray-900">
                            <Link href={`/blog/${post.slug}`} className="hover:text-berkeley-600">
                                {post.title}
                            </Link>
                        </h2>
                        <p className="mt-2 flex-1 text-gray-600">{post.excerpt}</p>
                        <span className="mt-4 text-sm text-gray-500">{post.author}</span>
                    </article>
                ))}
            </div>
        </div>
    );
}
