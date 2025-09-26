import { STATIC_DOCS_PAGES } from "@/lib/content/staticEntries";

export const findDocBySlug = (slug: string) =>
    STATIC_DOCS_PAGES.find((entry) => entry.slug === slug) ?? null;

export const buildAnchorId = (heading: string): string => {
    const normalized = heading.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const candidate = normalized.replace(/[^a-z0-9 -]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");
    return candidate || heading.toLowerCase().replace(/\s+/g, "-");
};

export const resolveNeighbours = (slug: string) => {
    const index = STATIC_DOCS_PAGES.findIndex((entry) => entry.slug === slug);
    if (index === -1) {
        return { previous: null, next: null };
    }
    const previous = index > 0 ? STATIC_DOCS_PAGES[index - 1] : null;
    const next = index + 1 < STATIC_DOCS_PAGES.length ? STATIC_DOCS_PAGES[index + 1] : null;
    return { previous, next };
};
