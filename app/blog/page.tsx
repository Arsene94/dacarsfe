import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import BlogPostCard from "@/components/blog/BlogPostCard";
import { apiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale } from "@/lib/i18n/server";
import { applyBlogPostTranslation } from "@/lib/blog/translations";
import { buildMetadata } from "@/lib/seo/meta";
import { blog, breadcrumb, itemList } from "@/lib/seo/jsonld";
import type { BlogPost } from "@/types/blog";

type BlogSeoCopy = {
    pageTitle: string;
    pageDescription: string;
    metaTitle: string;
    metaDescription: string;
    breadcrumbHome: string;
    breadcrumbBlog: string;
    readMoreLabel: string;
    emptyStateTitle: string;
    emptyStateDescription: string;
};

const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;
const HREFLANG_LOCALES = ["ro", "en", "it", "es", "fr", "de"] as const;

export const revalidate = 300;

const BLOG_SEO_COPY: Record<Locale, BlogSeoCopy> = {
    ro: {
        pageTitle: "Blog DaCars",
        pageDescription:
            "Informații proaspete despre mobilitate, predare rapidă și optimizarea flotei DaCars.",
        metaTitle: `Blog | Sfaturi, ghiduri și noutăți | ${SITE_NAME}`,
        metaDescription:
            "Citește cele mai noi recomandări de mobilitate, bune practici de închiriere și știri din echipa DaCars.",
        breadcrumbHome: "Acasă",
        breadcrumbBlog: "Blog",
        readMoreLabel: "Citește articolul",
        emptyStateTitle: "Momentan nu avem articole publicate",
        emptyStateDescription:
            "Revino în curând pentru a descoperi noi ghiduri și noutăți despre serviciile de mobilitate DaCars.",
    },
    en: {
        pageTitle: "DaCars Blog",
        pageDescription:
            "Fresh mobility insights, fast handover tips, and fleet optimization stories from DaCars.",
        metaTitle: `Blog | Tips, Guides & News | ${SITE_NAME}`,
        metaDescription:
            "Read the latest mobility tips, rental best practices, and news updates curated by the DaCars team.",
        breadcrumbHome: "Home",
        breadcrumbBlog: "Blog",
        readMoreLabel: "Read the article",
        emptyStateTitle: "No posts are available yet",
        emptyStateDescription:
            "Check back soon for new stories, guides, and updates from the DaCars mobility team.",
    },
    it: {
        pageTitle: "Blog DaCars",
        pageDescription:
            "Approfondimenti sulla mobilità, consigli per consegne rapide e strategie di flotta firmate DaCars.",
        metaTitle: `Blog | Consigli, guide e novità | ${SITE_NAME}`,
        metaDescription:
            "Leggi i consigli più recenti sulla mobilità, le migliori pratiche di noleggio e le novità dal team DaCars.",
        breadcrumbHome: "Pagina iniziale",
        breadcrumbBlog: "Blog",
        readMoreLabel: "Leggi l'articolo",
        emptyStateTitle: "Non ci sono articoli disponibili",
        emptyStateDescription:
            "Torna presto per scoprire nuove guide e aggiornamenti sul mondo della mobilità DaCars.",
    },
    es: {
        pageTitle: "Blog de DaCars",
        pageDescription:
            "Novedades sobre movilidad, consejos para entregas rápidas y estrategias de flota DaCars.",
        metaTitle: `Blog | Consejos, guías y noticias | ${SITE_NAME}`,
        metaDescription:
            "Lee los últimos consejos de movilidad, buenas prácticas de alquiler y noticias del equipo DaCars.",
        breadcrumbHome: "Inicio",
        breadcrumbBlog: "Blog",
        readMoreLabel: "Leer el artículo",
        emptyStateTitle: "Todavía no hay artículos disponibles",
        emptyStateDescription:
            "Vuelve pronto para descubrir nuevas guías y novedades sobre la movilidad de DaCars.",
    },
    fr: {
        pageTitle: "Blog DaCars",
        pageDescription:
            "Actualités mobilité, conseils de remise rapide et optimisations de flotte signées DaCars.",
        metaTitle: `Blog | Conseils, guides et actualités | ${SITE_NAME}`,
        metaDescription:
            "Découvrez les derniers conseils mobilité, bonnes pratiques de location et nouvelles de l'équipe DaCars.",
        breadcrumbHome: "Accueil",
        breadcrumbBlog: "Blog",
        readMoreLabel: "Lire l'article",
        emptyStateTitle: "Aucun article n'est disponible pour le moment",
        emptyStateDescription:
            "Revenez bientôt pour découvrir de nouveaux guides et actualités sur la mobilité DaCars.",
    },
    de: {
        pageTitle: "DaCars Blog",
        pageDescription:
            "Aktuelle Einblicke in Mobilität, schnelle Übergaben und Flottenoptimierung von DaCars.",
        metaTitle: `Blog | Tipps, Guides & News | ${SITE_NAME}`,
        metaDescription:
            "Lies die neuesten Mobilitätstipps, Vermietungs-Best-Practices und Neuigkeiten vom DaCars-Team.",
        breadcrumbHome: "Startseite",
        breadcrumbBlog: "Blog",
        readMoreLabel: "Artikel lesen",
        emptyStateTitle: "Derzeit sind keine Artikel verfügbar",
        emptyStateDescription:
            "Schau bald wieder vorbei, um neue Guides und Neuigkeiten rund um die Mobilität von DaCars zu entdecken.",
    },
};

const resolveBlogSeo = async () => {
    const locale = await resolveRequestLocale();
    const copy = BLOG_SEO_COPY[locale] ?? BLOG_SEO_COPY[FALLBACK_LOCALE];
    return { locale, copy };
};

export async function generateMetadata(): Promise<Metadata> {
    const { locale, copy } = await resolveBlogSeo();

    return buildMetadata({
        title: copy.metaTitle,
        description: copy.metaDescription,
        path: "/blog",
        hreflangLocales: HREFLANG_LOCALES,
        locale,
        openGraphTitle: copy.metaTitle,
        twitterTitle: copy.metaTitle,
    });
}

const loadBlogPosts = async (locale: Locale): Promise<BlogPost[]> => {
    const baseParams = {
        status: 'published',
        sort: '-published_at,-id',
        limit: 12,
    } as const;

    try {
        const response = await apiClient.getBlogPosts({ ...baseParams, language: locale });
        const posts = extractList<BlogPost>(response).map((post) => applyBlogPostTranslation(post, locale));
        if (posts.length > 0) {
            return posts;
        }
    } catch (error) {
        console.error('Nu am putut încărca articolele traduse', error);
    }

    if (locale === FALLBACK_LOCALE) {
        return [];
    }

    try {
        const fallbackResponse = await apiClient.getBlogPosts(baseParams);
        return extractList<BlogPost>(fallbackResponse).map((post) => applyBlogPostTranslation(post, locale));
    } catch (error) {
        console.error('Nu am putut încărca articolele din API', error);
        return [];
    }
};

const BlogIndexPage = async () => {
    const { locale, copy } = await resolveBlogSeo();
    const posts = await loadBlogPosts(locale);
    const postsItemList = itemList(
        posts.map((post) => ({
            name: post.title,
            url: `${SITE_URL}/blog/${post.slug}`,
            description: post.excerpt ?? copy.metaDescription,
            schemaType: "Article",
        })),
    );
    const structuredData = [
        blog({ description: copy.metaDescription }),
        postsItemList,
        breadcrumb([
            { name: copy.breadcrumbHome, url: SITE_URL },
            { name: copy.breadcrumbBlog, url: `${SITE_URL}/blog` },
        ]),
    ];

    return (
        <main className="mx-auto max-w-5xl space-y-10 px-6 py-12">
            <StructuredData data={structuredData} id="blog-index-structured-data" />
            <header className="rounded-xl bg-berkeley px-6 py-12 text-white">
                <h1 className="text-3xl font-semibold sm:text-4xl">{copy.pageTitle}</h1>
                <p className="mt-3 max-w-3xl text-base text-white/80">{copy.pageDescription}</p>
            </header>

            <section className="grid gap-8 md:grid-cols-2">
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <BlogPostCard
                            key={post.id}
                            post={post}
                            locale={locale}
                            ctaLabel={copy.readMoreLabel}
                        />
                    ))
                ) : (
                    <div className="col-span-full rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900">{copy.emptyStateTitle}</h2>
                        <p className="mt-2 text-sm text-gray-600">{copy.emptyStateDescription}</p>
                    </div>
                )}
            </section>
        </main>
    );
};

export default BlogIndexPage;
