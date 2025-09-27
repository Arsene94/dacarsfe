import Link from "next/link";
import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import { STATIC_DOCS_PAGES, resolveStaticUrl } from "@/lib/content/staticEntries";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/meta";
import { siteMetadata } from "@/lib/seo/siteMetadata";
import { DOCS_HREFLANG_LOCALES, resolveDocsSeo } from "@/app/docs/seo";

export async function generateMetadata(): Promise<Metadata> {
    const { locale, copy } = await resolveDocsSeo();

    return buildMetadata({
        title: copy.metaTitle,
        description: copy.metaDescription,
        path: "/docs",
        hreflangLocales: DOCS_HREFLANG_LOCALES,
        locale,
    });
}

const DocsIndexPage = async () => {
    const { copy } = await resolveDocsSeo();
    const breadcrumbJson = buildBreadcrumbJsonLd([
        { name: copy.breadcrumbHome, url: siteMetadata.siteUrl },
        { name: copy.breadcrumbDocs, url: resolveStaticUrl("/docs") },
    ]);

    return (
        <article className="space-y-10">
            {breadcrumbJson && <StructuredData data={breadcrumbJson} id="docs-breadcrumb" />}
            <header className="rounded-xl bg-berkeley px-6 py-10 text-white">
                <h1 className="text-3xl font-semibold sm:text-4xl">{copy.pageTitle}</h1>
                <p className="mt-3 max-w-3xl text-base text-white/80">{copy.pageDescription}</p>
            </header>

            <section className="grid gap-6 md:grid-cols-2">
                {STATIC_DOCS_PAGES.map((doc) => (
                    <Link
                        key={doc.slug}
                        href={`/docs/${doc.slug}`}
                        className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-berkeley hover:shadow-lg"
                    >
                        <h2 className="text-xl font-semibold text-gray-900 group-hover:text-berkeley">{doc.title}</h2>
                        <p className="mt-3 text-sm text-gray-600">{doc.description}</p>
                        <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">
                            Actualizat la {doc.lastUpdated}
                        </p>
                    </Link>
                ))}
            </section>
        </article>
    );
};

export default DocsIndexPage;
