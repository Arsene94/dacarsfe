import { describe, expect, it } from "vitest";

import { hreflangLinks, resolveLocalizedPathname } from "@/lib/seo/url";

const extractHref = (entries: Array<{ hrefLang: string; href: string }>, lang: string) => {
    return entries.find((entry) => entry.hrefLang === lang)?.href;
};

describe("hreflangLinks", () => {
    it("adauga prefixul de limba pentru ruta de baza", () => {
        const alternates = hreflangLinks("/", ["ro", "en", "it"]);

        expect(alternates).toEqual([
            { hrefLang: "ro", href: "https://dacars.ro/ro" },
            { hrefLang: "en", href: "https://dacars.ro/en" },
            { hrefLang: "it", href: "https://dacars.ro/it" },
            { hrefLang: "x-default", href: "https://dacars.ro/ro" },
        ]);
    });

    it("normalizeaza traseul si elimina prefixul de limba existent", () => {
        const alternates = hreflangLinks("https://dacars.ro/ro/blog/ghid", ["ro", "en"]);

        expect(extractHref(alternates, "ro")).toBe("https://dacars.ro/ro/blog/ghid");
        expect(extractHref(alternates, "en")).toBe("https://dacars.ro/en/blog/ghid");
        expect(extractHref(alternates, "x-default")).toBe("https://dacars.ro/ro/blog/ghid");
    });

    it("dedupeaza codurile de limba si pastreaza slugul corect", () => {
        const alternates = hreflangLinks("/oferta", ["ro", "ro-RO", "en", "x-default"]);

        expect(alternates).toEqual([
            { hrefLang: "ro", href: "https://dacars.ro/ro/oferta" },
            { hrefLang: "en", href: "https://dacars.ro/en/oferta" },
            { hrefLang: "x-default", href: "https://dacars.ro/ro/oferta" },
        ]);
    });
});

describe("resolveLocalizedPathname", () => {
    it("adauga prefixul de limba pentru radacina", () => {
        expect(resolveLocalizedPathname("/", "ro")).toBe("/ro");
        expect(resolveLocalizedPathname(undefined, "en")).toBe("/en");
    });

    it("nu dubleaza prefixul deja prezent", () => {
        expect(resolveLocalizedPathname("/ro/oferta", "ro")).toBe("/ro/oferta");
    });

    it("normalizeaza URL-urile absolute la limba ceruta", () => {
        expect(resolveLocalizedPathname("https://dacars.ro/en/blog/articol", "it")).toBe(
            "https://dacars.ro/it/blog/articol",
        );
    });
});
