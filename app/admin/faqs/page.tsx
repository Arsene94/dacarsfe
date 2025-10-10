"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import type { FaqCategory, FaqPayload, FaqStatus } from "@/types/faq";

const statusLabels: Record<FaqStatus, string> = {
    published: "Publicat",
    pending: "În așteptare",
    unavailable: "Indisponibil",
};

const statusOptions: Array<{ value: FaqStatus; label: string }> = [
    { value: "published", label: statusLabels.published },
    { value: "pending", label: statusLabels.pending },
    { value: "unavailable", label: statusLabels.unavailable },
];

type CategoryOption = {
    id: string;
    label: string;
    status: FaqStatus | null;
    order: number;
};

type FaqFormState = {
    question: string;
    answer: string;
    categoryId: string;
    status: FaqStatus;
};

const DEFAULT_STATUS: FaqStatus = "published";

const parseOrderValue = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return Number.MAX_SAFE_INTEGER;
};

const AdminFaqPage = () => {
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [categoryError, setCategoryError] = useState<string | null>(null);
    const [formState, setFormState] = useState<FaqFormState>({
        question: "",
        answer: "",
        categoryId: "",
        status: DEFAULT_STATUS,
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const formattedCategoryOptions = useMemo(() => {
        return categories.map((category) => ({
            ...category,
            label:
                category.status && category.status !== "published"
                    ? `${category.label} (${statusLabels[category.status]})`
                    : category.label,
        }));
    }, [categories]);

    const loadCategories = useCallback(async () => {
        setLoadingCategories(true);
        setCategoryError(null);
        try {
            const response = await apiClient.getFaqCategories({ limit: 200 });
            const rawCategories = extractList<FaqCategory>(response);
            const mapped = rawCategories
                .map((category): CategoryOption | null => {
                    if (!category) {
                        return null;
                    }

                    const idCandidate =
                        typeof category.id === "number" && Number.isFinite(category.id)
                            ? category.id.toString()
                            : typeof (category as { id?: string }).id === "string"
                                ? ((category as { id?: string }).id ?? "").trim()
                                : "";

                    const name = typeof category.name === "string" ? category.name.trim() : "";

                    if (idCandidate.length === 0 || name.length === 0) {
                        return null;
                    }

                    const status =
                        typeof category.status === "string" && category.status.trim().length > 0
                            ? (category.status as FaqStatus)
                            : null;

                    return {
                        id: idCandidate,
                        label: name,
                        status,
                        order: parseOrderValue(category.order),
                    } satisfies CategoryOption;
                })
                .filter((item): item is CategoryOption => item !== null)
                .sort((a, b) => {
                    if (a.order !== b.order) {
                        return a.order - b.order;
                    }
                    return a.label.localeCompare(b.label, "ro");
                });

            setCategories(mapped);
            setFormState((previous) => {
                if (previous.categoryId && mapped.some((item) => item.id === previous.categoryId)) {
                    return previous;
                }

                return {
                    ...previous,
                    categoryId: mapped.length > 0 ? mapped[0].id : "",
                };
            });
        } catch (error) {
            console.error("Nu am putut încărca categoriile FAQ", error);
            setCategories([]);
            setCategoryError("Nu am putut încărca categoriile. Încearcă din nou.");
            setFormState((previous) => ({ ...previous, categoryId: "" }));
        } finally {
            setLoadingCategories(false);
        }
    }, []);

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    const updateFormField = useCallback(<Key extends keyof FaqFormState>(key: Key, value: FaqFormState[Key]) => {
        setFormState((previous) => ({
            ...previous,
            [key]: value,
        }));
        setFormError(null);
        setFormSuccess(null);
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) {
            return;
        }

        const trimmedQuestion = formState.question.trim();
        const trimmedAnswer = formState.answer.trim();

        if (trimmedQuestion.length === 0) {
            setFormError("Introdu o întrebare pentru FAQ.");
            return;
        }

        if (trimmedAnswer.length === 0) {
            setFormError("Introdu un răspuns complet pentru FAQ.");
            return;
        }

        if (formState.categoryId.length === 0) {
            setFormError("Selectează o categorie pentru această întrebare.");
            return;
        }

        const categoryId = Number(formState.categoryId);
        if (!Number.isFinite(categoryId)) {
            setFormError("Categoria selectată este invalidă.");
            return;
        }

        setSaving(true);
        setFormError(null);
        setFormSuccess(null);

        const payload: FaqPayload = {
            question: trimmedQuestion,
            answer: trimmedAnswer,
            category_id: categoryId,
            status: formState.status,
        };

        try {
            await apiClient.createFaq(payload);
            setFormSuccess("FAQ-ul a fost adăugat cu succes.");
            setFormState((previous) => ({
                ...previous,
                question: "",
                answer: "",
            }));
        } catch (error) {
            console.error("Nu am putut salva FAQ-ul", error);
            setFormError("Nu am putut salva întrebarea. Verifică datele și încearcă din nou.");
        } finally {
            setSaving(false);
        }
    };

    const isSubmitDisabled = saving || categories.length === 0;

    return (
        <div className="space-y-8 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Administrare FAQ</h1>
                    <p className="text-sm text-gray-600">
                        Adaugă întrebări frecvente pentru baza de cunoștințe publică DaCars. Statusul „Publicat” le afișează
                        imediat pe site.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    className="inline-flex items-center gap-2"
                    onClick={() => void loadCategories()}
                    disabled={loadingCategories}
                >
                    {loadingCategories ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCcw className="h-4 w-4" />
                    )}
                    Reîncarcă categorii
                </Button>
            </div>

            <section className="max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="category">Categorie</Label>
                        <Select
                            id="category"
                            value={formState.categoryId}
                            onValueChange={(value) => updateFormField("categoryId", value)}
                            disabled={loadingCategories || categories.length === 0}
                            placeholder={loadingCategories ? "Se încarcă categoriile..." : "Selectează categoria"}
                        >
                            {formattedCategoryOptions.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.label}
                                </option>
                            ))}
                        </Select>
                        {categoryError && <p className="text-sm text-red-600">{categoryError}</p>}
                        {!loadingCategories && categories.length === 0 && !categoryError && (
                            <p className="text-sm text-gray-500">
                                Nu există încă nicio categorie de FAQ. Creează o categorie nouă din backend înainte de a adăuga
                                întrebări.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="question">Întrebare</Label>
                        <Input
                            id="question"
                            value={formState.question}
                            onChange={(event) => updateFormField("question", event.target.value)}
                            placeholder="Introdu întrebarea exact așa cum trebuie să apară public"
                            disabled={saving}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="answer">Răspuns</Label>
                        <Textarea
                            id="answer"
                            value={formState.answer}
                            onChange={(event) => updateFormField("answer", event.target.value)}
                            placeholder="Explică detaliat răspunsul pentru clienți"
                            rows={6}
                            disabled={saving}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            id="status"
                            value={formState.status}
                            onValueChange={(value) => updateFormField("status", value as FaqStatus)}
                            disabled={saving}
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                        <p className="text-sm text-gray-500">
                            FAQ-urile marcate ca „Publicat” apar imediat în site, iar cele „În așteptare” rămân ascunse până la
                            revizuire.
                        </p>
                    </div>

                    {formError && <p className="text-sm text-red-600">{formError}</p>}
                    {formSuccess && <p className="text-sm text-green-600">{formSuccess}</p>}

                    <div className="flex flex-wrap gap-3">
                        <Button type="submit" className="inline-flex items-center gap-2" disabled={isSubmitDisabled}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Salvează FAQ
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setFormState((previous) => ({
                                    ...previous,
                                    question: "",
                                    answer: "",
                                }));
                                setFormError(null);
                                setFormSuccess(null);
                            }}
                            disabled={saving}
                        >
                            Golește câmpurile
                        </Button>
                    </div>
                </form>
            </section>
        </div>
    );
};

export default AdminFaqPage;
