import Link from "next/link";
import type { Metadata } from "next";
import SEO from "@/components/SEO";
import { STATIC_DOCS_PAGES, resolveStaticUrl } from "@/lib/content/staticEntries";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/meta";
import { siteMetadata } from "@/lib/seo/siteMetadata";

const PAGE_TITLE = "Documentație DaCars";
const PAGE_DESCRIPTION = "Proceduri pas-cu-pas pentru configurarea flotei, tarifelor și raportării în platforma DaCars.";

export const generateMetadata = (): Metadata =>
    buildMetadata({
        title: `${PAGE_TITLE} | DaCars`,
        description: PAGE_DESCRIPTION,
        path: "/docs",
    });

const DocsIndexPage = () => {
    const breadcrumbJson = buildBreadcrumbJsonLd([
        { name: "Acasă", url: siteMetadata.siteUrl },
        { name: "Documentație", url: resolveStaticUrl("/docs") },
    ]);

    return (
        <article className="space-y-10">
            <SEO title={PAGE_TITLE} description={PAGE_DESCRIPTION} path="/docs" jsonLd={breadcrumbJson ? [breadcrumbJson] : []} />
            <header className="rounded-xl bg-berkeley px-6 py-10 text-white">
                <h1 className="text-3xl font-semibold sm:text-4xl">{PAGE_TITLE}</h1>
                <p className="mt-3 max-w-3xl text-base text-white/80">{PAGE_DESCRIPTION}</p>
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
