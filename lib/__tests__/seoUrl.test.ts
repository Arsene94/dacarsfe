import { describe, expect, it } from "vitest";

import { canonical, hreflangLinks, resolveLocalizedPathname } from "@/lib/seo/url";

const extractHref = (entries: Array<{ hrefLang: string; href: string }>, lang: string) => {
    return entries.find((entry) => entry.hrefLang === lang)?.href;
};

describe("hreflangLinks", () => {
    it("adauga prefixul de limba pentru ruta de baza", () => {
        const alternates = hreflangLinks("/", ["ro", "en", "it"]);

        expect(alternates).toEqual([
            { hrefLang: "ro", href: "https://www.dacars.ro/ro" },
            { hrefLang: "en", href: "https://www.dacars.ro/en" },
            { hrefLang: "it", href: "https://www.dacars.ro/it" },
            { hrefLang: "x-default", href: "https://www.dacars.ro/ro" },
        ]);
    });

    it("normalizeaza traseul si elimina prefixul de limba existent", () => {
        const alternates = hreflangLinks("https://www.dacars.ro/ro/blog/ghid", ["ro", "en"]);

        expect(extractHref(alternates, "ro")).toBe("https://www.dacars.ro/ro/blog/ghid");
        expect(extractHref(alternates, "en")).toBe("https://www.dacars.ro/en/blog/ghid");
        expect(extractHref(alternates, "x-default")).toBe("https://www.dacars.ro/ro/blog/ghid");
    });

    it("dedupeaza codurile de limba si pastreaza slugul corect", () => {
        const alternates = hreflangLinks("/oferta", ["ro", "ro-RO", "en", "x-default"]);

        expect(alternates).toEqual([
            { hrefLang: "ro", href: "https://www.dacars.ro/ro/oferta" },
            { hrefLang: "en", href: "https://www.dacars.ro/en/oferta" },
            { hrefLang: "x-default", href: "https://www.dacars.ro/ro/oferta" },
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
        expect(resolveLocalizedPathname("https://www.dacars.ro/en/blog/articol", "it")).toBe(
            "https://www.dacars.ro/it/blog/articol",
        );
    });
});

describe("canonical", () => {
    it("removes non-whitelisted query parameters", () => {
        expect(canonical("https://www.dacars.ro/cars?plan_type=casco")).toBe("https://www.dacars.ro/cars");
        expect(canonical("https://www.dacars.ro/cars?start_date=2025-10-05&end_date=2025-10-05")).toBe(
            "https://www.dacars.ro/cars",
        );
    });

    it("keeps pagination parameters above the first page", () => {
        expect(canonical("https://www.dacars.ro/cars?page=2")).toBe("https://www.dacars.ro/cars?page=2");
        expect(canonical("https://www.dacars.ro/cars?page=1")).toBe("https://www.dacars.ro/cars");
    });

    it("drops tracking parameters while keeping canonical ones", () => {
        expect(canonical("https://www.dacars.ro/cars?page=3&utm_source=google")).toBe("https://www.dacars.ro/cars?page=3");
    });

    it("normalizes relative paths with extraneous parameters", () => {
        expect(canonical("/cars/opel-astra?plan_type=casco")).toBe("https://www.dacars.ro/cars/opel-astra");
    });
});

