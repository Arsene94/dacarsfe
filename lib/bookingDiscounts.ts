const MANUAL_COUPON_TYPE_ALIASES = {
    per_total: "from_total",
    percent: "percentage",
} as const;

const MANUAL_COUPON_TYPES = [
    "code",
    "fixed_per_day",
    "per_day",
    "days",
    "from_total",
    "percentage",
] as const;

const MANUAL_COUPON_TYPE_SET = new Set<string>(MANUAL_COUPON_TYPES);

/**
 * Normalize coupon type values returned by the API or entered in forms.
 *
 * The backend historically returned `per_total` and `percent` for manual
 * overrides. Newer releases expect `from_total` and `percentage`. To keep
 * backwards compatibility we coerce the legacy aliases to the new values and
 * lowercase any recognized type.
 */
export const normalizeManualCouponType = (raw: unknown): string => {
    if (typeof raw !== "string") {
        return "";
    }

    const trimmed = raw.trim();
    if (trimmed.length === 0) {
        return "";
    }

    const lower = trimmed.toLowerCase();
    const alias =
        MANUAL_COUPON_TYPE_ALIASES[lower as keyof typeof MANUAL_COUPON_TYPE_ALIASES];
    const candidate = alias ?? lower;

    if (MANUAL_COUPON_TYPE_SET.has(candidate)) {
        return candidate;
    }

    return candidate;
};

export type ManualCouponType = (typeof MANUAL_COUPON_TYPES)[number];

export const isManualCouponType = (value: unknown): value is ManualCouponType => {
    if (typeof value !== "string") {
        return false;
    }

    const normalized = normalizeManualCouponType(value);
    return normalized.length > 0 && MANUAL_COUPON_TYPE_SET.has(normalized);
};
