import { apiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { blog, blogPosting, breadcrumb, itemList, type JsonLd } from "@/lib/seo/jsonld";
import { resolveMediaUrl } from "@/lib/media";
import { getUserDisplayName } from "@/lib/users";
import type { BlogPost } from "@/types/blog";
import { applyBlogPostTranslation } from "@/lib/blog/translations";

export type BlogIndexCopy = {
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

export type BlogPostCopy = {
    breadcrumbHome: string;
    breadcrumbBlog: string;
    publishedLabel: string;
    authorLabel: string;
    shareTitle: string;
    shareDescription: string;
    notFoundTitle: string;
    notFoundDescription: string;
};

export const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;
export const BLOG_HREFLANG_LOCALES = ["ro", "en", "it", "es", "fr", "de"] as const;

export const BLOG_INDEX_COPY: Record<Locale, BlogIndexCopy> = {
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

export const BLOG_POST_COPY: Record<Locale, BlogPostCopy> = {
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

export const getBlogIndexCopy = (locale: Locale): BlogIndexCopy =>
    BLOG_INDEX_COPY[locale] ?? BLOG_INDEX_COPY[FALLBACK_LOCALE];

export const getBlogPostCopy = (locale: Locale): BlogPostCopy =>
    BLOG_POST_COPY[locale] ?? BLOG_POST_COPY[FALLBACK_LOCALE];

const BLOG_LIST_PARAMS = {
    status: "published" as const,
    sort: "-published_at,-id" as const,
    limit: 12 as const,
};

const BLOG_POST_PARAMS = {
    status: "published" as const,
    limit: 1 as const,
};

const cleanText = (value?: string | null): string => {
    if (!value) {
        return "";
    }

    return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

export const extractBlogSummary = (post: BlogPost): string => {
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

export const buildBlogIndexStructuredData = (copy: BlogIndexCopy, posts: BlogPost[]): JsonLd[] => {
    const postsItemList = itemList(
        posts.map((post) => ({
            name: post.title,
            url: `${SITE_URL}/blog/${post.slug}`,
            description: post.excerpt ?? copy.metaDescription,
            schemaType: "Article" as const,
        })),
    );

    return [
        blog({ description: copy.metaDescription }),
        postsItemList,
        breadcrumb([
            { name: copy.breadcrumbHome, url: SITE_URL },
            { name: copy.breadcrumbBlog, url: `${SITE_URL}/blog` },
        ]),
    ];
};

const resolveBlogAuthorName = (post: BlogPost): string => {
    if (post.author) {
        return getUserDisplayName(post.author);
    }

    return SITE_NAME;
};

export const buildBlogPostStructuredData = (
    post: BlogPost,
    copy: BlogPostCopy,
    summary: string,
): JsonLd[] => {
    const keywords = post.tags?.map((tag) => tag.name).filter(Boolean);
    const image = resolveMediaUrl(post.image ?? post.thumbnail ?? null) ?? undefined;

    return [
        blogPosting({
            slug: post.slug,
            title: post.title,
            description: summary || post.title,
            image,
            author: { name: resolveBlogAuthorName(post) },
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
};

export const loadBlogPosts = async (locale: Locale): Promise<BlogPost[]> => {
    try {
        const response = await apiClient.getBlogPosts({ ...BLOG_LIST_PARAMS, language: locale });
        const posts = extractList<BlogPost>(response).map((post) => applyBlogPostTranslation(post, locale));
        if (posts.length > 0) {
            return posts;
        }
    } catch (error) {
        console.error("Nu am putut încărca articolele traduse", error);
    }

    if (locale === FALLBACK_LOCALE) {
        return [];
    }

    try {
        const fallbackResponse = await apiClient.getBlogPosts(BLOG_LIST_PARAMS);
        return extractList<BlogPost>(fallbackResponse).map((post) => applyBlogPostTranslation(post, locale));
    } catch (error) {
        console.error("Nu am putut încărca articolele din API", error);
        return [];
    }
};

export const loadBlogPost = async (slug: string, locale: Locale): Promise<BlogPost | null> => {
    try {
        const response = await apiClient.getBlogPosts({ ...BLOG_POST_PARAMS, slug, language: locale });
        const posts = extractList<BlogPost>(response).map((post) => applyBlogPostTranslation(post, locale));
        if (posts.length > 0) {
            return posts[0];
        }
    } catch (error) {
        console.error("Nu am putut încărca articolul tradus", error);
    }

    if (locale === FALLBACK_LOCALE) {
        return null;
    }

    try {
        const fallbackResponse = await apiClient.getBlogPosts({ ...BLOG_POST_PARAMS, slug });
        const posts = extractList<BlogPost>(fallbackResponse).map((post) => applyBlogPostTranslation(post, locale));
        return posts[0] ?? null;
    } catch (error) {
        console.error("Nu am putut încărca articolul din API", error);
        return null;
    }
};
