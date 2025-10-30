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

        expect(metadata.alternates?.canonical).toBe("https://dacars.ro/en/contact");
        expect(metadata.alternates?.languages?.en).toBe("https://dacars.ro/en/contact");
        expect(metadata.alternates?.languages?.ro).toBe("https://dacars.ro/ro/contact");
    });
});
