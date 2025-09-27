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
import type { BlogTag, BlogTagPayload } from "@/types/blog";

const EMPTY_FORM: TagFormState = {
  name: "",
  description: "",
};

type TagFormState = {
  name: string;
  description: string;
};

const sortTags = (entries: BlogTag[]): BlogTag[] =>
  [...entries].sort((a, b) => a.name.localeCompare(b.name, "ro", { sensitivity: "base" }));

const toPayload = (state: TagFormState): BlogTagPayload => {
  const description = state.description.trim();
  return {
    name: state.name.trim(),
    description: description.length > 0 ? description : null,
  } satisfies BlogTagPayload;
};

const BlogTagsPage = () => {
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<BlogTag | null>(null);
  const [formState, setFormState] = useState<TagFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getBlogTags({ perPage: 100, sort: "name" });
      const items = extractList(response);
      setTags(sortTags(items));
      setGlobalError(null);
    } catch (error) {
      console.error("Nu am putut încărca etichetele de blog", error);
      setGlobalError("Nu am putut încărca etichetele de blog. Încearcă din nou mai târziu.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const openAddModal = () => {
    setEditing(null);
    setFormState({ ...EMPTY_FORM });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tag: BlogTag) => {
    setEditing(tag);
    setFormState({
      name: tag.name,
      description: tag.description ?? "",
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

  const handleDelete = async (tag: BlogTag) => {
    const confirmed = window.confirm(`Ștergi eticheta „${tag.name}”?`);
    if (!confirmed) {
      return;
    }

    try {
      await apiClient.deleteBlogTag(tag.id);
      setTags((prev) => prev.filter((entry) => entry.id !== tag.id));
      setGlobalError(null);
    } catch (error) {
      console.error("Nu am putut șterge eticheta", error);
      setGlobalError("Nu am putut șterge eticheta. Încearcă din nou.");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      setFormError("Introdu un nume pentru etichetă.");
      return;
    }

    setIsSaving(true);
    const payload = toPayload({ ...formState, name: trimmedName });

    try {
      if (editing) {
        const response = await apiClient.updateBlogTag(editing.id, payload);
        const updated = extractItem(response) ?? { ...editing, ...payload };
        setTags((prev) =>
          sortTags(prev.map((entry) => (entry.id === editing.id ? { ...entry, ...updated } : entry))),
        );
      } else {
        const response = await apiClient.createBlogTag(payload);
        const created = extractItem(response);
        if (!created) {
          throw new Error("Eticheta creată nu a fost returnată de API");
        }
        setTags((prev) => sortTags([...prev, created]));
      }
      setGlobalError(null);
      closeModal();
    } catch (error) {
      console.error("Nu am putut salva eticheta de blog", error);
      setFormError("Nu am putut salva eticheta. Te rugăm să încerci din nou.");
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<BlogTag>[] = [
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
            aria-label={`Editează eticheta ${row.name}`}
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleDelete(row);
            }}
            className="text-red-500 hover:text-red-600"
            aria-label={`Șterge eticheta ${row.name}`}
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
          <h1 className="text-2xl font-semibold text-berkeley">Etichete blog</h1>
          <p className="text-sm text-gray-600">
            Gestionează etichetele folosite pentru a grupa articolele după subiecte specifice.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" /> Adaugă etichetă
        </Button>
      </div>

      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {globalError}
        </div>
      )}

      <div className="rounded-lg bg-white p-4 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-gray-500">Se încarcă etichetele...</p>
        ) : (
          <DataTable data={tags} columns={columns} />
        )}
      </div>

      <Popup open={isModalOpen} onClose={closeModal} className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-berkeley">
            {editing ? "Editează eticheta" : "Adaugă etichetă"}
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label
                htmlFor="blog-tag-name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Nume etichetă
              </label>
              <Input
                id="blog-tag-name"
                value={formState.name}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, name: event.target.value }));
                  if (formError) {
                    setFormError(null);
                  }
                }}
                placeholder="Ex: promoții"
                required
              />
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="blog-tag-description"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Descriere (opțional)
              </label>
              <Textarea
                id="blog-tag-description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Explică pe scurt când se folosește eticheta."
                rows={4}
              />
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
                  : "Adaugă etichetă"}
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
};

export default BlogTagsPage;
