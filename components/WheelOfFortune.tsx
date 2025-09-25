"use client";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import Image from "next/image";
import {
    AlertCircle,
    Gift,
    Loader2,
    RotateCcw,
    Sparkles,
} from "lucide-react";

import apiClient from "@/lib/api";
import { extractItem } from "@/lib/apiResponse";
import {
    buildWheelPrizeDefaultDescription,
    describeWheelPrizeAmount,
} from "@/lib/wheelFormatting";
import {
    clearStoredWheelPrize,
    getStoredWheelPrize,
    isStoredWheelPrizeActive,
    storeWheelPrize,
    type StoredWheelPrizeEntry,
} from "@/lib/wheelStorage";
import type {
    WheelOfFortunePeriod,
    WheelPrize,
    WheelOfFortuneProps,
} from "@/types/wheel";
import { useTranslations } from "@/lib/i18n/useTranslations";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const extractArray = (response: unknown): unknown[] => {
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
    const activeRaw = item.active ?? item.is_active ?? item.enabled ?? item.status;
    const normalizedActive = normalizeActiveFlag(activeRaw);

    return {
        id,
        name,
        start_at: typeof start === "string" ? start : null,
        end_at: typeof end === "string" ? end : null,
        active: normalizedActive,
        is_active: normalizedActive,
        description: typeof item.description === "string" ? item.description : null,
        created_at: typeof item.created_at === "string" ? item.created_at : null,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
    };
};

const isPeriodActive = (period?: WheelOfFortunePeriod | null) => {
    if (!period) return false;
    if (typeof period.active === "boolean") return period.active;
    if (typeof period.is_active === "boolean") return period.is_active;
    return false;
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

const dateFormatter = new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

const formatDateLabel = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return null;
    try {
        return dateFormatter.format(new Date(parsed));
    } catch (error) {
        console.warn("Failed to format date", error);
        return new Date(parsed).toLocaleDateString("ro-RO");
    }
};

const mapPrize = (item: unknown): WheelPrize | null => {
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
    const periodCandidate =
        item.period_id ??
        (isRecord(item.period)
            ? item.period.id ??
                (item.period as Record<string, unknown>).period_id ??
                (item.period as Record<string, unknown>).value
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
    };

    const resolvedDescription = basePrize.description ?? buildWheelPrizeDefaultDescription(basePrize);

    return {
        ...basePrize,
        description: resolvedDescription ?? null,
    };
};

const IP_ENDPOINTS = [
    "https://api.ipify.org?format=json",
    "https://api64.ipify.org?format=json",
];

const parseIpAddress = (payload: unknown): string | null => {
    if (!payload) return null;
    if (typeof payload === "string") {
        const trimmed = payload.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    if (typeof payload === "object" && payload !== null) {
        const record = payload as Record<string, unknown>;
        const candidates = ["ip", "ip_address", "address", "query"];
        for (const key of candidates) {
            const value = record[key];
            if (typeof value === "string") {
                const trimmed = value.trim();
                if (trimmed.length > 0) {
                    return trimmed;
                }
            }
        }
    }
    return null;
};

const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({ isPopup = false, onClose }) => {
    const [prizes, setPrizes] = useState<WheelPrize[]>([]);
    const [activePeriod, setActivePeriod] = useState<WheelOfFortunePeriod | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [availabilityStatus, setAvailabilityStatus] = useState<
        "unknown" | "available" | "unavailable"
    >("unknown");

    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [selectedPrize, setSelectedPrize] = useState<WheelPrize | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [spinsLeft, setSpinsLeft] = useState(1);

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [participant, setParticipant] = useState<{ name: string; phone: string } | null>(null);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
    const [saveError, setSaveError] = useState<string | null>(null);
    const [clientIp, setClientIp] = useState<string | null>(null);
    const [storedPrizeRecord, setStoredPrizeRecord] = useState<StoredWheelPrizeEntry | null>(null);

    const mountedRef = useRef(true);
    const spinTimeoutRef = useRef<number | null>(null);
    const ipFetchRef = useRef(false);

    const { messages, t } = useTranslations("home");
    const wheelMessages = (messages.wheel ?? {}) as Record<string, unknown>;
    const wheelPopup = (wheelMessages.popup ?? {}) as { title?: string; description?: string };
    const wheelSection = (wheelMessages.section ?? {}) as { title?: string; description?: string };
    const wheelForm = (wheelMessages.form ?? {}) as {
        name?: { label?: string; placeholder?: string };
        phone?: { label?: string; placeholder?: string };
        consent?: string;
    };
    const wheelStoredPrize = (wheelMessages.storedPrize ?? {}) as {
        title?: string;
        prefix?: string;
        suffix?: string;
        noExpiry?: string;
    };
    const wheelErrors = (wheelMessages.errors ?? {}) as Record<string, string>;
    const wheelButtons = (wheelMessages.buttons ?? {}) as Record<string, string>;
    const wheelWinner = (wheelMessages.winner ?? {}) as Record<string, string>;
    const wheelRegulation = (wheelMessages.regulation ?? {}) as {
        title?: string;
        items?: string[];
    };
    const wheelAssets = (wheelMessages.assets ?? {}) as { logoAlt?: string };
    const activePeriodTemplate =
        typeof wheelMessages.activePeriod === "string"
            ? wheelMessages.activePeriod
            : "Perioada activă: {{period}}. Completează datele tale, învârte roata și vezi ce premiu primești!";
    const defaultPrompt =
        typeof wheelMessages.defaultPrompt === "string"
            ? wheelMessages.defaultPrompt
            : "Completează datele tale, învârte roata și vezi ce premiu primești!";
    const spinsLeftLabel = wheelMessages.spinsLeft ?? "Încercări rămase";
    const spinButtonLabel = wheelButtons.spin ?? "Învârte Roata";
    const spinningLabel = wheelButtons.spinning ?? "Se învârte...";
    const activePrizeLabel = wheelButtons.activePrize ?? "Premiu activ";
    const outOfSpinsLabel = wheelButtons.outOfSpins ?? "Încercări epuizate";
    const resetLabel = wheelButtons.reset ?? "Resetează (Demo)";
    const closeButtonLabel = wheelButtons.close ?? "Închide";
    const tryAgainLabel = wheelButtons.tryAgain ?? "Încearcă din nou";
    const retrySaveLabel = wheelButtons.retrySave ?? "Reîncearcă salvarea";
    const continueLabel = wheelButtons.continue ?? "Continuă rezervarea";
    const storedPrizeTitle = wheelStoredPrize.title ?? "Premiu activ din Roata Norocului";
    const storedPrizePrefix = wheelStoredPrize.prefix ?? "Ai câștigat ";
    const storedPrizeSuffix = wheelStoredPrize.suffix ??
        ". Premiul este valabil până la {{expiry}} și îl poți folosi direct în pagina de checkout.";
    const storedPrizeNoExpiry = wheelStoredPrize.noExpiry ?? "expirarea automată";
    const regulationTitle = wheelRegulation.title ?? "Regulament rapid:";
    const regulationItems =
        wheelRegulation.items ?? [
            "• O singură încercare per client valid.",
            "• Premiul este valabil 30 de zile din momentul câștigului.",
            "• Se aplică doar la rezervări noi efectuate pe DaCars.",
            "• Nu se cumulează cu alte oferte sau reduceri.",
        ];
    const wheelLogoAlt = wheelAssets.logoAlt ?? t("wheel.assets.logoAlt", { fallback: "Siglă DaCars" });
    const loadNoPeriodMessage = wheelErrors.loadNoPeriod ?? t("wheel.errors.loadNoPeriod", {
        fallback: "Momentan nu există o perioadă activă pentru roata norocului.",
    });
    const loadNoPrizesMessage = wheelErrors.loadNoPrizes ?? t("wheel.errors.loadNoPrizes", {
        fallback: "Momentan nu sunt premii disponibile pentru această perioadă.",
    });
    const loadFailedMessage = wheelErrors.loadFailed ?? t("wheel.errors.loadFailed", {
        fallback: "Nu am putut încărca premiile. Te rugăm să încerci din nou mai târziu.",
    });
    const unavailableMessage = wheelErrors.unavailable ?? t("wheel.errors.unavailable", {
        fallback: "Roata nu este disponibilă în acest moment.",
    });
    const activePrizeMessage = wheelErrors.activePrize ?? t("wheel.errors.activePrize", {
        fallback:
            "Ai deja un premiu activ câștigat la Roata Norocului. Îl poți folosi la checkout în următoarele 30 de zile.",
    });
    const nameRequiredMessage = wheelErrors.nameRequired ?? t("wheel.errors.nameRequired", {
        fallback: "Introdu numele complet pentru a putea salva premiul.",
    });
    const phoneRequiredMessage = wheelErrors.phoneRequired ?? t("wheel.errors.phoneRequired", {
        fallback: "Introdu un număr de telefon valid.",
    });
    const noPrizeMessage = wheelErrors.noPrize ?? t("wheel.errors.noPrize", {
        fallback: "Nu am putut determina un premiu în acest moment. Încearcă din nou mai târziu.",
    });
    const saveFallbackMessage = wheelErrors.saveFallback ?? t("wheel.errors.saveFallback", {
        fallback: "A apărut o eroare la salvarea premiului. Te rugăm să încerci din nou.",
    });

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (spinTimeoutRef.current) {
                window.clearTimeout(spinTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (ipFetchRef.current) return;
        ipFetchRef.current = true;

        let cancelled = false;

        const fetchClientIp = async () => {
            for (const endpoint of IP_ENDPOINTS) {
                try {
                    const response = await fetch(endpoint);
                    if (!response.ok) {
                        continue;
                    }

                    const contentType = response.headers.get("content-type") ?? "";
                    let ip: string | null = null;

                    if (contentType.includes("application/json")) {
                        const data = await response.json();
                        ip = parseIpAddress(data);
                    } else {
                        const text = await response.text();
                        ip = parseIpAddress(text);
                    }

                    if (ip && !cancelled && mountedRef.current) {
                        setClientIp(ip);
                        return;
                    }
                } catch (error) {
                    console.warn("Failed to fetch client IP", error);
                }
            }
        };

        void fetchClientIp();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = getStoredWheelPrize();
        if (!stored) return;
        if (isStoredWheelPrizeActive(stored)) {
            setStoredPrizeRecord(stored);
            setSpinsLeft(0);
            if (stored.winner.name) {
                setCustomerName(stored.winner.name);
            }
            if (stored.winner.phone) {
                setCustomerPhone(stored.winner.phone);
            }
        } else {
            clearStoredWheelPrize();
        }
    }, []);

    const fetchWheelData = useCallback(async () => {
        setAvailabilityStatus("unknown");
        setIsLoading(true);
        setLoadError(null);
        try {
            const activePeriodResponse = await apiClient.getWheelOfFortunePeriods({ active: 1, is_active: 1, limit: 1 });
            const activeCandidates = extractArray(activePeriodResponse)
                .map(mapPeriod)
                .filter((item): item is WheelOfFortunePeriod => item !== null);

            let period = activeCandidates.find((item) => isPeriodActive(item)) ?? null;

            if (!period) {
                const fallbackResponse = await apiClient.getWheelOfFortunePeriods({ per_page: 20 });
                const fallbackList = extractArray(fallbackResponse)
                    .map(mapPeriod)
                    .filter((item): item is WheelOfFortunePeriod => item !== null);
                period = fallbackList.find((item) => isPeriodActive(item)) ?? null;
            }

            if (!period) {
                setActivePeriod(null);
                setPrizes([]);
                setAvailabilityStatus("unavailable");
                setLoadError(loadNoPeriodMessage);
                return;
            }

            setActivePeriod(period);

            const prizesResponse = await apiClient.getWheelOfFortunes({ period_id: period.id, limit: 100 });
            const prizeItems = extractArray(prizesResponse)
                .map(mapPrize)
                .filter((item): item is WheelPrize => item !== null)
                .map((item) => ({
                    ...item,
                    description: item.description ?? buildWheelPrizeDefaultDescription(item) ?? "",
                    color: item.color || "#1E7149",
                }));

            setPrizes(prizeItems);

            if (prizeItems.length === 0) {
                setAvailabilityStatus("unavailable");
                setLoadError(loadNoPrizesMessage);
            } else {
                setAvailabilityStatus("available");
            }
        } catch (error) {
            console.error("Failed to load wheel data", error);
            setPrizes([]);
            setActivePeriod(null);
            setAvailabilityStatus("unknown");
            setLoadError(loadFailedMessage);
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [loadFailedMessage, loadNoPeriodMessage, loadNoPrizesMessage]);

    useEffect(() => {
        fetchWheelData();
    }, [fetchWheelData]);

    useEffect(() => {
        if (!isPopup) return;
        if (availabilityStatus !== "unavailable") return;
        if (onClose) {
            onClose();
        }
    }, [availabilityStatus, isPopup, onClose]);

    const segmentAngle = useMemo(
        () => (prizes.length > 0 ? 360 / prizes.length : 0),
        [prizes.length],
    );

    const totalWeight = useMemo(
        () => prizes.reduce((sum, prize) => {
            const value = Number(prize.probability);
            return sum + (Number.isFinite(value) ? value : 0);
        }, 0),
        [prizes],
    );

    const pickWeightedIndex = useCallback(() => {
        if (prizes.length === 0) return -1;
        if (totalWeight <= 0) {
            const randomIndex = Math.floor(Math.random() * prizes.length);
            return Math.min(prizes.length - 1, Math.max(0, randomIndex));
        }
        const random = Math.random() * totalWeight;
        let cumulative = 0;
        for (let index = 0; index < prizes.length; index += 1) {
            cumulative += prizes[index].probability;
            if (random < cumulative) {
                return index;
            }
        }
        return prizes.length - 1;
    }, [prizes, totalWeight]);

    const hasStoredPrize = useMemo(
        () => isStoredWheelPrizeActive(storedPrizeRecord),
        [storedPrizeRecord],
    );

    const persistPrizeResult = useCallback(async (prize: WheelPrize, info: { name: string; phone: string }) => {
        const normalizedParticipant = {
            name: info.name.trim(),
            phone: info.phone.trim(),
        };
        setSaveState("saving");
        setSaveError(null);
        try {
            const response = await apiClient.createWheelOfFortunePrize({
                wheel_of_fortune_id: prize.id,
                name: normalizedParticipant.name,
                phone: normalizedParticipant.phone,
                ...(clientIp ? { ip_address: clientIp } : {}),
            });
            if (!mountedRef.current) return;

            const payload = extractItem(response);
            const record = isRecord(payload) ? payload : isRecord(response) ? response : null;
            const responsePrize = record?.wheel_of_fortune ? mapPrize(record.wheel_of_fortune) : null;
            const stored = storeWheelPrize({
                prize: responsePrize ?? prize,
                winner: normalizedParticipant,
                prizeId: toOptionalNumber(record?.id),
                wheel_of_fortune_id:
                    toOptionalNumber(record?.wheel_of_fortune_id)
                    ?? (responsePrize ?? prize).id,
                savedAt: typeof record?.created_at === "string" ? record.created_at : null,
                expiresAt: typeof record?.expires_at === "string" ? record.expires_at : null,
            });
            setStoredPrizeRecord(stored);
            setSaveState("success");
        } catch (error) {
            console.error("Failed to store wheel prize", error);
            if (!mountedRef.current) return;
            setSaveState("error");
            setSaveError(
                error instanceof Error ? error.message : saveFallbackMessage,
            );
        }
    }, [clientIp, saveFallbackMessage]);

    const handleSpin = () => {
        if (isSpinning || spinsLeft <= 0) return;
        if (isLoading) return;
        if (prizes.length === 0) {
            setFormError(unavailableMessage);
            return;
        }

        if (hasStoredPrize) {
            setFormError(
                activePrizeMessage,
            );
            return;
        }

        const sanitizedName = customerName.trim();
        const sanitizedPhone = customerPhone.trim();

        if (!sanitizedName) {
            setFormError(
                nameRequiredMessage,
            );
            return;
        }

        if (!sanitizedPhone) {
            setFormError(
                phoneRequiredMessage,
            );
            return;
        }

        const winningIndex = pickWeightedIndex();
        if (winningIndex < 0) {
            setFormError(
                noPrizeMessage,
            );
            return;
        }

        const winningPrize = prizes[winningIndex];
        const normalizedParticipant = { name: sanitizedName, phone: sanitizedPhone };

        setFormError(null);
        setParticipant(normalizedParticipant);
        setSaveState("idle");
        setSaveError(null);
        setIsSpinning(true);
        setSelectedPrize(null);
        setShowModal(false);

        const segStart = winningIndex * segmentAngle;
        const padding = segmentAngle > 0 ? Math.min(6, segmentAngle / 6) : 0;
        const desiredAngleWithinSegment = segStart + padding + Math.random() * (segmentAngle - 2 * padding);

        const baseRotation = ((rotation % 360) + 360) % 360;
        const rotationToDesiredModulo = (360 - desiredAngleWithinSegment + 360) % 360;
        const deltaToDesired = (rotationToDesiredModulo - baseRotation + 360) % 360;

        const fullSpins = 5 + Math.floor(Math.random() * 5);
        const finalRotation = rotation + fullSpins * 360 + deltaToDesired;
        setRotation(finalRotation);

        spinTimeoutRef.current = window.setTimeout(() => {
            if (!mountedRef.current) return;
            setIsSpinning(false);
            setSelectedPrize(winningPrize);
            setShowModal(true);

            if (winningPrize.type !== "try_again") {
                const stored = storeWheelPrize({
                    prize: winningPrize,
                    winner: normalizedParticipant,
                });
                setStoredPrizeRecord(stored);
                setSpinsLeft(0);
                void persistPrizeResult(winningPrize, normalizedParticipant);
            }
        }, 4000);
    };

    const handleRetrySave = () => {
        if (selectedPrize && participant) {
            void persistPrizeResult(selectedPrize, participant);
        }
    };

    const resetSpins = () => {
        clearStoredWheelPrize();
        setStoredPrizeRecord(null);
        setSpinsLeft(1);
        setRotation(0);
        setSelectedPrize(null);
        setShowModal(false);
        setSaveState("idle");
        setSaveError(null);
        setParticipant(null);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedPrize(null);
        setSaveState("idle");
        setSaveError(null);
    };

    const handleClosePopup = () => {
        handleCloseModal();
        if (onClose) onClose();
    };

    const canSpin = !isSpinning && spinsLeft > 0 && prizes.length > 0 && !isLoading && !hasStoredPrize;
    const selectedPrizeAmountLabel = selectedPrize ? describeWheelPrizeAmount(selectedPrize) : null;
    const storedPrizeAmountLabel = storedPrizeRecord
        ? describeWheelPrizeAmount(storedPrizeRecord.prize)
        : null;
    const storedPrizeExpiryLabel = storedPrizeRecord?.expires_at
        ? formatDateLabel(storedPrizeRecord.expires_at)
        : null;

    const winnerModal = showModal && selectedPrize ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1E7149]/10 to-[#1A3661]/10" />
                <div className="relative z-10">
                    <div
                        className={`${selectedPrize.type === "try_again" ? "bg-yellow-500" : "bg-[#1E7149]"} mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full`}
                    >
                        {selectedPrize.type === "try_again" ? (
                            <RotateCcw className="h-12 w-12 text-white" />
                        ) : (
                            <Gift className="h-12 w-12 text-white" />
                        )}
                    </div>

                    <h3 className="mb-4 font-['Poppins'] text-2xl font-bold text-[#1A3661]">
                        {selectedPrize.type === "try_again"
                            ? wheelWinner.tryAgainHeading ?? t("wheel.winner.tryAgainHeading", { fallback: "Mai încearcă!" })
                            : wheelWinner.successHeading ?? t("wheel.winner.successHeading", { fallback: "Felicitări! 🎉" })}
                    </h3>

                    <div
                        className={`${selectedPrize.type === "try_again" ? "bg-gradient-to-r from-yellow-500 to-orange-500" : "bg-gradient-to-r from-[#1E7149] to-[#195C3B]"} mb-6 rounded-2xl p-6 text-white`}
                    >
                        <h4 className="mb-2 font-['Poppins'] text-xl font-bold">{selectedPrize.title}</h4>
                        {selectedPrizeAmountLabel && (
                            <p className="mb-1 font-['Poppins'] text-2xl font-semibold">{selectedPrizeAmountLabel}</p>
                        )}
                        <p className="font-['DM Sans']">
                            {(selectedPrize.description || wheelWinner.descriptionFallback) ??
                                t("wheel.winner.descriptionFallback", {
                                    fallback: "Continuă procesul de rezervare pentru a afla mai multe detalii.",
                                })}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <p className="font-['DM Sans'] text-sm text-[#191919]/70">
                            {selectedPrize.type === "try_again"
                                ? wheelWinner.tryAgainMessage ??
                                    t("wheel.winner.tryAgainMessage", {
                                        fallback:
                                            "Nu te descuraja! Ai primit o nouă șansă să câștigi un premiu și mai bun.",
                                    })
                                : wheelWinner.successMessage ??
                                    t("wheel.winner.successMessage", {
                                        fallback:
                                            "Am înregistrat premiul tău și vei primi detalii prin SMS sau email în scurt timp.",
                                    })}
                        </p>

                        {selectedPrize.type !== "try_again" && storedPrizeExpiryLabel && (
                            <p className="font-['DM Sans'] text-xs text-[#191919]/60">
                                {(wheelWinner.expiry ??
                                    t("wheel.winner.expiry", {
                                        fallback: "Premiul este valabil până la {{expiry}} și îl vei găsi salvat și în pagina de checkout.",
                                    })).replace("{{expiry}}", storedPrizeExpiryLabel)}
                            </p>
                        )}

                        {selectedPrize.type !== "try_again" && (
                            <div className="space-y-3">
                                {saveState === "saving" && (
                                    <div className="flex items-center justify-center gap-2 rounded-xl bg-jade/10 px-4 py-3 text-sm text-jade">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {wheelWinner.saving ??
                                            t("wheel.winner.saving", { fallback: "Salvăm premiul tău..." })}
                                    </div>
                                )}
                                {saveState === "success" && (
                                    <div className="rounded-xl border border-jade/30 bg-white px-4 py-3 text-sm text-jade">
                                        {wheelWinner.saved ??
                                            t("wheel.winner.saved", {
                                                fallback:
                                                    "Premiul a fost salvat cu succes! Echipa DaCars îți va trimite toate detaliile curând.",
                                            })}
                                    </div>
                                )}
                                {saveState === "error" && (
                                    <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="mt-0.5 h-4 w-4" />
                                            <p>
                                                {saveError ??
                                                    wheelWinner.saveError ??
                                                        t("wheel.winner.saveError", {
                                                            fallback: "Nu am putut salva premiul. Încearcă din nou.",
                                                        })}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRetrySave}
                                            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
                                        >
                                            {retrySaveLabel}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col gap-3 sm:flex-row">
                            {selectedPrize.type === "try_again" ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setSelectedPrize(null);
                                            setSaveState("idle");
                                            setSaveError(null);
                                        }}
                                        className="flex-1 rounded-lg bg-[#1E7149] py-3 font-['DM Sans'] font-semibold text-white transition hover:bg-[#195C3B]"
                                    >
                                        {tryAgainLabel}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 rounded-lg border-2 border-gray-300 py-3 font-['DM Sans'] font-semibold text-[#191919] transition hover:bg-gray-50"
                                    >
                                        {wheelWinner.close ?? closeButtonLabel}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 rounded-lg bg-[#1E7149] py-3 font-['DM Sans'] font-semibold text-white transition hover:bg-[#195C3B]"
                                    >
                                        {continueLabel}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 rounded-lg border-2 border-gray-300 py-3 font-['DM Sans'] font-semibold text-[#191919] transition hover:bg-gray-50"
                                    >
                                        {wheelWinner.close ?? closeButtonLabel}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    const wheelSizeClass = isPopup
        ? "w-[260px] sm:w-[320px] md:w-[420px] lg:w-[480px] xl:w-[520px]"
        : "w-[340px] sm:w-[480px] md:w-[620px] lg:w-[700px]";

    const wheelContent = (
        <div className="flex flex-col items-center justify-center gap-12 lg:flex-row">
            <div className="relative">
                <div className="pointer-events-none absolute -top-0 left-1/2 z-20 -translate-x-1/2">
                    <div
                        className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-black drop-shadow-md"
                    />
                </div>

                <div className={`relative mx-auto aspect-square ${wheelSizeClass}`}>
                    <div
                        className="relative h-full w-full overflow-hidden rounded-full border-8 border-white shadow-2xl"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transition: isSpinning
                                ? "transform 4s cubic-bezier(0.23, 1, 0.32, 1)"
                                : "transform 0.3s ease-out",
                        }}
                    >
                        {prizes.map((prize, index) => {
                            const startAngle = index * segmentAngle;
                            const endAngle = (index + 1) * segmentAngle;
                            const midAngle = startAngle + segmentAngle / 2;

                            const startX = 50 + 50 * Math.cos((startAngle - 90) * Math.PI / 180);
                            const startY = 50 + 50 * Math.sin((startAngle - 90) * Math.PI / 180);
                            const endX = 50 + 50 * Math.cos((endAngle - 90) * Math.PI / 180);
                            const endY = 50 + 50 * Math.sin((endAngle - 90) * Math.PI / 180);
                            const largeArcFlag = segmentAngle > 180 ? 1 : 0;

                            const textRadius = 32;
                            const textX = 50 + textRadius * Math.cos((midAngle - 90) * Math.PI / 180);
                            const textY = 50 + textRadius * Math.sin((midAngle - 90) * Math.PI / 180);
                            const textRotation = midAngle > 90 && midAngle < 270 ? midAngle + 180 : midAngle;

                            const pathData = `M 50 50 L ${startX} ${startY} A 50 50 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                            return (
                                <div key={prize.id} className="absolute inset-0">
                                    <svg className="h-full w-full" viewBox="0 0 100 100">
                                        <path d={pathData} fill={prize.color} stroke="white" strokeWidth="0.5" />
                                        <text
                                            x={textX}
                                            y={textY}
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fill="white"
                                            fontSize={prizes.length > 10 ? "2.4" : "3"}
                                            fontWeight="bold"
                                            fontFamily="DM Sans"
                                            style={{
                                                textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                                                filter: "drop-shadow(1px 1px 2px rgba(0,0,0,0.8))",
                                            }}
                                            transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                                        >
                                            {prize.title}
                                        </text>
                                    </svg>
                                </div>
                            );
                        })}

                        <div className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#1E7149] bg-white shadow-lg">
                            <Image
                                src="/images/dacars-icon.svg"
                                alt={wheelLogoAlt}
                                width={32}
                                height={32}
                                className="h-8 w-8"
                                priority
                            />
                        </div>

                        {isLoading && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                                <Loader2 className="h-10 w-10 animate-spin text-[#1E7149]" />
                            </div>
                        )}

                        {!isLoading && prizes.length === 0 && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-white/80 text-center text-gray-600">
                                <AlertCircle className="h-8 w-8 text-[#1A3661]" />
                                <p>
                                    {wheelErrors.unavailable ??
                                        t("wheel.errors.unavailable", {
                                            fallback: "Roata nu este disponibilă momentan.",
                                        })}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-md text-center lg:text-left">
                <h3 className="mb-6 font-['Poppins'] text-2xl font-bold text-white lg:text-3xl">
                    {wheelWinner.title ?? t("wheel.winner.title", { fallback: "Câștigă premii exclusive!" })}
                </h3>
                <p className="mb-8 font-['DM Sans'] text-white/80 leading-relaxed">
                    {activePeriod
                        ? t("wheel.activePeriod", {
                              values: { period: activePeriod.name },
                              fallback: activePeriodTemplate.replace("{{period}}", activePeriod.name),
                          })
                        : t("wheel.defaultPrompt", { fallback: defaultPrompt })}
                </p>

                <div className="mb-6 space-y-4">
                    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                        <p className="font-['DM Sans'] text-white">
                            {spinsLeftLabel}: <span className="font-bold text-[#1E7149]">{spinsLeft}</span>
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                        <div className="grid gap-4">
                            <div className="text-left">
                                <label htmlFor="wheel-name" className="mb-1 block font-['DM Sans'] text-sm font-medium text-white/80">
                                    {wheelForm.name?.label ?? "Nume complet"}
                                </label>
                                <input
                                    id="wheel-name"
                                    value={customerName}
                                    onChange={(event) => {
                                        setCustomerName(event.target.value);
                                        if (formError) setFormError(null);
                                    }}
                                    placeholder={wheelForm.name?.placeholder ?? "Ex. Maria Popescu"}
                                    className="w-full rounded-lg border border-transparent px-4 py-3 font-['DM Sans'] text-sm text-[#191919] shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1E7149]"
                                />
                            </div>
                            <div className="text-left">
                                <label htmlFor="wheel-phone" className="mb-1 block font-['DM Sans'] text-sm font-medium text-white/80">
                                    {wheelForm.phone?.label ?? "Telefon"}
                                </label>
                                <input
                                    id="wheel-phone"
                                    value={customerPhone}
                                    onChange={(event) => {
                                        setCustomerPhone(event.target.value);
                                        if (formError) setFormError(null);
                                    }}
                                    placeholder={wheelForm.phone?.placeholder ?? "Ex. +40 712 345 678"}
                                    className="w-full rounded-lg border border-transparent px-4 py-3 font-['DM Sans'] text-sm text-[#191919] shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1E7149]"
                                />
                            </div>
                            <p className="font-['DM Sans'] text-xs text-white/70">
                                {wheelForm.consent ??
                                    "Datele sunt necesare pentru validarea premiului conform regulamentului DaCars."}
                            </p>
                        </div>
                    </div>

                    {hasStoredPrize && storedPrizeRecord && (
                        <div className="flex items-start gap-3 rounded-xl border border-[#1E7149]/40 bg-white/90 px-4 py-3 text-left shadow-sm">
                            <Gift className="mt-1 h-5 w-5 text-[#1E7149]" />
                            <div className="space-y-1">
                                <p className="font-['Poppins'] text-sm font-semibold text-[#1A3661]">
                                    {storedPrizeTitle}
                                </p>
                                <p className="font-['DM Sans'] text-xs text-[#1A3661]/80">
                                    {storedPrizePrefix}
                                    <span className="font-semibold text-[#1A3661]">{storedPrizeRecord.prize.title}</span>
                                    {storedPrizeAmountLabel ? ` — ${storedPrizeAmountLabel}` : ""}
                                    {storedPrizeSuffix
                                        .replace(
                                            "{{expiry}}",
                                            storedPrizeExpiryLabel ?? storedPrizeNoExpiry,
                                        )}
                                </p>
                            </div>
                        </div>
                    )}

                    {formError && (
                        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <AlertCircle className="h-4 w-4" />
                            <span>{formError}</span>
                        </div>
                    )}

                    {loadError && (
                        <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                            <AlertCircle className="h-4 w-4" />
                            <span>{loadError}</span>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleSpin}
                    disabled={!canSpin}
                    className={`mx-auto mb-4 flex items-center justify-center rounded-2xl px-8 py-4 font-['DM Sans'] text-lg font-bold text-white transition-all duration-200 lg:mx-0 ${
                        canSpin
                            ? "bg-[#1E7149] hover:scale-105 hover:bg-[#195C3B] hover:shadow-xl"
                            : "cursor-not-allowed bg-[#1E7149]/50"
                    }`}
                >
                    {isSpinning ? (
                        <>
                            <RotateCcw className="mr-3 h-6 w-6 animate-spin" /> {spinningLabel}
                        </>
                    ) : hasStoredPrize ? (
                        <>
                            <Gift className="mr-3 h-6 w-6" /> {activePrizeLabel}
                        </>
                    ) : spinsLeft <= 0 ? (
                        <>
                            <Gift className="mr-3 h-6 w-6" /> {outOfSpinsLabel}
                        </>
                    ) : (
                        <>
                            <Gift className="mr-3 h-6 w-6" /> {spinButtonLabel}
                        </>
                    )}
                </button>

                {spinsLeft <= 0 && !hasStoredPrize && (
                    <button
                        type="button"
                        onClick={resetSpins}
                        className="mx-auto flex items-center justify-center rounded-xl bg-white/20 px-6 py-3 font-['DM Sans'] font-semibold text-white transition hover:bg-white/30 lg:mx-0"
                    >
                        <RotateCcw className="mr-2 h-5 w-5" /> {resetLabel}
                    </button>
                )}

                <div className="mt-6 rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
                    <h4 className="mb-3 font-['Poppins'] text-lg font-semibold text-white">{regulationTitle}</h4>
                    <ul className="space-y-2 font-['DM Sans'] text-sm text-white/80">
                        {regulationItems.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );

    if (availabilityStatus === "unavailable") {
        return null;
    }

    if (isPopup) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="relative w-full max-w-6xl overflow-y-auto rounded-3xl bg-gradient-to-br from-[#1A3661] to-[#2a4a73] p-6 sm:p-8 max-h-[90vh]">
                    <button
                        type="button"
                        onClick={handleClosePopup}
                        aria-label={closeButtonLabel}
                        className="absolute right-6 top-6 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="mb-8 text-center">
                        <div className="mb-6 flex items-center justify-center gap-3">
                            <Sparkles className="h-8 w-8 text-[#1E7149]" />
                            <h2 className="font-['Poppins'] text-3xl font-bold text-white lg:text-4xl">
                                {wheelPopup.title ?? t("wheel.popup.title", { fallback: "Bun venit la DaCars!" })}
                            </h2>
                            <Sparkles className="h-8 w-8 text-[#1E7149]" />
                        </div>
                        <p className="mx-auto max-w-3xl font-['DM Sans'] text-xl text-white/80">
                            {wheelPopup.description ??
                                t("wheel.popup.description", {
                                    fallback:
                                        "Înainte să explorezi ofertele noastre, încearcă-ți norocul la Roata Norocului și câștigă beneficii exclusive!",
                                })}
                        </p>
                    </div>

                    {wheelContent}
                    {winnerModal}
                </div>
            </div>
        );
    }

    return (
        <section id="wheel" className="bg-gradient-to-br from-[#1A3661] to-[#2a4a73] py-20 lg:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-16 text-center">
                    <div className="mb-6 flex items-center justify-center gap-3">
                        <Sparkles className="h-8 w-8 text-[#1E7149]" />
                        <h2 className="font-['Poppins'] text-3xl font-bold text-white lg:text-4xl">
                            {wheelSection.title ?? t("wheel.section.title", { fallback: "Roata Norocului DaCars" })}
                        </h2>
                        <Sparkles className="h-8 w-8 text-[#1E7149]" />
                    </div>
                    <p className="mx-auto max-w-3xl font-['DM Sans'] text-xl text-white/80">
                        {wheelSection.description ??
                            t("wheel.section.description", {
                                fallback:
                                    "Încearcă-ți norocul și câștigă reduceri exclusive și beneficii speciale pentru următoarea ta rezervare!",
                            })}
                    </p>
                </div>

                {wheelContent}
            </div>

            {winnerModal}
        </section>
    );
};

export default WheelOfFortune;
