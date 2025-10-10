import { useCallback, useEffect, useMemo, useState } from "react";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const LANGUAGE_LABELS: Record<string, string> = {
    ro: "Română",
    en: "Engleză",
    it: "Italiană",
    es: "Spaniolă",
    fr: "Franceză",
    de: "Germană",
};

type TranslationField = {
    name: string;
    label: string;
    type?: "text" | "textarea";
    placeholder?: string;
    description?: string;
    rows?: number;
};

type TranslationValues = Record<string, string>;

type TranslationFetchResult = Record<
    string,
    Partial<Record<string, string | null | undefined>> | undefined
>;

type TranslationModalProps = {
    open: boolean;
    onClose: () => void;
    entityLabel: string;
    baseLanguageLabel?: string;
    baseValues: Partial<Record<string, string | null | undefined>>;
    fields: TranslationField[];
    loadTranslations: () => Promise<TranslationFetchResult>;
    onSave: (lang: string, values: TranslationValues) => Promise<void>;
    onDelete: (lang: string) => Promise<void>;
    targetLanguages?: readonly string[];
};

type FeedbackState = {
    type: "success" | "error";
    message: string;
};

const normalizeLanguage = (value: string): string => value.trim().toLowerCase();

const TranslationModal = ({
    open,
    onClose,
    entityLabel,
    baseLanguageLabel,
    baseValues,
    fields,
    loadTranslations,
    onSave,
    onDelete,
    targetLanguages,
}: TranslationModalProps) => {
    const defaultLanguage = DEFAULT_LOCALE;
    const normalizedDefaultLanguage = normalizeLanguage(defaultLanguage);
    const languages = useMemo(() => {
        const codes = (targetLanguages ?? AVAILABLE_LOCALES) as readonly string[];
        const seen = new Set<string>();
        return codes
            .map((code) => code.trim())
            .filter((code) => code.length > 0)
            .map((code) => ({ value: code, normalized: normalizeLanguage(code) }))
            .filter((entry) => entry.normalized !== normalizedDefaultLanguage)
            .filter((entry) => {
                if (seen.has(entry.normalized)) {
                    return false;
                }
                seen.add(entry.normalized);
                return true;
            });
    }, [normalizedDefaultLanguage, targetLanguages]);

    const baseLabel =
        baseLanguageLabel ??
        LANGUAGE_LABELS[normalizedDefaultLanguage] ??
        defaultLanguage.toUpperCase();

    const createEmptyValues = useCallback((): Record<string, string> => {
        const initial: Record<string, string> = {};
        fields.forEach((field) => {
            initial[field.name] = "";
        });
        return initial;
    }, [fields]);

    const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>(() => ({}));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<Record<string, boolean>>({});
    const [deleting, setDeleting] = useState<Record<string, boolean>>({});
    const [feedback, setFeedback] = useState<Record<string, FeedbackState | null>>({});

    const buildInitialState = useCallback(
        (data: TranslationFetchResult): Record<string, Record<string, string>> => {
            const normalizedData = Object.entries(data ?? {}).reduce<
                Record<string, Partial<Record<string, string | null | undefined>>>
            >((acc, [lang, values]) => {
                if (typeof lang !== "string") {
                    return acc;
                }
                const normalizedLang = normalizeLanguage(lang);
                if (!normalizedLang) {
                    return acc;
                }
                acc[normalizedLang] = values ?? {};
                return acc;
            }, {});

            return languages.reduce<Record<string, Record<string, string>>>((acc, entry) => {
                const current = createEmptyValues();
                const source = normalizedData[entry.normalized];
                if (source) {
                    fields.forEach((field) => {
                        const raw = source[field.name];
                        if (typeof raw === "string") {
                            current[field.name] = raw;
                            return;
                        }
                        if (typeof raw === "number" || typeof raw === "boolean") {
                            current[field.name] = String(raw);
                            return;
                        }
                        current[field.name] = "";
                    });
                }
                acc[entry.normalized] = current;
                return acc;
            }, {});
        },
        [createEmptyValues, fields, languages],
    );

    const fetchTranslations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await loadTranslations();
            setFormValues(buildInitialState(response ?? {}));
            setError(null);
        } catch (fetchError) {
            console.error("Nu am putut încărca traducerile", fetchError);
            setFormValues(buildInitialState({}));
            setError("Nu am putut încărca traducerile. Încearcă din nou.");
        } finally {
            setLoading(false);
        }
    }, [buildInitialState, loadTranslations]);

    useEffect(() => {
        if (!open) {
            setFormValues({});
            setSaving({});
            setDeleting({});
            setFeedback({});
            setError(null);
            setLoading(false);
            return;
        }

        void fetchTranslations();
    }, [fetchTranslations, open]);

    const handleFieldChange = useCallback(
        (lang: string, fieldName: string, value: string) => {
            setFormValues((prev) => {
                const current = prev[lang] ? { ...prev[lang] } : createEmptyValues();
                current[fieldName] = value;
                return {
                    ...prev,
                    [lang]: current,
                };
            });
            setFeedback((prev) => ({
                ...prev,
                [lang]: null,
            }));
        },
        [createEmptyValues],
    );

    const handleSave = useCallback(
        async (lang: { value: string; normalized: string }) => {
            const values = formValues[lang.normalized] ?? createEmptyValues();
            setSaving((prev) => ({ ...prev, [lang.normalized]: true }));
            setFeedback((prev) => ({ ...prev, [lang.normalized]: null }));
            try {
                await onSave(lang.value, values);
                setFeedback((prev) => ({
                    ...prev,
                    [lang.normalized]: {
                        type: "success",
                        message: "Traducere salvată cu succes.",
                    },
                }));
            } catch (saveError) {
                console.error("Nu am putut salva traducerea", saveError);
                setFeedback((prev) => ({
                    ...prev,
                    [lang.normalized]: {
                        type: "error",
                        message: "Nu am putut salva traducerea. Încearcă din nou.",
                    },
                }));
            } finally {
                setSaving((prev) => ({ ...prev, [lang.normalized]: false }));
            }
        },
        [createEmptyValues, formValues, onSave],
    );

    const handleDelete = useCallback(
        async (lang: { value: string; normalized: string }) => {
            const confirmed = window.confirm(
                `Ștergi traducerea pentru limba ${LANGUAGE_LABELS[lang.normalized] ?? lang.value}?`,
            );
            if (!confirmed) {
                return;
            }

            setDeleting((prev) => ({ ...prev, [lang.normalized]: true }));
            setFeedback((prev) => ({ ...prev, [lang.normalized]: null }));
            try {
                await onDelete(lang.value);
                setFormValues((prev) => ({
                    ...prev,
                    [lang.normalized]: createEmptyValues(),
                }));
                setFeedback((prev) => ({
                    ...prev,
                    [lang.normalized]: {
                        type: "success",
                        message: "Traducerea a fost ștearsă.",
                    },
                }));
            } catch (deleteError) {
                console.error("Nu am putut șterge traducerea", deleteError);
                setFeedback((prev) => ({
                    ...prev,
                    [lang.normalized]: {
                        type: "error",
                        message: "Nu am putut șterge traducerea. Încearcă din nou.",
                    },
                }));
            } finally {
                setDeleting((prev) => ({ ...prev, [lang.normalized]: false }));
            }
        },
        [createEmptyValues, onDelete],
    );

    return (
        <Popup open={open} onClose={onClose} className="max-w-4xl">
            <div className="space-y-6">
                <header className="space-y-2">
                    <h2 className="text-2xl font-semibold text-gray-900">
                        Traduce {entityLabel}
                    </h2>
                    <p className="text-sm text-gray-600">
                        Compară conținutul de bază cu versiunile traduse și salvează actualizările pentru fiecare
                        limbă.
                    </p>
                </header>

                <section className="space-y-4 rounded-lg border border-gray-200 p-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Variantă sursă ({baseLabel})
                    </h3>
                    <div className="grid gap-4">
                        {fields.map((field) => {
                            const rawValue = baseValues[field.name];
                            const value =
                                typeof rawValue === "string"
                                    ? rawValue
                                    : typeof rawValue === "number"
                                        ? String(rawValue)
                                        : "";
                            return (
                                <div key={`base-${field.name}`} className="space-y-1">
                                    <p className="text-sm font-medium text-gray-700">{field.label}</p>
                                    <div className="whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                                        {value.length > 0 ? value : "—"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {languages.length === 0 ? (
                    <p className="text-sm text-gray-600">
                        Nu sunt configurate alte limbi pentru traducere.
                    </p>
                ) : (
                    <section className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Traduceri disponibile</h3>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void fetchTranslations()}
                                    disabled={loading}
                                    className="gap-2"
                                >
                                    Reîncarcă
                                </Button>
                                <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                                    Închide
                                </Button>
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        {loading ? (
                            <p className="text-sm text-gray-500">Se încarcă traducerile...</p>
                        ) : (
                            <div className="space-y-6">
                                {languages.map((language) => {
                                    const values = formValues[language.normalized] ?? createEmptyValues();
                                    const languageLabel =
                                        LANGUAGE_LABELS[language.normalized] ?? language.value.toUpperCase();
                                    const state = feedback[language.normalized];
                                    const isSaving = Boolean(saving[language.normalized]);
                                    const isDeleting = Boolean(deleting[language.normalized]);

                                    return (
                                        <div
                                            key={`translation-${language.normalized}`}
                                            className="space-y-4 rounded-lg border border-gray-200 p-4"
                                        >
                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                <h4 className="text-base font-semibold text-gray-900">
                                                    {languageLabel}
                                                </h4>
                                                {state && (
                                                    <p
                                                        className={
                                                            state.type === "success"
                                                                ? "text-sm text-green-600"
                                                                : "text-sm text-red-600"
                                                        }
                                                    >
                                                        {state.message}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="grid gap-4">
                                                {fields.map((field) => (
                                                    <div key={`${language.normalized}-${field.name}`} className="space-y-1">
                                                        <label className="text-sm font-medium text-gray-700">
                                                            {field.label}
                                                        </label>
                                                        {field.type === "textarea" ? (
                                                            <Textarea
                                                                value={values[field.name] ?? ""}
                                                                onChange={(event) =>
                                                                    handleFieldChange(
                                                                        language.normalized,
                                                                        field.name,
                                                                        event.target.value,
                                                                    )
                                                                }
                                                                placeholder={field.placeholder}
                                                                rows={field.rows ?? 4}
                                                            />
                                                        ) : (
                                                            <Input
                                                                value={values[field.name] ?? ""}
                                                                onChange={(event) =>
                                                                    handleFieldChange(
                                                                        language.normalized,
                                                                        field.name,
                                                                        event.target.value,
                                                                    )
                                                                }
                                                                placeholder={field.placeholder}
                                                            />
                                                        )}
                                                        {field.description && (
                                                            <p className="text-xs text-gray-500">{field.description}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => void handleSave(language)}
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? "Se salvează..." : "Salvează"}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="danger"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => void handleDelete(language)}
                                                    disabled={isDeleting}
                                                >
                                                    {isDeleting ? "Se șterge..." : "Șterge traducerea"}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </Popup>
    );
};

export default TranslationModal;
