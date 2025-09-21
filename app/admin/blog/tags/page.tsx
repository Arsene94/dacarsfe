"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/api";
import { extractItem, extractList } from "@/lib/apiResponse";
import type { BlogTag, BlogTagPayload } from "@/types/blog";
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

const sortTags = (tags: BlogTag[]): BlogTag[] =>
  [...tags].sort((a, b) => a.name.localeCompare(b.name, "ro"));

type TagFormState = {
  name: string;
  description: string;
};

const initialFormState: TagFormState = {
  name: "",
  description: "",
};

export default function BlogTagsPage() {
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<BlogTag | null>(null);
  const [formState, setFormState] = useState<TagFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTags = useCallback(async () => {
    try {
      const response = await apiClient.getBlogTags({ perPage: 150, sort: "name" });
      const list = extractList(response);
      const normalized = list
        .filter((item): item is BlogTag => Boolean(item && typeof item === "object"))
        .map((item) => ({ ...item }))
        .filter((item): item is BlogTag => typeof item.id === "number" && typeof item.name === "string");
      setTags(sortTags(normalized));
    } catch (error) {
      console.error("Nu am putut încărca etichetele de blog", error);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const openAddModal = () => {
    setEditingTag(null);
    setFormState(initialFormState);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tag: BlogTag) => {
    setEditingTag(tag);
    setFormState({
      name: tag.name,
      description: tag.description ?? "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }
    setIsModalOpen(false);
    setEditingTag(null);
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
      setFormError("Introdu un nume pentru etichetă.");
      return;
    }

    const description = formState.description.trim();
    const payload: BlogTagPayload = {
      name: trimmedName,
      description: description.length > 0 ? description : null,
    };

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingTag) {
        const response = await apiClient.updateBlogTag(editingTag.id, payload);
        const updated = extractItem(response);
        if (updated) {
          setTags((previous) =>
            sortTags(previous.map((item) => (item.id === editingTag.id ? { ...item, ...updated } : item))),
          );
        } else {
          await fetchTags();
        }
      } else {
        const response = await apiClient.createBlogTag(payload);
        const created = extractItem(response);
        if (created) {
          setTags((previous) => sortTags([...previous, created]));
        } else {
          await fetchTags();
        }
      }
      closeModal();
    } catch (error) {
      console.error("Nu am putut salva eticheta", error);
      setFormError("Nu am putut salva eticheta. Încearcă din nou.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tag: BlogTag) => {
    if (!window.confirm(`Sigur dorești să ștergi eticheta „${tag.name}”?`)) {
      return;
    }

    try {
      await apiClient.deleteBlogTag(tag.id);
      setTags((previous) => previous.filter((item) => item.id !== tag.id));
    } catch (error) {
      console.error("Nu am putut șterge eticheta", error);
      window.alert("Ștergerea etichetei a eșuat. Încearcă din nou.");
    }
  };

  const columns: Column<BlogTag>[] = useMemo(
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
          <h1 className="text-2xl font-semibold text-berkeley">Etichete blog</h1>
          <p className="text-sm text-gray-600">
            Definește colecția de etichete folosite pentru organizarea articolelor.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" /> Etichetă nouă
        </Button>
      </div>

      <DataTable
        data={tags}
        columns={columns}
        pageSize={12}
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
              {editingTag ? "Editează eticheta" : "Etichetă nouă"}
            </h2>
            <p className="text-sm text-gray-600">
              Etichetele ajută la filtrarea articolelor și la recomandări în blog.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="blog-tag-name" className="block text-sm font-medium text-gray-700">
              Nume etichetă
            </label>
            <Input
              id="blog-tag-name"
              value={formState.name}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, name: event.target.value }))
              }
              placeholder="Ex: oferte"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="blog-tag-description" className="block text-sm font-medium text-gray-700">
              Descriere
            </label>
            <textarea
              id="blog-tag-description"
              value={formState.description}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, description: event.target.value }))
              }
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade"
              placeholder="Textul este opțional și oferă context echipei editoriale."
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

