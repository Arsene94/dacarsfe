import { SITE_URL } from '@/lib/config';

export type DocPageMeta = {
    slug: string;
    title: string;
    description: string;
    updatedAt: string;
    sections: Array<{ id: string; title: string }>;
};

export const DOCS_PAGES: DocPageMeta[] = [
    {
        slug: 'introducere',
        title: 'Introducere în platforma DaCars',
        description: 'Arhitectura platformei și fluxurile principale pentru managerii de flotă.',
        updatedAt: '2025-02-12',
        sections: [
            { id: 'viziune', title: 'Viziune și obiective' },
            { id: 'module', title: 'Module principale' },
            { id: 'flux-rezervari', title: 'Fluxul rezervărilor' },
            { id: 'monitorizare', title: 'Monitorizare și rapoarte' },
        ],
    },
    {
        slug: 'workflow-rezervari',
        title: 'Workflow complet pentru rezervări',
        description: 'Configurarea tarifelor, aprobarea rezervărilor și notificările automate.',
        updatedAt: '2025-02-18',
        sections: [
            { id: 'configurare-tarife', title: 'Configurarea tarifelor' },
            { id: 'validare-client', title: 'Validarea datelor clientului' },
            { id: 'plati-si-contracte', title: 'Plăți și contracte' },
            { id: 'automatizari', title: 'Automatizări și follow-up' },
        ],
    },
    {
        slug: 'monitorizare-flota',
        title: 'Monitorizarea flotei și mentenanță',
        description: 'Setări pentru alerte tehnice, revizii și integrarea cu telemetria.',
        updatedAt: '2025-02-27',
        sections: [
            { id: 'stare-flota', title: 'Starea flotei în timp real' },
            { id: 'revizii', title: 'Planificarea reviziilor' },
            { id: 'alarme', title: 'Alerte și notificări' },
            { id: 'analiza-costuri', title: 'Analiza costurilor de mentenanță' },
        ],
    },
];

export type BlogPost = {
    slug: string;
    title: string;
    excerpt: string;
    publishedAt: string;
    updatedAt?: string;
    author: string;
    tags: string[];
};

export const BLOG_POSTS: BlogPost[] = [
    {
        slug: 'strategii-dinamice-de-tarifare',
        title: 'Strategii dinamice de tarifare pentru flotele de închirieri',
        excerpt: 'Cum poți ajusta prețurile în timp real pentru a maximiza gradul de ocupare și marja.',
        publishedAt: '2025-01-26',
        updatedAt: '2025-03-04',
        author: 'Raluca Ionescu',
        tags: ['tarifare', 'analiza-date', 'crestere'],
    },
    {
        slug: 'automatisarea-comunicarii-cu-clientii',
        title: 'Automatizarea comunicării cu clienții în DaCars',
        excerpt: 'Șabloane, trigger-e și bune practici pentru comunicări impecabile pe tot parcursul rezervării.',
        publishedAt: '2024-12-11',
        author: 'Vlad Pop',
        tags: ['automations', 'customer-success'],
    },
    {
        slug: 'analiza-performantei-flotei',
        title: 'Analiza performanței flotei: KPI esențiali în 2025',
        excerpt: 'Dashboard-urile care contează și cum interpretezi datele pentru a reduce downtime-ul.',
        publishedAt: '2025-02-02',
        author: 'Raluca Ionescu',
        tags: ['analiza', 'rapoarte'],
    },
];

export const STATIC_PAGES = [
    { path: '/', title: 'Acasă', changeFrequency: 'daily', priority: 1 },
    { path: '/about', title: 'Despre DaCars', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/pricing', title: 'Planuri și prețuri', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/contact', title: 'Contact', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/faq', title: 'Întrebări frecvente', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/docs', title: 'Documentație', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/blog', title: 'Blog DaCars', changeFrequency: 'daily', priority: 0.7 },
];

export function getDocNavigation(slug: string) {
    const index = DOCS_PAGES.findIndex((page) => page.slug === slug);
    if (index === -1) {
        return { previous: undefined, next: undefined } as const;
    }

    return {
        previous: DOCS_PAGES[index - 1],
        next: DOCS_PAGES[index + 1],
    } as const;
}

export function resolveDocUrl(slug: string) {
    return `${SITE_URL}/docs/${slug}`;
}
