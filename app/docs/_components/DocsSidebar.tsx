"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { STATIC_DOCS_PAGES } from "@/lib/content/staticEntries";
import { cn } from "@/lib/utils";

const DocsSidebar = () => {
    const activeSegment = useSelectedLayoutSegment();

    return (
        <nav aria-label="Navigare documentație" className="space-y-2">
            {STATIC_DOCS_PAGES.map((page) => {
                const isActive = activeSegment === page.slug;
                return (
                    <Link
                        key={page.slug}
                        href={`/docs/${page.slug}`}
                        className={cn(
                            "block rounded-lg px-4 py-2 text-sm font-medium transition",
                            isActive
                                ? "bg-berkeley text-white shadow"
                                : "text-gray-700 hover:bg-berkeley/10 hover:text-berkeley",
                        )}
                        aria-current={isActive ? "page" : undefined}
                    >
                        {page.title}
                    </Link>
                );
            })}
        </nav>
    );
};

export default DocsSidebar;
