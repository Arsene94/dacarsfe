import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { ApiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { formatDate } from "@/lib/datetime";
import { resolveMediaUrl } from "@/lib/media";
import { getUserDisplayName } from "@/lib/users";
import { buildMetadata } from "@/lib/seo/meta";
import { absoluteUrl, siteMetadata } from "@/lib/seo/siteMetadata";
import { createBreadcrumbStructuredData } from "@/lib/seo/structuredData";
import type { BlogCategory, BlogPost, BlogPostListParams } from "@/types/blog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import JsonLd from "@/components/seo/JsonLd";
import BlogPostCard from "@/components/blog/BlogPostCard";

const PAGE_DESCRIPTION =
  "Descoperă ghiduri de călătorie, sfaturi pentru închirieri auto și noutăți din culisele DaCars.";

const metadataConfig = buildMetadata({
  title: "Blog DaCars | Ghiduri și sfaturi pentru călătorii inspirate",
  description: PAGE_DESCRIPTION,
  path: "/blog",
  openGraphTitle: "Blog DaCars – Sfaturi de închiriere și destinații recomandate",
});

export const metadata: Metadata = {
  ...metadataConfig,
};

const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const sortCategories = (entries: BlogCategory[]): BlogCategory[] =>
  [...entries].sort((a, b) => a.name.localeCompare(b.name, "ro", { sensitivity: "base" }));

const buildFilterHref = (category?: string | null, query?: string): string => {
  const params = new URLSearchParams();
  if (category) {
    params.set("category", category);
  }
  if (query) {
    params.set("q", query);
  }
  const queryString = params.toString();
  return queryString ? `/blog?${queryString}` : "/blog";
};

type BlogPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const BlogPage = async ({ searchParams }: BlogPageProps) => {
  const api = new ApiClient(getApiBaseUrl());

  const resolvedSearchParams = await searchParams;

  const searchTerm =
    typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q.trim() : "";
  const categorySlug =
    typeof resolvedSearchParams?.category === "string"
      ? resolvedSearchParams.category.trim()
      : "";

  const categoryResponse = await api.getBlogCategories({ perPage: 100, sort: "name" });
  let categories = sortCategories(extractList(categoryResponse));

  let selectedCategory: BlogCategory | null = null;
  let categoryId: number | undefined;
  if (categorySlug) {
    selectedCategory = categories.find((category) => category.slug === categorySlug) ?? null;
    if (!selectedCategory) {
      const slugResponse = await api.getBlogCategories({ limit: 1, slug: categorySlug });
      const [slugMatch] = extractList(slugResponse);
      if (slugMatch) {
        selectedCategory = slugMatch;
        categories = sortCategories([
          ...categories.filter((category) => category.id !== slugMatch.id),
          slugMatch,
        ]);
      }
    }
    categoryId = selectedCategory?.id ?? undefined;
  }

  const postsParams: BlogPostListParams = {
    limit: 9,
    status: "published",
    sort: "-published_at,-id",
    include: ["category", "tags", "author"],
  };
  if (categoryId) {
    postsParams.category_id = categoryId;
  }
  if (searchTerm) {
    postsParams.title = searchTerm;
  }

  const postsResponse = await api.getBlogPosts(postsParams);
  const posts = extractList(postsResponse);

  const [heroPost, ...otherPosts] = posts;

  const pageUrl = absoluteUrl("/blog");
  const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: "Acasă", item: siteMetadata.siteUrl },
    { name: "Blog", item: pageUrl },
  ]);
  const blogStructuredData =
    posts.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Blog DaCars",
          description: PAGE_DESCRIPTION,
          url: pageUrl,
          blogPost: posts.map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            datePublished: post.published_at ?? post.created_at,
            dateModified: post.updated_at ?? post.published_at ?? post.created_at,
            url: absoluteUrl(`/blog/${post.slug}`),
          })),
        }
      : null;

  return (
    <div className="bg-slate-50">
      {breadcrumbStructuredData && <JsonLd data={breadcrumbStructuredData} id="dacars-blog-breadcrumb" />}
      {blogStructuredData && <JsonLd data={blogStructuredData} id="dacars-blog-list" />}
      <section className="bg-berkeley py-16 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6">
          <div>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Blog DaCars</h1>
            <p className="mt-3 max-w-3xl text-base text-white/80">{PAGE_DESCRIPTION}</p>
          </div>
          <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              name="q"
              defaultValue={searchTerm}
              placeholder="Caută articole după titlu"
              className="flex-1 bg-white/10 text-white placeholder:text-white/60 focus:bg-white focus:text-[#191919]"
            />
            {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
            <Button type="submit" className="w-full sm:w-auto">
              Caută articole
            </Button>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-12 px-6 py-12">
        <div className="flex flex-wrap gap-3">
          <Link
            href={buildFilterHref(undefined, searchTerm)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              categorySlug
                ? "border-gray-200 text-gray-600 hover:border-berkeley hover:text-berkeley"
                : "border-berkeley bg-berkeley text-white"
            }`}
          >
            Toate articolele
          </Link>
          {categories.map((category) => {
            const active = category.slug === categorySlug;
            return (
              <Link
                key={category.id}
                href={buildFilterHref(category.slug ?? String(category.id), searchTerm)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  active
                    ? "border-berkeley bg-berkeley text-white"
                    : "border-gray-200 text-gray-600 hover:border-berkeley hover:text-berkeley"
                }`}
              >
                {category.name}
              </Link>
            );
          })}
        </div>

        {heroPost ? (
          <article className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="relative h-64 w-full overflow-hidden rounded-xl lg:h-full">
              {(() => {
                const heroImage = resolveMediaUrl(heroPost.thumbnail ?? null);
                if (!heroImage) {
                  return <div className="h-full w-full bg-gradient-to-br from-berkeley/20 via-jade/10 to-berkeley/25" />;
                }
                return (
                  <Image
                    src={heroImage}
                    alt={heroPost.title}
                    fill
                    sizes="(min-width: 1024px) 560px, 100vw"
                    className="object-cover"
                  />
                );
              })()}
            </div>
            <div className="space-y-4">
              {heroPost.category?.name && (
                <Link
                  href={buildFilterHref(heroPost.category?.slug ?? String(heroPost.category?.id), searchTerm)}
                  className="inline-flex text-sm font-semibold uppercase tracking-wide text-berkeley"
                >
                  {heroPost.category.name}
                </Link>
              )}
              <h2 className="text-3xl font-semibold text-gray-900">
                <Link href={`/blog/${heroPost.slug}`} className="hover:text-berkeley">
                  {heroPost.title}
                </Link>
              </h2>
              {heroPost.excerpt && (
                <p className="text-base leading-relaxed text-gray-600">{heroPost.excerpt}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {(() => {
                  const dateLabel = formatDate(heroPost.published_at ?? heroPost.created_at);
                  return dateLabel !== "—" ? <span>{dateLabel}</span> : null;
                })()}
                {heroPost.author && (
                  <span>De {getUserDisplayName(heroPost.author)}</span>
                )}
              </div>
              <Button asChild className="mt-2 w-full sm:w-auto">
                <Link href={`/blog/${heroPost.slug}`}>Citește articolul complet</Link>
              </Button>
            </div>
          </article>
        ) : (
          <p className="text-gray-600">
            Nu am găsit articole care să corespundă filtrului ales. Încearcă să modifici criteriile de căutare.
          </p>
        )}

        {otherPosts.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {otherPosts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BlogPage;
