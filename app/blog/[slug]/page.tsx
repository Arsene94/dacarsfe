import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SEO } from '@/components/SEO';
import { BLOG_POSTS } from '@/lib/seo/content';
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/jsonld';
import { buildCanonicalUrl } from '@/lib/seo/url';

export const dynamicParams = false;

export function generateStaticParams() {
    return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
    const post = BLOG_POSTS.find((item) => item.slug === params.slug);
    if (!post) {
        notFound();
    }

    const canonical = buildCanonicalUrl(`/blog/${post.slug}`);

    return {
        title: post.title,
        description: post.excerpt,
        alternates: {
            canonical,
        },
        openGraph: {
            title: post.title,
            description: post.excerpt,
            type: 'article',
            url: canonical,
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.excerpt,
        },
    };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
    const post = BLOG_POSTS.find((item) => item.slug === params.slug);
    if (!post) {
        notFound();
    }

    const canonical = buildCanonicalUrl(`/blog/${post.slug}`);
    const breadcrumb = buildBreadcrumbJsonLd([
        { name: 'Acasă', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: post.title, path: `/blog/${post.slug}` },
    ]);

    const articleSchema = buildArticleJsonLd({
        title: post.title,
        description: post.excerpt,
        slug: post.slug,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        author: post.author,
    });

    return (
        <div className="space-y-10">
            <SEO
                title={post.title}
                description={post.excerpt}
                path={`/blog/${post.slug}`}
                jsonLd={[breadcrumb, articleSchema]}
                openGraph={{ type: 'article', url: canonical, title: post.title, description: post.excerpt }}
                twitter={{ card: 'summary_large_image', title: post.title, description: post.excerpt }}
            />

            <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
                <ol className="flex items-center gap-2">
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
                    <li className="font-medium text-gray-700">{post.title}</li>
                </ol>
            </nav>

            <article className="prose prose-berkeley max-w-none">
                <header>
                    <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{post.title}</h1>
                    <p className="mt-2 text-gray-600">{post.excerpt}</p>
                    <p className="mt-2 text-sm text-gray-400">
                        Publicat pe {new Date(post.publishedAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                        {post.updatedAt ? ` · Actualizat ${new Date(post.updatedAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}` : ''}
                        {' '}
                        • {post.author}
                    </p>
                </header>

                <section>
                    <h2>Context și oportunitate</h2>
                    <p>
                        Managerii de flotă se confruntă cu volatilitate ridicată a cererii. Prin analiza datelor din DaCars poți previziona perioadele de vârf și ajusta prețurile fără a afecta experiența clienților.
                    </p>
                </section>

                <section>
                    <h2>Recomandări cheie</h2>
                    <ul>
                        <li>Analizează rapoartele predictive săptămânal.</li>
                        <li>Definește reguli automate pentru creșteri graduale de tarif.</li>
                        <li>Monitorizează reacțiile clienților prin scorul NPS.</li>
                    </ul>
                </section>

                <section>
                    <h2>Acțiuni imediate</h2>
                    <ol>
                        <li>Configurează segmentarea flotei pe clase și sezon.</li>
                        <li>Activează testele A/B pentru campaniile promoționale.</li>
                        <li>Setează alerte pentru ocupare sub 70% în perioada extra-sezon.</li>
                    </ol>
                </section>
            </article>
        </div>
    );
}
