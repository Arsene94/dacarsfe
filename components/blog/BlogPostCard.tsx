"use client";

import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import { formatDate } from "@/lib/datetime";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveMediaUrl } from "@/lib/media";
import { getUserDisplayName } from "@/lib/users";
import type { BlogPost } from "@/types/blog";
import { useLocaleHref } from "@/lib/i18n/useLocaleHref";

type BlogPostCardProps = {
  post: BlogPost;
  locale?: Locale | string;
  ctaLabel: string;
  priority?: boolean;
};

const buildCategoryHref = (slug?: string | null, query?: string): string => {
  if (!slug) {
    return "/blog";
  }
  const params = new URLSearchParams();
  params.set("category", slug);
  if (query) {
    params.set("q", query);
  }
  const queryString = params.toString();
  return queryString ? `/blog?${queryString}` : "/blog";
};

const BlogPostCard = ({
  post,
  locale = DEFAULT_LOCALE,
  ctaLabel,
  priority = false,
}: BlogPostCardProps) => {
  const imageUrl = resolveMediaUrl(post.image ?? post.thumbnail ?? null);
  const authorName = post.author ? getUserDisplayName(post.author) : null;
  const publishedLabel = formatDate(post.published_at ?? post.created_at, undefined, locale);
  const hasPublishedDate = publishedLabel !== "—";
  const categorySlug = post.category?.slug ?? null;
  const categoryName = post.category?.name ?? null;
  const buildLocaleHref = useLocaleHref();

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-48 w-full overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 767px) 320px, (max-width: 1023px) 50vw, 320px"
            className="object-cover"
            priority={priority}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-berkeley/20 via-jade/10 to-berkeley/25" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {categoryName && (
          <Link
            href={buildLocaleHref(buildCategoryHref(categorySlug))}
            className="text-xs font-semibold uppercase tracking-wide text-berkeley"
          >
            {categoryName}
          </Link>
        )}
        <h3 className="mt-3 text-xl font-semibold text-gray-900">
          <Link
            href={buildLocaleHref(`/blog/${post.slug}`)}
            className="transition-colors hover:text-berkeley"
          >
            {post.title}
          </Link>
        </h3>
        {post.excerpt && (
          <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">
            {post.excerpt}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {hasPublishedDate && <span>{publishedLabel}</span>}
          {authorName && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {authorName}
            </span>
          )}
        </div>
        {post.tags && post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-berkeley/10 px-3 py-1 text-xs font-medium text-berkeley"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-6">
          <Link
            href={buildLocaleHref(`/blog/${post.slug}`)}
            className="inline-flex items-center text-sm font-semibold text-berkeley transition hover:text-berkeley/80"
          >
            {ctaLabel}
            <span className="ml-1">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
};

export default BlogPostCard;
