import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import StructuredData from "@/components/StructuredData";
import { DOCS_HREFLANG_LOCALES, resolveDocsSeo } from "@/app/docs/seo";
import { buildAnchorId, findDocBySlug, resolveNeighbours } from "@/app/docs/helpers";
import { STATIC_DOCS_PAGES, resolveStaticUrl } from "@/lib/content/staticEntries";
import { SITE_NAME } from "@/lib/config";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/meta";
import { siteMetadata } from "@/lib/seo/siteMetadata";

type DocPageParams = {
    params: {
        slug: string;
    };
};

export const dynamicParams = false;

export function generateStaticParams() {
    return STATIC_DOCS_PAGES.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: DocPageParams): Promise<Metadata> {
    const { locale, copy } = await resolveDocsSeo();
    const doc = findDocBySlug(params.slug);

    if (!doc) {
        return buildMetadata({
            title: copy.notFoundTitle,
            description: copy.notFoundDescription,
            path: `/docs/${params.slug}`,
            noIndex: true,
            hreflangLocales: DOCS_HREFLANG_LOCALES,
            locale,
        });
    }

    return buildMetadata({
        title: `${doc.title} | ${copy.sectionLabel} ${SITE_NAME}`,
        description: doc.description,
        path: `/docs/${doc.slug}`,
        hreflangLocales: DOCS_HREFLANG_LOCALES,
        locale,
    });
}

export default async function DocPage({ params }: DocPageParams) {
    const { copy } = await resolveDocsSeo();
    const doc = findDocBySlug(params.slug);

    if (!doc) {
        notFound();
    }

    const neighbours = resolveNeighbours(doc.slug);
    const breadcrumbJson = buildBreadcrumbJsonLd([
        { name: copy.breadcrumbHome, url: siteMetadata.siteUrl },
        { name: copy.breadcrumbDocs, url: resolveStaticUrl("/docs") },
        { name: doc.title, url: resolveStaticUrl(`/docs/${doc.slug}`) },
    ]);

    return (
        <article className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            {breadcrumbJson && <StructuredData data={breadcrumbJson} id="doc-breadcrumb" />}
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
                <ol className="flex flex-wrap items-center gap-2">
                    <li>
                        <Link href="/" className="hover:text-berkeley">
                            {copy.breadcrumbHome}
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li>
                        <Link href="/docs" className="hover:text-berkeley">
                            {copy.breadcrumbDocs}
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li aria-current="page" className="font-medium text-gray-900">
                        {doc.title}
                    </li>
                </ol>
            </nav>

            <header className="pb-6">
                <h1 className="text-3xl font-semibold text-gray-900">{doc.title}</h1>
                <p className="mt-3 text-base text-gray-600">{doc.description}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">
                    Actualizat la {doc.lastUpdated}
                </p>
            </header>

            <div className="space-y-10">
                {doc.sections.map((section) => {
                    const anchor = buildAnchorId(section.heading);
                    return (
                        <section key={section.heading} id={anchor} className="scroll-mt-24">
                            <h2 className="text-2xl font-semibold text-gray-900">
                                <a href={`#${anchor}`} className="hover:text-berkeley">
                                    {section.heading}
                                </a>
                            </h2>
                            <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-700">
                                {section.body.map((paragraph) => (
                                    <p key={paragraph}>{paragraph}</p>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>

            <hr className="my-10 border-dashed border-gray-300" />

            <nav className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Navigare capitole">
                {neighbours.previous ? (
                    <Link
                        href={`/docs/${neighbours.previous.slug}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 transition hover:border-berkeley hover:text-berkeley"
                    >
                        ← {neighbours.previous.title}
                    </Link>
                ) : (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-gray-100 px-4 py-3 text-sm text-gray-400">
                        Începutul ghidului
                    </span>
                )}

                {neighbours.next ? (
                    <Link
                        href={`/docs/${neighbours.next.slug}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 transition hover:border-berkeley hover:text-berkeley"
                    >
                        {neighbours.next.title} →
                    </Link>
                ) : (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-gray-100 px-4 py-3 text-sm text-gray-400">
                        Ai ajuns la final
                    </span>
                )}
            </nav>
        </article>
    );
}
