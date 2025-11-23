import { describe, expect, it } from "vitest";

import { buildMetadata } from "@/lib/seo/meta";

describe("buildMetadata", () => {
    it("seteaza canonical-ul pe versiunea localizata", () => {
        const metadata = buildMetadata({
            title: "Test",
            description: "Descriere",
            path: "/contact",
            locale: "en",
            hreflangLocales: ["ro", "en"],
        });

        expect(metadata.alternates?.canonical).toBe("https://www.dacars.ro/en/contact");
        expect(metadata.alternates?.languages?.en).toBe("https://www.dacars.ro/en/contact");
        expect(metadata.alternates?.languages?.ro).toBe("https://www.dacars.ro/ro/contact");
    });

    it("omite canonical-ul atunci cand pagina este marcata ca noindex", () => {
        const metadata = buildMetadata({
            title: "Admin dashboard",
            description: "Panou de administrare",
            path: "/admin",
            noIndex: true,
        });

        expect(metadata.alternates).toBeUndefined();
        expect(metadata.openGraph?.url).toBeUndefined();
        expect(metadata.robots).toEqual({
            index: false,
            follow: false,
            googleBot: {
                index: false,
                follow: false,
            },
        });
    });
});
