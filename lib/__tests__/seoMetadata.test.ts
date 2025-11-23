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
});
