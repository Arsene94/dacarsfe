"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import type { PageKey } from "@/lib/i18n/translations";

const PAGE_OPTIONS: Array<{ value: PageKey; label: string; description: string }> = [
    { value: "layout", label: "Layout", description: "Elemente globale (header, footer, switch limbi)" },
    { value: "home", label: "Acasă", description: "Conținut landing page" },
    { value: "cars", label: "Flotă", description: "Listă mașini și filtre" },
    { value: "checkout", label: "Checkout", description: "Formular rezervare" },
    { value: "success", label: "Succes rezervare", description: "Pagina de confirmare" },
];

const LOCALE_LABELS: Record<Locale, string> = {
    ro: "Română",
    en: "Engleză",
    it: "Italiană",
    es: "Spaniolă",
    fr: "Franceză",
    de: "Germană",
};

type JsonPrimitive = string | number | boolean | null;

type PathSegment =
    | { type: "key"; key: string }
    | { type: "index"; index: number };

type PrimitiveType = "string" | "number" | "boolean" | "null";

type TranslationRow = {
    id: string;
    segments: PathSegment[];
    baseValue: JsonPrimitive;
    baseDisplay: string;
    translationValue: string;
    valueType: PrimitiveType;
    currentValue?: JsonPrimitive;
};

type TranslationResponse = {
    page: PageKey;
    locale: Locale;
    messages: Record<string, unknown>;
    baseMessages: Record<string, unknown>;
};

const isPageKey = (value: string): value is PageKey =>
    PAGE_OPTIONS.some((option) => option.value === value);

const isLocale = (value: string): value is Locale =>
    (AVAILABLE_LOCALES as readonly string[]).includes(value);

const isPrimitive = (value: unknown): value is JsonPrimitive =>
    typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const getPrimitiveType = (value: JsonPrimitive): PrimitiveType =>
    value === null ? "null" : typeof value;

const toDisplayPath = (segments: PathSegment[]): string =>
    segments
        .map((segment, index) =>
            segment.type === "key"
                ? index === 0
                    ? segment.key
                    : `.${segment.key}`
                : `[${segment.index}]`,
        )
        .join("");

const toInputValue = (value: JsonPrimitive | undefined): string => {
    if (value === undefined || value === null) {
        return "";
    }

    return typeof value === "string" ? value : String(value);
};

const flattenMessages = (
    base: Record<string, unknown>,
    translation: Record<string, unknown>,
): TranslationRow[] => {
    const rows: TranslationRow[] = [];

    const walk = (baseNode: unknown, translationNode: unknown, segments: PathSegment[]) => {
        if (isPrimitive(baseNode)) {
            const translationPrimitive = isPrimitive(translationNode) ? translationNode : undefined;

            rows.push({
                id: toDisplayPath(segments),
                segments,
                baseValue: baseNode,
                baseDisplay: baseNode === null ? "—" : String(baseNode),
                translationValue: toInputValue(translationPrimitive),
                valueType: getPrimitiveType(baseNode),
                currentValue: translationPrimitive,
            });
            return;
        }

        if (Array.isArray(baseNode)) {
            const translationArray = Array.isArray(translationNode) ? translationNode : [];

            baseNode.forEach((item, index) => {
                walk(item, translationArray[index], [...segments, { type: "index", index }]);
            });
            return;
        }

        if (isPlainObject(baseNode)) {
            const translationObject = isPlainObject(translationNode) ? translationNode : {};

            Object.keys(baseNode).forEach((key) => {
                walk(
                    (baseNode as Record<string, unknown>)[key],
                    translationObject[key],
                    [...segments, { type: "key", key }],
                );
            });
        }
    };

    walk(base, translation, []);
    return rows;
};

const convertInputToPrimitive = (
    value: string,
    type: PrimitiveType,
    fallback: JsonPrimitive,
): JsonPrimitive => {
    switch (type) {
        case "string":
            return value;
        case "number": {
            const trimmed = value.trim();

            if (!trimmed) {
                return fallback;
            }

            const parsed = Number(trimmed);
            return Number.isFinite(parsed) ? parsed : fallback;
        }
        case "boolean":
            if (value === "true" || value === "false") {
                return value === "true";
            }
            return fallback;
        case "null":
        default:
            return value.trim() === "" ? null : fallback;
    }
};

const setDeepValue = (
    node: unknown,
    segments: PathSegment[],
    depth: number,
    nextValue: JsonPrimitive,
): unknown => {
    if (depth >= segments.length) {
        return nextValue;
    }

    const segment = segments[depth];

    if (segment.type === "key") {
        const baseObject = isPlainObject(node) ? (node as Record<string, unknown>) : {};
        const currentValue = baseObject[segment.key];

        return {
            ...baseObject,
            [segment.key]: setDeepValue(currentValue, segments, depth + 1, nextValue),
        };
    }

    const sourceArray = Array.isArray(node) ? (node as unknown[]) : [];
    const copy = [...sourceArray];
    copy[segment.index] = setDeepValue(sourceArray[segment.index], segments, depth + 1, nextValue);
    return copy;
};

const applyValueAtPath = (
    source: Record<string, unknown>,
    row: TranslationRow,
    rawValue: string,
): Record<string, unknown> => {
    const nextPrimitive = convertInputToPrimitive(rawValue, row.valueType, row.currentValue ?? row.baseValue);
    return setDeepValue(source, row.segments, 0, nextPrimitive) as Record<string, unknown>;
};

const cloneJson = <T,>(value: T): T => {
    const serialized = JSON.stringify(value);
    return serialized ? (JSON.parse(serialized) as T) : value;
};

const computeTextareaRows = (value: string): number => {
    if (!value) {
        return 2;
    }

    const lines = value.split(/\r?\n/).length;
    const approx = Math.ceil(value.length / 90);
    return Math.max(2, Math.min(8, Math.max(lines, approx)));
};

export default function AdminTranslationsPage() {
    const [page, setPage] = useState<PageKey>("layout");
    const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
    const [baseMessages, setBaseMessages] = useState<Record<string, unknown>>({});
    const [draftMessages, setDraftMessages] = useState<Record<string, unknown>>({});
    const [initialMessages, setInitialMessages] = useState<Record<string, unknown>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const localeName = useMemo(() => LOCALE_LABELS[locale] ?? locale.toUpperCase(), [locale]);
    const serializedDraft = useMemo(() => JSON.stringify(draftMessages), [draftMessages]);
    const serializedInitial = useMemo(() => JSON.stringify(initialMessages), [initialMessages]);
    const hasChanges = serializedDraft !== serializedInitial;

    const translationRows = useMemo(
        () => flattenMessages(baseMessages, draftMessages),
        [baseMessages, draftMessages],
    );

    const missingTranslations = useMemo(
        () =>
            translationRows.filter(
                (row) =>
                    locale !== DEFAULT_LOCALE &&
                    row.valueType === "string" &&
                    row.translationValue.trim().length === 0,
            ).length,
        [translationRows, locale],
    );

    const loadTranslations = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const params = new URLSearchParams({ page, locale });

        try {
            const response = await fetch(`/api/admin/translations?${params.toString()}`, {
                cache: "no-store",
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                throw new Error(payload?.error || "Nu am putut încărca traducerile selectate.");
            }

            const data = (await response.json()) as TranslationResponse;

            const basePayload = cloneJson(data.baseMessages as Record<string, unknown>);
            const draftPayload = cloneJson(data.messages as Record<string, unknown>);

            setBaseMessages(basePayload);
            setDraftMessages(draftPayload);
            setInitialMessages(cloneJson(draftPayload));
        } catch (error) {
            console.error("Failed to load translations", error);
            setBaseMessages({});
            setDraftMessages({});
            setInitialMessages({});
            setErrorMessage(error instanceof Error ? error.message : "Nu am putut încărca traducerile.");
        } finally {
            setLoading(false);
        }
    }, [page, locale]);

    useEffect(() => {
        void loadTranslations();
    }, [loadTranslations]);

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timer = setTimeout(() => {
            setSuccessMessage(null);
        }, 3500);

        return () => clearTimeout(timer);
    }, [successMessage]);

    const handlePageChange = (nextValue: string) => {
        if (isPageKey(nextValue)) {
            setPage(nextValue);
        }
    };

    const handleLocaleChange = (nextValue: string) => {
        if (isLocale(nextValue)) {
            setLocale(nextValue);
        }
    };

    const handleReset = () => {
        setDraftMessages(cloneJson(initialMessages));
        setSuccessMessage(null);
        setErrorMessage(null);
    };

    const handleSave = async () => {
        if (!hasChanges || saving) {
            return;
        }

        setSaving(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const response = await fetch("/api/admin/translations", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ page, locale, messages: draftMessages }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                throw new Error(payload?.error || "Nu am putut salva traducerile.");
            }

            const data = (await response.json()) as TranslationResponse;
            const basePayload = cloneJson(data.baseMessages as Record<string, unknown>);
            const savedPayload = cloneJson(data.messages as Record<string, unknown>);

            setBaseMessages(basePayload);
            setDraftMessages(savedPayload);
            setInitialMessages(cloneJson(savedPayload));
            setSuccessMessage("Traducerile au fost salvate cu succes.");
        } catch (error) {
            console.error("Failed to save translations", error);
            setErrorMessage(error instanceof Error ? error.message : "Nu am putut salva traducerile.");
        } finally {
            setSaving(false);
        }
    };

    const handleRowChange = (row: TranslationRow, nextValue: string) => {
        setDraftMessages((prev) => applyValueAtPath(prev ?? {}, row, nextValue));
        setSuccessMessage(null);
        setErrorMessage(null);
    };

    return (
        <div className="space-y-6 p-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-berkeley">Traduceri site</h1>
                <p className="text-sm text-gray-600">
                    Editează conținutul din fișierele JSON din <code className="rounded bg-gray-100 px-1 py-0.5">messages/</code>.
                    Limba principală este româna; folosește panoul din stânga ca referință pentru celelalte limbi.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-4 space-y-1">
                    <Label htmlFor="translations-page">Pagina</Label>
                    <Select
                        id="translations-page"
                        value={page}
                        onValueChange={handlePageChange}
                        disabled={loading || saving}
                    >
                        {PAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label} — {option.description}
                            </option>
                        ))}
                    </Select>
                </div>

                <div className="lg:col-span-4 space-y-1">
                    <Label htmlFor="translations-locale">Limba</Label>
                    <Select
                        id="translations-locale"
                        value={locale}
                        onValueChange={handleLocaleChange}
                        disabled={loading || saving}
                    >
                        {AVAILABLE_LOCALES.map((code) => (
                            <option key={code} value={code}>
                                {LOCALE_LABELS[code as Locale] ?? code.toUpperCase()}
                            </option>
                        ))}
                    </Select>
                </div>

                <div className="lg:col-span-4 flex items-end gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void loadTranslations()}
                        disabled={loading || saving}
                    >
                        Reîncarcă
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        disabled={!hasChanges || loading || saving}
                    >
                        Resetează modificările
                    </Button>
                </div>
            </div>

            {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {errorMessage}
                </div>
            )}

            {successMessage && (
                <div className="rounded-lg border border-jade/30 bg-jade/10 p-4 text-sm text-jade">
                    {successMessage}
                </div>
            )}

            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-700">Compară și traduce</h2>
                        <p className="text-xs text-gray-500">
                            Valorile din stânga sunt referința în limba română. Completează coloana din dreapta pentru limba selectată.
                        </p>
                    </div>
                    {locale !== DEFAULT_LOCALE && missingTranslations > 0 && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            {missingTranslations} câmpuri fără traducere
                        </span>
                    )}
                    {hasChanges && (
                        <span className="text-xs font-medium text-amber-600">Modificări nesalvate</span>
                    )}
                </div>

                {translationRows.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                        Nu există chei de tradus pentru combinația selectată.
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th className="w-1/2 px-4 py-3">Română (referință)</th>
                                        <th className="w-1/2 px-4 py-3">
                                            {locale === DEFAULT_LOCALE ? "Editare limba principală" : `Traducere ${localeName}`}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                    {translationRows.map((row) => {
                                        const isMissing =
                                            locale !== DEFAULT_LOCALE && row.translationValue.trim().length === 0;
                                        const referenceValue =
                                            row.translationValue ||
                                            (typeof row.baseValue === "string" ? row.baseValue : "");
                                        const textareaRows = computeTextareaRows(referenceValue);

                                        return (
                                            <tr
                                                key={row.id}
                                                className={cn(
                                                    "bg-white",
                                                    isMissing && "bg-amber-50/40",
                                                )}
                                            >
                                                <td className="align-top px-4 py-3">
                                                    <div className="space-y-1">
                                                        <p className="font-mono text-[11px] uppercase tracking-tight text-gray-400">
                                                            {row.id || "(rădăcină)"}
                                                        </p>
                                                        <p className="whitespace-pre-wrap text-sm text-gray-700">
                                                            {row.baseValue === null ? "—" : String(row.baseValue)}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="align-top px-4 py-3">
                                                    {row.valueType === "string" ? (
                                                        <Textarea
                                                            value={row.translationValue}
                                                            onChange={(event) => handleRowChange(row, event.target.value)}
                                                            placeholder="Introdu traducerea..."
                                                            rows={textareaRows}
                                                            className="font-mono text-sm"
                                                            spellCheck={false}
                                                            disabled={loading}
                                                        />
                                                    ) : (
                                                        <Input
                                                            value={row.translationValue}
                                                            onChange={(event) => handleRowChange(row, event.target.value)}
                                                            placeholder="Introdu valoarea..."
                                                            className="font-mono text-sm"
                                                            disabled={loading}
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" onClick={handleSave} disabled={!hasChanges || saving || loading}>
                        {saving ? "Se salvează..." : "Salvează traducerile"}
                    </Button>
                    <p className="text-xs text-gray-500">
                        Valorile sunt salvate direct în fișierele JSON din proiect. Verifică traducerile goale înainte de salvare.
                    </p>
                </div>
            </div>
        </div>
    );
}
