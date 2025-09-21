import Link from "next/link";
import type { BlogPost } from "@/types/blog";

const dateFormatter = new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "medium",
});

const truncateText = (value: string, maxLength = 180): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trimEnd()}…`;
};

const extractExcerpt = (post: BlogPost): string => {
  if (typeof post.excerpt === "string" && post.excerpt.trim().length > 0) {
    return post.excerpt.trim();
  }
  if (typeof post.content === "string") {
    const stripped = post.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (stripped.length > 0) {
      return truncateText(stripped, 220);
    }
  }
  return "Descoperă toate detaliile în articol.";
};

const formatPublishedDate = (post: BlogPost): string | null => {
  const candidate = post.published_at ?? post.created_at;
  if (!candidate) {
    return null;
  }
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return dateFormatter.format(parsed);
};

type BlogCardProps = {
  post: BlogPost;
};

export function BlogCard({ post }: BlogCardProps) {
  const href = `/blog/${post.slug}`;
  const publishedDate = formatPublishedDate(post);
  const excerpt = extractExcerpt(post);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex-1 space-y-4 p-6">
        {post.category && (
          <span className="inline-flex items-center rounded-full bg-jade/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-jade">
            {post.category.name}
          </span>
        )}
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-berkeley">
            <Link href={href}>{post.title}</Link>
          </h3>
          <p className="text-sm text-gray-600">{excerpt}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4 text-xs text-gray-500">
        <div className="flex flex-wrap items-center gap-2">
          {publishedDate && <span>{publishedDate}</span>}
          {post.author?.first_name || post.author?.last_name || post.author?.email ? (
            <span>
              {[
                post.author?.first_name ?? "",
                post.author?.last_name ?? "",
              ]
                .filter((part) => part && part.length > 0)
                .join(" ") || post.author?.email || ""}
            </span>
          ) : null}
        </div>
        <Link
          href={href}
          className="font-medium text-jade transition hover:text-jadeLight"
          aria-label={`Citește articolul ${post.title}`}
        >
          Citește
        </Link>
      </div>
    </article>
  );
}

