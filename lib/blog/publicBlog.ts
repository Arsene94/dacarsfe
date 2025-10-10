import { apiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { blog, blogPosting, breadcrumb, itemList, type JsonLd } from "@/lib/seo/jsonld";
import { resolveMediaUrl } from "@/lib/media";
import { getUserDisplayName } from "@/lib/users";
import type { BlogPost } from "@/types/blog";
import { applyBlogPostTranslation } from "@/lib/blog/translations";

export type BlogIndexLink = {
    href: string;
    label: string;
    description: string;
};

export type BlogIndexInterlink = {
    title: string;
    description: string;
    ariaLabel: string;
    linkCta: string;
    links: BlogIndexLink[];
};

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
    interlink: BlogIndexInterlink;
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
        interlink: {
            title: "Explorează în continuare paginile noastre cheie",
            description:
                "Distribuie autoritatea articolelor către secțiunile comerciale esențiale și finalizează rezervarea informat.",
            ariaLabel: "Legături interne către paginile principale DaCars",
            linkCta: "Deschide pagina",
            links: [
                {
                    href: "/cars",
                    label: "Flota de închirieri DaCars",
                    description: "Vezi disponibilitatea în timp real și filtrează mașinile potrivite călătoriei tale.",
                },
                {
                    href: "/offers",
                    label: "Promoții și reduceri active",
                    description: "Aplică oferte sezoniere sau coduri câștigate și obține cel mai bun tarif.",
                },
                {
                    href: "/faq",
                    label: "Întrebări frecvente",
                    description: "Clarifică rapid politicile de depozit, plata și procedura de predare DaCars.",
                },
                {
                    href: "/contact",
                    label: "Contactează echipa 24/7",
                    description: "Vorbește cu un consultant pentru oferte personalizate sau suport rapid.",
                },
            ],
        },
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
        interlink: {
            title: "Continue with our most useful pages",
            description:
                "Send the authority of each article to high-value commercial sections and keep your rental journey connected.",
            ariaLabel: "Internal links to DaCars' primary pages",
            linkCta: "Open page",
            links: [
                {
                    href: "/cars",
                    label: "Browse the full fleet",
                    description: "Check real-time availability and filter cars that match your travel needs.",
                },
                {
                    href: "/offers",
                    label: "View current offers",
                    description: "Activate seasonal discounts or loyalty perks curated by the DaCars team.",
                },
                {
                    href: "/faq",
                    label: "Visit the help centre",
                    description: "Understand deposits, insurance, and pickup conditions before booking.",
                },
                {
                    href: "/contact",
                    label: "Talk to a specialist",
                    description: "Reach our consultants 24/7 for tailored assistance and booking support.",
                },
            ],
        },
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
        interlink: {
            title: "Continua verso le pagine essenziali",
            description:
                "Trasferisci l'autorevolezza degli articoli verso le sezioni commerciali chiave e completa la prenotazione senza interruzioni.",
            ariaLabel: "Collegamenti interni alle principali pagine DaCars",
            linkCta: "Apri la pagina",
            links: [
                {
                    href: "/cars",
                    label: "Scopri tutta la flotta",
                    description: "Verifica disponibilità in tempo reale e filtra i veicoli più adatti al tuo viaggio.",
                },
                {
                    href: "/offers",
                    label: "Vedi le offerte attive",
                    description: "Attiva sconti stagionali o vantaggi fedeltà curati dal team DaCars.",
                },
                {
                    href: "/faq",
                    label: "Consulta le FAQ",
                    description: "Chiarisci deposito, assicurazione e modalità di ritiro prima di confermare.",
                },
                {
                    href: "/contact",
                    label: "Parla con un consulente",
                    description: "Contatta il team DaCars 24/7 per assistenza personalizzata e preventivi rapidi.",
                },
            ],
        },
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
        interlink: {
            title: "Continúa hacia nuestras páginas clave",
            description:
                "Dirige la autoridad de cada artículo a las secciones comerciales más importantes y mantiene tu reserva bien conectada.",
            ariaLabel: "Enlaces internos a las páginas principales de DaCars",
            linkCta: "Abrir página",
            links: [
                {
                    href: "/cars",
                    label: "Revisa toda la flota",
                    description: "Consulta disponibilidad en tiempo real y filtra los coches ideales para tu viaje.",
                },
                {
                    href: "/offers",
                    label: "Explora las ofertas activas",
                    description: "Activa descuentos de temporada o beneficios de fidelidad creados para los clientes DaCars.",
                },
                {
                    href: "/faq",
                    label: "Visita las preguntas frecuentes",
                    description: "Aclara depósitos, coberturas y proceso de entrega antes de reservar.",
                },
                {
                    href: "/contact",
                    label: "Habla con un asesor",
                    description: "Contacta con nuestro equipo 24/7 para recibir asistencia personalizada y presupuestos rápidos.",
                },
            ],
        },
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
        interlink: {
            title: "Poursuivez vers nos pages stratégiques",
            description:
                "Diffusez l'autorité éditoriale vers les sections commerciales clés et restez maître de votre parcours de location.",
            ariaLabel: "Liens internes vers les principales pages DaCars",
            linkCta: "Ouvrir la page",
            links: [
                {
                    href: "/cars",
                    label: "Découvrir la flotte complète",
                    description: "Consultez la disponibilité en temps réel et filtrez les véhicules adaptés à votre trajet.",
                },
                {
                    href: "/offers",
                    label: "Voir les offres en cours",
                    description: "Activez remises saisonnières et avantages fidélité sélectionnés par l'équipe DaCars.",
                },
                {
                    href: "/faq",
                    label: "Consulter la FAQ",
                    description: "Clarifiez dépôt, assurance et processus de remise avant de confirmer votre réservation.",
                },
                {
                    href: "/contact",
                    label: "Joindre un conseiller",
                    description: "Contactez notre équipe 24/7 pour obtenir un accompagnement personnalisé et des offres rapides.",
                },
            ],
        },
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
        interlink: {
            title: "Gehe weiter zu unseren wichtigsten Seiten",
            description:
                "Leite die Autorität des Artikels auf zentrale Geschäftsbereiche und behalte deinen Buchungsprozess im Blick.",
            ariaLabel: "Interne Links zu den Hauptseiten von DaCars",
            linkCta: "Seite öffnen",
            links: [
                {
                    href: "/cars",
                    label: "Gesamte Flotte ansehen",
                    description: "Prüfe die Verfügbarkeit in Echtzeit und filtere Fahrzeuge passend zu deiner Reise.",
                },
                {
                    href: "/offers",
                    label: "Aktuelle Angebote entdecken",
                    description: "Aktiviere saisonale Rabatte oder Treuevorteile, die das DaCars-Team vorbereitet hat.",
                },
                {
                    href: "/faq",
                    label: "FAQ besuchen",
                    description: "Kläre Kautionen, Versicherungen und Übergabeablauf, bevor du buchst.",
                },
                {
                    href: "/contact",
                    label: "Mit dem Team sprechen",
                    description: "Kontaktiere unsere Berater rund um die Uhr für individuelle Unterstützung und Angebote.",
                },
            ],
        },
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
