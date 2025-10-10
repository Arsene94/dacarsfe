"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Languages, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import apiClient from "@/lib/api";
import { extractItem, extractList } from "@/lib/apiResponse";
import { formatDateTime } from "@/lib/datetime";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { Column } from "@/types/ui";
import type {
  BlogCategory,
  BlogCategoryPayload,
  BlogCategoryTranslation,
  BlogCategoryTranslationPayload,
} from "@/types/blog";

const EMPTY_FORM: CategoryFormState = {
  name: "",
  description: "",
};

type CategoryFormState = {
  name: string;
  description: string;
};

const sortCategories = (entries: BlogCategory[]): BlogCategory[] =>
  [...entries].sort((a, b) => a.name.localeCompare(b.name, "ro", { sensitivity: "base" }));

const toPayload = (state: CategoryFormState): BlogCategoryPayload => {
  const description = state.description.trim();
  return {
    name: state.name.trim(),
    description: description.length > 0 ? description : null,
  } satisfies BlogCategoryPayload;
};

const BlogCategoriesPage = () => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<BlogCategory | null>(null);
  const [formState, setFormState] = useState<CategoryFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const translationLocales = useMemo<Locale[]>(
    () => AVAILABLE_LOCALES.filter((locale) => locale !== DEFAULT_LOCALE),
    [],
  );
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);
  const [translationTarget, setTranslationTarget] = useState<BlogCategory | null>(null);
  const [categoryTranslations, setCategoryTranslations] = useState<
    Record<string, BlogCategoryTranslation>
  >({});
  const [persistedCategoryTranslations, setPersistedCategoryTranslations] = useState<
    Record<string, boolean>
  >({});
  const [activeTranslationLocale, setActiveTranslationLocale] = useState<Locale>(
    translationLocales[0] ?? DEFAULT_LOCALE,
  );
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationSuccess, setTranslationSuccess] = useState<string | null>(null);
  const [isSavingTranslation, setIsSavingTranslation] = useState(false);
  const [isDeletingTranslation, setIsDeletingTranslation] = useState(false);
  const translationBusy = isLoadingTranslations || isSavingTranslation || isDeletingTranslation;

  const safeString = (value: unknown): string => {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number") {
      return value.toString();
    }
    return "";
  };

  const normalizeTranslationLanguage = (
    entry: BlogCategoryTranslation | null | undefined,
  ): string | null => {
    if (!entry) {
      return null;
    }
    if (typeof entry.lang === "string" && entry.lang.trim().length > 0) {
      return entry.lang.trim();
    }
    if (typeof entry.lang_code === "string" && entry.lang_code.trim().length > 0) {
      return entry.lang_code.trim();
    }
    return null;
  };

  const fetchCategoryTranslations = useCallback(async (categoryId: number | string) => {
    setIsLoadingTranslations(true);
    try {
      const response = await apiClient.getBlogCategoryTranslations(categoryId);
      const list = extractList(response);
      const nextTranslations: Record<string, BlogCategoryTranslation> = {};
      const persisted: Record<string, boolean> = {};
      list.forEach((entry) => {
        const lang = normalizeTranslationLanguage(entry);
        if (!lang) {
          return;
        }
        nextTranslations[lang] = {
          lang,
          lang_code: lang,
          name: safeString(entry?.name),
          description: safeString(entry?.description),
        };
        persisted[lang] = true;
      });
      setCategoryTranslations(nextTranslations);
      setPersistedCategoryTranslations(persisted);
      setTranslationError(null);
    } catch (error) {
      console.error("Nu am putut încărca traducerile categoriei de blog", error);
      setTranslationError(
        "Nu am putut încărca traducerile pentru această categorie. Încearcă din nou.",
      );
    } finally {
      setIsLoadingTranslations(false);
    }
  }, []);

  const openTranslationModal = useCallback(
    (category: BlogCategory) => {
      if (translationLocales.length === 0) {
        return;
      }
      setTranslationTarget(category);
      const initialLocale = translationLocales[0] ?? DEFAULT_LOCALE;
      setActiveTranslationLocale(initialLocale);
      setCategoryTranslations({});
      setPersistedCategoryTranslations({});
      setTranslationError(null);
      setTranslationSuccess(null);
      setIsTranslationModalOpen(true);
      void fetchCategoryTranslations(category.id);
    },
    [fetchCategoryTranslations, translationLocales],
  );

  const closeTranslationModal = useCallback(() => {
    setIsTranslationModalOpen(false);
    setTranslationTarget(null);
    setCategoryTranslations({});
    setPersistedCategoryTranslations({});
    setTranslationError(null);
    setTranslationSuccess(null);
    setIsLoadingTranslations(false);
    setIsSavingTranslation(false);
    setIsDeletingTranslation(false);
    setActiveTranslationLocale(translationLocales[0] ?? DEFAULT_LOCALE);
  }, [translationLocales]);

  const updateTranslationDraft = useCallback(
    (locale: Locale, field: keyof BlogCategoryTranslationPayload, value: string) => {
      setCategoryTranslations((previous) => {
        const existing = previous[locale] ?? { lang: locale, lang_code: locale };
        return {
          ...previous,
          [locale]: {
            ...existing,
            lang: locale,
            lang_code: locale,
            [field]: value,
          },
        };
      });
      setTranslationSuccess(null);
      if (translationError) {
        setTranslationError(null);
      }
    },
    [translationError],
  );

  const handleTranslationLocaleChange = useCallback(
    (value: string) => {
      const candidate = value as Locale;
      if (!translationLocales.includes(candidate)) {
        return;
      }
      setActiveTranslationLocale(candidate);
      setTranslationSuccess(null);
      setTranslationError(null);
    },
    [translationLocales],
  );

  const handleSaveTranslation = useCallback(async () => {
    if (!translationTarget) {
      return;
    }
    const locale = activeTranslationLocale;
    const draft = categoryTranslations[locale] ?? {
      lang: locale,
      lang_code: locale,
      name: "",
      description: "",
    };
    const payload: BlogCategoryTranslationPayload = {
      name: draft.name?.trim() ? draft.name.trim() : null,
      description: draft.description?.trim() ? draft.description.trim() : null,
    };

    setIsSavingTranslation(true);
    try {
      const response = await apiClient.upsertBlogCategoryTranslation(
        translationTarget.id,
        locale,
        payload,
      );
      const saved = extractItem(response);
      setCategoryTranslations((previous) => ({
        ...previous,
        [locale]: {
          ...(saved ?? {}),
          lang: locale,
          lang_code: locale,
          name: safeString(saved?.name ?? payload.name ?? ""),
          description: safeString(saved?.description ?? payload.description ?? ""),
        },
      }));
      setPersistedCategoryTranslations((previous) => ({
        ...previous,
        [locale]: true,
      }));
      setTranslationSuccess("Traducerea a fost salvată cu succes.");
      setTranslationError(null);
    } catch (error) {
      console.error("Nu am putut salva traducerea categoriei de blog", error);
      setTranslationError("Nu am putut salva traducerea. Încearcă din nou.");
      setTranslationSuccess(null);
    } finally {
      setIsSavingTranslation(false);
    }
  }, [activeTranslationLocale, categoryTranslations, translationTarget]);

  const handleDeleteTranslation = useCallback(async () => {
    if (!translationTarget) {
      return;
    }
    const locale = activeTranslationLocale;
    setIsDeletingTranslation(true);
    try {
      await apiClient.deleteBlogCategoryTranslation(translationTarget.id, locale);
      setCategoryTranslations((previous) => {
        const next = { ...previous };
        delete next[locale];
        return next;
      });
      setPersistedCategoryTranslations((previous) => {
        const next = { ...previous };
        delete next[locale];
        return next;
      });
      setTranslationSuccess("Traducerea a fost ștearsă.");
      setTranslationError(null);
    } catch (error) {
      console.error("Nu am putut șterge traducerea categoriei de blog", error);
      setTranslationError("Nu am putut șterge traducerea. Încearcă din nou.");
      setTranslationSuccess(null);
    } finally {
      setIsDeletingTranslation(false);
    }
  }, [activeTranslationLocale, translationTarget]);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getBlogCategories({ perPage: 100, sort: "name" });
      const items = extractList(response);
      setCategories(sortCategories(items));
      setGlobalError(null);
    } catch (error) {
      console.error("Nu am putut încărca categoriile de blog", error);
      setGlobalError("Nu am putut încărca categoriile de blog. Încearcă din nou mai târziu.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openAddModal = () => {
    setEditing(null);
    setFormState({ ...EMPTY_FORM });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (category: BlogCategory) => {
    setEditing(category);
    setFormState({
      name: category.name,
      description: category.description ?? "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setIsSaving(false);
    setFormState({ ...EMPTY_FORM });
    setFormError(null);
  };

  const handleDelete = async (category: BlogCategory) => {
    const confirmed = window.confirm(`Ștergi categoria „${category.name}”?`);
    if (!confirmed) {
      return;
    }

    try {
      await apiClient.deleteBlogCategory(category.id);
      setCategories((prev) => prev.filter((entry) => entry.id !== category.id));
      setGlobalError(null);
    } catch (error) {
      console.error("Nu am putut șterge categoria", error);
      setGlobalError("Nu am putut șterge categoria de blog. Te rugăm să încerci din nou.");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      setFormError("Introdu un nume pentru categorie.");
      return;
    }

    setIsSaving(true);
    const payload = toPayload({ ...formState, name: trimmedName });

    try {
      if (editing) {
        const response = await apiClient.updateBlogCategory(editing.id, payload);
        const updated = extractItem(response) ?? { ...editing, ...payload };
        setCategories((prev) =>
          sortCategories(
            prev.map((entry) => (entry.id === editing.id ? { ...entry, ...updated } : entry)),
          ),
        );
      } else {
        const response = await apiClient.createBlogCategory(payload);
        const created = extractItem(response);
        if (!created) {
          throw new Error("Categoria creată nu a fost returnată de API");
        }
        setCategories((prev) => sortCategories([...prev, created]));
      }
      setGlobalError(null);
      closeModal();
    } catch (error) {
      console.error("Nu am putut salva categoria de blog", error);
      setFormError("Nu am putut salva categoria. Te rugăm să încerci din nou.");
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<BlogCategory>[] = [
    {
      id: "name",
      header: "Nume",
      accessor: (row) => row.name,
      sortable: true,
    },
    {
      id: "slug",
      header: "Slug",
      accessor: (row) => row.slug ?? "",
      sortable: true,
      cell: (row) => row.slug ?? "—",
    },
    {
      id: "description",
      header: "Descriere",
      accessor: (row) => row.description ?? "",
      cell: (row) => (row.description ? row.description : "—"),
    },
    {
      id: "created_at",
      header: "Creată la",
      accessor: (row) => row.created_at ?? "",
      sortable: true,
      cell: (row) => formatDateTime(row.created_at),
    },
    {
      id: "actions",
      header: "Acțiuni",
      accessor: () => "",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {translationLocales.length > 0 && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                openTranslationModal(row);
              }}
              className="text-berkeley hover:text-jade"
              aria-label={`Tradu categoria ${row.name}`}
              disabled={translationBusy}
            >
              <Languages className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(event) => {
              event.stopPropagation();
              openEditModal(row);
            }}
            className="text-jade hover:text-jadeLight"
            aria-label={`Editează categoria ${row.name}`}
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleDelete(row);
            }}
            className="text-red-500 hover:text-red-600"
            aria-label={`Șterge categoria ${row.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const activeCategoryTranslation =
    categoryTranslations[activeTranslationLocale] ?? {
      lang: activeTranslationLocale,
      lang_code: activeTranslationLocale,
      name: "",
      description: "",
    };
  const hasPersistedTranslation = Boolean(
    persistedCategoryTranslations[activeTranslationLocale],
  );
  const activeLocaleLabel = activeTranslationLocale.toUpperCase();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-berkeley">Categorii blog</h1>
          <p className="text-sm text-gray-600">
            Organizează articolele publicate pe blog în categorii tematice.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" /> Adaugă categorie
        </Button>
      </div>

      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {globalError}
        </div>
      )}

      <div className="rounded-lg bg-white p-4 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-gray-500">Se încarcă categoriile...</p>
        ) : (
          <DataTable data={categories} columns={columns} />
        )}
      </div>

      <Popup
        open={isTranslationModalOpen}
        onClose={closeTranslationModal}
        className="max-w-2xl"
      >
        {translationLocales.length === 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-berkeley">Traduceri categorie</h2>
            <p className="text-sm text-gray-600">
              Nu sunt configurate limbi suplimentare pentru traduceri în acest moment.
            </p>
            <div className="flex justify-end">
              <Button type="button" onClick={closeTranslationModal}>
                Închide
              </Button>
            </div>
          </div>
        ) : translationTarget ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-berkeley">Traduceri categorie</h2>
              <p className="text-sm text-gray-600">
                Actualizează numele și descrierea categoriei pentru limbile disponibile.
              </p>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-medium text-gray-900">{translationTarget.name}</p>
              {translationTarget.description && (
                <p className="mt-1 whitespace-pre-line">{translationTarget.description}</p>
              )}
            </div>
            {translationLocales.length > 1 && (
              <div className="space-y-1">
                <label
                  htmlFor="blog-category-translation-language"
                  className="text-sm font-medium text-gray-700"
                >
                  Limbă
                </label>
                <Select
                  id="blog-category-translation-language"
                  value={activeTranslationLocale}
                  onValueChange={handleTranslationLocaleChange}
                  disabled={translationBusy}
                >
                  {translationLocales.map((locale) => (
                    <option key={locale} value={locale}>
                      {locale.toUpperCase()}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {isLoadingTranslations ? (
              <p className="text-sm text-gray-500">Se încarcă traducerile...</p>
            ) : (
              <div className="space-y-4">
                {translationError && (
                  <p className="text-sm text-red-600" role="alert">
                    {translationError}
                  </p>
                )}
                {translationSuccess && (
                  <p className="text-sm text-green-600">{translationSuccess}</p>
                )}
                <div className="space-y-2">
                  <label
                    htmlFor="blog-category-translation-name"
                    className="text-sm font-medium text-gray-700"
                  >
                    Nume categorie ({activeLocaleLabel})
                  </label>
                  <Input
                    id="blog-category-translation-name"
                    value={activeCategoryTranslation.name ?? ""}
                    onChange={(event) =>
                      updateTranslationDraft(activeTranslationLocale, "name", event.target.value)
                    }
                    placeholder="Introdu numele tradus al categoriei"
                    disabled={translationBusy}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="blog-category-translation-description"
                    className="text-sm font-medium text-gray-700"
                  >
                    Descriere ({activeLocaleLabel})
                  </label>
                  <Textarea
                    id="blog-category-translation-description"
                    value={activeCategoryTranslation.description ?? ""}
                    onChange={(event) =>
                      updateTranslationDraft(
                        activeTranslationLocale,
                        "description",
                        event.target.value,
                      )
                    }
                    placeholder="Descrierea categoriei în limba selectată"
                    rows={4}
                    disabled={translationBusy}
                  />
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={handleSaveTranslation}
                    disabled={isSavingTranslation || isLoadingTranslations}
                  >
                    {isSavingTranslation ? "Se salvează..." : "Salvează traducerea"}
                  </Button>
                  {hasPersistedTranslation && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDeleteTranslation}
                      disabled={isDeletingTranslation}
                    >
                      {isDeletingTranslation ? "Se șterge..." : "Șterge traducerea"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeTranslationModal}
                    disabled={isSavingTranslation || isDeletingTranslation}
                  >
                    Închide
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selectează o categorie pentru a vizualiza și edita traducerile disponibile.
            </p>
            <div className="flex justify-end">
              <Button type="button" onClick={closeTranslationModal}>
                Închide
              </Button>
            </div>
          </div>
        )}
      </Popup>

      <Popup open={isModalOpen} onClose={closeModal} className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-berkeley">
            {editing ? "Editează categoria" : "Adaugă categorie"}
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label
                htmlFor="blog-category-name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Nume categorie
              </label>
              <Input
                id="blog-category-name"
                value={formState.name}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, name: event.target.value }));
                  if (formError) {
                    setFormError(null);
                  }
                }}
                placeholder="Ex: Ghiduri de călătorie"
                required
              />
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="blog-category-description"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Descriere (opțional)
              </label>
              <Textarea
                id="blog-category-description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Descrie pe scurt ce tip de articole include categoria."
                rows={4}
              />
              <p className="mt-1 text-xs text-gray-500">
                Textul este afișat în zona publică lângă titlul categoriei.
              </p>
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          )}

          <div className="flex flex-col items-stretch gap-3 pt-2 lg:flex-row lg:items-center lg:justify-end">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Renunță
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Se salvează..."
                : editing
                  ? "Salvează modificările"
                  : "Adaugă categorie"}
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
};

export default BlogCategoriesPage;
