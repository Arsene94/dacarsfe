import type { Metadata } from 'next';
import Link from 'next/link';

import { SEO } from '@/components/SEO';
import { DOCS_PAGES } from '@/lib/seo/content';
import { SUPPORTED_LANGUAGES } from '@/lib/config';
import { canonical, hreflangLinks } from '@/lib/seo/url';

const TITLE = 'Documentație DaCars';
const DESCRIPTION = 'Ghid complet cu procese, module și bune practici pentru administrarea flotei în DaCars.';

export const generateMetadata = (): Metadata => {
    const canonicalUrl = canonical('/docs');
    const hreflangEntries = hreflangLinks(Array.from(SUPPORTED_LANGUAGES), '/docs');

    return {
        title: TITLE,
        description: DESCRIPTION,
        alternates: {
            canonical: canonicalUrl,
            languages: Object.fromEntries(hreflangEntries.map((entry) => [entry.hrefLang, entry.href])),
        },
        openGraph: {
            title: TITLE,
            description: DESCRIPTION,
            url: canonicalUrl,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: TITLE,
            description: DESCRIPTION,
        },
    };
};

export default function DocsIndexPage() {
    return (
        <div className="space-y-12">
            <SEO
                title={TITLE}
                description={DESCRIPTION}
                path="/docs"
                hreflangLocales={Array.from(SUPPORTED_LANGUAGES)}
            />
            <header className="rounded-2xl border border-berkeley-100 bg-berkeley-50 p-10 text-gray-900 shadow-sm">
                <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Manualul echipei DaCars</h1>
                <p className="mt-4 max-w-2xl text-lg text-berkeley-900">
                    Urmează traseul recomandat pentru onboarding rapid și pentru a descoperi automatizările care îți accelerează operațiunile zilnice.
                </p>
            </header>

            <section className="grid gap-6 md:grid-cols-2">
                {DOCS_PAGES.map((doc) => (
                    <article key={doc.slug} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berkeley-500">Actualizat în {new Date(doc.updatedAt).toLocaleDateString('ro-RO')}</p>
                        <h2 className="mt-3 text-xl font-semibold text-gray-900">
                            <Link href={`/docs/${doc.slug}`} className="hover:text-berkeley-600">
                                {doc.title}
                            </Link>
                        </h2>
                        <p className="mt-2 text-gray-600">{doc.description}</p>
                        <div className="mt-4 text-sm text-berkeley-700">
                            {doc.sections.length} secțiuni • {doc.sections[0]?.title}
                        </div>
                    </article>
                ))}
            </section>
        </div>
    );
}
