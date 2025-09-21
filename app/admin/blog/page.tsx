"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import apiClient from "@/lib/api";
import { extractItem, extractList } from "@/lib/apiResponse";
import type { BlogCategory, BlogPost, BlogPostPayload, BlogTag } from "@/types/blog";
import type { User } from "@/types/auth";
import type { Column } from "@/types/ui";

type AuthorLike = {
  id?: number | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  published: "Publicat",
};

const BLOG_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Publicat" },
] as const;

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

const toDateTimeLocal = (value?: string | null): string => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const fromDateTimeLocal = (value: string): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

const sortByPublishedAt = (posts: BlogPost[]): BlogPost[] =>
  [...posts].sort((a, b) => {
    const left = a.published_at ?? a.created_at ?? "";
    const right = b.published_at ?? b.created_at ?? "";
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return new Date(right).getTime() - new Date(left).getTime();
  });

type BlogPostFormState = {
  title: string;
  categoryId: string;
  authorId: string;
  status: string;
  publishedAt: string;
  excerpt: string;
  content: string;
  tagIds: number[];
};

const initialFormState: BlogPostFormState = {
  title: "",
  categoryId: "",
  authorId: "",
  status: "draft",
  publishedAt: "",
  excerpt: "",
  content: "",
  tagIds: [],
};

const buildAuthorName = (person: AuthorLike): string => {
  const parts = [person.first_name, person.last_name].filter((part): part is string => Boolean(part));
  if (parts.length > 0) {
    return parts.join(" ");
  }
  if (person.email) {
    return person.email;
  }
  if (typeof person.id === "number" && Number.isFinite(person.id)) {
    return `Utilizator #${person.id}`;
  }
  return "Nespecificat";
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export default function BlogPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [authors, setAuthors] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formState, setFormState] = useState<BlogPostFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchResources = useCallback(async () => {
    try {
      const [postsResponse, categoriesResponse, tagsResponse, authorsResponse] = await Promise.all([
        apiClient.getBlogPosts({ perPage: 100, sort: "-published_at,-id" }),
        apiClient.getBlogCategories({ perPage: 100, sort: "name" }),
        apiClient.getBlogTags({ perPage: 200, sort: "name" }),
        apiClient.getUsers({ perPage: 200, sort: "first_name" }),
      ]);

      const fetchedPosts = extractList(postsResponse).filter((item): item is BlogPost => Boolean(item));
      setPosts(sortByPublishedAt(fetchedPosts));

      const fetchedCategories = extractList(categoriesResponse)
        .filter((item): item is BlogCategory => Boolean(item && typeof item === "object"))
        .map((item) => ({ ...item }));
      setCategories(fetchedCategories.sort((a, b) => a.name.localeCompare(b.name, "ro")));

      const fetchedTags = extractList(tagsResponse)
        .filter((item): item is BlogTag => Boolean(item && typeof item === "object"))
        .map((item) => ({ ...item }));
      setTags(fetchedTags.sort((a, b) => a.name.localeCompare(b.name, "ro")));

      const fetchedAuthors = extractList(authorsResponse)
        .filter((item): item is User => Boolean(item && typeof item === "object"))
        .map((item) => ({ ...item }))
        .filter((item): item is User => typeof item.id === "number");
      setAuthors(
        fetchedAuthors.sort((a, b) => buildAuthorName(a).localeCompare(buildAuthorName(b), "ro")),
      );
    } catch (error) {
      console.error("Nu am putut încărca resursele pentru blog", error);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const openAddModal = () => {
    setEditingPost(null);
    setFormState(initialFormState);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setFormState({
      title: post.title,
      categoryId: post.category?.id ? String(post.category.id) : post.category_id ? String(post.category_id) : "",
      authorId: post.author?.id ? String(post.author.id) : post.author_id ? String(post.author_id) : "",
      status: post.status ?? "draft",
      publishedAt: toDateTimeLocal(post.published_at),
      excerpt: post.excerpt ?? "",
      content: post.content ?? "",
      tagIds: Array.isArray(post.tags)
        ? post.tags
            .map((tag) => tag?.id)
            .filter((value): value is number => typeof value === "number")
        : Array.isArray(post.tag_ids)
          ? post.tag_ids.filter((value): value is number => typeof value === "number")
          : [],
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }
    setIsModalOpen(false);
    setEditingPost(null);
    setFormState(initialFormState);
    setFormError(null);
  };

  const toggleTagSelection = (tagId: number) => {
    setFormState((previous) => {
      const exists = previous.tagIds.includes(tagId);
      const nextIds = exists
        ? previous.tagIds.filter((id) => id !== tagId)
        : [...previous.tagIds, tagId];
      return { ...previous, tagIds: nextIds };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const trimmedTitle = formState.title.trim();
    if (!trimmedTitle) {
      setFormError("Introdu un titlu pentru articol.");
      return;
    }

    const categoryId = Number(formState.categoryId);
    if (!Number.isFinite(categoryId)) {
      setFormError("Selectează o categorie pentru articol.");
      return;
    }

    const authorId = Number(formState.authorId);
    if (!Number.isFinite(authorId)) {
      setFormError("Selectează un autor pentru articol.");
      return;
    }

    const trimmedContent = formState.content.trim();
    if (!trimmedContent) {
      setFormError("Adaugă conținut pentru articolul de blog.");
      return;
    }

    const trimmedExcerpt = formState.excerpt.trim();
    const payload: BlogPostPayload = {
      title: trimmedTitle,
      category_id: categoryId,
      author_id: authorId,
      status: formState.status,
      excerpt: trimmedExcerpt.length > 0 ? trimmedExcerpt : null,
      content: trimmedContent,
      published_at: formState.publishedAt ? fromDateTimeLocal(formState.publishedAt) : null,
      tag_ids: formState.tagIds,
    };

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingPost) {
        const response = await apiClient.updateBlogPost(editingPost.id, payload);
        const updated = extractItem(response);
        if (updated) {
          setPosts((previous) =>
            sortByPublishedAt(previous.map((item) => (item.id === editingPost.id ? { ...item, ...updated } : item))),
          );
        } else {
          await fetchResources();
        }
      } else {
        const response = await apiClient.createBlogPost(payload);
        const created = extractItem(response);
        if (created) {
          setPosts((previous) => sortByPublishedAt([...previous, created]));
        } else {
          await fetchResources();
        }
      }
      closeModal();
    } catch (error) {
      console.error("Nu am putut salva articolul", error);
      setFormError("Nu am putut salva articolul. Încearcă din nou.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!window.confirm(`Sigur dorești să ștergi articolul „${post.title}”?`)) {
      return;
    }

    try {
      await apiClient.deleteBlogPost(post.id);
      setPosts((previous) => previous.filter((item) => item.id !== post.id));
    } catch (error) {
      console.error("Nu am putut șterge articolul", error);
      window.alert("Ștergerea articolului a eșuat. Încearcă din nou.");
    }
  };

  const columns: Column<BlogPost>[] = useMemo(() => {
    const resolveAuthorName = (post: BlogPost): string => {
      if (post.author) {
        return buildAuthorName({
          id: post.author.id,
          first_name: post.author.first_name,
          last_name: post.author.last_name,
          email: post.author.email,
        });
      }
      const id = toNumberOrNull(post.author_id);
      if (id !== null) {
        const candidate = authors.find((user) => user.id === id);
        if (candidate) {
          return buildAuthorName(candidate);
        }
      }
      return "Nespecificat";
    };

    return [
      {
        id: "title",
        header: "Titlu",
        accessor: (row) => row.title,
        sortable: true,
      },
      {
        id: "category",
        header: "Categorie",
        accessor: (row) => row.category?.name ?? "",
        sortable: true,
      },
      {
        id: "author",
        header: "Autor",
        accessor: (row) => resolveAuthorName(row),
        sortable: true,
      },
      {
        id: "status",
        header: "Status",
        accessor: (row) => row.status ?? "",
        sortable: true,
        cell: (row) => statusLabels[row.status ?? ""] ?? row.status ?? "-",
      },
      {
        id: "published_at",
        header: "Publicare",
        accessor: (row) => (row.published_at ? new Date(row.published_at).getTime() : 0),
        sortable: true,
        cell: (row) => formatDateTime(row.published_at ?? row.created_at),
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
              aria-label={`Editează ${row.title}`}
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
              aria-label={`Șterge ${row.title}`}
              className="text-red-500 transition hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ];
  }, [authors]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-berkeley">Articole blog</h1>
          <p className="text-sm text-gray-600">
            Creează și gestionează conținutul publicat în secțiunea de blog DaCars.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" /> Articol nou
        </Button>
      </div>

      <DataTable
        data={posts}
        columns={columns}
        pageSize={10}
        renderRowDetails={(row) => (
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <span className="font-medium">Rezumat:</span> {row.excerpt || "Nu există un rezumat pentru acest articol."}
            </p>
            <div>
              <span className="font-medium">Etichete:</span>{" "}
              {row.tags && row.tags.length > 0 ? (
                <span>{row.tags.map((tag) => tag.name).join(", ")}</span>
              ) : (
                <span>Nu sunt asociate etichete.</span>
              )}
            </div>
            <p>
              <span className="font-medium">Ultima actualizare:</span> {formatDateTime(row.updated_at)}
            </p>
          </div>
        )}
      />

      <Popup open={isModalOpen} onClose={closeModal} className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-berkeley">
              {editingPost ? "Editează articol" : "Articol nou"}
            </h2>
            <p className="text-sm text-gray-600">
              Completează informațiile vizibile în blog și atributele SEO asociate.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="blog-post-title" className="block text-sm font-medium text-gray-700">
                Titlu articol
              </label>
              <Input
                id="blog-post-title"
                value={formState.title}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, title: event.target.value }))
                }
                placeholder="Ex: Ghid complet pentru predarea mașinii în Otopeni"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="blog-post-status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <Select
                id="blog-post-status"
                value={formState.status}
                onValueChange={(value) =>
                  setFormState((previous) => ({ ...previous, status: value || "draft" }))
                }
              >
                {BLOG_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="blog-post-category" className="block text-sm font-medium text-gray-700">
                Categorie
              </label>
              <Select
                id="blog-post-category"
                value={formState.categoryId}
                onValueChange={(value) =>
                  setFormState((previous) => ({ ...previous, categoryId: value }))
                }
              >
                <option value="" disabled hidden>
                  Selectează categoria
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="blog-post-author" className="block text-sm font-medium text-gray-700">
                Autor
              </label>
              <Select
                id="blog-post-author"
                value={formState.authorId}
                onValueChange={(value) =>
                  setFormState((previous) => ({ ...previous, authorId: value }))
                }
              >
                <option value="" disabled hidden>
                  Selectează autorul
                </option>
                {authors.map((author) => (
                  <option key={author.id} value={String(author.id)}>
                    {buildAuthorName(author)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="blog-post-published-at" className="block text-sm font-medium text-gray-700">
                Dată publicare
              </label>
              <Input
                id="blog-post-published-at"
                type="datetime-local"
                value={formState.publishedAt}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, publishedAt: event.target.value }))
                }
              />
              <p className="text-xs text-gray-500">
                Completează doar dacă articolul trebuie publicat la o dată specifică.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="blog-post-excerpt" className="block text-sm font-medium text-gray-700">
              Rezumat
            </label>
            <textarea
              id="blog-post-excerpt"
              value={formState.excerpt}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, excerpt: event.target.value }))
              }
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade"
              placeholder="Scurt paragraf folosit în listări și partajări sociale."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="blog-post-content" className="block text-sm font-medium text-gray-700">
              Conținut
            </label>
            <textarea
              id="blog-post-content"
              value={formState.content}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, content: event.target.value }))
              }
              rows={12}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade"
              placeholder="Poți lipi HTML sau Markdown generat din editorul CMS."
              required
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">Etichete</span>
            {tags.length === 0 ? (
              <p className="text-sm text-gray-500">Nu există etichete definite momentan.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tags.map((tag) => {
                  const checked = formState.tagIds.includes(tag.id);
                  return (
                    <label
                      key={tag.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm transition hover:border-jade"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTagSelection(tag.id)}
                        className="h-4 w-4 rounded border-gray-300 text-jade focus:ring-jade"
                      />
                      <span>{tag.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
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
              {isSaving ? "Se salvează..." : "Salvează articolul"}
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
}

