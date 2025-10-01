import { describe, expect, it } from "vitest";

import type { WheelOfFortunePeriod } from "@/types/wheel";
import {
    doesPeriodMatchBookingMonths,
    resolveMonthsInRange,
} from "../HomePageClient";

const buildPeriod = (
    overrides: Partial<WheelOfFortunePeriod> = {},
): WheelOfFortunePeriod => ({
    id: 1,
    name: "Perioadă test",
    start_at: "2024-01-01",
    end_at: "2024-12-31",
    starts_at: "2024-01-01",
    ends_at: "2024-12-31",
    active: true,
    is_active: true,
    description: null,
    created_at: null,
    updated_at: null,
    active_months: null,
    wheel_of_fortunes: null,
    ...overrides,
});

describe("resolveMonthsInRange", () => {
    it("include doar luna când perioada este în aceeași lună", () => {
        expect(resolveMonthsInRange("2024-05-02", "2024-05-18")).toEqual([5]);
    });

    it("include toate lunile dintre capete", () => {
        expect(resolveMonthsInRange("2024-01-31", "2024-04-02")).toEqual([1, 2, 3, 4]);
    });

    it("returnează listă goală pentru interval invalid", () => {
        expect(resolveMonthsInRange("2024-06-10", "2024-05-01")).toEqual([]);
    });
});

describe("doesPeriodMatchBookingMonths", () => {
    it("returnează false când nu există perioadă", () => {
        expect(doesPeriodMatchBookingMonths(null, [5])).toBe(false);
    });

    it("returnează false când perioada nu este activă", () => {
        const period = buildPeriod({ active: false, is_active: false });
        expect(doesPeriodMatchBookingMonths(period, [5])).toBe(false);
    });

    it("acceptă toate lunile când perioada nu are restricții", () => {
        const period = buildPeriod({ active_months: null });
        expect(doesPeriodMatchBookingMonths(period, [3, 4])).toBe(true);
    });

    it("potrivește doar lunile incluse în active_months", () => {
        const period = buildPeriod({ active_months: [6, 7, 8] });
        expect(doesPeriodMatchBookingMonths(period, [6, 7])).toBe(true);
        expect(doesPeriodMatchBookingMonths(period, [6, 9])).toBe(false);
    });

    it("returnează false când nu există luni pentru rezervare", () => {
        const period = buildPeriod();
        expect(doesPeriodMatchBookingMonths(period, [])).toBe(false);
    });
});
