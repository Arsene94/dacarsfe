import { describe, expect, it } from "vitest";
import { AVAILABLE_LOCALES } from "@/lib/i18n/config";
import {
    buildLocalizedSitemapUrls,
    dedupeSitemapEntries,
    type SitemapEntry,
} from "@/lib/seo/sitemap";

const SAMPLE_ENTRIES: SitemapEntry[] = [
    {
        path: "/",
        lastModified: "2025-01-01T00:00:00.000Z",
        changeFrequency: "daily",
        priority: 1,
    },
    {
        path: "/offers",
        lastModified: "2025-01-10T08:00:00.000Z",
        changeFrequency: "weekly",
        priority: 0.8,
    },
];

describe("dedupeSitemapEntries", () => {
    it("keeps the most recent metadata when the same path is provided twice", () => {
        const duplicateEntries: SitemapEntry[] = [
            {
                path: "/offers",
                lastModified: "2025-01-01T00:00:00.000Z",
                changeFrequency: "monthly",
                priority: 0.5,
            },
            {
                path: "/offers",
                lastModified: "2025-02-15T12:00:00.000Z",
                changeFrequency: "weekly",
                priority: 0.9,
            },
        ];

        const result = dedupeSitemapEntries(duplicateEntries);
        expect(result).toHaveLength(1);

        const [entry] = result;
        expect(entry.lastModified).toBe("2025-02-15T12:00:00.000Z");
        expect(entry.priority).toBe(0.9);
        expect(entry.changeFrequency).toBe("weekly");
    });
});

describe("buildLocalizedSitemapUrls", () => {
    it("generates canonical and localized URLs for every sitemap entry", () => {
        const sitemap = buildLocalizedSitemapUrls(SAMPLE_ENTRIES, ["ro", "en"] as const);

        const urls = sitemap.map((entry) => entry.url).sort();
        expect(urls).toContain("https://dacars.ro");
        expect(urls).toContain("https://dacars.ro/offers");
        expect(urls).toContain("https://dacars.ro/ro");
        expect(urls).toContain("https://dacars.ro/ro/offers");
        expect(urls).toContain("https://dacars.ro/en");
        expect(urls).toContain("https://dacars.ro/en/offers");
    });

    it("avoids duplicating URLs when the entry already includes the locale prefix", () => {
        const localizedEntries: SitemapEntry[] = [
            {
                path: "/ro/contact",
                lastModified: "2025-01-05T09:30:00.000Z",
                changeFrequency: "monthly",
                priority: 0.6,
            },
        ];

        const sitemap = buildLocalizedSitemapUrls(localizedEntries, AVAILABLE_LOCALES);
        const urls = sitemap.map((entry) => entry.url);

        const occurrences = urls.filter((url) => url === "https://dacars.ro/ro/contact").length;
        expect(occurrences).toBe(1);
    });
});
