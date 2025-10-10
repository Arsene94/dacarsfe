"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import CKEditor from "@/lib/vendors/ckeditor/react";
import ClassicEditor from "@/lib/vendors/ckeditor/classic-editor";
import apiClient from "@/lib/api";
import { extractItem, extractList } from "@/lib/apiResponse";
import type {
    FaqCategory,
    FaqCategoryPayload,
    FaqPayload,
    FaqStatus,
} from "@/types/faq";
import type { ClassicEditorInstance } from "@/lib/vendors/ckeditor/loader";

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
    status: FaqStatus;
    order: number;
};

type NormalizedFaqRecord = {
    id: number;
    question: string;
    answer: string;
    status: FaqStatus;
    categoryId: number;
    categoryName: string;
    createdAt: string | null;
    updatedAt: string | null;
};

type NormalizedCategory = {
    id: number;
    name: string;
    description: string;
    status: FaqStatus;
    order: number | null;
    faqs: NormalizedFaqRecord[];
    faqCount: number;
    createdAt: string | null;
    updatedAt: string | null;
};

type CategoryFormState = {
    id: number | null;
    name: string;
    description: string;
    order: string;
    status: FaqStatus;
};

type FaqFormState = {
    question: string;
    answer: string;
    categoryId: string;
    status: FaqStatus;
};

const DEFAULT_STATUS: FaqStatus = "published";

const answerEditorConfig: Record<string, unknown> = {
    toolbar: [
        "heading",
        "|",
        "bold",
        "italic",
        "link",
        "bulletedList",
        "numberedList",
        "blockQuote",
        "|",
        "undo",
        "redo",
    ],
    link: {
        addTargetToExternalLinks: true,
    },
    placeholder: "Explică detaliat răspunsul pentru clienți",
    shouldNotGroupWhenFull: true,
};

const createEmptyCategoryForm = (): CategoryFormState => ({
    id: null,
    name: "",
    description: "",
    order: "",
    status: DEFAULT_STATUS,
});

const isFaqStatus = (value: unknown): value is FaqStatus =>
    value === "published" || value === "pending" || value === "unavailable";

const normalizeOrder = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return null;
};

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

const extractPlainText = (value: string): string =>
    value
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;|&#160;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

const AdminFaqPage = () => {
    const [categoryRecords, setCategoryRecords] = useState<NormalizedCategory[]>([]);
    const [faqRecords, setFaqRecords] = useState<NormalizedFaqRecord[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [categoryError, setCategoryError] = useState<string | null>(null);
    const [categoryManagementError, setCategoryManagementError] = useState<string | null>(null);
    const [categoryFormState, setCategoryFormState] = useState<CategoryFormState>(
        () => createEmptyCategoryForm(),
    );
    const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
    const [categoryFormSuccess, setCategoryFormSuccess] = useState<string | null>(null);
    const [categorySaving, setCategorySaving] = useState(false);
    const [categoryDeletingId, setCategoryDeletingId] = useState<number | null>(null);
    const [formState, setFormState] = useState<FaqFormState>({
        question: "",
        answer: "",
        categoryId: "",
        status: DEFAULT_STATUS,
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [editingFaqId, setEditingFaqId] = useState<number | null>(null);

    const editingFaqIdRef = useRef<number | null>(null);

    useEffect(() => {
        editingFaqIdRef.current = editingFaqId;
    }, [editingFaqId]);

    const dateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat("ro-RO", {
                dateStyle: "medium",
                timeStyle: "short",
            }),
        [],
    );

    const categoryOptions = useMemo(() => {
        return categoryRecords.map((category) => ({
            id: category.id.toString(),
            label: category.name,
            status: category.status,
            order:
                typeof category.order === "number" && Number.isFinite(category.order)
                    ? category.order
                    : Number.MAX_SAFE_INTEGER,
        }));
    }, [categoryRecords]);

    const formattedCategoryOptions = useMemo(() => {
        return categoryOptions.map((category) => ({
            ...category,
            label:
                category.status !== "published"
                    ? `${category.label} (${statusLabels[category.status]})`
                    : category.label,
        }));
    }, [categoryOptions]);

    const isEditingCategory = categoryFormState.id !== null;

    const resetCategoryForm = useCallback(() => {
        setCategoryFormState(createEmptyCategoryForm());
        setCategoryFormError(null);
        setCategoryFormSuccess(null);
        setCategoryManagementError(null);
    }, []);

    const updateCategoryFormField = useCallback(
        <Key extends keyof CategoryFormState>(key: Key, value: CategoryFormState[Key]) => {
            setCategoryFormState((previous) => ({
                ...previous,
                [key]: value,
            }));
            setCategoryFormError(null);
            setCategoryFormSuccess(null);
            setCategoryManagementError(null);
        },
        [],
    );

    const loadCategories = useCallback(
        async (preferredCategoryId?: string) => {
            setLoadingCategories(true);
            setCategoryError(null);
            setCategoryManagementError(null);
            try {
                const response = await apiClient.getFaqCategories({ limit: 200, include: "faqs" });
                const rawCategories = extractList<FaqCategory>(response);
                const mapped = rawCategories
                    .map((category): NormalizedCategory | null => {
                        if (!category) {
                            return null;
                        }

                        const idValue =
                            typeof category.id === "number" && Number.isFinite(category.id)
                                ? category.id
                                : Number(category.id);

                        if (!Number.isFinite(idValue)) {
                            return null;
                        }

                        const name = typeof category.name === "string" ? category.name.trim() : "";

                        if (name.length === 0) {
                            return null;
                        }

                        const status = isFaqStatus(category.status) ? category.status : "pending";
                        const description =
                            typeof category.description === "string"
                                ? category.description.trim()
                                : "";
                        const orderValue = normalizeOrder(category.order);
                        const normalizedFaqs = Array.isArray(category.faqs)
                            ? category.faqs
                                  .map((faq): NormalizedFaqRecord | null => {
                                      if (!faq) {
                                          return null;
                                      }

                                      const faqId =
                                          typeof faq.id === "number" && Number.isFinite(faq.id)
                                              ? faq.id
                                              : Number(faq.id);

                                      if (!Number.isFinite(faqId)) {
                                          return null;
                                      }

                                      const question =
                                          typeof faq.question === "string" ? faq.question.trim() : "";

                                      if (question.length === 0) {
                                          return null;
                                      }

                                      const faqStatus = isFaqStatus(faq.status) ? faq.status : "pending";
                                      const answerValue =
                                          typeof faq.answer === "string" ? faq.answer.trim() : "";
                                      const createdAt =
                                          typeof faq.created_at === "string" ? faq.created_at : null;
                                      const updatedAt =
                                          typeof faq.updated_at === "string"
                                              ? faq.updated_at
                                              : createdAt;

                                      return {
                                          id: Number(faqId),
                                          question,
                                          answer: answerValue,
                                          status: faqStatus,
                                          categoryId: Number(idValue),
                                          categoryName: name,
                                          createdAt,
                                          updatedAt,
                                      } satisfies NormalizedFaqRecord;
                                  })
                                  .filter((item): item is NormalizedFaqRecord => item !== null)
                                  .sort((a, b) => a.question.localeCompare(b.question, "ro"))
                            : [];
                        const faqCount = normalizedFaqs.length;
                        const createdAt =
                            typeof category.created_at === "string" ? category.created_at : null;
                        const updatedAt =
                            typeof category.updated_at === "string" ? category.updated_at : null;

                        return {
                            id: Number(idValue),
                            name,
                            description,
                            status,
                            order: orderValue,
                            faqs: normalizedFaqs,
                            faqCount,
                            createdAt,
                            updatedAt,
                        } satisfies NormalizedCategory;
                    })
                    .filter((item): item is NormalizedCategory => item !== null)
                    .sort((a, b) => {
                        const orderA =
                            typeof a.order === "number" && Number.isFinite(a.order)
                                ? a.order
                                : Number.MAX_SAFE_INTEGER;
                        const orderB =
                            typeof b.order === "number" && Number.isFinite(b.order)
                                ? b.order
                                : Number.MAX_SAFE_INTEGER;

                        if (orderA !== orderB) {
                            return orderA - orderB;
                        }
                        return a.name.localeCompare(b.name, "ro");
                    });

                setCategoryRecords(mapped);

                const flattenedFaqs = mapped
                    .flatMap((category) => category.faqs)
                    .sort((a, b) => {
                        if (a.updatedAt && b.updatedAt) {
                            const aTime = Date.parse(a.updatedAt);
                            const bTime = Date.parse(b.updatedAt);

                            if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
                                return bTime - aTime;
                            }
                        }

                        if (a.createdAt && b.createdAt) {
                            const aTime = Date.parse(a.createdAt);
                            const bTime = Date.parse(b.createdAt);

                            if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
                                return bTime - aTime;
                            }
                        }

                        return a.question.localeCompare(b.question, "ro");
                    });

                setFaqRecords(flattenedFaqs);

                setFormState((previous) => {
                    if (editingFaqIdRef.current === null) {
                        return previous;
                    }

                    const activeFaq = flattenedFaqs.find(
                        (faq) => faq.id === editingFaqIdRef.current,
                    );

                    if (!activeFaq) {
                        return previous;
                    }

                    return {
                        ...previous,
                        question: activeFaq.question,
                        answer: activeFaq.answer,
                        categoryId: activeFaq.categoryId.toString(),
                        status: activeFaq.status,
                    } satisfies FaqFormState;
                });

                if (
                    editingFaqIdRef.current !== null &&
                    !flattenedFaqs.some((faq) => faq.id === editingFaqIdRef.current)
                ) {
                    editingFaqIdRef.current = null;
                    setEditingFaqId(null);
                }

                setFormState((previous) => {
                    const desiredCategoryId = preferredCategoryId ?? previous.categoryId;
                    if (
                        desiredCategoryId &&
                        mapped.some((item) => item.id.toString() === desiredCategoryId)
                    ) {
                        if (previous.categoryId === desiredCategoryId) {
                            return previous;
                        }
                        return {
                            ...previous,
                            categoryId: desiredCategoryId,
                        };
                    }

                    return {
                        ...previous,
                        categoryId: mapped.length > 0 ? mapped[0].id.toString() : "",
                    };
                });

                setCategoryFormState((previous) => {
                    if (previous.id == null) {
                        return previous;
                    }

                    const match = mapped.find((item) => item.id === previous.id);
                    if (!match) {
                        return createEmptyCategoryForm();
                    }

                    return {
                        ...previous,
                        name: match.name,
                        description: match.description,
                        order:
                            typeof match.order === "number" && Number.isFinite(match.order)
                                ? match.order.toString()
                                : "",
                        status: match.status,
                    } satisfies CategoryFormState;
                });
            } catch (error) {
                console.error("Nu am putut încărca categoriile FAQ", error);
                setCategoryRecords([]);
                setFaqRecords([]);
                const message = "Nu am putut încărca categoriile. Încearcă din nou.";
                setCategoryError(message);
                setCategoryManagementError(message);
                setFormState((previous) => ({ ...previous, categoryId: "" }));
                resetCategoryForm();
            } finally {
                setLoadingCategories(false);
            }
        },
        [resetCategoryForm],
    );

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

    const handleAnswerChange = useCallback(
        (_: unknown, editor: ClassicEditorInstance) => {
            const data = editor.getData();
            updateFormField("answer", typeof data === "string" ? data : String(data));
        },
        [updateFormField],
    );

    const formatTimestamp = useCallback(
        (value: string | null) => {
            if (!value) {
                return "–";
            }

            const parsed = Date.parse(value);
            if (Number.isNaN(parsed)) {
                return value;
            }

            try {
                return dateFormatter.format(new Date(parsed));
            } catch (error) {
                console.error("Nu am putut formata data FAQ", error);
                return value;
            }
        },
        [dateFormatter],
    );

    const handleEditCategory = (category: NormalizedCategory) => {
        setCategoryFormState({
            id: category.id,
            name: category.name,
            description: category.description,
            order:
                typeof category.order === "number" && Number.isFinite(category.order)
                    ? category.order.toString()
                    : "",
            status: category.status,
        });
        setCategoryFormError(null);
        setCategoryFormSuccess(null);
        setCategoryManagementError(null);
    };

    const handleCategorySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (categorySaving) {
            return;
        }

        const trimmedName = categoryFormState.name.trim();
        const trimmedDescription = categoryFormState.description.trim();
        const orderInput = categoryFormState.order.trim();

        if (trimmedName.length === 0) {
            setCategoryFormError("Introdu un nume pentru categoria de FAQ.");
            return;
        }

        if (trimmedName.length > 120) {
            setCategoryFormError("Numele categoriei nu poate depăși 120 de caractere.");
            return;
        }

        if (trimmedDescription.length > 400) {
            setCategoryFormError("Descrierea categoriei poate avea maximum 400 de caractere.");
            return;
        }

        let orderValue: number | null = null;
        if (orderInput.length > 0) {
            const parsedOrder = Number(orderInput);
            if (!Number.isFinite(parsedOrder) || parsedOrder < 0 || parsedOrder > 255) {
                setCategoryFormError("Introdu un număr între 0 și 255 pentru câmpul de ordine.");
                return;
            }
            orderValue = parsedOrder;
        }

        const statusValue = isFaqStatus(categoryFormState.status)
            ? categoryFormState.status
            : DEFAULT_STATUS;

        const payload: FaqCategoryPayload = {
            name: trimmedName,
            description: trimmedDescription.length > 0 ? trimmedDescription : null,
            order: typeof orderValue === "number" ? orderValue : null,
            status: statusValue,
        };

        setCategorySaving(true);
        setCategoryFormError(null);
        setCategoryFormSuccess(null);
        setCategoryManagementError(null);

        try {
            if (isEditingCategory && categoryFormState.id != null) {
                await apiClient.updateFaqCategory(categoryFormState.id, payload);
                await loadCategories(categoryFormState.id.toString());
                setCategoryFormSuccess("Categoria a fost actualizată cu succes.");
            } else {
                const response = await apiClient.createFaqCategory(payload);
                const created = extractItem<FaqCategory>(response);
                let createdIdNumber: number | null = null;

                if (created) {
                    if (typeof created.id === "number" && Number.isFinite(created.id)) {
                        createdIdNumber = created.id;
                    } else if (typeof created.id === "string") {
                        const parsed = Number(created.id);
                        if (Number.isFinite(parsed)) {
                            createdIdNumber = parsed;
                        }
                    }
                }

                const createdIdString = createdIdNumber != null ? createdIdNumber.toString() : undefined;

                await loadCategories(createdIdString);

                if (createdIdString) {
                    setFormState((previous) => ({
                        ...previous,
                        categoryId: createdIdString,
                    }));
                }

                resetCategoryForm();
                setCategoryFormSuccess("Categoria a fost creată cu succes.");
            }
        } catch (error) {
            console.error("Nu am putut salva categoria FAQ", error);
            setCategoryFormError("Nu am putut salva categoria. Verifică datele și încearcă din nou.");
        } finally {
            setCategorySaving(false);
        }
    };

    const handleDeleteCategory = async (category: NormalizedCategory) => {
        if (categoryDeletingId !== null) {
            return;
        }

        const shouldDelete = window.confirm(
            `Sigur vrei să ștergi categoria „${category.name}”? Acțiunea nu poate fi anulată.`,
        );

        if (!shouldDelete) {
            return;
        }

        setCategoryDeletingId(category.id);
        setCategoryFormError(null);
        setCategoryFormSuccess(null);
        setCategoryManagementError(null);

        try {
            await apiClient.deleteFaqCategory(category.id);
            await loadCategories();
            resetCategoryForm();
            setCategoryFormSuccess("Categoria a fost ștearsă cu succes.");
        } catch (error) {
            console.error("Nu am putut șterge categoria FAQ", error);
            setCategoryManagementError(
                "Nu am putut șterge categoria. Verifică dacă nu are întrebări active și încearcă din nou.",
            );
        } finally {
            setCategoryDeletingId(null);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) {
            return;
        }

        const trimmedQuestion = formState.question.trim();
        const trimmedAnswer = formState.answer.trim();
        const plainAnswer = extractPlainText(trimmedAnswer);

        if (trimmedQuestion.length === 0) {
            setFormError("Introdu o întrebare pentru FAQ.");
            return;
        }

        if (plainAnswer.length === 0) {
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
            const wasEditing = editingFaqId !== null;

            if (wasEditing) {
                await apiClient.updateFaq(editingFaqId, payload);
                setFormSuccess("FAQ-ul a fost actualizat cu succes.");
            } else {
                await apiClient.createFaq(payload);
                setFormSuccess("FAQ-ul a fost adăugat cu succes.");
            }

            await loadCategories(categoryId.toString());

            setFormState((previous) => ({
                ...previous,
                question: "",
                answer: "",
                status: wasEditing ? DEFAULT_STATUS : previous.status,
            }));

            if (wasEditing) {
                editingFaqIdRef.current = null;
                setEditingFaqId(null);
            }
        } catch (error) {
            console.error("Nu am putut salva FAQ-ul", error);
            setFormError("Nu am putut salva întrebarea. Verifică datele și încearcă din nou.");
        } finally {
            setSaving(false);
        }
    };

    const isSubmitDisabled = saving || categoryOptions.length === 0;
    const isEditingFaq = editingFaqId !== null;

    const handleEditFaq = (faq: NormalizedFaqRecord) => {
        setEditingFaqId(faq.id);
        editingFaqIdRef.current = faq.id;
        setFormState((previous) => ({
            ...previous,
            question: faq.question,
            answer: faq.answer,
            categoryId: faq.categoryId.toString(),
            status: faq.status,
        }));
        setFormError(null);
        setFormSuccess(null);
    };

    const handleCancelFaqEdit = () => {
        editingFaqIdRef.current = null;
        setEditingFaqId(null);
        setFormState((previous) => ({
            ...previous,
            question: "",
            answer: "",
            status: DEFAULT_STATUS,
        }));
        setFormError(null);
        setFormSuccess(null);
    };

    return (
        <div className="space-y-8 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Administrare FAQ</h1>
                    <p className="text-sm text-gray-600">
                        Gestionează categoriile și întrebările frecvente afișate în platforma DaCars. Modificările se
                        propagă imediat în site și în fluxul de rezervare.
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
                    Reîncarcă datele
                </Button>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr),minmax(0,5fr)]">
                <section className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Categorii FAQ</h2>
                            <p className="text-sm text-gray-600">
                                Creează, actualizează și șterge categoriile folosite pentru organizarea întrebărilor.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => resetCategoryForm()}
                            disabled={categorySaving}
                        >
                            <Plus className="h-4 w-4" />
                            Categorie nouă
                        </Button>
                    </div>

                    {categoryManagementError && (
                        <p className="text-sm text-red-600">{categoryManagementError}</p>
                    )}

                    <div className="overflow-hidden rounded-lg border border-gray-200">
                        {loadingCategories ? (
                            <div className="p-4 text-sm text-gray-500">Se încarcă categoriile...</div>
                        ) : categoryRecords.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500">
                                Nu există încă nicio categorie. Completează formularul de mai jos pentru a adăuga prima
                                categorie.
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Nume</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Ordine</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">FAQ-uri</th>
                                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Acțiuni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {categoryRecords.map((category) => (
                                        <tr key={category.id} className="hover:bg-gray-50">
                                            <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                                                {category.name}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                {statusLabels[category.status]}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                {typeof category.order === "number" && Number.isFinite(category.order)
                                                    ? category.order
                                                    : "–"}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                                                {category.faqCount}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2"
                                                        onClick={() => handleEditCategory(category)}
                                                        disabled={categorySaving}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                        Editează
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="danger"
                                                        size="sm"
                                                        className="gap-2"
                                                        onClick={() => void handleDeleteCategory(category)}
                                                        disabled={categoryDeletingId === category.id}
                                                    >
                                                        {categoryDeletingId === category.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                        Șterge
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <form className="space-y-4" onSubmit={handleCategorySubmit}>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {isEditingCategory ? "Editează categoria" : "Categorie nouă"}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {isEditingCategory
                                    ? "Actualizează informațiile categoriei și salvează pentru a reînnoi traducerile."
                                    : "Completează câmpurile pentru a adăuga o nouă categorie pentru întrebările frecvente."}
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="faq-category-name">Nume categorie</Label>
                                <Input
                                    id="faq-category-name"
                                    value={categoryFormState.name}
                                    onChange={(event) => updateCategoryFormField("name", event.target.value)}
                                    placeholder="Ex: Rezervare și plată"
                                    maxLength={120}
                                    disabled={categorySaving}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="faq-category-order">Ordine</Label>
                                <Input
                                    id="faq-category-order"
                                    type="number"
                                    min={0}
                                    max={255}
                                    value={categoryFormState.order}
                                    onChange={(event) => updateCategoryFormField("order", event.target.value)}
                                    placeholder="Ex: 1"
                                    disabled={categorySaving}
                                />
                                <p className="text-xs text-gray-500">
                                    Valorile mai mici apar primele. Lasă gol pentru ordonare alfabetică implicită.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="faq-category-status">Status</Label>
                                <Select
                                    id="faq-category-status"
                                    value={categoryFormState.status}
                                    onValueChange={(value) => updateCategoryFormField("status", value as FaqStatus)}
                                    disabled={categorySaving}
                                >
                                    {statusOptions.map((option) => (
                                        <option key={`category-status-${option.value}`} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="faq-category-description">Descriere</Label>
                                <Textarea
                                    id="faq-category-description"
                                    value={categoryFormState.description}
                                    onChange={(event) => updateCategoryFormField("description", event.target.value)}
                                    placeholder="Note interne despre ce acoperă categoria"
                                    rows={3}
                                    maxLength={400}
                                    disabled={categorySaving}
                                />
                                <p className="text-xs text-gray-500">
                                    Descrierea este opțională și ajută echipa să înțeleagă scopul categoriei (maxim 400 de
                                    caractere).
                                </p>
                            </div>
                        </div>

                        {categoryFormError && <p className="text-sm text-red-600">{categoryFormError}</p>}
                        {categoryFormSuccess && <p className="text-sm text-green-600">{categoryFormSuccess}</p>}

                        <div className="flex flex-wrap gap-3">
                            <Button type="submit" className="inline-flex items-center gap-2" disabled={categorySaving}>
                                {categorySaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {isEditingCategory ? "Actualizează categoria" : "Salvează categoria"}
                            </Button>
                            {isEditingCategory && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="inline-flex items-center gap-2"
                                    onClick={() => resetCategoryForm()}
                                    disabled={categorySaving}
                                >
                                    Renunță la editare
                                </Button>
                            )}
                        </div>
                    </form>
                </section>

                <section className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Întrebări frecvente</h2>
                        <p className="text-sm text-gray-600">
                            Adaugă întrebări și răspunsuri noi pentru baza de cunoștințe publică. Statusul „Publicat” le face
                            vizibile imediat pentru clienți.
                        </p>
                        {isEditingFaq && (
                            <p className="mt-2 text-sm font-medium text-berkeley">
                                Editezi întrebarea selectată. Actualizează câmpurile și salvează pentru a publica modificările.
                            </p>
                        )}
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="category">Categorie</Label>
                            <Select
                                id="category"
                                value={formState.categoryId}
                                onValueChange={(value) => updateFormField("categoryId", value)}
                                disabled={loadingCategories || categoryOptions.length === 0}
                                placeholder={loadingCategories ? "Se încarcă categoriile..." : "Selectează categoria"}
                            >
                                {formattedCategoryOptions.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.label}
                                    </option>
                                ))}
                            </Select>
                            {categoryError && <p className="text-sm text-red-600">{categoryError}</p>}
                            {!loadingCategories && categoryOptions.length === 0 && !categoryError && (
                                <p className="text-sm text-gray-500">
                                    Nu există încă nicio categorie de FAQ. Creează o categorie în panoul din stânga pentru a putea
                                    adăuga întrebări.
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
                            <Label htmlFor="answer-editor">Răspuns</Label>
                            <div id="answer-editor" className="rich-text-editor rich-text-editor--faq-answer">
                                <CKEditor
                                    editor={ClassicEditor}
                                    data={formState.answer}
                                    config={answerEditorConfig}
                                    disabled={saving}
                                    onChange={handleAnswerChange}
                                />
                            </div>
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
                                {isEditingFaq ? "Actualizează FAQ" : "Salvează FAQ"}
                            </Button>
                            {isEditingFaq ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancelFaqEdit}
                                    disabled={saving}
                                >
                                    Renunță la editare
                                </Button>
                            ) : (
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
                            )}
                        </div>
                    </form>
                </section>
            </div>

            <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Întrebări existente</h2>
                        <p className="text-sm text-gray-600">
                            Revizuiește toate întrebările adăugate și statusul lor de publicare. Lista se
                            actualizează automat după modificări.
                        </p>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                        Total întrebări: {faqRecords.length}
                    </span>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200">
                    {loadingCategories ? (
                        <div className="p-4 text-sm text-gray-500">Se încarcă întrebările...</div>
                    ) : faqRecords.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">
                            Nu există încă întrebări salvate. Adaugă un FAQ folosind formularul din dreapta.
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                        Întrebare
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                        Categorie
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                        Ultima actualizare
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                                        Acțiuni
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {faqRecords.map((faq) => (
                                    <tr key={faq.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900 break-words">
                                            {faq.question}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{faq.categoryName}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {statusLabels[faq.status]}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {formatTimestamp(faq.updatedAt ?? faq.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end">
                                                <Button
                                                    type="button"
                                                    variant="default"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => handleEditFaq(faq)}
                                                    disabled={saving}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    Editează
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>
        </div>
    );
};

export default AdminFaqPage;
