import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import { BlogCard } from "@/components/blog/BlogCard";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { buildMetadata } from "@/lib/seo/meta";
import { absoluteUrl, siteMetadata } from "@/lib/seo/siteMetadata";
import { createBreadcrumbStructuredData } from "@/lib/seo/structuredData";
import type { BlogPost } from "@/types/blog";

const dateFormatter = new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "long",
});

const FALLBACK_DESCRIPTION =
  "Articole despre închirieri auto, trasee recomandate și modul în care DaCars te ajută să ajungi mai rapid la destinație.";

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

const buildAuthorName = (post: BlogPost): string | null => {
  const author = post.author;
  if (!author) {
    return null;
  }
  const parts = [author.first_name, author.last_name].filter((part): part is string => Boolean(part));
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return author.email ?? null;
};

const fetchPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  const response = await apiClient.getBlogPosts({ limit: 1, slug, status: "published" });
  const posts = extractList(response);
  return posts.length > 0 ? posts[0] : null;
};

type BlogPostPageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await fetchPostBySlug(params.slug);
  const description = post?.excerpt ?? post?.meta_description ?? FALLBACK_DESCRIPTION;
  const path = `/blog/${params.slug}`;

  return buildMetadata({
    title: post ? `${post.title} | Blog DaCars` : "Articol blog | DaCars",
    description,
    path,
    openGraphTitle: post ? `${post.title} | Blog DaCars` : undefined,
    openGraphDescription: description,
  });
}

const BlogPostPage = async ({ params }: BlogPostPageProps) => {
  const post = await fetchPostBySlug(params.slug);
  if (!post) {
    notFound();
  }

  const relatedResponse = await apiClient.getBlogPosts({
    limit: 4,
    status: "published",
    sort: "-published_at,-id",
    ...(post.category?.id ? { category_id: post.category.id } : {}),
  });
  const relatedPosts = extractList(relatedResponse)
    .filter((item): item is BlogPost => Boolean(item))
    .filter((item) => item.slug !== post.slug)
    .slice(0, 3);

  const authorName = buildAuthorName(post);
  const publishedDate = formatPublishedDate(post);
  const articleUrl = absoluteUrl(`/blog/${post.slug}`);

  const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: "Acasă", item: siteMetadata.siteUrl },
    { name: "Blog", item: absoluteUrl("/blog") },
    { name: post.title, item: articleUrl },
  ]);

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    mainEntityOfPage: articleUrl,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    ...(post.updated_at ? { dateModified: post.updated_at } : {}),
    ...(post.category ? { articleSection: post.category.name } : {}),
    ...(authorName
      ? {
          author: {
            "@type": "Person",
            name: authorName,
          },
        }
      : {}),
  } as const;

  return (
    <>
      <JsonLd data={articleStructuredData} id={`dacars-blog-article-${post.slug}`} />
      {breadcrumbStructuredData && (
        <JsonLd data={breadcrumbStructuredData} id={`dacars-blog-breadcrumb-${post.slug}`} />
      )}
      <article className="bg-white">
        <header className="bg-berkeley py-16 text-white">
          <div className="mx-auto max-w-4xl px-4">
            <nav className="flex flex-wrap items-center gap-2 text-sm text-white/70" aria-label="Breadcrumb">
              <Link href="/blog" className="hover:text-jadeLight">
                Blog
              </Link>
              {post.category && (
                <span aria-hidden="true" className="text-white/50">
                  /
                </span>
              )}
              {post.category && <span>{post.category.name}</span>}
            </nav>
            <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">{post.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
              {publishedDate && <span>{publishedDate}</span>}
              {authorName && <span>{authorName}</span>}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-12">
          {post.tags && post.tags.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-600"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <div
            className="space-y-6 text-lg leading-relaxed text-gray-700 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-8 [&_h3]:text-xl [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-jade [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
          />
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="bg-gray-50 py-12">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-berkeley">Articole similare</h2>
              <Link href="/blog" className="text-sm font-medium text-jade hover:text-jadeLight">
                Vezi toate articolele
              </Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((item) => (
                <BlogCard key={item.id} post={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default BlogPostPage;

