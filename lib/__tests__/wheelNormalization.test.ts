import { describe, expect, it } from "vitest";

import { isPeriodActive } from "@/lib/wheelNormalization";
import type { WheelOfFortunePeriod } from "@/types/wheel";

const createPeriod = (
    overrides: Partial<WheelOfFortunePeriod> = {},
): WheelOfFortunePeriod => ({
    id: 1,
    name: "Test period",
    start_at: null,
    end_at: null,
    starts_at: null,
    ends_at: null,
    active: undefined,
    is_active: undefined,
    ...overrides,
});

describe("isPeriodActive", () => {
    const reference = new Date("2024-05-20T10:00:00Z");

    it("returns flag when explicit boolean is present", () => {
        expect(isPeriodActive(createPeriod({ active: true }), reference)).toBe(true);
        expect(isPeriodActive(createPeriod({ active: false }), reference)).toBe(false);
        expect(isPeriodActive(createPeriod({ is_active: true }), reference)).toBe(true);
        expect(isPeriodActive(createPeriod({ is_active: false }), reference)).toBe(false);
    });

    it("returns false when no period is provided", () => {
        expect(isPeriodActive(null, reference)).toBe(false);
        expect(isPeriodActive(undefined, reference)).toBe(false);
    });

    it("resolves active status from start and end dates when flags are missing", () => {
        expect(
            isPeriodActive(
                createPeriod({ start_at: "2024-05-10T00:00:00Z", end_at: "2024-05-25T23:59:59Z" }),
                reference,
            ),
        ).toBe(true);
    });

    it("treats missing end date as ongoing", () => {
        expect(
            isPeriodActive(createPeriod({ start_at: "2024-05-01 00:00:00" }), reference),
        ).toBe(true);
    });

    it("treats missing start date as active until the end", () => {
        expect(
            isPeriodActive(createPeriod({ end_at: "2024-05-30 23:59:59" }), reference),
        ).toBe(true);
    });

    it("treats date-only end boundaries as inclusive for the entire day", () => {
        expect(
            isPeriodActive(
                createPeriod({ start_at: "2024-05-01", end_at: "2024-05-20" }),
                reference,
            ),
        ).toBe(true);

        expect(
            isPeriodActive(
                createPeriod({ start_at: "2024-05-01", end_at: "2024-05-19" }),
                reference,
            ),
        ).toBe(false);
    });

    it("returns false when current date is outside the configured range", () => {
        expect(
            isPeriodActive(
                createPeriod({ start_at: "2024-05-21T00:00:00Z", end_at: "2024-05-25T23:59:59Z" }),
                reference,
            ),
        ).toBe(false);

        expect(
            isPeriodActive(
                createPeriod({ start_at: "2024-05-01T00:00:00Z", end_at: "2024-05-10T23:59:59Z" }),
                reference,
            ),
        ).toBe(false);
    });

    it("returns false when no boundaries or flags are provided", () => {
        expect(isPeriodActive(createPeriod(), reference)).toBe(false);
    });

    it("ignores invalid date strings", () => {
        expect(isPeriodActive(createPeriod({ start_at: "invalid" }), reference)).toBe(false);
    });

    it("treats period with doar active_months ca activă", () => {
        expect(
            isPeriodActive(
                createPeriod({ active_months: [5, 6, 7], start_at: null, end_at: null }),
                reference,
            ),
        ).toBe(true);
    });
});
