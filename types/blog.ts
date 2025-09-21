export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface BlogCategoryListParams {
  page?: number;
  perPage?: number;
  per_page?: number;
  limit?: number;
  name?: string;
  slug?: string;
  sort?: string;
  fields?: string;
}

export type BlogCategoryPayload = Partial<{
  name: string;
  description: string | null;
}>;

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface BlogTagListParams {
  page?: number;
  perPage?: number;
  per_page?: number;
  limit?: number;
  name?: string;
  slug?: string;
  sort?: string;
  fields?: string;
}

export type BlogTagPayload = Partial<{
  name: string;
  description: string | null;
}>;

export interface BlogPostAuthor {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  [key: string]: unknown;
}

export type BlogPostStatus = "draft" | "published" | (string & {});

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  status?: BlogPostStatus | null;
  published_at?: string | null;
  category?: BlogCategory | null;
  category_id?: number | null;
  tags?: BlogTag[];
  tag_ids?: number[];
  author?: BlogPostAuthor | null;
  author_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export type BlogPostPayload = Partial<{
  category_id: number;
  author_id: number | null;
  title: string;
  excerpt: string | null;
  content: string | null;
  status: BlogPostStatus | null;
  published_at: string | null;
  tag_ids: Array<number | string>;
}>;

export interface BlogPostListParams {
  page?: number;
  perPage?: number;
  per_page?: number;
  limit?: number;
  category_id?: number | string;
  author_id?: number | string;
  status?: BlogPostStatus | string;
  title?: string;
  title_like?: string;
  slug?: string;
  sort?: string;
  fields?: string;
  include?: string;
}
