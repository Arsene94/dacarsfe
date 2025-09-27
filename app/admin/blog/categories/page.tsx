"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/lib/api";
import { extractItem, extractList } from "@/lib/apiResponse";
import { formatDateTime } from "@/lib/datetime";
import type { Column } from "@/types/ui";
import type { BlogCategory, BlogCategoryPayload } from "@/types/blog";

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
