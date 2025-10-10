export interface BlogCategory {
  id: number;
  name: string;
  slug?: string;
  description?: string | null;
  status?: string | null;
  parent_id?: number | null;
  icon?: string | null;
  order?: number | null;
  is_featured?: boolean | number | null;
  is_default?: boolean | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  translations?: BlogCategoryTranslation[];
  [key: string]: unknown;
}

export interface BlogCategoryTranslation {
  lang?: string;
  name?: string;
  description?: string | null;
}

export type BlogCategoryTranslationPayload = Partial<{
  name: string | null;
  description: string | null;
}> &
  Record<string, unknown>;

export type BlogCategoryPayload = Partial<{
  name: string;
  description: string | null;
  parent_id: number | null;
  status: string | null;
  icon: string | null;
  order: number | null;
  is_featured: boolean | number | null;
  is_default: boolean | number | null;
}> & Record<string, unknown>;

export interface BlogCategoryListParams {
  page?: number;
  perPage?: number;
  per_page?: number;
  limit?: number;
  name?: string;
  slug?: string;
  sort?: string;
  fields?: string;
  search?: string;
}

export interface BlogTag {
  id: number;
  name: string;
  slug?: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export type BlogTagPayload = Partial<{
  name: string;
  description: string | null;
}> & Record<string, unknown>;

export interface BlogTagListParams {
  page?: number;
  perPage?: number;
  per_page?: number;
  limit?: number;
  name?: string;
  slug?: string;
  sort?: string;
  fields?: string;
  search?: string;
}

export interface BlogPostAuthor {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  [key: string]: unknown;
}

export type BlogPostStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "archived"
  | (string & {});

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  status?: BlogPostStatus | null;
  published_at?: string | null;
  image?: string | null;
  thumbnail?: string | null;
  category?: BlogCategory | null;
  category_id?: number | null;
  tags?: BlogTag[];
  tag_ids?: number[];
  author?: BlogPostAuthor | null;
  author_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  translations?: BlogPostTranslation[];
  [key: string]: unknown;
}

export interface BlogPostTranslation {
  lang?: string;
  title?: string;
  excerpt?: string | null;
  content?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
}

export type BlogPostTranslationPayload = Partial<{
  title: string | null;
  excerpt: string | null;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
}> &
  Record<string, unknown>;

export type BlogPostPayload = Partial<{
  category_id: number;
  author_id: number | null;
  title: string;
  excerpt: string | null;
  content: string | null;
  status: BlogPostStatus | null;
  published_at: string | null;
  image: string | null;
  thumbnail: string | null;
  meta_title: string | null;
  meta_description: string | null;
  tag_ids: Array<number | string>;
}> & Record<string, unknown>;

export interface BlogPostListParams {
  page?: number;
  perPage?: number;
  per_page?: number;
  limit?: number;
  category_id?: number | string;
  author_id?: number | string;
  status?: BlogPostStatus | string;
  slug?: string;
  title?: string;
  sort?: string;
  fields?: string;
  include?: string | readonly string[];
  search?: string;
}
