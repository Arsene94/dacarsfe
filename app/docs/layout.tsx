import type { ReactNode } from "react";
import DocsSidebar from "@/app/docs/_components/DocsSidebar";
import { STATIC_DOCS_PAGES } from "@/lib/content/staticEntries";

const latestRevision = STATIC_DOCS_PAGES.reduce(
    (latest, doc) => (doc.lastUpdated > latest ? doc.lastUpdated : latest),
    STATIC_DOCS_PAGES[0]?.lastUpdated ?? "2025-01-07",
);

const DocsLayout = ({ children }: { children: ReactNode }) => {
    return (
        <div className="bg-slate-50">
            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 lg:flex-row">
                <aside className="lg:w-72">
                    <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900">Documentație clienți DaCars</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Sfaturi și pași esențiali pentru rezervări, ridicare și utilizarea serviciilor DaCars.
                        </p>
                        <div className="mt-4">
                            <DocsSidebar />
                        </div>
                    </div>
                </aside>
                <section className="flex-1 space-y-6">
                    {children}
                    <footer className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
                        Ultima revizie: {latestRevision}
                    </footer>
                </section>
            </div>
        </div>
    );
};

export default DocsLayout;
