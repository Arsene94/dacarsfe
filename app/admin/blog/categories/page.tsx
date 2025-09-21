"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/api";
import { extractItem, extractList } from "@/lib/apiResponse";
import type { BlogCategory, BlogCategoryPayload } from "@/types/blog";
import type { Column } from "@/types/ui";

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleString("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const sortCategories = (categories: BlogCategory[]): BlogCategory[] =>
  [...categories].sort((a, b) => a.name.localeCompare(b.name, "ro"));

type CategoryFormState = {
  name: string;
  description: string;
};

const initialFormState: CategoryFormState = {
  name: "",
  description: "",
};

export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [formState, setFormState] = useState<CategoryFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.getBlogCategories({ perPage: 100, sort: "name" });
      const list = extractList(response);
      const normalized = list
        .filter((item): item is BlogCategory => Boolean(item && typeof item === "object"))
        .map((item) => ({ ...item }))
        .filter((item): item is BlogCategory => typeof item.id === "number" && typeof item.name === "string");
      setCategories(sortCategories(normalized));
    } catch (error) {
      console.error("Nu am putut încărca categoriile de blog", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormState(initialFormState);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (category: BlogCategory) => {
    setEditingCategory(category);
    setFormState({
      name: category.name,
      description: category.description ?? "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormState(initialFormState);
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      setFormError("Introdu un nume pentru categorie.");
      return;
    }

    const description = formState.description.trim();
    const payload: BlogCategoryPayload = {
      name: trimmedName,
      description: description.length > 0 ? description : null,
    };

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingCategory) {
        const response = await apiClient.updateBlogCategory(editingCategory.id, payload);
        const updated = extractItem(response);
        if (updated) {
          setCategories((previous) =>
            sortCategories(
              previous.map((item) => (item.id === editingCategory.id ? { ...item, ...updated } : item)),
            ),
          );
        } else {
          await fetchCategories();
        }
      } else {
        const response = await apiClient.createBlogCategory(payload);
        const created = extractItem(response);
        if (created) {
          setCategories((previous) => sortCategories([...previous, created]));
        } else {
          await fetchCategories();
        }
      }
      closeModal();
    } catch (error) {
      console.error("Nu am putut salva categoria", error);
      setFormError("Nu am putut salva categoria. Încearcă din nou.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: BlogCategory) => {
    if (!window.confirm(`Sigur dorești să ștergi categoria „${category.name}”?`)) {
      return;
    }

    try {
      await apiClient.deleteBlogCategory(category.id);
      setCategories((previous) => previous.filter((item) => item.id !== category.id));
    } catch (error) {
      console.error("Nu am putut șterge categoria", error);
      window.alert("Ștergerea categoriei a eșuat. Încearcă din nou.");
    }
  };

  const columns: Column<BlogCategory>[] = useMemo(
    () => [
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
      },
      {
        id: "created_at",
        header: "Creată",
        accessor: (row) => (row.created_at ? new Date(row.created_at).getTime() : 0),
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
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openEditModal(row);
              }}
              aria-label={`Editează ${row.name}`}
              className="text-jade transition hover:text-jadeLight"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleDelete(row);
              }}
              aria-label={`Șterge ${row.name}`}
              className="text-red-500 transition hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-berkeley">Categorii blog</h1>
          <p className="text-sm text-gray-600">
            Gestionează structura categoriilor pentru articolele publicate.
          </p>
        </div>
        <Button onClick={openAddModal} disabled={loading}>
          <Plus className="mr-2 h-4 w-4" /> Categorie nouă
        </Button>
      </div>

      <DataTable
        data={categories}
        columns={columns}
        pageSize={10}
        renderRowDetails={(row) => (
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-medium">Descriere:</span> {row.description || "Nu există descriere."}
            </p>
            <p>
              <span className="font-medium">Ultima actualizare:</span> {formatDateTime(row.updated_at)}
            </p>
          </div>
        )}
      />

      <Popup open={isModalOpen} onClose={closeModal} className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-berkeley">
              {editingCategory ? "Editează categoria" : "Categorie nouă"}
            </h2>
            <p className="text-sm text-gray-600">
              Completează informațiile afișate în public și în filtrele din admin.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="blog-category-name" className="block text-sm font-medium text-gray-700">
              Nume categorie
            </label>
            <Input
              id="blog-category-name"
              value={formState.name}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, name: event.target.value }))
              }
              placeholder="Ex: Sfaturi de închiriere"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="blog-category-description" className="block text-sm font-medium text-gray-700">
              Descriere
            </label>
            <textarea
              id="blog-category-description"
              value={formState.description}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, description: event.target.value }))
              }
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade"
              placeholder="Text scurt folosit în listările publice."
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>
              Anulează
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Se salvează..." : "Salvează"}
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
}

