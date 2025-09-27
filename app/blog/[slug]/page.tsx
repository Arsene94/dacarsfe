import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale } from "@/lib/i18n/server";
import { STATIC_BLOG_POSTS } from "@/lib/content/staticEntries";
import { buildMetadata } from "@/lib/seo/meta";
import { blogPosting, breadcrumb } from "@/lib/seo/jsonld";

type BlogPostPageProps = {
    params: Promise<{ slug: string }>;
};

const findPost = (slug: string) => STATIC_BLOG_POSTS.find((entry) => entry.slug === slug);

export const dynamicParams = false;

export function generateStaticParams() {
    return STATIC_BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

type BlogPostSeoCopy = {
    breadcrumbHome: string;
    breadcrumbBlog: string;
    notFoundTitle: string;
    notFoundDescription: string;
};

const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;
const HREFLANG_LOCALES = ["ro", "en", "it", "es", "fr", "de"] as const;

const BLOG_POST_SEO_COPY: Record<Locale, BlogPostSeoCopy> = {
    ro: {
        breadcrumbHome: "Acasă",
        breadcrumbBlog: "Blog",
        notFoundTitle: "Articolul nu a fost găsit | DaCars",
        notFoundDescription: "Articolul căutat nu mai este disponibil sau a fost mutat.",
    },
    en: {
        breadcrumbHome: "Home",
        breadcrumbBlog: "Blog",
        notFoundTitle: "Article not found | DaCars",
        notFoundDescription: "The requested article is no longer available or has been moved.",
    },
    it: {
        breadcrumbHome: "Pagina iniziale",
        breadcrumbBlog: "Blog",
        notFoundTitle: "Articolo non trovato | DaCars",
        notFoundDescription: "L'articolo richiesto non è più disponibile o è stato spostato.",
    },
    es: {
        breadcrumbHome: "Inicio",
        breadcrumbBlog: "Blog",
        notFoundTitle: "Artículo no encontrado | DaCars",
        notFoundDescription: "El artículo solicitado ya no está disponible o se ha movido.",
    },
    fr: {
        breadcrumbHome: "Accueil",
        breadcrumbBlog: "Blog",
        notFoundTitle: "Article introuvable | DaCars",
        notFoundDescription: "L'article demandé n'est plus disponible ou a été déplacé.",
    },
    de: {
        breadcrumbHome: "Startseite",
        breadcrumbBlog: "Blog",
        notFoundTitle: "Artikel nicht gefunden | DaCars",
        notFoundDescription: "Der gewünschte Artikel ist nicht mehr verfügbar oder wurde verschoben.",
    },
};

const resolveBlogPostSeo = () => {
    const locale = resolveRequestLocale();
    const copy = BLOG_POST_SEO_COPY[locale] ?? BLOG_POST_SEO_COPY[FALLBACK_LOCALE];
    return { locale, copy };
};

const resolveDescription = (post: (typeof STATIC_BLOG_POSTS)[number]): string => {
    if (post.excerpt && post.excerpt.trim().length > 0) {
        return post.excerpt;
    }

    const raw = post.content.join(" ").trim();
    return raw.length > 160 ? `${raw.slice(0, 157)}...` : raw;
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const { locale, copy } = resolveBlogPostSeo();
    const post = findPost(slug);

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

    const description = resolveDescription(post);

    return buildMetadata({
        title: `${post.title} | ${SITE_NAME}`,
        description,
        path: `/blog/${post.slug}`,
        ogImage: undefined,
        hreflangLocales: HREFLANG_LOCALES,
        locale,
    });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const { copy } = resolveBlogPostSeo();
    const post = findPost(slug);

    if (!post) {
        notFound();
    }

    const description = resolveDescription(post);

    const structuredData = [
        blogPosting({
            slug: post.slug,
            title: post.title,
            description,
            author: { name: post.author },
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
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

            <header className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Publicat la {post.publishedAt}</p>
                <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">{post.title}</h1>
                <p className="text-base text-gray-600">{description}</p>
                <p className="text-sm text-gray-500">Autor: {post.author}</p>
            </header>

            <div className="space-y-5 text-base leading-relaxed text-gray-700">
                {post.content.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                ))}
            </div>

            <footer className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Ți-a plăcut articolul?</h2>
                <p className="mt-2 text-sm text-gray-600">
                    Distribuie-l colegilor din flotă și revino pe blog pentru noi actualizări despre mobilitatea DaCars.
                </p>
            </footer>
        </article>
    );
}
