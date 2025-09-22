"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { extractItem, extractList } from "@/lib/apiResponse";
import { formatDateTime, toIsoStringFromInput, toLocalDatetimeInputValue } from "@/lib/datetime";
import { resolveMediaUrl } from "@/lib/media";
import { getUserDisplayName } from "@/lib/users";
import type { Column } from "@/types/ui";
import type {
  BlogCategory,
  BlogPost,
  BlogPostListParams,
  BlogPostPayload,
  BlogPostStatus,
  BlogTag,
} from "@/types/blog";
import type { User } from "@/types/auth";
import { ensureUser } from "@/types/auth";

type BlogPostFormState = {
  title: string;
  categoryId: string;
  authorId: string;
  status: BlogPostStatus;
  publishedAt: string;
  excerpt: string;
  content: string;
  tagIds: number[];
  metaTitle: string;
  metaDescription: string;
};

type BlogPostImageState = {
  file: File | null;
  previewUrl: string | null;
  existingPath: string | null;
  remove: boolean;
};

const createEmptyImageState = (): BlogPostImageState => ({
  file: null,
  previewUrl: null,
  existingPath: null,
  remove: false,
});

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Publicat",
  scheduled: "Programat",
  archived: "Arhivat",
};

const STATUS_OPTIONS: Array<{ value: BlogPostStatus; label: string }> = [
  { value: "draft", label: STATUS_LABELS.draft },
  { value: "published", label: STATUS_LABELS.published },
  { value: "scheduled", label: STATUS_LABELS.scheduled },
  { value: "archived", label: STATUS_LABELS.archived },
];

const EMPTY_FORM: BlogPostFormState = {
  title: "",
  categoryId: "",
  authorId: "",
  status: "draft",
  publishedAt: "",
  excerpt: "",
  content: "",
  tagIds: [],
  metaTitle: "",
  metaDescription: "",
};

const sortByName = <T extends { name: string }>(entries: T[]): T[] =>
  [...entries].sort((a, b) => a.name.localeCompare(b.name, "ro", { sensitivity: "base" }));

const BlogPostsPage = () => {
  const { user } = useAuth();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [authors, setAuthors] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [formState, setFormState] = useState<BlogPostFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ status: string; category: string }>({
    status: "all",
    category: "all",
  });
  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [imageState, setImageState] = useState<BlogPostImageState>(() => createEmptyImageState());

  const resetImageState = useCallback(() => {
    setImageState((prev) => {
      if (prev.previewUrl && prev.file) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return createEmptyImageState();
    });
  }, []);

  useEffect(() => {
    return () => {
      if (imageState.previewUrl && imageState.file) {
        URL.revokeObjectURL(imageState.previewUrl);
      }
    };
  }, [imageState.previewUrl, imageState.file]);

  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImageState((prev) => {
      if (prev.previewUrl && prev.file) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        existingPath: null,
        remove: false,
      };
    });

    event.target.value = "";
  }, []);

  const handleImageRemove = useCallback(() => {
    setImageState((prev) => {
      if (prev.previewUrl && prev.file) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      const hadExisting = typeof prev.existingPath === "string" && prev.existingPath.length > 0;
      return {
        file: null,
        previewUrl: null,
        existingPath: null,
        remove: hadExisting,
      };
    });
  }, []);

  const resolveAuthorName = useCallback(
    (post: BlogPost): string => {
      if (post.author) {
        return getUserDisplayName({ ...post.author });
      }

      const relationAuthor =
        post.author && typeof post.author === "object" && post.author !== null
          ? post.author
          : null;

      const authorId =
        typeof post.author_id === "number"
          ? post.author_id
          : relationAuthor && typeof relationAuthor.id === "number"
            ? relationAuthor.id
            : null;

      if (authorId === null) {
        return "—";
      }
      const match = authors.find((candidate) => candidate.id === authorId);
      if (match) {
        return getUserDisplayName(match);
      }
      return getUserDisplayName({ id: authorId });
    },
    [authors],
  );

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: BlogPostListParams = {
        perPage: 100,
        include: ["category", "tags", "author"],
        sort: "-published_at,-id",
      };
      if (filters.status !== "all") {
        params.status = filters.status;
      }
      if (filters.category !== "all") {
        params.category_id = filters.category;
      }
      if (appliedSearch) {
        params.title = appliedSearch;
      }
      const response = await apiClient.getBlogPosts(params);
      const items = extractList(response);
      setPosts(items);
      setGlobalError(null);
    } catch (error) {
      console.error("Nu am putut încărca articolele de blog", error);
      setGlobalError("Nu am putut încărca articolele de blog. Încearcă din nou mai târziu.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, appliedSearch]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [categoryResponse, tagResponse, authorResponse] = await Promise.all([
          apiClient.getBlogCategories({ perPage: 200, sort: "name" }),
          apiClient.getBlogTags({ perPage: 200, sort: "name" }),
          apiClient.getUsers({ perPage: 200, sort: "first_name" }),
        ]);

        const categoryList = sortByName(extractList(categoryResponse));
        setCategories(categoryList);

        const tagList = sortByName(extractList(tagResponse));
        setTags(tagList);

        const rawAuthors = extractList(authorResponse);
        const normalizedAuthors = rawAuthors
          .map((entry) => {
            try {
              return ensureUser(entry);
            } catch (error) {
              console.warn("Autor invalid primit din API", error);
              return null;
            }
          })
          .filter((entry): entry is User => entry !== null)
          .sort((a, b) =>
            getUserDisplayName(a).localeCompare(getUserDisplayName(b), "ro", { sensitivity: "base" }),
          );
        setAuthors(normalizedAuthors);
      } catch (error) {
        console.error("Nu am putut încărca datele auxiliare pentru blog", error);
        setGlobalError("Nu am putut încărca listele de categorii, etichete sau autori.");
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const openAddModal = () => {
    setEditing(null);
    setFormState({
      ...EMPTY_FORM,
      authorId: user?.id ? String(user.id) : "",
      status: "draft",
    });
    resetImageState();
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = useCallback((post: BlogPost) => {
    const categoryId =
      typeof post.category_id === "number"
        ? String(post.category_id)
        : post.category?.id
          ? String(post.category.id)
          : "";
    const authorId =
      typeof post.author_id === "number"
        ? String(post.author_id)
        : post.author?.id
          ? String(post.author.id)
          : "";
    const tagIds = Array.isArray(post.tags)
      ? post.tags
          .map((tag) => (typeof tag?.id === "number" ? tag.id : null))
          .filter((id): id is number => id !== null)
      : [];

    setEditing(post);
    setFormState({
      title: post.title ?? "",
      categoryId,
      authorId,
      status: (post.status ?? "draft") as BlogPostFormState["status"],
      publishedAt: toLocalDatetimeInputValue(post.published_at ?? null),
      excerpt: post.excerpt ?? "",
      content: post.content ?? "",
      tagIds,
      metaTitle: post.meta_title ?? "",
      metaDescription: post.meta_description ?? "",
    });
    setImageState((prev) => {
      if (prev.previewUrl && prev.file) {
        URL.revokeObjectURL(prev.previewUrl);
      }

      const rawImage =
        typeof post.image === "string" && post.image.trim().length > 0 ? post.image : null;
      const rawThumbnail =
        typeof post.thumbnail === "string" && post.thumbnail.trim().length > 0
          ? post.thumbnail
          : null;
      const rawPath = rawImage ?? rawThumbnail ?? null;
      const preview = rawPath ? resolveMediaUrl(rawPath) : null;
      return {
        file: null,
        previewUrl: preview,
        existingPath: rawPath,
        remove: false,
      };
    });
    setFormError(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setIsSaving(false);
    setFormState({ ...EMPTY_FORM, authorId: user?.id ? String(user.id) : "" });
    setFormError(null);
    resetImageState();
  };

  const toggleTag = (tagId: number) => {
    setFormState((prev) => {
      const exists = prev.tagIds.includes(tagId);
      const nextTagIds = exists
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId];
      return { ...prev, tagIds: nextTagIds };
    });
  };

  const handleDelete = useCallback(async (post: BlogPost) => {
    const confirmed = window.confirm(`Ștergi articolul „${post.title}”?`);
    if (!confirmed) {
      return;
    }

    try {
      await apiClient.deleteBlogPost(post.id);
      setPosts((prev) => prev.filter((entry) => entry.id !== post.id));
      setGlobalError(null);
    } catch (error) {
      console.error("Nu am putut șterge articolul de blog", error);
      setGlobalError("Nu am putut șterge articolul. Încearcă din nou.");
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const trimmedTitle = formState.title.trim();
    if (!trimmedTitle) {
      setFormError("Introdu un titlu pentru articol.");
      return;
    }

    const categoryIdNumeric = Number(formState.categoryId);
    if (!Number.isFinite(categoryIdNumeric) || categoryIdNumeric <= 0) {
      setFormError("Selectează categoria articolului.");
      return;
    }

    const authorIdNumeric = Number(formState.authorId);
    if (!Number.isFinite(authorIdNumeric) || authorIdNumeric <= 0) {
      setFormError("Selectează autorul articolului.");
      return;
    }

    const tagIds = formState.tagIds.filter((id) => Number.isFinite(id));

    const payload: BlogPostPayload = {
      title: trimmedTitle,
      category_id: categoryIdNumeric,
      author_id: authorIdNumeric,
      status: formState.status,
      excerpt: formState.excerpt.trim() ? formState.excerpt.trim() : null,
      content: formState.content.trim() ? formState.content : null,
      tag_ids: tagIds,
      meta_title: formState.metaTitle.trim() ? formState.metaTitle.trim() : null,
      meta_description: formState.metaDescription.trim()
        ? formState.metaDescription.trim()
        : null,
    };

    if (formState.publishedAt.trim().length > 0) {
      const isoValue = toIsoStringFromInput(formState.publishedAt);
      if (!isoValue) {
        setFormError("Data publicării nu este validă.");
        return;
      }
      payload.published_at = isoValue;
    } else {
      payload.published_at = null;
    }

    const shouldUploadImage = Boolean(imageState.file);
    const shouldRemoveExistingImage = imageState.remove && !imageState.file;

    if (shouldRemoveExistingImage) {
      payload.image = null;
    }

    let requestPayload: BlogPostPayload | FormData = payload;

    if (shouldUploadImage && imageState.file) {
      const formData = new FormData();
      const appendValue = (key: string, value: unknown) => {
        if (typeof value === "undefined") {
          return;
        }

        if (value === null) {
          formData.append(key, "");
          return;
        }

        if (Array.isArray(value)) {
          if (value.length === 0) {
            formData.append(key, "");
            return;
          }
          value.forEach((item) => appendValue(`${key}[]`, item));
          return;
        }

        if (typeof value === "boolean") {
          formData.append(key, value ? "1" : "0");
          return;
        }

        formData.append(key, String(value));
      };

      Object.entries(payload).forEach(([key, value]) => {
        appendValue(key, value);
      });

      formData.append("image", imageState.file, imageState.file.name);
      requestPayload = formData;
    }

    setIsSaving(true);
    try {
      if (editing) {
        await apiClient.updateBlogPost(editing.id, requestPayload);
      } else {
        await apiClient.createBlogPost(requestPayload);
      }
      await fetchPosts();
      closeModal();
    } catch (error) {
      console.error("Nu am putut salva articolul de blog", error);
      setFormError("Nu am putut salva articolul. Verifică datele și încearcă din nou.");
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<BlogPost>[] = useMemo(
    () => [
      {
        id: "title",
        header: "Titlu",
        accessor: (row) => row.title,
        sortable: true,
        cell: (row) => (
          <div>
            <p className="font-medium text-gray-900">{row.title}</p>
            {row.excerpt && <p className="mt-1 text-sm text-gray-500">{row.excerpt}</p>}
          </div>
        ),
      },
      {
        id: "category",
        header: "Categorie",
        accessor: (row) => row.category?.name ?? "",
        sortable: true,
        cell: (row) => row.category?.name ?? "—",
      },
      {
        id: "status",
        header: "Stare",
        accessor: (row) => row.status ?? "",
        sortable: true,
        cell: (row) => {
          const status = row.status ?? "draft";
          const label = STATUS_LABELS[status] ?? status;
          const baseClasses = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium";
          let tone = "bg-gray-100 text-gray-700";
          if (status === "published") {
            tone = "bg-jade/10 text-jade";
          } else if (status === "scheduled") {
            tone = "bg-blue-100 text-blue-700";
          } else if (status === "archived") {
            tone = "bg-amber-100 text-amber-700";
          }
          return <span className={`${baseClasses} ${tone}`}>{label}</span>;
        },
      },
      {
        id: "published_at",
        header: "Publicat la",
        accessor: (row) => row.published_at ?? row.created_at ?? "",
        sortable: true,
        cell: (row) => formatDateTime(row.published_at ?? row.created_at),
      },
      {
        id: "author",
        header: "Autor",
        accessor: (row) => resolveAuthorName(row),
        sortable: true,
        cell: (row) => resolveAuthorName(row),
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
              aria-label={`Editează articolul ${row.title}`}
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                handleDelete(row);
              }}
              className="text-red-500 hover:text-red-600"
              aria-label={`Șterge articolul ${row.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [handleDelete, openEditModal, resolveAuthorName],
  );

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setAppliedSearch(searchValue.trim());
  };

  const handleResetFilters = () => {
    setFilters({ status: "all", category: "all" });
    setSearchValue("");
    setAppliedSearch("");
  };

  const previewSource =
    imageState.previewUrl ??
    (imageState.existingPath ? resolveMediaUrl(imageState.existingPath) : null);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-berkeley">Articole de blog</h1>
          <p className="text-sm text-gray-600">
            Publică și administrează articolele din blogul DaCars, împreună cu categoriile și etichetele asociate.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" /> Adaugă articol
        </Button>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <form
          onSubmit={handleSearchSubmit}
          className="grid gap-4 md:grid-cols-4 md:items-end"
        >
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="blog-filter-status">
              Stare
            </label>
            <Select
              id="blog-filter-status"
              value={filters.status}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
            >
              <option value="all">Toate</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="blog-filter-category">
              Categorie
            </label>
            <Select
              id="blog-filter-category"
              value={filters.category}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
            >
              <option value="all">Toate</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="blog-search">
              Căutare după titlu
            </label>
            <div className="flex gap-2">
              <Input
                id="blog-search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Introdu titlul articolului"
              />
              <Button type="submit" size="sm">
                Caută
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={handleResetFilters}>
                Resetează
              </Button>
            </div>
          </div>
        </form>
      </div>

      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {globalError}
        </div>
      )}

      <div className="rounded-lg bg-white p-4 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-gray-500">Se încarcă articolele...</p>
        ) : posts.length > 0 ? (
          <DataTable data={posts} columns={columns} pageSize={10} />
        ) : (
          <p className="text-sm text-gray-500">Nu există articole care să corespundă filtrului curent.</p>
        )}
      </div>

      <Popup
        open={isModalOpen}
        onClose={closeModal}
        className="max-w-3xl max-h-[calc(100vh-3rem)] overflow-hidden p-0"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 p-6">
              <h2 className="text-lg font-semibold text-berkeley">
                {editing ? "Editează articolul" : "Adaugă articol"}
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="blog-post-title">
                    Titlu
                  </label>
                  <Input
                    id="blog-post-title"
                    value={formState.title}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, title: event.target.value }));
                      if (formError) {
                        setFormError(null);
                      }
                    }}
                    placeholder="Introdu titlul articolului"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="blog-post-category">
                    Categorie
                  </label>
                  <Select
                    id="blog-post-category"
                    value={formState.categoryId}
                    onValueChange={(value) => {
                      setFormState((prev) => ({ ...prev, categoryId: value }));
                      if (formError) {
                        setFormError(null);
                      }
                    }}
                    required
                  >
                    <option value="">Selectează o categorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="blog-post-author">
                    Autor
                  </label>
                  <Select
                    id="blog-post-author"
                    value={formState.authorId}
                    onValueChange={(value) => {
                      setFormState((prev) => ({ ...prev, authorId: value }));
                      if (formError) {
                        setFormError(null);
                      }
                    }}
                    required
                  >
                    <option value="">Selectează un autor</option>
                    {authors.map((candidate) => (
                      <option key={candidate.id} value={String(candidate.id)}>
                        {getUserDisplayName(candidate)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="blog-post-status">
                    Stare
                  </label>
                  <Select
                    id="blog-post-status"
                    value={formState.status}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, status: value as BlogPostStatus }))
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label
                    className="text-sm font-medium text-gray-700"
                    htmlFor="blog-post-published-at"
                  >
                    Publicat la
                  </label>
                  <Input
                    id="blog-post-published-at"
                    type="datetime-local"
                    value={formState.publishedAt}
                    onChange={(event) => setFormState((prev) => ({ ...prev, publishedAt: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="blog-post-excerpt">
                    Rezumat scurt
                  </label>
                  <Textarea
                    id="blog-post-excerpt"
                    value={formState.excerpt}
                    onChange={(event) => setFormState((prev) => ({ ...prev, excerpt: event.target.value }))}
                    placeholder="Introdu un paragraf scurt pentru listri."
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="blog-post-image">
                  Imagine principală
                </label>
                <p className="text-xs text-gray-500">
                  Se afișează pe pagina publică a articolului și în listările din blog.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                  <div
                    className={`relative h-40 w-full overflow-hidden rounded-xl border ${
                      previewSource
                        ? "border-gray-200 bg-white"
                        : "border-dashed border-gray-300 bg-gray-50"
                    } sm:max-w-xs`}
                  >
                    {previewSource ? (
                      <Image
                        src={previewSource}
                        alt="Previzualizare imagine articol"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        Nicio imagine selectată
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3">
                    <label
                      htmlFor="blog-post-image"
                      className="inline-flex w-fit items-center gap-2 rounded-md border border-jade bg-jade px-4 py-2 text-sm font-medium text-white transition hover:bg-jade/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <input
                        id="blog-post-image"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageChange}
                        disabled={isSaving}
                      />
                      <UploadCloud className="h-4 w-4" aria-hidden="true" />
                      {previewSource ? "Schimbă imaginea" : "Încarcă imagine"}
                    </label>
                    {previewSource && (
                      <button
                        type="button"
                        onClick={handleImageRemove}
                        className="inline-flex w-fit items-center gap-2 text-sm text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        Elimină imaginea
                      </button>
                    )}
                    <p className="text-xs text-gray-500">
                      Acceptă imagini JPG, PNG sau WebP. Dimensiune recomandată 1280×720px.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700" htmlFor="blog-post-content">
                  Conținut
                </label>
                <Textarea
                  id="blog-post-content"
                  value={formState.content}
                  onChange={(event) => setFormState((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="Conținutul HTML sau Markdown al articolului."
                  rows={8}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="blog-post-meta-title">
                    Meta title
                  </label>
                  <Input
                    id="blog-post-meta-title"
                    value={formState.metaTitle}
                    onChange={(event) => setFormState((prev) => ({ ...prev, metaTitle: event.target.value }))}
                    placeholder="Titlu SEO (opțional)"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="text-sm font-medium text-gray-700"
                    htmlFor="blog-post-meta-description"
                  >
                    Meta description
                  </label>
                  <Textarea
                    id="blog-post-meta-description"
                    value={formState.metaDescription}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, metaDescription: event.target.value }))
                    }
                    placeholder="Descriere SEO (opțional)"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Etichete</p>
                {tags.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nu există etichete disponibile. Adaugă etichete înainte de a le atașa articolelor.
                  </p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {tags.map((tag) => {
                      const checked = formState.tagIds.includes(tag.id);
                      const inputId = `blog-tag-${tag.id}`;
                      return (
                        <label key={tag.id} htmlFor={inputId} className="flex items-center gap-2 text-sm">
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTag(tag.id)}
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
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-white p-6">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Renunță
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Se salvează..." : editing ? "Salvează articolul" : "Publică articolul"}
            </Button>
          </div>
        </form>
      </Popup>

    </div>
  );
};

export default BlogPostsPage;
