import type { WheelPrize } from "@/types/wheel";

const amountFormatter = new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
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
