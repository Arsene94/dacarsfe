"use client";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    AlertCircle,
    Gift,
    Loader2,
    RotateCcw,
    Sparkles,
} from "lucide-react";

import apiClient from "@/lib/api";
import type {
    WheelOfFortunePeriod,
    WheelPrize,
    WheelOfFortuneProps,
} from "@/types/wheel";

const extractArray = (response: any): any[] => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.items)) return response.items;
    return [];
};

const mapPeriod = (item: any): WheelOfFortunePeriod | null => {
    if (!item) return null;
    const id = Number(item.id ?? item.period_id ?? item.value);
    if (!Number.isFinite(id)) return null;

    const nameSource = item.name ?? item.title;
    const name = typeof nameSource === "string" && nameSource.trim().length > 0
        ? nameSource.trim()
        : `Perioada #${id}`;

    const start = item.start_at ?? item.start_date ?? item.starts_at ?? item.from ?? null;
    const end = item.end_at ?? item.end_date ?? item.ends_at ?? item.to ?? null;
    const activeRaw = item.is_active ?? item.active ?? item.enabled ?? item.status;

    return {
        id,
        name,
        start_at: typeof start === "string" ? start : null,
        end_at: typeof end === "string" ? end : null,
        is_active: typeof activeRaw !== "undefined"
            ? Boolean(activeRaw === true || activeRaw === 1 || `${activeRaw}` === "1" || `${activeRaw}`.toLowerCase() === "true")
            : undefined,
        description: typeof item.description === "string" ? item.description : null,
        created_at: typeof item.created_at === "string" ? item.created_at : null,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
    };
};

const mapPrize = (item: any): WheelPrize | null => {
    if (!item) return null;
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
    const periodId = Number(item.period_id ?? item.period?.id);

    const probability = typeof probabilitySource === "number"
        ? probabilitySource
        : Number(String(probabilitySource).replace(/,/g, "."));

    return {
        id,
        period_id: Number.isFinite(periodId) ? periodId : 0,
        title,
        description: typeof descriptionSource === "string" ? descriptionSource : null,
        color: typeof colorSource === "string" && colorSource.trim().length > 0 ? colorSource : "#1E7149",
        probability: Number.isFinite(probability) ? probability : 0,
        type: typeof typeSource === "string" ? typeSource : "other",
        created_at: typeof item.created_at === "string" ? item.created_at : null,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
    };
};

const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({ isPopup = false, onClose }) => {
    const [prizes, setPrizes] = useState<WheelPrize[]>([]);
    const [activePeriod, setActivePeriod] = useState<WheelOfFortunePeriod | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

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

    const mountedRef = useRef(true);
    const spinTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (spinTimeoutRef.current) {
                window.clearTimeout(spinTimeoutRef.current);
            }
        };
    }, []);

    const fetchWheelData = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const activePeriodResponse = await apiClient.getWheelOfFortunePeriods({ is_active: 1, limit: 1 });
            const activeCandidates = extractArray(activePeriodResponse)
                .map(mapPeriod)
                .filter((item): item is WheelOfFortunePeriod => item !== null);

            let period = activeCandidates.find((item) => item.is_active) ?? activeCandidates[0] ?? null;

            if (!period) {
                const fallbackResponse = await apiClient.getWheelOfFortunePeriods({ per_page: 20 });
                const fallbackList = extractArray(fallbackResponse)
                    .map(mapPeriod)
                    .filter((item): item is WheelOfFortunePeriod => item !== null);
                period = fallbackList.find((item) => item.is_active) ?? fallbackList[0] ?? null;
            }

            if (!period) {
                setActivePeriod(null);
                setPrizes([]);
                setLoadError("Momentan nu există o perioadă activă pentru roata norocului.");
                setIsLoading(false);
                return;
            }

            setActivePeriod(period);

            const prizesResponse = await apiClient.getWheelOfFortunes({ period_id: period.id, limit: 100 });
            const prizeItems = extractArray(prizesResponse)
                .map(mapPrize)
                .filter((item): item is WheelPrize => item !== null)
                .map((item) => ({
                    ...item,
                    description: item.description ?? "",
                    color: item.color || "#1E7149",
                }));

            setPrizes(prizeItems);

            if (prizeItems.length === 0) {
                setLoadError("Momentan nu sunt premii disponibile pentru această perioadă.");
            }
        } catch (error) {
            console.error("Failed to load wheel data", error);
            setPrizes([]);
            setActivePeriod(null);
            setLoadError("Nu am putut încărca premiile. Te rugăm să încerci din nou mai târziu.");
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchWheelData();
    }, [fetchWheelData]);

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

    const persistPrizeResult = useCallback(async (prize: WheelPrize, info: { name: string; phone: string }) => {
        setSaveState("saving");
        setSaveError(null);
        try {
            await apiClient.createWheelOfFortunePrize({
                wheel_of_fortune_id: prize.id,
                name: info.name,
                phone: info.phone,
            });
            if (!mountedRef.current) return;
            setSaveState("success");
        } catch (error) {
            console.error("Failed to store wheel prize", error);
            if (!mountedRef.current) return;
            setSaveState("error");
            setSaveError(
                error instanceof Error
                    ? error.message
                    : "A apărut o eroare la salvarea premiului. Te rugăm să încerci din nou.",
            );
        }
    }, []);

    const handleSpin = () => {
        if (isSpinning || spinsLeft <= 0) return;
        if (isLoading) return;
        if (prizes.length === 0) {
            setFormError("Roata nu este disponibilă în acest moment.");
            return;
        }

        const sanitizedName = customerName.trim();
        const sanitizedPhone = customerPhone.trim();

        if (!sanitizedName) {
            setFormError("Introdu numele complet pentru a putea salva premiul.");
            return;
        }

        if (!sanitizedPhone) {
            setFormError("Introdu un număr de telefon valid.");
            return;
        }

        const winningIndex = pickWeightedIndex();
        if (winningIndex < 0) {
            setFormError("Nu am putut determina un premiu în acest moment. Încearcă din nou mai târziu.");
            return;
        }

        const winningPrize = prizes[winningIndex];

        setFormError(null);
        setParticipant({ name: sanitizedName, phone: sanitizedPhone });
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
                setSpinsLeft(0);
                void persistPrizeResult(winningPrize, {
                    name: sanitizedName,
                    phone: sanitizedPhone,
                });
            }
        }, 4000);
    };

    const handleRetrySave = () => {
        if (selectedPrize && participant) {
            void persistPrizeResult(selectedPrize, participant);
        }
    };

    const resetSpins = () => {
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

    const canSpin = !isSpinning && spinsLeft > 0 && prizes.length > 0 && !isLoading;

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
                        {selectedPrize.type === "try_again" ? "Mai încearcă!" : "Felicitări! 🎉"}
                    </h3>

                    <div
                        className={`${selectedPrize.type === "try_again" ? "bg-gradient-to-r from-yellow-500 to-orange-500" : "bg-gradient-to-r from-[#1E7149] to-[#195C3B]"} mb-6 rounded-2xl p-6 text-white`}
                    >
                        <h4 className="mb-2 font-['Poppins'] text-xl font-bold">{selectedPrize.title}</h4>
                        <p className="font-['DM Sans']">
                            {selectedPrize.description || "Continuă procesul de rezervare pentru a afla mai multe detalii."}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <p className="font-['DM Sans'] text-sm text-[#191919]/70">
                            {selectedPrize.type === "try_again"
                                ? "Nu te descuraja! Ai primit o nouă șansă să câștigi un premiu și mai bun."
                                : "Am înregistrat premiul tău și vei primi detalii prin SMS sau email în scurt timp."}
                        </p>

                        {selectedPrize.type !== "try_again" && (
                            <div className="space-y-3">
                                {saveState === "saving" && (
                                    <div className="flex items-center justify-center gap-2 rounded-xl bg-jade/10 px-4 py-3 text-sm text-jade">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Salvăm premiul tău...
                                    </div>
                                )}
                                {saveState === "success" && (
                                    <div className="rounded-xl border border-jade/30 bg-white px-4 py-3 text-sm text-jade">
                                        Premiul a fost salvat cu succes! Echipa DaCars îți va trimite toate detaliile curând.
                                    </div>
                                )}
                                {saveState === "error" && (
                                    <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="mt-0.5 h-4 w-4" />
                                            <p>{saveError ?? "Nu am putut salva premiul. Încearcă din nou."}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRetrySave}
                                            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
                                        >
                                            Reîncearcă salvarea
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
                                        Încearcă din nou
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 rounded-lg border-2 border-gray-300 py-3 font-['DM Sans'] font-semibold text-[#191919] transition hover:bg-gray-50"
                                    >
                                        Închide
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 rounded-lg bg-[#1E7149] py-3 font-['DM Sans'] font-semibold text-white transition hover:bg-[#195C3B]"
                                    >
                                        Continuă rezervarea
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 rounded-lg border-2 border-gray-300 py-3 font-['DM Sans'] font-semibold text-[#191919] transition hover:bg-gray-50"
                                    >
                                        Închide
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    const wheelContent = (
        <div className="flex flex-col items-center justify-center gap-12 lg:flex-row">
            <div className="relative">
                <div className="pointer-events-none absolute -top-0 left-1/2 z-20 -translate-x-1/2">
                    <div
                        className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-black drop-shadow-md"
                    />
                </div>

                <div className="relative mx-auto aspect-square w-[340px] sm:w-[480px] md:w-[620px] lg:w-[700px]">
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
                            <Gift className="h-8 w-8 text-[#1E7149]" />
                        </div>

                        {isLoading && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                                <Loader2 className="h-10 w-10 animate-spin text-[#1E7149]" />
                            </div>
                        )}

                        {!isLoading && prizes.length === 0 && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-white/80 text-center text-gray-600">
                                <AlertCircle className="h-8 w-8 text-[#1A3661]" />
                                <p>Roata nu este disponibilă momentan.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-md text-center lg:text-left">
                <h3 className="mb-6 font-['Poppins'] text-2xl font-bold text-white lg:text-3xl">
                    Câștigă premii exclusive!
                </h3>
                <p className="mb-8 font-['DM Sans'] text-white/80 leading-relaxed">
                    {activePeriod
                        ? `Perioada activă: ${activePeriod.name}. Completează datele tale, învârte roata și vezi ce premiu primești!`
                        : "Completează datele tale, învârte roata și vezi ce premiu primești!"}
                </p>

                <div className="mb-6 space-y-4">
                    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                        <p className="font-['DM Sans'] text-white">
                            Încercări rămase: <span className="font-bold text-[#1E7149]">{spinsLeft}</span>
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                        <div className="grid gap-4">
                            <div className="text-left">
                                <label htmlFor="wheel-name" className="mb-1 block font-['DM Sans'] text-sm font-medium text-white/80">
                                    Nume complet
                                </label>
                                <input
                                    id="wheel-name"
                                    value={customerName}
                                    onChange={(event) => {
                                        setCustomerName(event.target.value);
                                        if (formError) setFormError(null);
                                    }}
                                    placeholder="Ex. Maria Popescu"
                                    className="w-full rounded-lg border border-transparent px-4 py-3 font-['DM Sans'] text-sm text-[#191919] shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1E7149]"
                                />
                            </div>
                            <div className="text-left">
                                <label htmlFor="wheel-phone" className="mb-1 block font-['DM Sans'] text-sm font-medium text-white/80">
                                    Telefon
                                </label>
                                <input
                                    id="wheel-phone"
                                    value={customerPhone}
                                    onChange={(event) => {
                                        setCustomerPhone(event.target.value);
                                        if (formError) setFormError(null);
                                    }}
                                    placeholder="Ex. +40 712 345 678"
                                    className="w-full rounded-lg border border-transparent px-4 py-3 font-['DM Sans'] text-sm text-[#191919] shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1E7149]"
                                />
                            </div>
                            <p className="font-['DM Sans'] text-xs text-white/70">
                                Datele sunt necesare pentru validarea premiului conform regulamentului DaCars.
                            </p>
                        </div>
                    </div>

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
                            <RotateCcw className="mr-3 h-6 w-6 animate-spin" /> Se învârte...
                        </>
                    ) : spinsLeft <= 0 ? (
                        <>
                            <Gift className="mr-3 h-6 w-6" /> Încercări epuizate
                        </>
                    ) : (
                        <>
                            <Gift className="mr-3 h-6 w-6" /> Învârte Roata
                        </>
                    )}
                </button>

                {spinsLeft <= 0 && (
                    <button
                        type="button"
                        onClick={resetSpins}
                        className="mx-auto flex items-center justify-center rounded-xl bg-white/20 px-6 py-3 font-['DM Sans'] font-semibold text-white transition hover:bg-white/30 lg:mx-0"
                    >
                        <RotateCcw className="mr-2 h-5 w-5" /> Resetează (Demo)
                    </button>
                )}

                <div className="mt-6 rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
                    <h4 className="mb-3 font-['Poppins'] text-lg font-semibold text-white">Regulament rapid:</h4>
                    <ul className="space-y-2 font-['DM Sans'] text-sm text-white/80">
                        <li>• O singură încercare per client valid.</li>
                        <li>• Premiul este valabil 30 de zile din momentul câștigului.</li>
                        <li>• Se aplică doar la rezervări noi efectuate pe DaCars.</li>
                        <li>• Nu se cumulează cu alte oferte sau reduceri.</li>
                    </ul>
                </div>
            </div>
        </div>
    );

    if (isPopup) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="relative w-full max-w-6xl overflow-y-auto rounded-3xl bg-gradient-to-br from-[#1A3661] to-[#2a4a73] p-8">
                    <button
                        type="button"
                        onClick={handleClosePopup}
                        aria-label="Închide popup"
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
                                Bun venit la DaCars!
                            </h2>
                            <Sparkles className="h-8 w-8 text-[#1E7149]" />
                        </div>
                        <p className="mx-auto max-w-3xl font-['DM Sans'] text-xl text-white/80">
                            Înainte să explorezi ofertele noastre, încearcă-ți norocul la Roata Norocului și câștigă beneficii exclusive!
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
                            Roata Norocului DaCars
                        </h2>
                        <Sparkles className="h-8 w-8 text-[#1E7149]" />
                    </div>
                    <p className="mx-auto max-w-3xl font-['DM Sans'] text-xl text-white/80">
                        Încearcă-ți norocul și câștigă reduceri exclusive și beneficii speciale pentru următoarea ta rezervare!
                    </p>
                </div>

                {wheelContent}
            </div>

            {winnerModal}
        </section>
    );
};

export default WheelOfFortune;
