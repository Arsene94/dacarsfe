import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import StructuredData from "@/components/StructuredData";
import { apiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { formatDate } from "@/lib/datetime";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale } from "@/lib/i18n/server";
import { applyBlogPostTranslation } from "@/lib/blog/translations";
import { resolveMediaUrl } from "@/lib/media";
import { buildMetadata } from "@/lib/seo/meta";
import { blogPosting, breadcrumb } from "@/lib/seo/jsonld";
import { getUserDisplayName } from "@/lib/users";
import type { BlogPost } from "@/types/blog";

export const revalidate = 300;

const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;
const HREFLANG_LOCALES = ["ro", "en", "it", "es", "fr", "de"] as const;

type BlogPostPageProps = {
    params: Promise<{ slug: string }>;
};

type BlogPostSeoCopy = {
    breadcrumbHome: string;
    breadcrumbBlog: string;
    publishedLabel: string;
    authorLabel: string;
    shareTitle: string;
    shareDescription: string;
    notFoundTitle: string;
    notFoundDescription: string;
};

const BLOG_POST_SEO_COPY: Record<Locale, BlogPostSeoCopy> = {
    ro: {
        breadcrumbHome: "Acasă",
        breadcrumbBlog: "Blog",
        publishedLabel: "Publicat la",
        authorLabel: "Autor",
        shareTitle: "Ți-a plăcut articolul?",
        shareDescription:
            "Distribuie-l colegilor din flotă și revino pe blog pentru noi actualizări despre mobilitatea DaCars.",
        notFoundTitle: "Articolul nu a fost găsit | DaCars",
        notFoundDescription: "Articolul căutat nu mai este disponibil sau a fost mutat.",
    },
    en: {
        breadcrumbHome: "Home",
        breadcrumbBlog: "Blog",
        publishedLabel: "Published on",
        authorLabel: "Author",
        shareTitle: "Enjoyed the article?",
        shareDescription:
            "Share it with your team and come back soon for fresh DaCars mobility updates and guides.",
        notFoundTitle: "Article not found | DaCars",
        notFoundDescription: "The requested article is no longer available or may have been moved.",
    },
    it: {
        breadcrumbHome: "Pagina iniziale",
        breadcrumbBlog: "Blog",
        publishedLabel: "Pubblicato il",
        authorLabel: "Autore",
        shareTitle: "Ti è piaciuto l'articolo?",
        shareDescription:
            "Condividilo con il tuo team e torna sul blog per nuove guide e aggiornamenti sulla mobilità DaCars.",
        notFoundTitle: "Articolo non trovato | DaCars",
        notFoundDescription: "L'articolo richiesto non è più disponibile oppure è stato spostato.",
    },
    es: {
        breadcrumbHome: "Inicio",
        breadcrumbBlog: "Blog",
        publishedLabel: "Publicado el",
        authorLabel: "Autor",
        shareTitle: "¿Te gustó el artículo?",
        shareDescription:
            "Compártelo con tu equipo y vuelve pronto para más novedades y guías sobre la movilidad DaCars.",
        notFoundTitle: "Artículo no encontrado | DaCars",
        notFoundDescription: "El artículo solicitado ya no está disponible o se ha movido.",
    },
    fr: {
        breadcrumbHome: "Accueil",
        breadcrumbBlog: "Blog",
        publishedLabel: "Publié le",
        authorLabel: "Auteur",
        shareTitle: "Vous avez aimé l'article ?",
        shareDescription:
            "Partagez-le avec votre équipe et revenez bientôt pour d'autres actualités sur la mobilité DaCars.",
        notFoundTitle: "Article introuvable | DaCars",
        notFoundDescription: "L'article demandé n'est plus disponible ou a été déplacé.",
    },
    de: {
        breadcrumbHome: "Startseite",
        breadcrumbBlog: "Blog",
        publishedLabel: "Veröffentlicht am",
        authorLabel: "Autor",
        shareTitle: "Hat dir der Artikel gefallen?",
        shareDescription:
            "Teile ihn mit deinem Team und schau bald wieder vorbei für neue Updates zur DaCars-Mobilität.",
        notFoundTitle: "Artikel nicht gefunden | DaCars",
        notFoundDescription: "Der gewünschte Artikel ist nicht mehr verfügbar oder wurde verschoben.",
    },
};

const resolveBlogPostSeo = async () => {
    const locale = await resolveRequestLocale();
    const copy = BLOG_POST_SEO_COPY[locale] ?? BLOG_POST_SEO_COPY[FALLBACK_LOCALE];
    return { locale, copy };
};

const cleanText = (value?: string | null): string => {
    if (!value) {
        return "";
    }

    return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

const resolvePostSummary = (post: BlogPost): string => {
    const meta = cleanText(post.meta_description);
    if (meta) {
        return meta;
    }

    const excerpt = cleanText(post.excerpt);
    if (excerpt) {
        return excerpt;
    }

    const content = cleanText(post.content);
    if (!content) {
        return "";
    }

    return content.length > 160 ? `${content.slice(0, 157)}...` : content;
};

const fetchBlogPost = cache(async (slug: string, locale: Locale): Promise<BlogPost | null> => {
    const baseParams = {
        slug,
        status: 'published',
        limit: 1,
    } as const;

    try {
        const response = await apiClient.getBlogPosts({ ...baseParams, language: locale });
        const posts = extractList<BlogPost>(response).map((post) => applyBlogPostTranslation(post, locale));
        if (posts.length > 0) {
            return posts[0];
        }
    } catch (error) {
        console.error('Nu am putut încărca articolul tradus', error);
    }

    if (locale === FALLBACK_LOCALE) {
        return null;
    }

    try {
        const fallbackResponse = await apiClient.getBlogPosts(baseParams);
        const posts = extractList<BlogPost>(fallbackResponse).map((post) => applyBlogPostTranslation(post, locale));
        return posts[0] ?? null;
    } catch (error) {
        console.error('Nu am putut încărca articolul din API', error);
        return null;
    }
});

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const { locale, copy } = await resolveBlogPostSeo();
    const post = await fetchBlogPost(slug, locale);

    if (!post) {
        return buildMetadata({
            title: copy.notFoundTitle,
            description: copy.notFoundDescription,
            path: `/blog/${slug}`,
            noIndex: true,
            hreflangLocales: HREFLANG_LOCALES,
            locale,
        });
    }

    const summary = resolvePostSummary(post);
    const resolvedTitle = post.meta_title?.trim().length ? post.meta_title : `${post.title} | ${SITE_NAME}`;
    const ogImage = resolveMediaUrl(post.image ?? post.thumbnail ?? null) ?? undefined;
    const keywords = post.tags?.map((tag) => tag.name).filter(Boolean);

    return buildMetadata({
        title: resolvedTitle,
        description: summary || post.title,
        path: `/blog/${post.slug}`,
        ogImage,
        hreflangLocales: HREFLANG_LOCALES,
        locale,
        keywords,
        openGraphTitle: resolvedTitle,
        twitterTitle: resolvedTitle,
    });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const { locale, copy } = await resolveBlogPostSeo();
    const post = await fetchBlogPost(slug, locale);

    if (!post) {
        notFound();
    }

    const summary = resolvePostSummary(post);
    const publishedLabel = formatDate(post.published_at ?? post.created_at, undefined, locale);
    const authorName = post.author ? getUserDisplayName(post.author) : SITE_NAME;
    const imageUrl = resolveMediaUrl(post.image ?? post.thumbnail ?? null) ?? undefined;
    const keywords = post.tags?.map((tag) => tag.name).filter(Boolean);

    const structuredData = [
        blogPosting({
            slug: post.slug,
            title: post.title,
            description: summary || post.title,
            image: imageUrl,
            author: { name: authorName },
            datePublished: post.published_at ?? post.created_at ?? new Date().toISOString(),
            dateModified: post.updated_at ?? post.published_at ?? post.created_at ?? undefined,
            keywords: keywords && keywords.length > 0 ? keywords : undefined,
        }),
        breadcrumb([
            { name: copy.breadcrumbHome, url: SITE_URL },
            { name: copy.breadcrumbBlog, url: `${SITE_URL}/blog` },
            { name: post.title, url: `${SITE_URL}/blog/${post.slug}` },
        ]),
    ];

    return (
        <article className="mx-auto max-w-3xl space-y-8 px-6 py-12">
            <StructuredData data={structuredData} id="blog-post-structured-data" />
            <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
                <ol className="flex flex-wrap items-center gap-2">
                    <li>
                        <Link href="/" className="hover:text-berkeley">
                            {copy.breadcrumbHome}
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li>
                        <Link href="/blog" className="hover:text-berkeley">
                            {copy.breadcrumbBlog}
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li aria-current="page" className="font-medium text-gray-900">
                        {post.title}
                    </li>
                </ol>
            </nav>

            <header className="space-y-4">
                {publishedLabel !== "—" && (
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                        {copy.publishedLabel} {publishedLabel}
                    </p>
                )}
                <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">{post.title}</h1>
                {summary && <p className="text-base text-gray-600">{summary}</p>}
                <p className="text-sm text-gray-500">
                    {copy.authorLabel}: {authorName}
                </p>
            </header>

            {post.content && (
                <div
                    className="prose prose-slate max-w-none text-base leading-relaxed text-gray-700 prose-a:text-berkeley"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />
            )}

            <footer className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">{copy.shareTitle}</h2>
                <p className="mt-2 text-sm text-gray-600">{copy.shareDescription}</p>
            </footer>
        </article>
    );
}
