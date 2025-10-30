import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config.js";

import { IMAGE_SIZE_PRESETS, getImageSizesPreset } from "@/lib/images/sizePresets";

describe("image optimisation configuration", () => {
    it("exposes AVIF and WebP formats in Next.js config", () => {
        const formats = nextConfig?.images?.formats ?? [];
        expect(formats).toContain("image/avif");
        expect(formats).toContain("image/webp");
    });

    it("provides consistent responsive size presets", () => {
        expect(IMAGE_SIZE_PRESETS.heroBackground).toBe("100vw");
        expect(getImageSizesPreset("blogCard")).toMatch(/320px$/);
        expect(getImageSizesPreset("carGridCard")).toMatch(/320px$/);
    });
});
