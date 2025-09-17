import type { WheelPrize } from "@/types/wheel";

export const WHEEL_PRIZE_STORAGE_KEY = "dacars.wheel-prize";
export const WHEEL_PRIZE_STORAGE_VERSION = 1;
export const WHEEL_PRIZE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface StoredWheelPrizeEntry {
    version: number;
    prize: WheelPrize;
    winner: {
        name: string;
        phone: string;
    };
    wheel_of_fortune_id: number;
    prize_id?: number | null;
    saved_at: string;
    expires_at: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
    typeof value === "object" && value !== null && !Array.isArray(value)
);

const normalizeString = (value: unknown): string | null => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    return null;
};

const normalizeNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const normalized = value.replace(/,/g, ".").trim();
        if (!normalized) return null;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const normalizeOptionalNumber = (value: unknown): number | null => {
    const parsed = normalizeNumber(value);
    return typeof parsed === "number" ? parsed : null;
};

const normalizeDateIso = (value: unknown): string | null => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString();
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const parsed = Date.parse(trimmed);
        if (!Number.isNaN(parsed)) {
            return new Date(parsed).toISOString();
        }
    }
    return null;
};

const sanitizePrizeForStorage = (prize: WheelPrize): WheelPrize => ({
    id: Number(prize.id),
    period_id: Number(prize.period_id),
    title: prize.title ?? `Premiu #${prize.id}`,
    description:
        typeof prize.description === "string"
            ? prize.description
            : prize.description == null
                ? null
                : String(prize.description),
    amount: typeof prize.amount === "number" && Number.isFinite(prize.amount)
        ? prize.amount
        : typeof prize.amount === "string"
            ? normalizeOptionalNumber(prize.amount)
            : null,
    color: prize.color ?? "#1E7149",
    probability: Number(prize.probability) || 0,
    type: prize.type,
    created_at:
        typeof prize.created_at === "string" ? prize.created_at : null,
    updated_at:
        typeof prize.updated_at === "string" ? prize.updated_at : null,
});

const parsePrize = (value: unknown): WheelPrize | null => {
    if (!isPlainObject(value)) return null;
    const id = normalizeNumber(value.id ?? value.wheel_of_fortune_id);
    const periodId = normalizeNumber(value.period_id ?? value.periodId);
    if (!Number.isFinite(id ?? NaN)) return null;
    if (!Number.isFinite(periodId ?? NaN)) return null;

    const title = normalizeString(value.title ?? value.name) ?? `Premiu #${id}`;
    const description = normalizeString(value.description ?? value.details);
    const amount = normalizeOptionalNumber(value.amount ?? value.quantity ?? value.days);
    const color = normalizeString(value.color ?? value.hex) ?? "#1E7149";
    const probability = normalizeOptionalNumber(value.probability ?? value.weight) ?? 0;
    const type = normalizeString(value.type ?? value.prize_type ?? value.category) ?? "other";
    const createdAt = normalizeDateIso(value.created_at);
    const updatedAt = normalizeDateIso(value.updated_at);

    return {
        id: Number(id),
        period_id: Number(periodId),
        title,
        description,
        amount,
        color,
        probability,
        type,
        created_at: createdAt,
        updated_at: updatedAt,
    };
};

export const parseStoredWheelPrize = (
    raw: unknown,
): StoredWheelPrizeEntry | null => {
    if (!isPlainObject(raw)) return null;

    const prize = parsePrize(raw.prize ?? raw.slice ?? raw.wheel_of_fortune);
    const winnerSource = raw.winner ?? raw.participant ?? raw.customer;
    const winnerName = normalizeString(winnerSource?.name ?? raw.name);
    const winnerPhone = normalizeString(winnerSource?.phone ?? raw.phone);
    const savedAt = normalizeDateIso(raw.saved_at ?? raw.created_at);
    const expiresAt = normalizeDateIso(raw.expires_at ?? raw.expire_at ?? raw.valid_until);

    if (!prize || !winnerName || !winnerPhone || !savedAt || !expiresAt) {
        return null;
    }

    const wheelId = normalizeNumber(raw.wheel_of_fortune_id ?? prize.id) ?? prize.id;
    const prizeId = normalizeOptionalNumber(raw.prize_id ?? raw.id);
    const version = typeof raw.version === "number" ? raw.version : WHEEL_PRIZE_STORAGE_VERSION;

    return {
        version,
        prize: sanitizePrizeForStorage(prize),
        winner: {
            name: winnerName,
            phone: winnerPhone,
        },
        wheel_of_fortune_id: Number(wheelId),
        prize_id: typeof prizeId === "number" ? prizeId : null,
        saved_at: savedAt,
        expires_at: expiresAt,
    };
};

export const getStoredWheelPrize = (): StoredWheelPrizeEntry | null => {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(WHEEL_PRIZE_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const record = parseStoredWheelPrize(parsed);
        if (!record) {
            window.localStorage.removeItem(WHEEL_PRIZE_STORAGE_KEY);
            return null;
        }
        return record;
    } catch (error) {
        console.warn("Failed to parse stored wheel prize", error);
        window.localStorage.removeItem(WHEEL_PRIZE_STORAGE_KEY);
        return null;
    }
};

export const clearStoredWheelPrize = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(WHEEL_PRIZE_STORAGE_KEY);
};

export const isStoredWheelPrizeActive = (
    record: StoredWheelPrizeEntry | null | undefined,
    referenceDate: Date = new Date(),
): boolean => {
    if (!record) return false;
    const expiryTime = Date.parse(record.expires_at);
    if (Number.isNaN(expiryTime)) return false;
    return expiryTime > referenceDate.getTime();
};

export const storeWheelPrize = (params: {
    prize: WheelPrize;
    winner: { name: string; phone: string };
    prizeId?: number | null;
    wheel_of_fortune_id?: number;
    savedAt?: string | Date | null;
    expiresAt?: string | Date | null;
}): StoredWheelPrizeEntry => {
    const sanitizedPrize = sanitizePrizeForStorage(params.prize);
    const savedAtIso = normalizeDateIso(params.savedAt) ?? new Date().toISOString();
    const expiresAtIso = normalizeDateIso(params.expiresAt)
        ?? new Date(new Date(savedAtIso).getTime() + WHEEL_PRIZE_TTL_MS).toISOString();
    const wheelId = normalizeNumber(params.wheel_of_fortune_id) ?? sanitizedPrize.id;
    const prizeId = normalizeOptionalNumber(params.prizeId);

    const winnerName = normalizeString(params.winner.name) ?? "";
    const winnerPhone = normalizeString(params.winner.phone) ?? "";

    const record: StoredWheelPrizeEntry = {
        version: WHEEL_PRIZE_STORAGE_VERSION,
        prize: sanitizedPrize,
        winner: {
            name: winnerName,
            phone: winnerPhone,
        },
        wheel_of_fortune_id: Number(wheelId),
        prize_id: typeof prizeId === "number" ? prizeId : null,
        saved_at: savedAtIso,
        expires_at: expiresAtIso,
    };

    if (typeof window !== "undefined") {
        window.localStorage.setItem(WHEEL_PRIZE_STORAGE_KEY, JSON.stringify(record));
    }

    return record;
};
