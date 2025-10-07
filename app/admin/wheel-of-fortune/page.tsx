"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    CalendarDays,
    CheckCircle2,
    Edit,
    Loader2,
    Plus,
    RefreshCcw,
    Sparkles,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { Select } from "@/components/ui/select";
import apiClient from "@/lib/api";
import { extractItem } from "@/lib/apiResponse";
import type { ApiItemResult } from "@/types/api";
import type { Column } from "@/types/ui";
import {
    WHEEL_OF_FORTUNE_TYPES,
    type WheelOfFortunePeriod,
    type WheelOfFortunePrizeWinner,
    type WheelOfFortuneSlice,
    type WheelOfFortuneType,
} from "@/types/wheel";

const probabilityFormatter = new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
});

const formatPrizeType = (type: string | undefined | null) => {
    if (!type) return "—";
    const normalized = type.toString();
    const dictionary: Record<string, string> = {
        percentage_discount: "Reducere procentuală",
        fixed_discount: "Reducere fixă",
        extra_rental_day: "Zi suplimentară",
        vehicle_upgrade: "Upgrade vehicul",
        try_again: "Mai încearcă",
        extra_service: "Serviciu extra",
        voucher: "Voucher",
        other: "Alt tip",
    };
    return dictionary[normalized] ?? normalized.replace(/_/g, " ");
};

const DEFAULT_PRIZE_COLOR = "#1E7149";

const DEFAULT_PRIZE_TYPE: WheelOfFortuneType =
    WHEEL_OF_FORTUNE_TYPES[0] ?? "percentage_discount";

const MONTHS: { value: number; label: string }[] = [
    { value: 1, label: "Ianuarie" },
    { value: 2, label: "Februarie" },
    { value: 3, label: "Martie" },
    { value: 4, label: "Aprilie" },
    { value: 5, label: "Mai" },
    { value: 6, label: "Iunie" },
    { value: 7, label: "Iulie" },
    { value: 8, label: "August" },
    { value: 9, label: "Septembrie" },
    { value: 10, label: "Octombrie" },
    { value: 11, label: "Noiembrie" },
    { value: 12, label: "Decembrie" },
];

const formatActiveMonths = (values?: number[] | null) => {
    if (!Array.isArray(values) || values.length === 0) {
        return null;
    }
    const labels = values
        .map((value) => MONTHS.find((month) => month.value === value)?.label ?? null)
        .filter((label): label is string => Boolean(label));
    if (labels.length === 0) {
        return null;
    }
    return labels.join(", ");
};

const amountFormatter = new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
});

const AMOUNT_FIELD_CONFIG: Record<string, {
    label: string;
    placeholder: string;
    helper?: string;
    step?: string;
    min?: number;
    max?: number;
    requireInteger?: boolean;
}> = {
    percentage_discount: {
        label: "Valoare reducere (%)",
        placeholder: "Ex. 10",
        helper: "Introduce procentul exact al reducerii oferite.",
        step: "0.01",
        min: 0.01,
        max: 100,
    },
    fixed_discount: {
        label: "Discount fix (EUR)",
        placeholder: "Ex. 150",
        helper: "Introduce valoarea reducerii în lei.",
        step: "0.01",
        min: 1,
    },
    extra_rental_day: {
        label: "Număr zile gratuite",
        placeholder: "Ex. 2",
        helper: "Completează numărul de zile suplimentare oferite.",
        step: "1",
        min: 1,
        requireInteger: true,
    },
};

const getAmountFieldConfig = (type: WheelOfFortuneType | string | undefined | null) => {
    const key = typeof type === "string" ? type : "";
    return AMOUNT_FIELD_CONFIG[key] ?? null;
};

const prizeTypeRequiresAmount = (type: WheelOfFortuneType | string | undefined | null) =>
    Boolean(getAmountFieldConfig(type));

const formatPrizeAmount = (prize: {
    amount?: number | null;
    type?: WheelOfFortuneType | string | null;
} | null | undefined) => {
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
        return `${amountFormatter.format(amount)} EUR`;
    }
    if (normalizedType === "extra_rental_day") {
        const formatted = Number.isInteger(amount)
            ? amount.toString()
            : amountFormatter.format(amount);
        return `${formatted} ${formatted === "1" ? "zi" : "zile"}`;
    }
    return amountFormatter.format(amount);
};

type PrizeFormState = {
    title: string;
    type: WheelOfFortuneType;
    probability: string;
    color: string;
    description: string;
    amount: string;
};

const createEmptyPrizeForm = (): PrizeFormState => ({
    title: "",
    type: DEFAULT_PRIZE_TYPE,
    probability: "",
    color: DEFAULT_PRIZE_COLOR,
    description: "",
    amount: "",
});

const normalizePrizeType = (
    value: unknown,
    fallback: WheelOfFortuneType = DEFAULT_PRIZE_TYPE,
): WheelOfFortuneType => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
            return trimmed as WheelOfFortuneType;
        }
    }
    return fallback;
};

const toNumber = (value: unknown): number => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === "string") {
        const normalized = value.replace(/,/g, ".");
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const toOptionalNumber = (value: unknown): number | null => {
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

const parseBoolean = (value: unknown): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        return ["1", "true", "yes", "da", "active", "activ"].includes(value.toLowerCase());
    }
    return false;
};

const toDateInputValue = (value?: string | null) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value.slice(0, 10);
    }
    return parsed.toISOString().slice(0, 10);
};

const formatDate = (value?: string | null) => {
    if (!value) return "Nespecificată";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value.slice(0, 10);
    }
    return dateFormatter.format(parsed);
};

const formatDateRange = (start?: string | null, end?: string | null) => {
    if (start && end) {
        return `${formatDate(start)} – ${formatDate(end)}`;
    }
    if (start) {
        return `Începe la ${formatDate(start)}`;
    }
    if (end) {
        return `Până la ${formatDate(end)}`;
    }
    return "Nespecificată";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const extractDataArray = (response: unknown): unknown[] => {
    if (Array.isArray(response)) return response;
    if (!isRecord(response)) return [];
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.items)) return response.items;
    if (Array.isArray(response.results)) return response.results;
    return [];
};

const MINUTES_PER_DAY = 60 * 24;

const mapPeriod = (item: unknown): WheelOfFortunePeriod | null => {
    if (!isRecord(item)) return null;
    const id = Number(item.id ?? item.period_id ?? item.value);
    if (!Number.isFinite(id)) return null;

    const nameSource = item.name ?? item.title;
    const name = typeof nameSource === "string" && nameSource.trim().length > 0
        ? nameSource.trim()
        : `Perioada #${id}`;

    const start = item.start_at ?? item.start_date ?? item.starts_at ?? item.from ?? null;
    const end = item.end_at ?? item.end_date ?? item.ends_at ?? item.to ?? null;

    const isActiveRaw =
        item.active ??
        item.is_active ??
        item.enabled ??
        item.status;

    const normalizedActive =
        typeof isActiveRaw !== "undefined" ? parseBoolean(isActiveRaw) : undefined;

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
    };
};

const isPeriodActive = (period?: WheelOfFortunePeriod | null) => {
    if (!period) return false;
    if (typeof period.active === "boolean") return period.active;
    if (typeof period.is_active === "boolean") return period.is_active;
    return false;
};

const mapPrize = (item: unknown): WheelOfFortuneSlice | null => {
    if (!isRecord(item)) return null;
    const id = Number(item.id ?? item.wheel_of_fortune_id ?? item.value);
    if (!Number.isFinite(id)) return null;

    const period = isRecord(item.period) ? (item.period as Record<string, unknown>) : null;
    const periodIdRaw = item.period_id ?? (period ? period.id : undefined);
    const periodId = Number(periodIdRaw);

    const titleSource = item.title ?? item.name;
    const title = typeof titleSource === "string" && titleSource.trim().length > 0
        ? titleSource.trim()
        : `Premiu #${id}`;

    const descriptionSource = item.description ?? item.details ?? item.text ?? null;
    const colorSource = item.color ?? item.hex ?? item.swatch ?? DEFAULT_PRIZE_COLOR;
    const probabilitySource = item.probability ?? item.weight ?? item.chance ?? 0;
    const typeSource = item.type ?? item.prize_type ?? item.category;
    const amountSource =
        item.amount ??
        item.quantity ??
        item.days ??
        item.discount ??
        item.percentage ??
        null;

    return {
        id,
        period_id: Number.isFinite(periodId) ? periodId : 0,
        title,
        description: typeof descriptionSource === "string" ? descriptionSource : null,
        amount: toOptionalNumber(amountSource),
        color:
            typeof colorSource === "string" && colorSource.trim().length > 0
                ? colorSource
                : DEFAULT_PRIZE_COLOR,
        probability: toNumber(probabilitySource),
        type: normalizePrizeType(typeSource, "other"),
        created_at: typeof item.created_at === "string" ? item.created_at : null,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
    };
};

const mapWinner = (item: unknown): WheelOfFortunePrizeWinner | null => {
    if (!isRecord(item)) return null;
    const id = Number(item.id ?? item.prize_id ?? item.value);
    if (!Number.isFinite(id)) return null;

    const wheelSource = item.wheel_of_fortune ?? item.prize ?? item.reward ?? null;
    const wheel = mapPrize(wheelSource);

    const wheelIdRaw = item.wheel_of_fortune_id ?? wheel?.id ?? item.wheel_id;
    const wheelId = Number(wheelIdRaw);

    return {
        id,
        wheel_of_fortune_id: Number.isFinite(wheelId) ? wheelId : 0,
        name: typeof item.name === "string" ? item.name : "",
        phone: typeof item.phone === "string" ? item.phone : "",
        ip_address: typeof item.ip_address === "string" ? item.ip_address : null,
        created_at: typeof item.created_at === "string" ? item.created_at : null,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
        wheel_of_fortune: wheel,
    };
};

const formatCooldownDays = (minutes: number) => {
    if (!Number.isFinite(minutes)) return "";
    const daysValue = minutes / MINUTES_PER_DAY;
    if (!Number.isFinite(daysValue)) return "";
    if (Number.isInteger(daysValue)) {
        return String(daysValue);
    }
    const rounded = Math.round(daysValue * 1000) / 1000;
    return String(rounded);
};

export default function WheelOfFortuneAdminPage() {
    const [periods, setPeriods] = useState<WheelOfFortunePeriod[]>([]);
    const [periodLoading, setPeriodLoading] = useState(false);
    const [periodError, setPeriodError] = useState<string | null>(null);

    const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
    const selectedPeriodRef = useRef<number | null>(null);

    const [prizes, setPrizes] = useState<WheelOfFortuneSlice[]>([]);
    const [prizesLoading, setPrizesLoading] = useState(false);
    const [prizesError, setPrizesError] = useState<string | null>(null);

    const [winners, setWinners] = useState<WheelOfFortunePrizeWinner[]>([]);
    const [winnersLoading, setWinnersLoading] = useState(false);
    const [winnersError, setWinnersError] = useState<string | null>(null);

    const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
    const [periodFormError, setPeriodFormError] = useState<string | null>(null);
    const [periodSaving, setPeriodSaving] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState<WheelOfFortunePeriod | null>(null);
    const [periodForm, setPeriodForm] = useState({
        name: "",
        start: "",
        end: "",
        isActive: true,
        description: "",
        activeMonths: [] as number[],
        cooldownDays: "",
    });

    const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
    const [prizeFormError, setPrizeFormError] = useState<string | null>(null);
    const [prizeSaving, setPrizeSaving] = useState(false);
    const [editingPrize, setEditingPrize] = useState<WheelOfFortuneSlice | null>(null);
    const [prizeForm, setPrizeForm] = useState<PrizeFormState>(() => createEmptyPrizeForm());
    const amountFieldConfig = useMemo(
        () => getAmountFieldConfig(prizeForm.type),
        [prizeForm.type],
    );

    useEffect(() => {
        selectedPeriodRef.current = selectedPeriodId;
    }, [selectedPeriodId]);

    const fetchPeriods = useCallback(async (preferredId?: number | null) => {
        setPeriodLoading(true);
        setPeriodError(null);
        try {
            const response = await apiClient.getWheelOfFortunePeriods({ per_page: 100 });
            const items = extractDataArray(response);
            const mapped = items
                .map(mapPeriod)
                .filter((item): item is WheelOfFortunePeriod => item !== null)
                .sort((a, b) => {
                    const startA = a.start_at ?? "";
                    const startB = b.start_at ?? "";
                    if (startA && startB && startA !== startB) {
                        return startA > startB ? -1 : 1;
                    }
                    return b.id - a.id;
                });

            setPeriods(mapped);

            const candidateIds = mapped.map((item) => item.id);
            const currentSelected = preferredId ?? selectedPeriodRef.current;
            let nextSelected: number | null = null;

            if (currentSelected && candidateIds.includes(currentSelected)) {
                nextSelected = currentSelected;
            } else {
                const activePeriod = mapped.find((item) => isPeriodActive(item));
                nextSelected = activePeriod?.id ?? (mapped[0]?.id ?? null);
            }

            setSelectedPeriodId(nextSelected);
        } catch (error) {
            console.error("Failed to load wheel periods", error);
            setPeriodError("Nu am putut încărca perioadele. Încearcă din nou.");
            setPeriods([]);
        } finally {
            setPeriodLoading(false);
        }
    }, []);

    const fetchPrizes = useCallback(async (periodId: number | null) => {
        if (!periodId) {
            setPrizes([]);
            return;
        }
        setPrizesLoading(true);
        setPrizesError(null);
        try {
            const response = await apiClient.getWheelOfFortunes({ period_id: periodId, per_page: 100 });
            const items = extractDataArray(response);
            const mapped = items
                .map((item) => mapPrize(item))
                .filter((item): item is WheelOfFortuneSlice => item !== null)
                .map((item) => ({ ...item, period_id: item.period_id || periodId }))
                .sort((a, b) => {
                    if (b.probability !== a.probability) {
                        return b.probability - a.probability;
                    }
                    return a.title.localeCompare(b.title, "ro");
                });
            setPrizes(mapped);
        } catch (error) {
            console.error("Failed to load wheel prizes", error);
            setPrizesError("Nu am putut încărca premiile pentru această perioadă.");
            setPrizes([]);
        } finally {
            setPrizesLoading(false);
        }
    }, []);

    const fetchWinners = useCallback(async () => {
        setWinnersLoading(true);
        setWinnersError(null);
        try {
            const response = await apiClient.getWheelOfFortunePrizes({ per_page: 10 });
            const items = extractDataArray(response);
            const mapped = items
                .map(mapWinner)
                .filter((item): item is WheelOfFortunePrizeWinner => item !== null);
            setWinners(mapped);
        } catch (error) {
            console.error("Failed to load wheel winners", error);
            setWinnersError("Nu am putut încărca lista de câștigători.");
            setWinners([]);
        } finally {
            setWinnersLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPeriods();
        fetchWinners();
    }, [fetchPeriods, fetchWinners]);

    useEffect(() => {
        fetchPrizes(selectedPeriodId);
    }, [selectedPeriodId, fetchPrizes]);

    const selectedPeriod = useMemo(
        () => periods.find((period) => period.id === selectedPeriodId) ?? null,
        [periods, selectedPeriodId],
    );

    const openAddPeriodModal = () => {
        setEditingPeriod(null);
        setPeriodForm({
            name: "",
            start: "",
            end: "",
            isActive: periods.length === 0,
            description: "",
            activeMonths: [],
            cooldownDays: "",
        });
        setPeriodFormError(null);
        setIsPeriodModalOpen(true);
    };

    const openEditPeriodModal = (period: WheelOfFortunePeriod) => {
        setEditingPeriod(period);
        setPeriodForm({
            name: period.name ?? "",
            start: toDateInputValue(period.start_at),
            end: toDateInputValue(period.end_at),
            isActive: isPeriodActive(period),
            description: period.description ?? "",
            activeMonths: Array.isArray(period.active_months)
                ? period.active_months
                      .map((value) => Number(value))
                      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 12)
                : [],
            cooldownDays:
                typeof period.cooldown_minutes === "number" && Number.isFinite(period.cooldown_minutes)
                    ? formatCooldownDays(period.cooldown_minutes)
                    : typeof period.spin_cooldown_minutes === "number"
                        && Number.isFinite(period.spin_cooldown_minutes)
                        ? formatCooldownDays(period.spin_cooldown_minutes)
                        : "",
        });
        setPeriodFormError(null);
        setIsPeriodModalOpen(true);
    };

    const closePeriodModal = () => {
        setIsPeriodModalOpen(false);
        setEditingPeriod(null);
        setPeriodSaving(false);
        setPeriodFormError(null);
    };

    const handlePeriodSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (periodSaving) return;

        const trimmedName = periodForm.name.trim();
        if (!trimmedName) {
            setPeriodFormError("Introdu un nume pentru perioadă.");
            return;
        }

        if (periodForm.start && periodForm.end && periodForm.start > periodForm.end) {
            setPeriodFormError("Data de început nu poate fi ulterioară datei de sfârșit.");
            return;
        }

        const trimmedCooldown = periodForm.cooldownDays.trim();
        let cooldownMinutesValue: number | null = null;
        if (trimmedCooldown.length > 0) {
            const parsedCooldown = Number(trimmedCooldown.replace(/,/g, "."));
            if (!Number.isFinite(parsedCooldown) || parsedCooldown < 0) {
                setPeriodFormError("Introdu un număr valid de zile pentru fereastra de așteptare.");
                return;
            }
            const cooldownMinutes = Math.round(parsedCooldown * MINUTES_PER_DAY);
            if (!Number.isFinite(cooldownMinutes) || cooldownMinutes < 0) {
                setPeriodFormError("Durata de cooldown este invalidă. Încearcă din nou.");
                return;
            }
            cooldownMinutesValue = cooldownMinutes;
        }

        setPeriodFormError(null);
        setPeriodSaving(true);

        const normalizedMonths = Array.from(
            new Set(periodForm.activeMonths.map((value) => Number(value))),
        )
            .filter((value) => Number.isFinite(value) && value >= 1 && value <= 12)
            .sort((a, b) => a - b);

        const payload = {
            name: trimmedName,
            start_at: periodForm.start || undefined,
            end_at: periodForm.end || undefined,
            active: periodForm.isActive,
            is_active: periodForm.isActive,
            description: periodForm.description.trim() || undefined,
            active_months: normalizedMonths,
            cooldown_minutes: typeof cooldownMinutesValue === "number" ? cooldownMinutesValue : null,
        };

        try {
            let response;
            if (editingPeriod) {
                response = await apiClient.updateWheelOfFortunePeriod(editingPeriod.id, payload);
            } else {
                response = await apiClient.createWheelOfFortunePeriod(payload);
            }

            const saved = mapPeriod(
                extractItem(response as ApiItemResult<WheelOfFortunePeriod>),
            );
            closePeriodModal();
            await fetchPeriods(saved?.id ?? undefined);
        } catch (error) {
            console.error("Failed to save wheel period", error);
            setPeriodFormError("Nu am putut salva perioada. Verifică datele și încearcă din nou.");
        } finally {
            setPeriodSaving(false);
        }
    };

    const handleDeletePeriod = async (period: WheelOfFortunePeriod) => {
        const confirmMessage = `Ștergi perioada «${period.name}»? Această acțiune nu poate fi anulată.`;
        if (!window.confirm(confirmMessage)) {
            return;
        }
        try {
            await apiClient.deleteWheelOfFortunePeriod(period.id);
            const nextPreferred = selectedPeriodId === period.id ? null : selectedPeriodId;
            await fetchPeriods(nextPreferred ?? undefined);
        } catch (error) {
            console.error("Failed to delete wheel period", error);
            setPeriodError("Nu am putut șterge perioada. Încearcă din nou.");
        }
    };

    const openAddPrizeModal = () => {
        if (!selectedPeriodId) return;
        setEditingPrize(null);
        setPrizeForm(createEmptyPrizeForm());
        setPrizeFormError(null);
        setIsPrizeModalOpen(true);
    };

    const openEditPrizeModal = (prize: WheelOfFortuneSlice) => {
        setEditingPrize(prize);
        setPrizeForm({
            title: prize.title ?? "",
            type: normalizePrizeType(prize.type, "other"),
            probability: Number.isFinite(prize.probability)
                ? prize.probability.toString()
                : "",
            color:
                typeof prize.color === "string" && prize.color.trim().length > 0
                    ? prize.color
                    : DEFAULT_PRIZE_COLOR,
            description: prize.description ?? "",
            amount:
                typeof prize.amount === "number" && Number.isFinite(prize.amount)
                    ? prize.amount.toString()
                    : "",
        });
        setPrizeFormError(null);
        setIsPrizeModalOpen(true);
    };

    const closePrizeModal = () => {
        setIsPrizeModalOpen(false);
        setEditingPrize(null);
        setPrizeSaving(false);
        setPrizeFormError(null);
        setPrizeForm(createEmptyPrizeForm());
    };

    const handlePrizeSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedPeriodId || prizeSaving) return;

        const trimmedTitle = prizeForm.title.trim();
        if (!trimmedTitle) {
            setPrizeFormError("Introdu un titlu pentru premiu.");
            return;
        }

        const probabilityValue = Number(prizeForm.probability.replace(/,/g, "."));
        if (!Number.isFinite(probabilityValue) || probabilityValue < 0) {
            setPrizeFormError("Introdu o probabilitate validă.");
            return;
        }

        const normalizedType = normalizePrizeType(prizeForm.type);
        const amountConfig = getAmountFieldConfig(normalizedType);
        const trimmedAmountInput = prizeForm.amount.trim();
        let amountValue: number | undefined;

        if (amountConfig) {
            const parsedAmount = toOptionalNumber(trimmedAmountInput);
            if (parsedAmount === null) {
                setPrizeFormError(`Introdu o valoare pentru „${amountConfig.label}”.`);
                return;
            }
            if (typeof amountConfig.min === "number" && parsedAmount < amountConfig.min) {
                setPrizeFormError(
                    `Valoarea trebuie să fie cel puțin ${formatPrizeAmount({ amount: amountConfig.min, type: normalizedType })}.`,
                );
                return;
            }
            if (typeof amountConfig.max === "number" && parsedAmount > amountConfig.max) {
                setPrizeFormError(
                    `Valoarea trebuie să fie cel mult ${formatPrizeAmount({ amount: amountConfig.max, type: normalizedType })}.`,
                );
                return;
            }
            if (amountConfig.requireInteger && !Number.isInteger(parsedAmount)) {
                setPrizeFormError("Valoarea trebuie să fie un număr întreg.");
                return;
            }
            amountValue = parsedAmount;
        } else if (trimmedAmountInput.length > 0) {
            const parsedAmount = toOptionalNumber(trimmedAmountInput);
            if (parsedAmount === null) {
                setPrizeFormError("Valoarea introdusă pentru premiu nu este validă.");
                return;
            }
            amountValue = parsedAmount;
        }

        setPrizeFormError(null);
        setPrizeSaving(true);

        const normalizedColor =
            typeof prizeForm.color === "string" && prizeForm.color.trim().length > 0
                ? prizeForm.color.trim()
                : DEFAULT_PRIZE_COLOR;
        const trimmedDescription = prizeForm.description.trim();

        let payloadAmount: number | null | undefined;
        if (amountConfig) {
            payloadAmount = typeof amountValue === "number" ? amountValue : null;
        } else if (typeof amountValue === "number") {
            payloadAmount = amountValue;
        } else if (
            editingPrize &&
            typeof editingPrize.amount === "number" &&
            Number.isFinite(editingPrize.amount) &&
            !amountConfig
        ) {
            payloadAmount = null;
        }

        const payload = {
            period_id: selectedPeriodId,
            title: trimmedTitle,
            description: trimmedDescription || undefined,
            color: normalizedColor,
            probability: probabilityValue,
            type: normalizedType,
            ...(typeof payloadAmount !== "undefined" ? { amount: payloadAmount } : {}),
        };

        try {
            if (editingPrize) {
                await apiClient.updateWheelOfFortune(editingPrize.id, payload);
            } else {
                await apiClient.createWheelOfFortune(payload);
            }

            closePrizeModal();
            await fetchPrizes(selectedPeriodId);
            if (!editingPrize) {
                await fetchWinners();
            }
        } catch (error) {
            console.error("Failed to save wheel prize", error);
            setPrizeFormError("Nu am putut salva premiul. Încearcă din nou.");
        } finally {
            setPrizeSaving(false);
        }
    };

    const handleDeletePrize = async (prize: WheelOfFortuneSlice) => {
        const confirmMessage = `Ștergi premiul «${prize.title}»?`;
        if (!window.confirm(confirmMessage)) {
            return;
        }
        try {
            await apiClient.deleteWheelOfFortune(prize.id);
            if (selectedPeriodId) {
                await fetchPrizes(selectedPeriodId);
            }
        } catch (error) {
            console.error("Failed to delete wheel prize", error);
            setPrizesError("Nu am putut șterge premiul. Încearcă din nou.");
        }
    };

    const prizeColumns: Column<WheelOfFortuneSlice>[] = [
        {
            id: "title",
            header: "Premiu",
            accessor: (row) => row.title,
        },
        {
            id: "type",
            header: "Tip",
            accessor: (row) => row.type,
            cell: (row) => formatPrizeType(row.type),
        },
        {
            id: "amount",
            header: "Valoare",
            accessor: (row) => row.amount ?? "",
            cell: (row) => formatPrizeAmount(row),
        },
        {
            id: "probability",
            header: "Probabilitate",
            accessor: (row) => row.probability,
            cell: (row) => `${probabilityFormatter.format(row.probability)}%`,
        },
        {
            id: "color",
            header: "Culoare",
            accessor: (row) => row.color,
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <span
                        aria-hidden
                        className="inline-block h-4 w-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: row.color }}
                    />
                    <span className="text-xs font-mono text-gray-600">{row.color}</span>
                </div>
            ),
        },
        {
            id: "actions",
            header: "Acțiuni",
            accessor: () => "",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            openEditPrizeModal(row);
                        }}
                        className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-berkeley transition hover:border-jade hover:text-jade"
                        aria-label={`Editează ${row.title}`}
                    >
                        <Edit className="mr-1 h-3.5 w-3.5" /> Editează
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleDeletePrize(row);
                        }}
                        className="inline-flex items-center rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        aria-label={`Șterge ${row.title}`}
                    >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Șterge
                    </button>
                </div>
            ),
        },
    ];

    const winnerColumns: Column<WheelOfFortunePrizeWinner>[] = [
        {
            id: "name",
            header: "Nume",
            accessor: (row) => row.name,
        },
        {
            id: "phone",
            header: "Telefon",
            accessor: (row) => row.phone,
        },
        {
            id: "prize",
            header: "Premiu câștigat",
            accessor: (row) => row.wheel_of_fortune?.title ?? "",
            cell: (row) => (
                <div>
                    <p className="font-medium text-berkeley">{row.wheel_of_fortune?.title ?? "—"}</p>
                    {row.wheel_of_fortune?.type && (
                        <p className="text-xs text-gray-500">{formatPrizeType(row.wheel_of_fortune?.type)}</p>
                    )}
                </div>
            ),
        },
        {
            id: "prize_amount",
            header: "Valoare",
            accessor: (row) => row.wheel_of_fortune?.amount ?? "",
            cell: (row) => formatPrizeAmount(row.wheel_of_fortune),
        },
        {
            id: "created_at",
            header: "Data",
            accessor: (row) => row.created_at ?? "",
            cell: (row) => {
                if (!row.created_at) return "—";
                const parsed = new Date(row.created_at);
                if (Number.isNaN(parsed.getTime())) {
                    return row.created_at;
                }
                return dateTimeFormatter.format(parsed);
            },
        },
    ];

    return (
        <div className="space-y-10 p-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-full bg-jade/10 p-3 text-jade">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-berkeley">Premii Wheel of Fortune</h1>
                        <p className="text-sm text-gray-600">
                            Gestionează perioadele și premiile disponibile pentru roata norocului DaCars.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fetchPeriods(selectedPeriodId ?? undefined)}
                    >
                        <RefreshCcw className="mr-2 h-4 w-4" /> Actualizează perioadele
                    </Button>
                    <Button type="button" size="sm" onClick={openAddPeriodModal}>
                        <Plus className="mr-2 h-4 w-4" /> Adaugă perioadă
                    </Button>
                </div>
            </header>

            <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CalendarDays className="h-5 w-5 text-jade" />
                    Perioade configurate
                </div>
                {periodError && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {periodError}
                    </div>
                )}
                {periodLoading ? (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă perioadele...
                    </div>
                ) : periods.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                        Nu există perioade configurate. Adaugă prima perioadă pentru a crea premii.
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {periods.map((period) => {
                            const isSelected = period.id === selectedPeriodId;
                            const activeMonthsLabel = formatActiveMonths(period.active_months);
                            return (
                                <div
                                    key={period.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedPeriodId(period.id)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            setSelectedPeriodId(period.id);
                                        }
                                    }}
                                    className={`rounded-2xl border p-5 shadow-sm transition ${
                                        isSelected
                                            ? "border-jade bg-jade/5 shadow-md"
                                            : "border-gray-200 bg-white hover:border-jade/60 hover:shadow-md"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="text-lg font-semibold text-berkeley">{period.name}</h3>
                                            <p className="mt-2 text-sm text-gray-600">
                                                {formatDateRange(period.start_at, period.end_at)}
                                            </p>
                                            {activeMonthsLabel && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Lunile eligibile: {activeMonthsLabel}
                                                </p>
                                            )}
                                        </div>
                                        {isPeriodActive(period) ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-jade/10 px-3 py-1 text-xs font-semibold text-jade">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Activă
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                                                Inactivă
                                            </span>
                                        )}
                                    </div>
                                    {period.description && (
                                        <p className="mt-3 text-sm text-gray-600">{period.description}</p>
                                    )}
                                    <div className="mt-4 flex justify-end gap-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                openEditPeriodModal(period);
                                            }}
                                            className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 font-semibold text-berkeley transition hover:border-jade hover:text-jade"
                                        >
                                            <Edit className="mr-1 h-3.5 w-3.5" /> Editează
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleDeletePeriod(period);
                                            }}
                                            className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-2 font-semibold text-red-600 transition hover:bg-red-50"
                                        >
                                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Șterge
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-berkeley">Premii pentru perioada selectată</h2>
                        {selectedPeriod ? (
                            <p className="text-sm text-gray-600">
                                {selectedPeriod.name} · {formatDateRange(selectedPeriod.start_at, selectedPeriod.end_at)}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-600">
                                Selectează sau creează o perioadă pentru a adăuga premii.
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchPrizes(selectedPeriodId ?? null)}
                            disabled={!selectedPeriodId}
                        >
                            <RefreshCcw className="mr-2 h-4 w-4" /> Actualizează premii
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={openAddPrizeModal}
                            disabled={!selectedPeriodId}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Adaugă premiu
                        </Button>
                    </div>
                </div>

                {prizesError && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {prizesError}
                    </div>
                )}

                {!selectedPeriodId ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                        Selectează o perioadă pentru a vedea sau adăuga premii.
                    </div>
                ) : prizesLoading ? (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă premiile...
                    </div>
                ) : prizes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                        Perioada selectată nu are premii configurate încă.
                    </div>
                ) : (
                    <DataTable data={prizes} columns={prizeColumns} />
                )}
            </section>

            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-berkeley">Câștigători recenți</h2>
                        <p className="text-sm text-gray-600">
                            Lista ultimelor înregistrări salvate prin API-ul roții norocului.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={fetchWinners}
                    >
                        <RefreshCcw className="mr-2 h-4 w-4" /> Actualizează lista
                    </Button>
                </div>

                {winnersError && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {winnersError}
                    </div>
                )}

                {winnersLoading ? (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă câștigătorii...
                    </div>
                ) : winners.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                        Nu există încă înregistrări salvate.
                    </div>
                ) : (
                    <DataTable data={winners} columns={winnerColumns} pageSize={5} />
                )}
            </section>

            <Popup open={isPeriodModalOpen} onClose={closePeriodModal} className="max-w-2xl">
                <form onSubmit={handlePeriodSubmit} className="space-y-5">
                    <header>
                        <h2 className="text-xl font-semibold text-berkeley">
                            {editingPeriod ? "Editează perioada" : "Adaugă perioadă"}
                        </h2>
                        <p className="text-sm text-gray-600">
                            Definește intervalul în care roata va fi activă și stabilește dacă perioada este principală.
                        </p>
                    </header>

                    <div className="space-y-2">
                        <label htmlFor="period-name" className="text-sm font-medium text-gray-700">
                            Nume perioadă
                        </label>
                        <Input
                            id="period-name"
                            value={periodForm.name}
                            onChange={(event) =>
                                setPeriodForm((prev) => ({ ...prev, name: event.target.value }))
                            }
                            placeholder="Ex. Black Friday 2025"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="period-start" className="text-sm font-medium text-gray-700">
                                Dată început
                            </label>
                            <Input
                                id="period-start"
                                type="date"
                                value={periodForm.start}
                                onChange={(event) =>
                                    setPeriodForm((prev) => ({ ...prev, start: event.target.value }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="period-end" className="text-sm font-medium text-gray-700">
                                Dată sfârșit
                            </label>
                            <Input
                                id="period-end"
                                type="date"
                                value={periodForm.end}
                                onChange={(event) =>
                                    setPeriodForm((prev) => ({ ...prev, end: event.target.value }))
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Luni eligibile</span>
                        <p className="text-xs text-gray-500">
                            Selectează lunile pentru care premiile din această perioadă sunt valabile. Dacă nu selectezi nimic,
                            premiile vor fi eligibile în orice lună.
                        </p>
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
                        {MONTHS.map((month) => {
                            const isChecked = periodForm.activeMonths.includes(month.value);
                            return (
                                <label
                                        key={month.value}
                                        className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-berkeley focus:ring-berkeley"
                                            checked={isChecked}
                                            onChange={(event) => {
                                                setPeriodForm((prev) => {
                                                    const next = new Set(prev.activeMonths);
                                                    if (event.target.checked) {
                                                        next.add(month.value);
                                                    } else {
                                                        next.delete(month.value);
                                                    }
                                                    return {
                                                        ...prev,
                                                        activeMonths: Array.from(next).sort((a, b) => a - b),
                                                    };
                                                });
                                            }}
                                        />
                                        {month.label}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="period-cooldown" className="text-sm font-medium text-gray-700">
                            Cooldown după rezervare (zile)
                        </label>
                        <Input
                            id="period-cooldown"
                            type="number"
                            min={0}
                            step={0.1}
                            value={periodForm.cooldownDays}
                            onChange={(event) =>
                                setPeriodForm((prev) => ({
                                    ...prev,
                                    cooldownDays: event.target.value,
                                }))
                            }
                            placeholder="Ex. 2 pentru 2 zile (2880 minute)"
                        />
                        <p className="text-xs text-gray-500">
                            Setează câte zile trebuie să treacă după folosirea unui premiu pentru a putea învârti din nou roata.
                            Acceptă și zecimale, iar valoarea este convertită automat în minute (1 zi = 1440 minute). Exemplu:
                            2 zile → 2 × 1440 = 2880 minute. Lasă gol pentru valoarea implicită (1 zi).
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="period-description" className="text-sm font-medium text-gray-700">
                            Descriere (opțional)
                        </label>
                        <textarea
                            id="period-description"
                            value={periodForm.description}
                            onChange={(event) =>
                                setPeriodForm((prev) => ({ ...prev, description: event.target.value }))
                            }
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade"
                            placeholder="Note interne despre această perioadă"
                        />
                    </div>

                    <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 lg:flex-row lg:items-center lg:gap-3">
                        <input
                            type="checkbox"
                            checked={periodForm.isActive}
                            onChange={(event) =>
                                setPeriodForm((prev) => ({ ...prev, isActive: event.target.checked }))
                            }
                            className="h-4 w-4 rounded border-gray-300 text-jade focus:ring-jade"
                        />
                        Marchează perioada ca activă
                    </label>

                    {periodFormError && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {periodFormError}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 lg:flex-row lg:justify-end">
                        <Button type="button" variant="secondary" onClick={closePeriodModal}>
                            Anulează
                        </Button>
                        <Button type="submit" disabled={periodSaving}>
                            {periodSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvare...
                                </>
                            ) : (
                                "Salvează"
                            )}
                        </Button>
                    </div>
                </form>
            </Popup>

            <Popup open={isPrizeModalOpen} onClose={closePrizeModal} className="max-w-2xl">
                <form onSubmit={handlePrizeSubmit} className="space-y-5">
                    <header>
                        <h2 className="text-xl font-semibold text-berkeley">
                            {editingPrize ? "Editează premiu" : "Adaugă premiu"}
                        </h2>
                        <p className="text-sm text-gray-600">
                            Configurează premiul afișat pe roată, culoarea și probabilitatea de apariție.
                        </p>
                    </header>

                    <div className="space-y-2">
                        <label htmlFor="prize-title" className="text-sm font-medium text-gray-700">
                            Titlu
                        </label>
                        <Input
                            id="prize-title"
                            value={prizeForm.title}
                            onChange={(event) =>
                                setPrizeForm((prev) => ({ ...prev, title: event.target.value }))
                            }
                            placeholder="Ex. 10% reducere"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="prize-type" className="text-sm font-medium text-gray-700">
                                Tip premiu
                            </label>
                            <Select
                                id="prize-type"
                                value={prizeForm.type}
                                onValueChange={(value) =>
                                    setPrizeForm((prev) => {
                                        const nextType = normalizePrizeType(value);
                                        return {
                                            ...prev,
                                            type: nextType,
                                            amount: prizeTypeRequiresAmount(nextType) ? prev.amount : "",
                                        };
                                    })
                                }
                            >
                                {WHEEL_OF_FORTUNE_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {formatPrizeType(type)}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="prize-probability" className="text-sm font-medium text-gray-700">
                                Probabilitate (%)
                            </label>
                            <Input
                                id="prize-probability"
                                type="number"
                                step="0.01"
                                min="0"
                                value={prizeForm.probability}
                                onChange={(event) =>
                                    setPrizeForm((prev) => ({ ...prev, probability: event.target.value }))
                                }
                                placeholder="Ex. 12.5"
                                required
                            />
                        </div>
                        {amountFieldConfig && (
                            <div className="space-y-2">
                                <label htmlFor="prize-amount" className="text-sm font-medium text-gray-700">
                                    {amountFieldConfig.label}
                                </label>
                                <Input
                                    id="prize-amount"
                                    type="number"
                                    inputMode="decimal"
                                    step={amountFieldConfig.step}
                                    min={amountFieldConfig.min}
                                    max={amountFieldConfig.max}
                                    value={prizeForm.amount}
                                    onChange={(event) =>
                                        setPrizeForm((prev) => ({ ...prev, amount: event.target.value }))
                                    }
                                    placeholder={amountFieldConfig.placeholder}
                                    required={prizeTypeRequiresAmount(prizeForm.type)}
                                />
                                {amountFieldConfig.helper && (
                                    <p className="text-xs text-gray-500">{amountFieldConfig.helper}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="prize-color" className="text-sm font-medium text-gray-700">
                            Culoare segment
                        </label>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
                            <input
                                id="prize-color"
                                type="color"
                                value={prizeForm.color}
                                onChange={(event) =>
                                    setPrizeForm((prev) => ({ ...prev, color: event.target.value }))
                                }
                                className="h-10 w-16 cursor-pointer rounded border border-gray-300"
                            />
                            <Input
                                value={prizeForm.color}
                                onChange={(event) =>
                                    setPrizeForm((prev) => ({ ...prev, color: event.target.value }))
                                }
                                className="flex-1"
                                placeholder={DEFAULT_PRIZE_COLOR}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="prize-description" className="text-sm font-medium text-gray-700">
                            Descriere (opțional)
                        </label>
                        <textarea
                            id="prize-description"
                            value={prizeForm.description}
                            onChange={(event) =>
                                setPrizeForm((prev) => ({ ...prev, description: event.target.value }))
                            }
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade"
                            placeholder="Detalii despre beneficiul oferit"
                        />
                    </div>

                    {prizeFormError && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {prizeFormError}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 lg:flex-row lg:justify-end">
                        <Button type="button" variant="secondary" onClick={closePrizeModal}>
                            Anulează
                        </Button>
                        <Button type="submit" disabled={prizeSaving}>
                            {prizeSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvare...
                                </>
                            ) : (
                                "Salvează"
                            )}
                        </Button>
                    </div>
                </form>
            </Popup>
        </div>
    );
}
