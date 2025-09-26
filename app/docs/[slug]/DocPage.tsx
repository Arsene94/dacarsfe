import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import type { JSX } from 'react';

import { SEO } from '@/components/SEO';
import { DOCS_PAGES, getDocNavigation } from '@/lib/seo/content';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonld';
import { buildCanonicalUrl } from '@/lib/seo/url';

import IntroducereContent from './content/introducere.mdx';
import WorkflowRezervariContent from './content/workflow-rezervari.mdx';
import MonitorizareFlotaContent from './content/monitorizare-flota.mdx';

export const dynamicParams = false;

export function generateStaticParams() {
    return DOCS_PAGES.map((doc) => ({ slug: doc.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
    const doc = DOCS_PAGES.find((item) => item.slug === params.slug);
    if (!doc) {
        notFound();
    }

    const canonical = buildCanonicalUrl(`/docs/${doc.slug}`);

    return {
        title: doc.title,
        description: doc.description,
        alternates: {
            canonical,
        },
        openGraph: {
            title: doc.title,
            description: doc.description,
            type: 'article',
            url: canonical,
        },
        twitter: {
            card: 'summary_large_image',
            title: doc.title,
            description: doc.description,
        },
    };
}

const DOC_COMPONENTS = new Map<string, () => JSX.Element>([
    ['introducere', IntroducereContent],
    ['workflow-rezervari', WorkflowRezervariContent],
    ['monitorizare-flota', MonitorizareFlotaContent],
]);

export function DocPage({ params }: { params: { slug: string } }) {
    const doc = DOCS_PAGES.find((item) => item.slug === params.slug);
    const Content = DOC_COMPONENTS.get(params.slug);

    if (!doc || !Content) {
        notFound();
    }

    const canonical = buildCanonicalUrl(`/docs/${doc.slug}`);
    const breadcrumb = buildBreadcrumbJsonLd([
        { name: 'Acasă', path: '/' },
        { name: 'Documentație', path: '/docs' },
        { name: doc.title, path: `/docs/${doc.slug}` },
    ]);

    const navigation = getDocNavigation(doc.slug);

    return (
        <Fragment>
            <SEO
                title={doc.title}
                description={doc.description}
                path={`/docs/${doc.slug}`}
                jsonLd={breadcrumb}
                openGraph={{ type: 'article', url: canonical, title: doc.title, description: doc.description }}
                twitter={{ card: 'summary_large_image', title: doc.title, description: doc.description }}
            />
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
                <ol className="flex items-center gap-2">
                    <li>
                        <Link href="/" className="hover:text-berkeley-600">
                            Acasă
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li>
                        <Link href="/docs" className="hover:text-berkeley-600">
                            Documentație
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li className="font-medium text-gray-700">{doc.title}</li>
                </ol>
            </nav>

            <article className="prose prose-berkeley max-w-none">
                <header>
                    <h1 className="text-3xl font-bold text-gray-900">{doc.title}</h1>
                    <p className="mt-2 text-gray-600">{doc.description}</p>
                    <p className="mt-1 text-sm text-gray-400">
                        Ultima actualizare: {new Date(doc.updatedAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </header>

                <Content />
            </article>

            <nav aria-label="Navigare documente" className="mt-10 flex flex-col gap-4 border-t border-gray-200 pt-6 text-sm text-berkeley-700 md:flex-row md:justify-between">
                {navigation.previous ? (
                    <Link href={`/docs/${navigation.previous.slug}`} className="flex flex-1 flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-berkeley-300">
                        <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Anterior</span>
                        <span className="font-semibold text-gray-900">{navigation.previous.title}</span>
                    </Link>
                ) : (
                    <span aria-hidden="true" className="flex flex-1" />
                )}

                {navigation.next ? (
                    <Link href={`/docs/${navigation.next.slug}`} className="flex flex-1 flex-col rounded-lg border border-gray-200 bg-white p-4 text-right shadow-sm hover:border-berkeley-300">
                        <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Următor</span>
                        <span className="font-semibold text-gray-900">{navigation.next.title}</span>
                    </Link>
                ) : (
                    <span aria-hidden="true" className="flex flex-1" />
                )}
            </nav>
        </Fragment>
    );
}

export default DocPage;
