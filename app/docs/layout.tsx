import Link from 'next/link';
import type { ReactNode } from 'react';

import { DOCS_PAGES } from '@/lib/seo/content';
import { cn } from '@/lib/utils';

export default function DocsLayout({ children, params }: { children: ReactNode; params: { slug?: string } }) {
    const activeSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
    const currentDoc = activeSlug ? DOCS_PAGES.find((doc) => doc.slug === activeSlug) : undefined;

    return (
        <div className="mx-auto flex w-full max-w-6xl gap-10 px-4 py-12 lg:py-16">
            <aside className="hidden w-64 shrink-0 space-y-6 lg:block">
                <nav aria-label="Secțiuni documentație" className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-berkeley-500">Documentație</p>
                    <ul className="space-y-1 text-sm">
                        {DOCS_PAGES.map((doc) => (
                            <li key={doc.slug}>
                                <Link
                                    href={`/docs/${doc.slug}`}
                                    className={cn(
                                        'flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-berkeley-50',
                                        activeSlug === doc.slug ? 'bg-berkeley-100 font-semibold text-berkeley-800' : 'text-gray-600'
                                    )}
                                >
                                    <span>{doc.title}</span>
                                    <span className="text-xs text-gray-400">{new Date(doc.updatedAt).toLocaleDateString('ro-RO')}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                {currentDoc ? (
                    <nav aria-label="Cuprinsul paginii" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Cuprins</p>
                        <ol className="space-y-2 text-sm text-gray-600">
                            {currentDoc.sections.map((section) => (
                                <li key={section.id}>
                                    <a className="hover:text-berkeley-600" href={`#${section.id}`}>
                                        {section.title}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </nav>
                ) : null}
            </aside>

            <main className="min-w-0 flex-1">{children}</main>
        </div>
    );
}
