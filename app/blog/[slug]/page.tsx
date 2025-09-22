import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ApiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { formatDate } from "@/lib/datetime";
import { resolveMediaUrl } from "@/lib/media";
import { getUserDisplayName } from "@/lib/users";
import { buildMetadata } from "@/lib/seo/meta";
import { absoluteUrl, siteMetadata } from "@/lib/seo/siteMetadata";
import { createBreadcrumbStructuredData } from "@/lib/seo/structuredData";
import type { BlogPost, BlogPostListParams } from "@/types/blog";
import { Button } from "@/components/ui/button";
import JsonLd from "@/components/seo/JsonLd";
import BlogPostCard from "@/components/blog/BlogPostCard";

const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const fetchPostBySlug = cache(async (slug: string): Promise<BlogPost | null> => {
  if (!slug) {
    return null;
  }
  const api = new ApiClient(getApiBaseUrl());
  const params: BlogPostListParams = {
    limit: 1,
    slug,
    status: "published",
    include: ["category", "tags", "author"],
  };
  const response = await api.getBlogPosts(params);
  const [post] = extractList(response);
  return post ?? null;
});

type BlogPostPageProps = {
  params: { slug: string };
};

export const generateMetadata = async ({ params }: BlogPostPageProps): Promise<Metadata> => {
  const post = await fetchPostBySlug(params.slug);
  if (!post) {
    return buildMetadata({
      title: "Articolul de blog nu a fost găsit",
      description: "Articolul solicitat nu există sau a fost retras.",
      path: `/blog/${params.slug}`,
      noIndex: true,
    });
  }

  const pagePath = `/blog/${post.slug}`;
  const description =
    post.meta_description ??
    post.excerpt ??
    `Citește articolul „${post.title}” pe blogul DaCars și descoperă sfaturi utile pentru următoarea închiriere auto.`;
  const thumbnail = resolveMediaUrl(post.image ?? post.thumbnail ?? null);

  return buildMetadata({
    title: `${post.title} | Blog DaCars`,
    description,
    path: pagePath,
    openGraphTitle: `${post.title} | Blog DaCars`,
    image: thumbnail ? { src: thumbnail, alt: post.meta_title ?? post.title } : undefined,
    openGraphType: "article",
  });
};

const BlogPostPage = async ({ params }: BlogPostPageProps) => {
  const post = await fetchPostBySlug(params.slug);
  if (!post) {
    notFound();
  }

  const api = new ApiClient(getApiBaseUrl());
  const relatedParams: BlogPostListParams = {
    limit: 4,
    status: "published",
    sort: "-published_at,-id",
    include: ["category", "tags", "author"],
  };
  if (post.category_id) {
    relatedParams.category_id = post.category_id;
  }
  const relatedResponse = await api.getBlogPosts(relatedParams);
  const relatedCandidates = extractList(relatedResponse).filter((candidate) => candidate.id !== post.id);
  const relatedPosts = relatedCandidates.slice(0, 3);

  const pageUrl = absoluteUrl(`/blog/${post.slug}`);
  const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: "Acasă", item: siteMetadata.siteUrl },
    { name: "Blog", item: absoluteUrl("/blog") },
    { name: post.title, item: pageUrl },
  ]);

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description:
      post.meta_description ??
      post.excerpt ??
      `Citește articolul „${post.title}” pe blogul DaCars și află cele mai noi informații despre închirieri auto.`,
    author: post.author
      ? {
          "@type": "Person",
          name: getUserDisplayName(post.author),
        }
      : {
          "@type": "Organization",
          name: siteMetadata.siteName,
        },
    publisher: {
      "@type": "Organization",
      name: siteMetadata.siteName,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(siteMetadata.defaultSocialImage.src),
      },
    },
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at ?? post.published_at ?? post.created_at,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    image: resolveMediaUrl(post.image ?? post.thumbnail ?? null) ?? undefined,
  };

  const heroImage = resolveMediaUrl(post.image ?? post.thumbnail ?? null);
  const publishedLabel = formatDate(post.published_at ?? post.created_at);
  const authorName = post.author ? getUserDisplayName(post.author) : null;

  return (
    <div className="bg-slate-50">
      <JsonLd data={articleStructuredData} id={`dacars-blog-post-${post.id}`} />
      {breadcrumbStructuredData && (
        <JsonLd data={breadcrumbStructuredData} id={`dacars-blog-post-breadcrumb-${post.id}`} />
      )}
      <article className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href={post.category?.slug ? `/blog?category=${post.category.slug}` : "/blog"}
          className="text-sm font-semibold uppercase tracking-wide text-berkeley"
        >
          {post.category?.name ?? "Blog DaCars"}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-gray-900 sm:text-4xl">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          {publishedLabel !== "—" && <span>{publishedLabel}</span>}
          {authorName && <span>De {authorName}</span>}
        </div>
        {heroImage && (
          <div className="mt-8 overflow-hidden rounded-xl">
            <Image
              src={heroImage}
              alt={post.title}
              width={1280}
              height={640}
              className="h-auto w-full object-cover"
            />
          </div>
        )}
        <div
          className="max-w-none space-y-6 leading-relaxed text-gray-700 [&_a]:text-berkeley [&_a:hover]:underline [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6"
          dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
        />
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3">
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
        <div className="mt-10">
          <Button asChild variant="secondary">
            <Link href="/blog">Înapoi la blog</Link>
          </Button>
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-12">
          <h2 className="text-2xl font-semibold text-gray-900">Articole similare</h2>
          <p className="mt-2 text-sm text-gray-500">
            Inspiră-te din alte povești și recomandări pregătite de echipa DaCars.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {relatedPosts.map((related) => (
              <BlogPostCard key={related.id} post={related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default BlogPostPage;
