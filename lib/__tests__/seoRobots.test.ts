import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SitemapEntry } from "@/lib/seo/sitemap";

vi.mock("@/lib/seo/sitemap", () => ({
    generateSitemapEntries: vi.fn(),
}));

import { generateRobotsConfig } from "@/lib/seo/robots";
import { generateSitemapEntries } from "@/lib/seo/sitemap";

const sitemapEntriesMock = vi.mocked(generateSitemapEntries);

describe("generateRobotsConfig", () => {
    beforeEach(() => {
        sitemapEntriesMock.mockReset();
    });

    it("include toate rutele descoperite și versiunile lor localizate în allow", async () => {
        const entries: SitemapEntry[] = [
            {
                path: "/",
                lastModified: "2025-01-01T00:00:00.000Z",
                changeFrequency: "daily",
                priority: 1,
            },
            {
                path: "/blog",
                lastModified: "2025-02-01T00:00:00.000Z",
                changeFrequency: "weekly",
                priority: 0.8,
            },
        ];

        sitemapEntriesMock.mockResolvedValue(entries);

        const config = await generateRobotsConfig();
        const [mainRule] = Array.isArray(config.rules) ? config.rules : [config.rules];
        const allow = Array.isArray(mainRule?.allow) ? mainRule?.allow : [mainRule?.allow].filter(Boolean) as string[];

        expect(new Set(allow).size).toBe(allow.length);
        expect(allow).toContain("/");
        expect(allow).toContain("/blog");
        expect(allow).toContain("/ro");
        expect(allow).toContain("/ro/blog");
        expect(allow).toContain("/en");
        expect(allow).toContain("/en/blog");
        expect(allow).toContain("/*?*");

        const disallow = Array.isArray(mainRule?.disallow)
            ? mainRule.disallow
            : [mainRule?.disallow].filter(Boolean) as string[];

        expect(disallow).toContain("/*?*&*");
        expect(disallow).toContain("/admin/");
    });
});
