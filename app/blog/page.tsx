import type { Metadata } from "next";
import Link from "next/link";
import { BlogCard } from "@/components/blog/BlogCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import JsonLd from "@/components/seo/JsonLd";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { buildMetadata } from "@/lib/seo/meta";
import { absoluteUrl, siteMetadata } from "@/lib/seo/siteMetadata";
import {
  createBreadcrumbStructuredData,
  createSearchActionStructuredData,
} from "@/lib/seo/structuredData";
import { getBlogRequestOptions } from "@/lib/blogServer";
import type { ApiListResponse } from "@/types/api";
import type { BlogCategory, BlogPost } from "@/types/blog";

const BLOG_PAGE_SIZE = 9;
const PAGE_DESCRIPTION =
  "Informații utile despre închirieri auto, ghiduri de călătorie și noutăți din platforma DaCars.";

const metadataConfig = buildMetadata({
  title: "Blog DaCars – Sfaturi și noutăți despre închirieri auto",
  description: PAGE_DESCRIPTION,
  path: "/blog",
  openGraphTitle: "Blog DaCars | Sfaturi pentru închirieri auto și roadtrip-uri reușite",
});

export const metadata: Metadata = {
  ...metadataConfig,
};

const siteUrl = siteMetadata.siteUrl;
const pageUrl = absoluteUrl("/blog");

const searchStructuredData = createSearchActionStructuredData({
  siteUrl,
  siteName: siteMetadata.siteName,
  target: `${pageUrl}?q={search_term_string}`,
  queryInput: "required name=search_term_string",
});

const breadcrumbStructuredData = createBreadcrumbStructuredData([
  { name: "Acasă", item: siteUrl },
  { name: "Blog", item: pageUrl },
]);

type BlogPageSearchParams = {
  categorie?: string | string[];
  category?: string | string[];
  page?: string | string[];
  q?: string | string[];
  search?: string | string[];
};

const getStringParam = (value: string | string[] | undefined): string => {
  if (!value) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] ?? "" : "";
  }
  return value;
};

const parsePageNumber = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
};

const computeTotalPages = (response: ApiListResponse<BlogPost> | BlogPost[], fallbackPerPage: number): number => {
  if (Array.isArray(response)) {
    return 1;
  }
  const meta = response.meta ?? response.pagination;
  if (!meta) {
    return 1;
  }
  const total = meta.total ?? meta.count ?? 0;
  const perPage = meta.per_page ?? meta.perPage ?? fallbackPerPage;
  const lastPage = meta.last_page ?? meta.lastPage;
  if (typeof lastPage === "number" && Number.isFinite(lastPage)) {
    return Math.max(1, lastPage);
  }
  if (total > 0 && perPage > 0) {
    return Math.max(1, Math.ceil(total / perPage));
  }
  return 1;
};

const buildQueryLink = (
  page: number,
  categorySlug: string,
  query: string,
): string => {
  const params = new URLSearchParams();
  if (categorySlug) {
    params.set("categorie", categorySlug);
  }
  if (query) {
    params.set("q", query);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const queryString = params.toString();
  return queryString ? `/blog?${queryString}` : "/blog";
};

const buildCategoryLink = (slug: string, currentQuery: string): string => {
  const params = new URLSearchParams();
  if (slug) {
    params.set("categorie", slug);
  }
  if (currentQuery) {
    params.set("q", currentQuery);
  }
  const queryString = params.toString();
  return queryString ? `/blog?${queryString}` : "/blog";
};

const getPageNumbers = (current: number, total: number): number[] => {
  const maxVisible = 5;
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const offset = Math.floor(maxVisible / 2);
  let start = Math.max(1, current - offset);
  let end = start + maxVisible - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - maxVisible + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

type BlogPageProps = {
  searchParams?: BlogPageSearchParams | Promise<BlogPageSearchParams>;
};

const BlogPage = async ({ searchParams }: BlogPageProps) => {
  const params = (await searchParams) ?? {};
  const categorySlug = getStringParam(params.categorie ?? params.category);
  const query = getStringParam(params.q ?? params.search);
  const page = parsePageNumber(getStringParam(params.page));
  const blogRequestOptions = getBlogRequestOptions();

  let categories: BlogCategory[] = [];
  let categoriesError = false;
  try {
    const categoriesResponse = await apiClient.getBlogCategories(
      { limit: 24, sort: "name" },
      blogRequestOptions,
    );
    categories = extractList(categoriesResponse)
      .filter((item): item is BlogCategory => Boolean(item && typeof item === "object"))
      .map((item) => ({ ...item }))
      .filter((item): item is BlogCategory => typeof item.id === "number" && typeof item.name === "string" && typeof item.slug === "string");
  } catch (error) {
    console.error("Nu am putut încărca categoriile de blog", error);
    categoriesError = true;
  }

  const selectedCategory = categories.find((category) => category.slug === categorySlug);

  let postsSource: ApiListResponse<BlogPost> | BlogPost[] = [];
  let posts: BlogPost[] = [];
  let postsError = false;
  try {
    const postsResponse = await apiClient.getBlogPosts(
      {
        perPage: BLOG_PAGE_SIZE,
        page,
        status: "published",
        sort: "-published_at,-id",
        ...(selectedCategory ? { category_id: selectedCategory.id } : {}),
        ...(query ? { title_like: query } : {}),
      },
      blogRequestOptions,
    );
    postsSource = postsResponse as ApiListResponse<BlogPost> | BlogPost[];
    posts = extractList(postsResponse);
  } catch (error) {
    console.error("Nu am putut încărca articolele de blog", error);
    postsError = true;
  }

  const totalPages = computeTotalPages(postsSource, BLOG_PAGE_SIZE);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pageNumbers = getPageNumbers(safePage, totalPages);

  return (
    <>
      {searchStructuredData && <JsonLd data={searchStructuredData} id="dacars-blog-search" />}
      {breadcrumbStructuredData && <JsonLd data={breadcrumbStructuredData} id="dacars-blog-breadcrumb" />}
      <section className="bg-berkeley py-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-3xl font-semibold sm:text-4xl">Descoperă blogul DaCars</h1>
          <p className="mt-4 max-w-2xl text-base text-white/80">{PAGE_DESCRIPTION}</p>
          <form className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row" method="get">
            <Input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Caută după titlu sau cuvinte cheie"
              aria-label="Caută articole în blog"
            />
            {categorySlug && <input type="hidden" name="categorie" value={categorySlug} />}
            <Button type="submit" size="sm" className="whitespace-nowrap">
              Caută
            </Button>
          </form>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap gap-3">
            <Link
              href={buildCategoryLink("", query)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                categorySlug
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-jade text-white shadow"
              }`}
            >
              Toate articolele
            </Link>
            {categories.map((category) => {
              const active = category.slug === categorySlug;
              return (
                <Link
                  key={category.id}
                  href={buildCategoryLink(category.slug ?? "", query)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-jade text-white shadow"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </Link>
              );
            })}
          </div>
          {categoriesError && (
            <p className="mt-3 text-sm text-red-600">
              Nu am putut încărca categoriile de blog. Te rugăm să reîncerci mai târziu.
            </p>
          )}
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          {postsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center text-red-700">
              Nu am putut încărca articolele de blog. Te rugăm să reîncerci mai târziu.
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-600">
              Nu am găsit articole care să corespundă filtrării curente.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-12 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                {safePage > 1 && (
                  <Link
                    href={buildQueryLink(safePage - 1, categorySlug, query)}
                    className="rounded-full px-4 py-2 text-sm font-medium text-jade transition hover:bg-jade/10"
                  >
                    Anterior
                  </Link>
                )}
                <div className="flex items-center gap-1">
                  {pageNumbers.map((pageNumber) => (
                    <Link
                      key={pageNumber}
                      href={buildQueryLink(pageNumber, categorySlug, query)}
                      className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                        pageNumber === safePage
                          ? "bg-jade text-white shadow"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      aria-current={pageNumber === safePage ? "page" : undefined}
                    >
                      {pageNumber}
                    </Link>
                  ))}
                </div>
                {safePage < totalPages && (
                  <Link
                    href={buildQueryLink(safePage + 1, categorySlug, query)}
                    className="rounded-full px-4 py-2 text-sm font-medium text-jade transition hover:bg-jade/10"
                  >
                    Următor
                  </Link>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Pagina {safePage} din {totalPages}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default BlogPage;

