"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/lib/api";
import { cn } from "@/lib/utils";
import {
    fetchMaintenanceSettings,
    formatDateTimeInputValue,
    normalizeMaintenanceSettings,
    toIsoStringOrNull,
} from "@/lib/maintenance";
import type { MaintenanceSettings } from "@/types/settings";

type MaintenanceFormState = {
    enabled: boolean;
    message: string;
    resumeAtInput: string;
    allowPathsInput: string;
};

const EMPTY_STATE: MaintenanceFormState = {
    enabled: false,
    message: "",
    resumeAtInput: "",
    allowPathsInput: "",
};

const ToggleSwitch = ({
    checked,
    onToggle,
    ariaLabel,
}: {
    checked: boolean;
    onToggle: () => void;
    ariaLabel?: string;
}) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={(event) => {
            event.preventDefault();
            onToggle();
        }}
        className={cn(
            "relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full border border-transparent transition-all duration-300 ease-out",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-jade/70 focus-visible:ring-offset-2",
            checked ? "bg-gradient-to-r from-jade to-jadeLight shadow-inner" : "bg-gray-300",
        )}
    >
        <span
            className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-300 ease-out",
                checked ? "translate-x-6" : "translate-x-1",
            )}
        >
            <span
                className={cn(
                    "h-2.5 w-2.5 rounded-full transition-colors duration-300",
                    checked ? "bg-jade" : "bg-gray-400",
                )}
            />
        </span>
    </button>
);

const formatAuditTrail = (settings: MaintenanceSettings | null): string | null => {
    if (!settings?.updated_at) {
        return null;
    }

    try {
        const formattedDate = new Intl.DateTimeFormat("ro-RO", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(settings.updated_at));
        if (settings.updated_by) {
            return `${formattedDate} de ${settings.updated_by}`;
        }
        return formattedDate;
    } catch (error) {
        console.warn("Nu am putut formata data ultimei actualizări", error);
        return null;
    }
};

const MaintenanceSettingsPage = () => {
    const [form, setForm] = useState<MaintenanceFormState>({ ...EMPTY_STATE });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [snapshot, setSnapshot] = useState<MaintenanceSettings | null>(null);

    const auditTrail = useMemo(() => formatAuditTrail(snapshot), [snapshot]);

    const syncWithSettings = (settings: MaintenanceSettings | null) => {
        if (!settings) {
            setForm({ ...EMPTY_STATE });
            return;
        }

        const allowPaths = Array.isArray(settings.allow_paths)
            ? settings.allow_paths.filter((path): path is string => typeof path === "string" && path.trim().length > 0)
            : [];

        setForm({
            enabled: Boolean(settings.enabled),
            message: typeof settings.message === "string" ? settings.message : "",
            resumeAtInput: formatDateTimeInputValue(settings.resume_at),
            allowPathsInput: allowPaths.join("\n"),
        });
    };

    const loadSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            const normalized = await fetchMaintenanceSettings();
            setSnapshot(normalized);
            syncWithSettings(normalized);
        } catch (requestError) {
            console.error("Nu am putut încărca setările de mentenanță", requestError);
            setError("A apărut o eroare la preluarea setărilor de mentenanță. Încearcă din nou.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) {
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        const trimmedMessage = form.message.trim();
        const allowPaths = form.allowPathsInput
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        try {
            const payload = {
                enabled: form.enabled,
                message: trimmedMessage.length > 0 ? trimmedMessage : null,
                resume_at: toIsoStringOrNull(form.resumeAtInput),
                allow_paths: allowPaths.length > 0 ? allowPaths : null,
            };

            const response = await apiClient.updateMaintenanceSettings(payload);
            const normalized = normalizeMaintenanceSettings(response?.data);
            setSnapshot(normalized);
            syncWithSettings(normalized);
            setSuccess(
                normalized?.enabled
                    ? "Modul de mentenanță este activ. Vizitatorii vor vedea pagina dedicată."
                    : "Modul de mentenanță a fost dezactivat. Site-ul este disponibil public.",
            );
        } catch (requestError) {
            console.error("Nu am putut salva setările de mentenanță", requestError);
            setError("Salvarea a eșuat. Te rugăm să verifici câmpurile și să încerci din nou.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                    <p className="text-sm font-medium">Se încarcă setările de mentenanță...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6">
            <header className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-berkeley/10 text-berkeley">
                        <CalendarClock className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Modul de mentenanță</h1>
                        <p className="text-sm text-gray-500">
                            Controlează pagina vizibilă pentru vizitatori atunci când platforma este indisponibilă temporar.
                        </p>
                    </div>
                </div>
                {auditTrail ? (
                    <p className="text-xs text-gray-400">Ultima actualizare: {auditTrail}</p>
                ) : null}
            </header>

            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            {success ? (
                <div className="rounded-lg border border-jade/30 bg-jade/10 p-4 text-sm text-jade-900">
                    {success}
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-8">
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Activare mod mentenanță</p>
                                <p className="text-sm text-gray-500">
                                    Când este activ, toate paginile publice vor afișa mesajul de mentenanță.
                                </p>
                            </div>
                            <ToggleSwitch
                                checked={form.enabled}
                                onToggle={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                                ariaLabel="Activează sau dezactivează modul de mentenanță"
                            />
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="maintenance-message" className="text-sm font-medium text-gray-900">
                                    Mesaj principal
                                </label>
                                <Textarea
                                    id="maintenance-message"
                                    placeholder="Descrie pe scurt motivul mentenanței și ce urmează."
                                    value={form.message}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, message: event.target.value }))
                                    }
                                    rows={6}
                                />
                                <p className="text-xs text-gray-400">
                                    Mesajul apare sub titlul paginii de mentenanță și poate include detalii suplimentare.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="maintenance-resume" className="text-sm font-medium text-gray-900">
                                        Estimare reluare serviciu
                                    </label>
                                    <Input
                                        id="maintenance-resume"
                                        type="datetime-local"
                                        value={form.resumeAtInput}
                                        onChange={(event) =>
                                            setForm((prev) => ({ ...prev, resumeAtInput: event.target.value }))
                                        }
                                    />
                                    <p className="text-xs text-gray-400">
                                        Acest câmp este opțional și ajută clienții să știe când să revină.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="maintenance-allow-paths" className="text-sm font-medium text-gray-900">
                                        Rute accesibile în mentenanță
                                    </label>
                                    <Textarea
                                        id="maintenance-allow-paths"
                                        placeholder="Exemplu: /contact\n/blog"
                                        value={form.allowPathsInput}
                                        onChange={(event) =>
                                            setForm((prev) => ({ ...prev, allowPathsInput: event.target.value }))
                                        }
                                        rows={4}
                                    />
                                    <p className="text-xs text-gray-400">
                                        Un URL relativ per linie. Aceste pagini vor rămâne accesibile chiar dacă modul de
                                        mentenanță este activ.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                        <ShieldAlert className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        <div className="space-y-2 text-sm">
                            <p className="font-semibold">Recomandări înainte de activare</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>anunță echipa de suport pentru a gestiona solicitările urgente;</li>
                                <li>adaugă o rută permisă pentru formularul de contact dacă dorești să rămână accesibil;</li>
                                <li>verifică în prealabil pagina de mentenanță pentru eventuale actualizări de conținut.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <div className="flex items-center justify-end gap-3">
                    <Button type="button" variant="outline" onClick={loadSettings} disabled={saving}>
                        Reîncarcă
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                Salvăm modificările...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                                Salvează setările
                            </span>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default MaintenanceSettingsPage;
