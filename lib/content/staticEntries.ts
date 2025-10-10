import { SITE_URL } from "@/lib/config";

export type StaticDocPage = {
    slug: string;
    title: string;
    description: string;
    lastUpdated: string;
    sections: Array<{
        heading: string;
        body: string[];
    }>;
};

export const STATIC_DOCS_PAGES: StaticDocPage[] = [
    {
        slug: "introducere-platforma",
        title: "Introducere în platforma DaCars",
        description: "Prezentare generală a fluxului de rezervare și a modului în care adminul gestionează cererile.",
        lastUpdated: "2024-12-19",
        sections: [
            {
                heading: "Fluxul de rezervare",
                body: [
                    "Clienții pot căuta disponibilitatea mașinilor folosind filtrarea după perioadă, categorie și oraș.",
                    "Rezervările sunt sincronizate în timp real cu backend-ul prin canalele websockets gestionate de Laravel.",
                ],
            },
            {
                heading: "Roluri și permisiuni",
                body: [
                    "Platforma are roluri pentru client, agent și administrator. Fiecare rol are secțiuni dedicate în consola admin.",
                    "Permisiunile se actualizează din panoul de administrare > Setări > Control acces.",
                ],
            },
        ],
    },
    {
        slug: "configurare-tarife",
        title: "Configurarea tarifelor dinamice",
        description: "Cum setăm grilele tarifare pentru sezon, flotă și promoții locale.",
        lastUpdated: "2024-12-17",
        sections: [
            {
                heading: "Tarife de bază",
                body: [
                    "Fiecare mașină pornește de la un tarif zilnic recomandat. Tariful poate fi ajustat direct din fișa vehiculului.",
                    "Pentru perioade de peste 7 zile se aplică automat discountul configurat în secțiunea Promotii.",
                ],
            },
            {
                heading: "Suplimente și garanții",
                body: [
                    "Adăugați suplimente (scaun copii, asigurare extinsă) din secțiunea Add-ons. Sistemul calculează TVA-ul în mod automat.",
                    "Pentru rezervările fără garanție este necesară aprobarea manuală a unui administrator înainte de confirmare.",
                ],
            },
        ],
    },
    {
        slug: "rapoarte-si-analiza",
        title: "Rapoarte și analiză",
        description: "Monitorizarea performanței flotei și raportarea către departamentul financiar.",
        lastUpdated: "2024-12-10",
        sections: [
            {
                heading: "Dashboard zilnic",
                body: [
                    "Tabloul de bord afișează gradul de ocupare, venituri pe zi și rezervări active.",
                    "Indicatorii sunt exportabili în format CSV și pot fi integrați cu Google Data Studio prin webhook.",
                ],
            },
            {
                heading: "Export contabil",
                body: [
                    "Exportul contabil generează un fișier XML compatibil cu sistemele ERP locale.",
                    "Pentru corecții manuale, folosiți secțiunea Istoric facturi și adăugați o notă internă.",
                ],
            },
        ],
    },
];

export type StaticBlogPost = {
    slug: string;
    title: string;
    excerpt: string;
    content: string[];
    publishedAt: string;
    updatedAt?: string;
    author: string;
};

export const STATIC_BLOG_POSTS: StaticBlogPost[] = [
    {
        slug: "sfaturi-inchiriere-iarna",
        title: "Sfaturi pentru închirieri auto iarna în România",
        excerpt: "Checklist esențial pentru clienții care conduc în sezonul rece cu mașini DaCars.",
        content: [
            "Planificați ridicarea mașinii cu minimum 30 de minute înainte pentru a verifica starea anvelopelor și dotările de iarnă.",
            "Folosiți aplicația mobilă DaCars pentru a raporta rapid orice incident și pentru asistență rutieră 24/7.",
            "Păstrați lanțurile antiderapante în portbagaj pentru zonele montane, chiar dacă prognoza pare favorabilă.",
        ],
        publishedAt: "2024-12-05",
        updatedAt: "2024-12-12",
        author: "Andreea Marinescu",
    },
    {
        slug: "predare-rapida-otopeni",
        title: "Cum funcționează predarea rapidă DaCars în Otopeni",
        excerpt: "Ghid pentru clienții care vor un proces de check-in automat la terminalul Sosiri.",
        content: [
            "După confirmarea rezervării, primiți un cod QR unic în aplicație pentru kiosk-ul DaCars din aeroport.",
            "Agentul de suport este disponibil prin video call direct din interfața kiosk-ului în mai puțin de 60 de secunde.",
            "Verificați că aveți actul de identitate și permisul de conducere valabile; scanarea se face înainte de ridicarea cheii.",
        ],
        publishedAt: "2024-11-22",
        author: "Bogdan Ioniță",
    },
    {
        slug: "optimizare-flota-2025",
        title: "Optimizarea flotei DaCars pentru 2025",
        excerpt: "Strategia noastră pentru vehicule electrice și hibride în marile orașe.",
        content: [
            "Începem anul cu 25% din flotă formată din modele hibride plug-in pentru rutele urbane.",
            "Instalăm stații rapide de încărcare în punctele cheie: Otopeni, Piața Victoriei și Timișoara Aeroport.",
            "Clienții corporate vor primi rapoarte lunare privind emisiile de CO₂ economisite prin alegerea flotei verzi.",
        ],
        publishedAt: "2024-10-15",
        updatedAt: "2024-12-01",
        author: "Echipa DaCars",
    },
];

export const STATIC_PAGES = [
    {
        path: "/",
        changeFrequency: "daily" as const,
        priority: 1,
    },
    {
        path: "/despre",
        changeFrequency: "monthly" as const,
        priority: 0.8,
    },
    {
        path: "/pricing",
        changeFrequency: "weekly" as const,
        priority: 0.9,
    },
    {
        path: "/contact",
        changeFrequency: "monthly" as const,
        priority: 0.6,
    },
    {
        path: "/faq",
        changeFrequency: "weekly" as const,
        priority: 0.7,
    },
    {
        path: "/termeni-si-conditii",
        changeFrequency: "yearly" as const,
        priority: 0.4,
    },
    {
        path: "/politica-de-confidentialitate",
        changeFrequency: "yearly" as const,
        priority: 0.4,
    },
    {
        path: "/politica-cookie",
        changeFrequency: "yearly" as const,
        priority: 0.4,
    },
    {
        path: "/docs",
        changeFrequency: "weekly" as const,
        priority: 0.8,
    },
];

export const resolveStaticUrl = (path: string): string => `${SITE_URL}${path}`;
