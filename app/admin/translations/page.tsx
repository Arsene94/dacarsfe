"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
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

type TranslationResponse = {
    page: PageKey;
    locale: Locale;
    messages: Record<string, unknown>;
    baseMessages: Record<string, unknown>;
};

const formatJson = (value: Record<string, unknown>): string => `${JSON.stringify(value, null, 2)}\n`;

const isPageKey = (value: string): value is PageKey =>
    PAGE_OPTIONS.some((option) => option.value === value);

const isLocale = (value: string): value is Locale =>
    (AVAILABLE_LOCALES as readonly string[]).includes(value);

export default function AdminTranslationsPage() {
    const [page, setPage] = useState<PageKey>("layout");
    const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
    const [baseContent, setBaseContent] = useState<string>("");
    const [draftContent, setDraftContent] = useState<string>("");
    const [initialContent, setInitialContent] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const localeName = useMemo(() => LOCALE_LABELS[locale] ?? locale.toUpperCase(), [locale]);

    const hasChanges = useMemo(() => draftContent !== initialContent, [draftContent, initialContent]);

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
            const baseFormatted = formatJson(data.baseMessages);
            const draftFormatted = formatJson(data.messages);

            setBaseContent(baseFormatted);
            setDraftContent(draftFormatted);
            setInitialContent(draftFormatted);
        } catch (error) {
            console.error("Failed to load translations", error);
            setBaseContent("");
            setDraftContent("");
            setInitialContent("");
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
        setDraftContent(initialContent);
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

        let parsed: Record<string, unknown>;

        try {
            parsed = JSON.parse(draftContent) as Record<string, unknown>;
        } catch (error) {
            setSaving(false);
            setErrorMessage(
                error instanceof Error
                    ? `JSON invalid: ${error.message}`
                    : "Conținutul introdus nu este un JSON valid.",
            );
            return;
        }

        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
            setSaving(false);
            setErrorMessage("Structura trebuie să fie un obiect JSON (chei și valori).");
            return;
        }

        try {
            const response = await fetch("/api/admin/translations", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ page, locale, messages: parsed }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                throw new Error(payload?.error || "Nu am putut salva traducerile.");
            }

            const data = (await response.json()) as TranslationResponse;
            const baseFormatted = formatJson(data.baseMessages);
            const savedFormatted = formatJson(data.messages);

            setBaseContent(baseFormatted);
            setDraftContent(savedFormatted);
            setInitialContent(savedFormatted);
            setSuccessMessage("Traducerile au fost salvate cu succes.");
        } catch (error) {
            console.error("Failed to save translations", error);
            setErrorMessage(error instanceof Error ? error.message : "Nu am putut salva traducerile.");
        } finally {
            setSaving(false);
        }
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

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">Referință Română</h2>
                        <span className="text-xs text-gray-500">Doar citire</span>
                    </div>
                    <Textarea
                        value={baseContent}
                        readOnly
                        rows={28}
                        className="font-mono text-sm"
                        spellCheck={false}
                        disabled={loading}
                    />
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-700">
                                {locale === DEFAULT_LOCALE ? "Traducere principală" : `Traducere ${localeName}`}
                            </h2>
                            {locale !== DEFAULT_LOCALE && (
                                <p className="text-xs text-gray-500">
                                    Actualizează doar valorile din JSON; cheile trebuie să rămână identice cu versiunea în română.
                                </p>
                            )}
                        </div>
                        {hasChanges && (
                            <span className="text-xs font-medium text-amber-600">Modificări nesalvate</span>
                        )}
                    </div>
                    <Textarea
                        value={draftContent}
                        onChange={(event) => setDraftContent(event.target.value)}
                        rows={28}
                        className="font-mono text-sm"
                        spellCheck={false}
                        disabled={loading}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={!hasChanges || saving || loading}
                        >
                            {saving ? "Se salvează..." : "Salvează traducerile"}
                        </Button>
                        <p className="text-xs text-gray-500">
                            Asigură-te că JSON-ul este valid înainte de salvare. Formatul este rearanjat automat după salvare.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
