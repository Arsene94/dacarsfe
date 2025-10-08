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

const toFiniteNumber = (value: unknown): number | null => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
};

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

type PercentageCouponContext = {
    couponType: unknown;
    couponAmount: unknown;
    discountAmount?: unknown;
    days?: unknown;
    depositRate?: unknown;
    cascoRate?: unknown;
    withDeposit?: unknown;
};

/**
 * Convert raw discount amounts returned by the API into the percentage value
 * expected by the booking form when the manual override uses the
 * `percentage` type.
 */
export const derivePercentageCouponInputValue = (
    context: PercentageCouponContext,
): number | null => {
    const normalizedType = normalizeManualCouponType(context.couponType);
    if (normalizedType !== "percentage") {
        return toFiniteNumber(context.couponAmount);
    }

    const discountAmount =
        toFiniteNumber(context.discountAmount) ?? toFiniteNumber(context.couponAmount);
    if (discountAmount == null || discountAmount <= 0) {
        return toFiniteNumber(context.couponAmount);
    }

    const rentalDays = toFiniteNumber(context.days);
    if (rentalDays == null || rentalDays <= 0) {
        return toFiniteNumber(context.couponAmount);
    }

    const depositRate = toFiniteNumber(context.depositRate);
    const cascoRate = toFiniteNumber(context.cascoRate);
    const preferCasco = context.withDeposit === false;

    const effectiveRate = preferCasco
        ? cascoRate ?? depositRate ?? null
        : depositRate ?? cascoRate ?? null;

    if (effectiveRate == null || effectiveRate <= 0) {
        return toFiniteNumber(context.couponAmount);
    }

    const baseSubtotal = effectiveRate * rentalDays;
    if (!Number.isFinite(baseSubtotal) || baseSubtotal <= 0) {
        return toFiniteNumber(context.couponAmount);
    }

    const percentage = (discountAmount / baseSubtotal) * 100;
    if (!Number.isFinite(percentage)) {
        return toFiniteNumber(context.couponAmount);
    }

    const normalized = Math.round(percentage * 100) / 100;
    return normalized >= 0 ? normalized : 0;
};
