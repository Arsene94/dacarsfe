import { buildWheelPrizeDefaultDescription } from "@/lib/wheelFormatting";
import type { WheelOfFortunePeriod, WheelPrize } from "@/types/wheel";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

export const extractArray = (response: unknown): unknown[] => {
    if (Array.isArray(response)) return response;
    if (!isRecord(response)) return [];
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.items)) return response.items;
    if (Array.isArray(response.results)) return response.results;
    return [];
};

const normalizeActiveFlag = (value: unknown): boolean | undefined => {
    if (typeof value === "undefined" || value === null) return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const normalized = `${value}`.trim().toLowerCase();
    if (["1", "true", "yes", "da", "active", "activ"].includes(normalized)) {
        return true;
    }
    if (["0", "false", "no", "inactive", "inactiv", "off"].includes(normalized)) {
        return false;
    }
    return undefined;
};

export const mapPeriod = (item: unknown): WheelOfFortunePeriod | null => {
    if (!isRecord(item)) return null;
    const id = Number(item.id ?? item.period_id ?? item.value);
    if (!Number.isFinite(id)) return null;

    const nameSource = item.name ?? item.title;
    const name = typeof nameSource === "string" && nameSource.trim().length > 0
        ? nameSource.trim()
        : `Perioada #${id}`;

    const start = item.start_at ?? item.start_date ?? item.starts_at ?? item.from ?? null;
    const end = item.end_at ?? item.end_date ?? item.ends_at ?? item.to ?? null;
    const activeRaw = item.active ?? item.is_active ?? item.enabled ?? item.status;
    const normalizedActive = normalizeActiveFlag(activeRaw);

    const cooldownSource =
        item.cooldown_minutes ??
        item.spin_cooldown_minutes ??
        item.cooldown ??
        item.cooldownMinutes ??
        item.spinCooldownMinutes ??
        null;
    const cooldownMinutes = toOptionalNumber(cooldownSource);

    const activeMonths = Array.isArray(item.active_months)
        ? item.active_months
              .map((entry) => Number(entry))
              .filter((entry) => Number.isFinite(entry) && entry >= 1 && entry <= 12)
        : [];

    return {
        id,
        name,
        start_at: typeof start === "string" ? start : null,
        end_at: typeof end === "string" ? end : null,
        starts_at: typeof start === "string" ? start : null,
        ends_at: typeof end === "string" ? end : null,
        active: normalizedActive,
        is_active: normalizedActive,
        description: typeof item.description === "string" ? item.description : null,
        created_at: typeof item.created_at === "string" ? item.created_at : null,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
        active_months: activeMonths.length > 0 ? activeMonths : null,
        cooldown_minutes:
            typeof cooldownMinutes === "number" && Number.isFinite(cooldownMinutes) && cooldownMinutes > 0
                ? cooldownMinutes
                : typeof cooldownMinutes === "number" && cooldownMinutes === 0
                    ? 0
                    : null,
        spin_cooldown_minutes:
            typeof cooldownMinutes === "number" && Number.isFinite(cooldownMinutes)
                ? cooldownMinutes
                : null,
        wheel_of_fortunes: Array.isArray(item.wheel_of_fortunes)
            ? item.wheel_of_fortunes
                  .map((entry) => mapPrize(entry, false))
                  .filter((entry): entry is WheelPrize => entry !== null)
            : null,
    };
};

export const isPeriodActive = (period?: WheelOfFortunePeriod | null) => {
    if (!period) return false;
    if (typeof period.active === "boolean") return period.active;
    if (typeof period.is_active === "boolean") return period.is_active;
    return false;
};

export const toOptionalNumber = (value: unknown): number | null => {
    if (typeof value === "undefined" || value === null) return null;
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const normalized = value.replace(/,/g, ".").trim();
        if (normalized.length === 0) return null;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

export const mapPrize = (item: unknown, includePeriod = true): WheelPrize | null => {
    if (!isRecord(item)) return null;
    const id = Number(item.id ?? item.wheel_of_fortune_id ?? item.value);
    if (!Number.isFinite(id)) return null;

    const titleSource = item.title ?? item.name;
    const title = typeof titleSource === "string" && titleSource.trim().length > 0
        ? titleSource.trim()
        : `Premiu #${id}`;

    const descriptionSource = item.description ?? item.details ?? item.text ?? null;
    const colorSource = item.color ?? item.hex ?? item.swatch ?? "#1E7149";
    const probabilitySource = item.probability ?? item.weight ?? item.chance ?? 0;
    const typeSource = item.type ?? item.prize_type ?? item.category ?? "other";
    const rawPeriod = isRecord(item.period) ? item.period : null;
    const periodCandidate =
        item.period_id ??
        (rawPeriod
            ? rawPeriod.id ??
                (rawPeriod as Record<string, unknown>).period_id ??
                (rawPeriod as Record<string, unknown>).value
            : typeof item.period === "string" || typeof item.period === "number"
                ? item.period
                : null);
    const periodIdValue = toOptionalNumber(periodCandidate);
    const amountSource =
        item.amount ??
        item.quantity ??
        item.days ??
        item.discount ??
        item.percentage ??
        null;

    const probability = typeof probabilitySource === "number"
        ? probabilitySource
        : Number(String(probabilitySource).replace(/,/g, "."));

    const basePrize: WheelPrize = {
        id,
        period_id: typeof periodIdValue === "number" && Number.isFinite(periodIdValue)
            ? periodIdValue
            : 0,
        title,
        description: typeof descriptionSource === "string" ? descriptionSource : null,
        amount: toOptionalNumber(amountSource),
        color: typeof colorSource === "string" && colorSource.trim().length > 0 ? colorSource : "#1E7149",
        probability: Number.isFinite(probability) ? probability : 0,
        type: typeof typeSource === "string" ? typeSource : "other",
        created_at: typeof item.created_at === "string" ? item.created_at : null,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
        period: includePeriod && rawPeriod ? mapPeriod(rawPeriod) : null,
    };

    const resolvedDescription = basePrize.description ?? buildWheelPrizeDefaultDescription(basePrize);

    return {
        ...basePrize,
        description: resolvedDescription ?? null,
    };
};
