import type { WheelPrize } from "@/types/wheel";
import type { ReservationWheelPrizeSummary } from "@/types/reservation";

const amountFormatter = new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
});

const expiryFormatter = new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

export const formatWheelPrizeAmount = (
    prize: Pick<WheelPrize, "amount" | "type"> | null | undefined,
): string => {
    if (!prize) return "—";
    const { amount } = prize;
    if (typeof amount !== "number" || !Number.isFinite(amount)) {
        return "—";
    }
    const normalizedType = typeof prize.type === "string" ? prize.type : "other";
    if (normalizedType === "percentage_discount") {
        return `${amountFormatter.format(amount)}%`;
    }
    if (normalizedType === "fixed_discount") {
        return `${amountFormatter.format(amount)} RON`;
    }
    if (normalizedType === "extra_rental_day") {
        const formatted = Number.isInteger(amount)
            ? amount.toString()
            : amountFormatter.format(amount);
        return `${formatted} ${formatted === "1" ? "zi" : "zile"}`;
    }
    return amountFormatter.format(amount);
};

export const describeWheelPrizeAmount = (
    prize: WheelPrize | null | undefined,
): string | null => {
    if (!prize) return null;
    const formatted = formatWheelPrizeAmount(prize);
    if (formatted === "—") return null;
    const type = typeof prize.type === "string" ? prize.type : "other";
    if (type === "percentage_discount") {
        return `Reducere de ${formatted}`;
    }
    if (type === "fixed_discount") {
        return `Discount de ${formatted}`;
    }
    if (type === "extra_rental_day") {
        return `Bonus de ${formatted}`;
    }
    return formatted;
};

const toOptionalNumber = (value: unknown): number | null => {
    if (value == null || value === "") return null;
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const sanitized = Number(value.replace(/[^0-9.,-]/g, "").replace(",", "."));
        return Number.isFinite(sanitized) ? sanitized : null;
    }
    return null;
};

export const mapReservationPrizeToWheelPrize = (
    summary: ReservationWheelPrizeSummary | null | undefined,
): WheelPrize | null => {
    if (!summary) return null;
    return {
        id: Number(summary.prize_id ?? 0),
        period_id: Number(summary.wheel_of_fortune_id ?? 0),
        title: summary.title ?? "Premiu DaCars",
        description: summary.description ?? null,
        amount: toOptionalNumber(summary.amount),
        color: "#000000",
        probability: 0,
        type: summary.type ?? "other",
        created_at: null,
        updated_at: null,
    };
};

export const describeWheelPrizeSummaryAmount = (
    summary: ReservationWheelPrizeSummary | null | undefined,
): string | null => {
    if (!summary) return null;
    if (summary.amount_label && summary.amount_label.trim().length > 0) {
        return summary.amount_label;
    }
    const prize = mapReservationPrizeToWheelPrize(summary);
    if (!prize) return null;
    return describeWheelPrizeAmount(prize);
};

export const formatWheelPrizeExpiry = (
    value?: string | null,
): string | null => {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return null;
    try {
        return expiryFormatter.format(new Date(parsed));
    } catch (error) {
        console.warn("Failed to format wheel prize expiry", error);
        return new Date(parsed).toLocaleDateString("ro-RO");
    }
};

export const buildWheelPrizeDefaultDescription = (
    prize: WheelPrize,
): string | null => {
    const amountDescription = describeWheelPrizeAmount(prize);
    if (!amountDescription) return null;
    const type = typeof prize.type === "string" ? prize.type : "other";
    if (type === "percentage_discount") {
        return `${amountDescription} la următoarea rezervare.`;
    }
    if (type === "fixed_discount") {
        return `${amountDescription} aplicat la rezervarea ta.`;
    }
    if (type === "extra_rental_day") {
        return `${amountDescription} pentru mașina rezervată.`;
    }
    return amountDescription;
};
