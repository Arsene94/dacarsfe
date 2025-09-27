import Link from "next/link";
import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale } from "@/lib/i18n/server";
import { STATIC_BLOG_POSTS } from "@/lib/content/staticEntries";
import { buildMetadata } from "@/lib/seo/meta";
import { blog, breadcrumb, itemList } from "@/lib/seo/jsonld";

type BlogSeoCopy = {
    pageTitle: string;
    pageDescription: string;
    metaTitle: string;
    metaDescription: string;
    breadcrumbHome: string;
    breadcrumbBlog: string;
};

const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;
const HREFLANG_LOCALES = ["ro", "en", "it", "es", "fr", "de"] as const;

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
    },
};

const resolveBlogSeo = () => {
    const locale = resolveRequestLocale();
    const copy = BLOG_SEO_COPY[locale] ?? BLOG_SEO_COPY[FALLBACK_LOCALE];
    return { locale, copy };
};

export async function generateMetadata(): Promise<Metadata> {
    const { locale, copy } = resolveBlogSeo();

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

const postsItemList = itemList(
    STATIC_BLOG_POSTS.map((post) => ({
        name: post.title,
        url: `${SITE_URL}/blog/${post.slug}`,
        description: post.excerpt,
        schemaType: "Article",
    })),
);

const BlogIndexPage = () => {
    const { copy } = resolveBlogSeo();
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
                {STATIC_BLOG_POSTS.map((post) => (
                    <article key={post.slug} className="flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Publicat la {post.publishedAt}</p>
                            <h2 className="text-2xl font-semibold text-gray-900">
                                <Link href={`/blog/${post.slug}`} className="hover:text-berkeley">
                                    {post.title}
                                </Link>
                            </h2>
                            <p className="text-sm text-gray-600">{post.excerpt}</p>
                        </div>
                        <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
                            <span>de {post.author}</span>
                            <Link href={`/blog/${post.slug}`} className="font-medium text-berkeley hover:underline">
                                Citește articolul
                            </Link>
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
};

export default BlogIndexPage;
