"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Loader2, Plus, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popup } from "@/components/ui/popup";
import { Select } from "@/components/ui/select";
import apiClient from "@/lib/api";
import { extractItem, extractList } from "@/lib/apiResponse";
import type { Column } from "@/types/ui";
import type { Coupon, CouponPayload, CouponType } from "@/types/coupon";

const couponTypeLabels: Record<string, string> = {
    percent: "Procent (%)",
    percentage: "Procent (%)",
    percent_off: "Reducere procentuală",
    fixed: "Reducere fixă (EUR)",
};

const couponTypeOptions: Array<{ value: CouponType; label: string }> = [
    { value: "percent", label: "Procent (%)" },
    { value: "percentage", label: "Procent (alias)" },
    { value: "percent_off", label: "Reducere procentuală" },
    { value: "fixed", label: "Reducere fixă (EUR)" },
];

const percentTypes = new Set(["percent", "percentage", "percent_off"]);

const numberFormatter = new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
});

type CouponFormState = {
    code: string;
    type: CouponType | "";
    value: string;
    isUnlimited: "yes" | "no";
    limit: string;
    limitToEmail: string;
    isUnlimitedExpires: "yes" | "no";
    expiresAt: string;
    isDateValid: "yes" | "no";
    validStartDate: string;
    validEndDate: string;
};

const createEmptyForm = (): CouponFormState => ({
    code: "",
    type: "percent",
    value: "",
    isUnlimited: "no",
    limit: "",
    limitToEmail: "",
    isUnlimitedExpires: "no",
    expiresAt: "",
    isDateValid: "no",
    validStartDate: "",
    validEndDate: "",
});

const normalizeDateInput = (value?: string | null): string => {
    if (typeof value !== "string" || value.trim().length === 0) {
        return "";
    }
    if (value.length >= 10) {
        return value.slice(0, 10);
    }
    return value;
};

const normalizeDateTimeInput = (value?: string | null): string => {
    if (typeof value !== "string" || value.trim().length === 0) {
        return "";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }
    const offset = parsed.getTimezoneOffset();
    const localDate = new Date(parsed.getTime() - offset * 60_000);
    return localDate.toISOString().slice(0, 16);
};

const parseDateValue = (value?: string | null): Date | null => {
    if (typeof value !== "string" || value.trim().length === 0) {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
};

const formatCouponType = (type?: CouponType | null): string => {
    if (!type) {
        return "—";
    }
    const normalized = type.toString().toLowerCase();
    return couponTypeLabels[normalized] ?? type.toString();
};

const formatCouponValue = (coupon: Coupon): string => {
    const rawValue = coupon?.value;
    const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0);
    if (!Number.isFinite(numericValue)) {
        return "—";
    }
    const typeKey = coupon?.type ? coupon.type.toString().toLowerCase() : "";
    if (percentTypes.has(typeKey)) {
        return `${numberFormatter.format(numericValue)}%`;
    }
    return `${numberFormatter.format(numericValue)} EUR`;
};

const toFormState = (coupon: Coupon): CouponFormState => ({
    code: coupon.code ?? "",
    type: (coupon.type as CouponType) ?? "percent",
    value: coupon.value != null ? String(coupon.value) : "",
    isUnlimited: coupon.is_unlimited ? "yes" : "no",
    limit:
        coupon.is_unlimited || coupon.limit == null
            ? ""
            : String(coupon.limit ?? ""),
    limitToEmail: coupon.limited_to_email ?? "",
    isUnlimitedExpires: coupon.is_unlimited_expires ? "yes" : "no",
    expiresAt:
        coupon.is_unlimited_expires
            ? ""
            : normalizeDateInput(coupon.expires_at ?? null),
    isDateValid: coupon.is_date_valid ? "yes" : "no",
    validStartDate: normalizeDateTimeInput(coupon.valid_start_date ?? null),
    validEndDate: normalizeDateTimeInput(coupon.valid_end_date ?? null),
});

const formatUsageSummary = (coupon: Coupon): string => {
    if (coupon.is_unlimited) {
        return `${coupon.used ?? 0} folosințe · Nelimitat`;
    }
    const used = typeof coupon.used === "number" ? coupon.used : Number(coupon.used ?? 0);
    const limit = typeof coupon.limit === "number" ? coupon.limit : Number(coupon.limit ?? 0);
    if (!Number.isFinite(used) && !Number.isFinite(limit)) {
        return "—";
    }
    return `${Number.isFinite(used) ? used : 0} / ${Number.isFinite(limit) ? limit : 0}`;
};

const formatDateValue = (value?: string | null, fallback = "—"): string => {
    const date = parseDateValue(value);
    if (!date) {
        return fallback;
    }
    return dateFormatter.format(date);
};

const formatDateTimeValue = (value?: string | null): string => {
    const date = parseDateValue(value);
    if (!date) {
        return "—";
    }
    return dateTimeFormatter.format(date);
};

const formatLimitedToEmail = (value?: string | null): string => {
    if (typeof value !== "string") {
        return "—";
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "—";
};

const isValidDateTimeInput = (value: string): boolean => {
    if (value.trim().length === 0) {
        return false;
    }
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
};

const ensureDateTimeSeconds = (value: string): string => {
    if (value.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(value)) {
        return value;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
        return `${value}:00`;
    }
    return value;
};

type FilterState = {
    search: string;
    type: string;
    isUnlimited: "" | "yes" | "no";
    isUnlimitedExpires: "" | "yes" | "no";
};

const defaultFilters: FilterState = {
    search: "",
    type: "",
    isUnlimited: "",
    isUnlimitedExpires: "",
};

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<FilterState>(defaultFilters);
    const [searchDraft, setSearchDraft] = useState("");
    const [formState, setFormState] = useState<CouponFormState>(createEmptyForm);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    const loadCoupons = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getCoupons({
                search: filters.search || undefined,
                type: filters.type || undefined,
                is_unlimited:
                    filters.isUnlimited === ""
                        ? undefined
                        : filters.isUnlimited === "yes"
                            ? "1"
                            : "0",
                is_unlimited_expires:
                    filters.isUnlimitedExpires === ""
                        ? undefined
                        : filters.isUnlimitedExpires === "yes"
                            ? "1"
                            : "0",
                limit: 200,
            });
            const list = extractList<Coupon>(response);
            setCoupons(list);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Nu am putut încărca lista de cupoane.";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        void loadCoupons();
    }, [loadCoupons]);

    const handleFilterSubmit = useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setFilters((prev) => ({ ...prev, search: searchDraft.trim() }));
        },
        [searchDraft],
    );

    const handleResetFilters = useCallback(() => {
        setFilters(defaultFilters);
        setSearchDraft("");
    }, []);

    const handleOpenCreate = useCallback(() => {
        setEditingCoupon(null);
        setFormState(createEmptyForm());
        setFormError(null);
        setIsFormOpen(true);
    }, []);

    const handleEditCoupon = useCallback((coupon: Coupon) => {
        setEditingCoupon(coupon);
        setFormState(toFormState(coupon));
        setFormError(null);
        setIsFormOpen(true);
    }, []);

    const closeForm = useCallback(() => {
        if (saving) {
            return;
        }
        setIsFormOpen(false);
        setFormError(null);
    }, [saving]);

    const handleFormChange = useCallback(<K extends keyof CouponFormState>(key: K, value: CouponFormState[K]) => {
        setFormState((prev) => {
            const next = { ...prev, [key]: value } as CouponFormState;
            if (key === "isUnlimited" && value === "yes") {
                next.limit = "";
            }
            if (key === "isUnlimitedExpires" && value === "yes") {
                next.expiresAt = "";
            }
            if (key === "isDateValid" && value === "no") {
                next.validStartDate = "";
                next.validEndDate = "";
            }
            return next;
        });
    }, []);

    const handleSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (saving) {
                return;
            }
            setFormError(null);

            const trimmedCode = formState.code.trim();
            if (!trimmedCode) {
                setFormError("Completează codul cuponului.");
                return;
            }

            const couponType = formState.type || "percent";
            const numericValue = Number(formState.value);
            if (!Number.isFinite(numericValue) || numericValue < 0) {
                setFormError("Valoarea reducerii trebuie să fie un număr valid mai mare sau egal cu zero.");
                return;
            }

            const unlimitedUsage = formState.isUnlimited === "yes";
            const unlimitedExpiration = formState.isUnlimitedExpires === "yes";
            const trimmedLimitEmail = formState.limitToEmail.trim();

            if (trimmedLimitEmail.length > 0) {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(trimmedLimitEmail)) {
                    setFormError("Introduce o adresă de email validă pentru limitarea cuponului.");
                    return;
                }
            }

            const restrictByDate = formState.isDateValid === "yes";
            const rawValidStart = restrictByDate ? formState.validStartDate.trim() : "";
            const rawValidEnd = restrictByDate ? formState.validEndDate.trim() : "";
            let normalizedValidStart: string | null = null;
            let normalizedValidEnd: string | null = null;

            if (restrictByDate) {
                if (rawValidStart.length === 0 && rawValidEnd.length === 0) {
                    setFormError(
                        "Configurează cel puțin o limită pentru perioada de rezervare (start sau final).",
                    );
                    return;
                }

                if (rawValidStart.length > 0) {
                    if (!isValidDateTimeInput(rawValidStart)) {
                        setFormError("Data de început pentru valabilitate nu este validă.");
                        return;
                    }
                    normalizedValidStart = ensureDateTimeSeconds(rawValidStart);
                }

                if (rawValidEnd.length > 0) {
                    if (!isValidDateTimeInput(rawValidEnd)) {
                        setFormError("Data de final pentru valabilitate nu este validă.");
                        return;
                    }
                    normalizedValidEnd = ensureDateTimeSeconds(rawValidEnd);
                }

                if (normalizedValidStart && normalizedValidEnd) {
                    const startDate = new Date(rawValidStart);
                    const endDate = new Date(rawValidEnd);
                    if (startDate.getTime() > endDate.getTime()) {
                        setFormError("Data de început trebuie să fie anterioară datei de final pentru intervalul de valabilitate.");
                        return;
                    }
                }
            }

            let parsedLimit: number | null = null;
            if (!unlimitedUsage) {
                const limitInput = formState.limit.trim();
                if (limitInput.length === 0) {
                    setFormError("Specifică limita maximă de utilizări sau marchează cuponul ca nelimitat.");
                    return;
                }
                parsedLimit = Number(limitInput);
                if (!Number.isFinite(parsedLimit) || parsedLimit < 0) {
                    setFormError("Limita de utilizări trebuie să fie un număr pozitiv sau zero.");
                    return;
                }
            }

            let expirationDate: string | null = null;
            if (!unlimitedExpiration) {
                const trimmedDate = formState.expiresAt.trim();
                if (!trimmedDate) {
                    setFormError("Selectează data de expirare sau marchează cuponul ca fără expirare.");
                    return;
                }
                expirationDate = trimmedDate;
            }

            setSaving(true);
            try {
                const payload: CouponPayload = {
                    code: trimmedCode,
                    type: couponType,
                    value: numericValue,
                    is_unlimited: unlimitedUsage,
                    limit: unlimitedUsage ? null : parsedLimit,
                    is_unlimited_expires: unlimitedExpiration,
                    expires_at: unlimitedExpiration ? null : expirationDate,
                    limited_to_email: trimmedLimitEmail.length > 0 ? trimmedLimitEmail : null,
                    is_date_valid: restrictByDate,
                    valid_start_date: restrictByDate ? normalizedValidStart : null,
                    valid_end_date: restrictByDate ? normalizedValidEnd : null,
                };

                const response = editingCoupon
                    ? await apiClient.updateCoupon(editingCoupon.id, payload)
                    : await apiClient.createCoupon(payload);

                const saved = extractItem(response);
                if (!saved) {
                    throw new Error("Răspuns invalid de la server.");
                }

                setIsFormOpen(false);
                setFormState(createEmptyForm());
                setEditingCoupon(null);
                await loadCoupons();
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "A apărut o eroare la salvarea cuponului.";
                setFormError(message);
            } finally {
                setSaving(false);
            }
        },
        [editingCoupon, formState, loadCoupons, saving],
    );

    const columns = useMemo<Column<Coupon>[]>(() => [
        {
            id: "code",
            header: "Cod",
            accessor: (row) => row.code ?? "",
            sortable: true,
        },
        {
            id: "type",
            header: "Tip",
            accessor: (row) => formatCouponType(row.type) ?? "",
            cell: (row) => (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {formatCouponType(row.type)}
                </span>
            ),
            sortable: true,
        },
        {
            id: "value",
            header: "Valoare",
            accessor: (row) => (typeof row.value === "number" ? row.value : Number(row.value ?? 0)),
            cell: (row) => formatCouponValue(row),
            sortable: true,
        },
        {
            id: "usage",
            header: "Utilizare",
            accessor: (row) => (row.is_unlimited ? "Nelimitat" : formatUsageSummary(row)),
            cell: (row) => formatUsageSummary(row),
        },
        {
            id: "limited_to_email",
            header: "Limitat la email",
            accessor: (row) => row.limited_to_email?.trim() ?? "",
            cell: (row) => formatLimitedToEmail(row.limited_to_email),
        },
        {
            id: "expires",
            header: "Expirare",
            accessor: (row) => {
                if (row.is_unlimited_expires) {
                    return "Fără expirare";
                }
                const date = parseDateValue(row.expires_at);
                return date ? date : "";
            },
            cell: (row) =>
                row.is_unlimited_expires
                    ? "Fără expirare"
                    : formatDateValue(row.expires_at, "—"),
            sortable: true,
        },
        {
            id: "booking_window",
            header: "Perioadă rezervare",
            accessor: (row) =>
                row.is_date_valid
                    ? `${row.valid_start_date ?? ""}|${row.valid_end_date ?? ""}`
                    : "",
            cell: (row) =>
                row.is_date_valid
                    ? `${formatDateTimeValue(row.valid_start_date)} → ${formatDateTimeValue(row.valid_end_date)}`
                    : "Fără restricții",
        },
        {
            id: "actions",
            header: "Acțiuni",
            accessor: () => "",
            cell: (row) => (
                <Button
                    size="sm"
                    variant="secondary"
                    className="flex items-center gap-2"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleEditCoupon(row);
                    }}
                >
                    <Edit className="h-4 w-4" />
                    Editează
                </Button>
            ),
        },
    ], [handleEditCoupon]);

    const renderRowDetails = useCallback(
        (row: Coupon) => (
            <div className="space-y-2 text-sm text-slate-600">
                <div>
                    <span className="font-semibold text-slate-700">Valoare:</span> {formatCouponValue(row)}
                </div>
                <div>
                    <span className="font-semibold text-slate-700">Utilizări:</span> {formatUsageSummary(row)}
                </div>
                <div>
                    <span className="font-semibold text-slate-700">Limitat la email:</span>{" "}
                    {formatLimitedToEmail(row.limited_to_email)}
                </div>
                <div>
                    <span className="font-semibold text-slate-700">Expirare:</span>{" "}
                    {row.is_unlimited_expires ? "Fără expirare" : formatDateValue(row.expires_at, "—")}
                </div>
                <div>
                    <span className="font-semibold text-slate-700">Perioadă rezervare:</span>{" "}
                    {row.is_date_valid
                        ? `${formatDateTimeValue(row.valid_start_date)} → ${formatDateTimeValue(row.valid_end_date)}`
                        : "Fără restricții"}
                </div>
                <div>
                    <span className="font-semibold text-slate-700">Creat la:</span> {formatDateTimeValue(row.created_at)}
                </div>
                <div>
                    <span className="font-semibold text-slate-700">Ultima actualizare:</span> {formatDateTimeValue(row.updated_at)}
                </div>
            </div>
        ),
        [],
    );

    return (
        <div className="space-y-6 p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Cupoane</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-600">
                        Vizualizează, filtrează și gestionează codurile de reducere folosite în campaniile DaCars.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="secondary"
                        className="flex items-center gap-2"
                        onClick={() => void loadCoupons()}
                        disabled={loading}
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Actualizează
                    </Button>
                    <Button className="flex items-center gap-2" onClick={handleOpenCreate}>
                        <Plus className="h-4 w-4" />
                        Adaugă cupon
                    </Button>
                </div>
            </div>

            <form
                onSubmit={handleFilterSubmit}
                className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4"
            >
                <div className="space-y-2">
                    <Label htmlFor="coupon-search">Cod sau căutare globală</Label>
                    <Input
                        id="coupon-search"
                        placeholder="Ex. SPRING15"
                        value={searchDraft}
                        onChange={(event) => setSearchDraft(event.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="coupon-type-filter">Tip reducere</Label>
                    <Select
                        id="coupon-type-filter"
                        value={filters.type}
                        onValueChange={(value) =>
                            setFilters((prev) => ({ ...prev, type: value }))
                        }
                    >
                        <option value="">Toate tipurile</option>
                        {couponTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="coupon-usage-filter">Limită de utilizări</Label>
                    <Select
                        id="coupon-usage-filter"
                        value={filters.isUnlimited}
                        onValueChange={(value) =>
                            setFilters((prev) => ({
                                ...prev,
                                isUnlimited: (value as FilterState["isUnlimited"]) ?? "",
                            }))
                        }
                    >
                        <option value="">Toate</option>
                        <option value="no">Limitate</option>
                        <option value="yes">Nelimitate</option>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="coupon-expiration-filter">Expirare</Label>
                    <Select
                        id="coupon-expiration-filter"
                        value={filters.isUnlimitedExpires}
                        onValueChange={(value) =>
                            setFilters((prev) => ({
                                ...prev,
                                isUnlimitedExpires: (value as FilterState["isUnlimitedExpires"]) ?? "",
                            }))
                        }
                    >
                        <option value="">Toate</option>
                        <option value="no">Au dată de expirare</option>
                        <option value="yes">Fără expirare</option>
                    </Select>
                </div>
                <div className="md:col-span-2 lg:col-span-4 flex items-end justify-end gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        className="flex items-center gap-2"
                        onClick={handleResetFilters}
                        disabled={loading}
                    >
                        Resetează filtrele
                    </Button>
                    <Button type="submit" className="flex items-center gap-2" disabled={loading}>
                        Aplică filtrarea
                    </Button>
                </div>
            </form>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Se încarcă lista de cupoane...</span>
                    </div>
                ) : coupons.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500">
                        Nu am găsit cupoane pentru filtrele selectate.
                    </div>
                ) : (
                    <DataTable
                        data={coupons}
                        columns={columns}
                        pageSize={10}
                        renderRowDetails={renderRowDetails}
                    />
                )}
            </div>

            <Popup open={isFormOpen} onClose={closeForm}>
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                            {editingCoupon ? "Editează cupon" : "Adaugă cupon"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Completează detaliile cuponului conform documentației API.
                        </p>
                    </div>
                </div>

                {formError && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {formError}
                    </div>
                )}

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="coupon-code">Cod</Label>
                            <Input
                                id="coupon-code"
                                value={formState.code}
                                onChange={(event) =>
                                    handleFormChange("code", event.target.value.toUpperCase())
                                }
                                maxLength={20}
                                placeholder="Ex. SPRING15"
                                required
                            />
                            <p className="text-xs text-slate-500">
                                Cod unic, maxim 20 de caractere. Valorile duplicate vor fi respinse.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="coupon-type">Tip reducere</Label>
                            <Select
                                id="coupon-type"
                                value={formState.type}
                                onValueChange={(value) =>
                                    handleFormChange("type", value as CouponType)
                                }
                                required
                            >
                                {couponTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="coupon-value">Valoare reducere</Label>
                            <Input
                                id="coupon-value"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formState.value}
                                onChange={(event) => handleFormChange("value", event.target.value)}
                                placeholder={
                                    formState.type && percentTypes.has(formState.type.toString())
                                        ? "Ex. 15"
                                        : "Ex. 50"
                                }
                                required
                            />
                            <p className="text-xs text-slate-500">
                                Valorile procentuale se exprimă ca număr întreg sau zecimal (ex. 15, 12.5).
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="coupon-usage">Limită utilizări</Label>
                            <Select
                                id="coupon-usage"
                                value={formState.isUnlimited}
                                onValueChange={(value) =>
                                    handleFormChange("isUnlimited", value as "yes" | "no")
                                }
                            >
                                <option value="no">Limitat</option>
                                <option value="yes">Nelimitat</option>
                            </Select>
                            {formState.isUnlimited === "no" && (
                                <p className="text-xs text-slate-500">
                                    Alege varianta „Limitat” pentru a stabili un număr maxim de utilizări.
                                </p>
                            )}
                        </div>
                    </div>

                    {formState.isUnlimited === "no" && (
                        <div className="space-y-2">
                            <Label htmlFor="coupon-limit">Număr maxim de utilizări</Label>
                            <Input
                                id="coupon-limit"
                                type="number"
                                min="0"
                                step="1"
                                value={formState.limit}
                                onChange={(event) => handleFormChange("limit", event.target.value)}
                                placeholder="Ex. 250"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="coupon-limit-email">Limitare la adresă de email</Label>
                        <Input
                            id="coupon-limit-email"
                            type="email"
                            value={formState.limitToEmail}
                            onChange={(event) => handleFormChange("limitToEmail", event.target.value)}
                            placeholder="Ex. vip@dacars.ro"
                        />
                        <p className="text-xs text-slate-500">
                            Lasă necompletat pentru a permite folosirea cuponului cu orice adresă de email.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="coupon-expiration-mode">Expirare</Label>
                            <Select
                                id="coupon-expiration-mode"
                                value={formState.isUnlimitedExpires}
                                onValueChange={(value) =>
                                    handleFormChange("isUnlimitedExpires", value as "yes" | "no")
                                }
                            >
                                <option value="no">Are dată de expirare</option>
                                <option value="yes">Fără expirare</option>
                            </Select>
                        </div>
                        {formState.isUnlimitedExpires === "no" && (
                            <div className="space-y-2">
                                <Label htmlFor="coupon-expiration-date">Data expirării</Label>
                                <Input
                                    id="coupon-expiration-date"
                                    type="date"
                                    value={formState.expiresAt}
                                    onChange={(event) => handleFormChange("expiresAt", event.target.value)}
                                    min={new Date().toISOString().slice(0, 10)}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="coupon-date-valid">Restricționează perioada de rezervare</Label>
                            <Select
                                id="coupon-date-valid"
                                value={formState.isDateValid}
                                onValueChange={(value) =>
                                    handleFormChange("isDateValid", (value as "yes" | "no") ?? "no")
                                }
                            >
                                <option value="no">Nu</option>
                                <option value="yes">Da</option>
                            </Select>
                            <p className="text-xs text-slate-500">
                                Activează opțiunea pentru a impune intervalul de rezervare (<code>valid_start_date</code> / <code>valid_end_date</code>).
                            </p>
                        </div>
                    </div>

                    {formState.isDateValid === "yes" && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="coupon-valid-start">Început valabilitate rezervare</Label>
                                <Input
                                    id="coupon-valid-start"
                                    type="datetime-local"
                                    value={formState.validStartDate}
                                    onChange={(event) => handleFormChange("validStartDate", event.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="coupon-valid-end">Final valabilitate rezervare</Label>
                                <Input
                                    id="coupon-valid-end"
                                    type="datetime-local"
                                    value={formState.validEndDate}
                                    onChange={(event) => handleFormChange("validEndDate", event.target.value)}
                                />
                            </div>
                            <p className="md:col-span-2 text-xs text-slate-500">
                                Cel puțin unul dintre capetele intervalului trebuie completat. Dacă setezi ambele valori, data de început
                                trebuie să fie înainte de data de final.
                            </p>
                        </div>
                    )}

                    {editingCoupon && typeof editingCoupon.used === "number" && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                            Folosiri actuale: <span className="font-semibold">{editingCoupon.used}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={closeForm}
                            disabled={saving}
                        >
                            Anulează
                        </Button>
                        <Button type="submit" disabled={saving} className="flex items-center gap-2">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editingCoupon ? "Salvează modificările" : "Creează cupon"}
                        </Button>
                    </div>
                </form>
            </Popup>
        </div>
    );
}

