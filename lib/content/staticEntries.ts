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
        slug: "incepe-cu-dacars",
        title: "Începe cu DaCars",
        description: "Ghid rapid pentru crearea contului și configurarea primei rezervări ca client DaCars.",
        lastUpdated: "2025-01-07",
        sections: [
            {
                heading: "Creează-ți contul gratuit",
                body: [
                    "Accesează www.dacars.ro și apasă pe butonul \"Înregistrare\" pentru a-ți crea un cont folosind adresa de e-mail sau autentificarea cu Google.",
                    "Confirmă-ți adresa prin linkul primit pe e-mail pentru a activa toate funcțiile dedicate clienților DaCars.",
                ],
            },
            {
                heading: "Setează profilul de șofer",
                body: [
                    "Completează datele personale, numărul permisului și metoda preferată de plată din secțiunea Contul meu > Profil.",
                    "Poți salva mai multe adrese de facturare și poți invita șoferi suplimentari pentru rezervările corporate.",
                ],
            },
            {
                heading: "Descoperă panoul de client",
                body: [
                    "Din Dashboard vizualizezi rezervările active, istoricul călătoriilor și documentele descărcabile (contracte, facturi).",
                    "Activează notificările push din aplicația mobilă pentru a primi alerte despre statusul rezervării și promoții personalizate.",
                ],
            },
        ],
    },
    {
        slug: "rezervare-pas-cu-pas",
        title: "Rezervare pas cu pas",
        description: "Instrucțiuni detaliate pentru a găsi, personaliza și confirma o rezervare online.",
        lastUpdated: "2025-01-07",
        sections: [
            {
                heading: "Caută mașina potrivită",
                body: [
                    "Folosește filtrarea după oraș, perioadă și tipul vehiculului. Sistemul îți arată în timp real disponibilitatea și kilometrajul inclus.",
                    "Adaugă codurile promoționale în pasul de căutare pentru a vedea tarifele actualizate instant.",
                ],
            },
            {
                heading: "Selectează extraopțiunile",
                body: [
                    "Alege asigurări suplimentare, scaune pentru copii sau Wi-Fi mobil direct din configuratorul rezervării.",
                    "Poți salva preferințele ca preset pentru următoarele rezervări, astfel încât formularul să se completeze automat.",
                ],
            },
            {
                heading: "Finalizează plata în siguranță",
                body: [
                    "Plătește cu cardul Visa/Mastercard sau prin Apple Pay/Google Pay. Toate tranzacțiile sunt securizate prin 3-D Secure.",
                    "Primești contractul și voucherul de ridicare pe e-mail și în aplicație, iar rezervarea apare imediat în secțiunea \"Călătoriile mele\".",
                ],
            },
        ],
    },
    {
        slug: "ridicare-si-returnare",
        title: "Ridicare și returnare",
        description: "Checklist complet pentru preluarea și predarea mașinii fără stres.",
        lastUpdated: "2025-01-07",
        sections: [
            {
                heading: "Înainte de ridicare",
                body: [
                    "Verifică în aplicație documentele necesare (act de identitate, permis, card folosit la plată) și nivelul garanției preautorizate.",
                    "Confirmă ora exactă de ridicare cu minimum 2 ore înainte pentru a permite echipei să pregătească vehiculul dorit.",
                ],
            },
            {
                heading: "În punctul de ridicare",
                body: [
                    "Deschide voucherul digital și folosește codul QR pentru identificare rapidă la biroul DaCars sau la kiosk-ul self check-in.",
                    "Efectuează turul video de predare împreună cu agentul sau prin aplicație, iar eventualele observații se salvează automat în contract.",
                ],
            },
            {
                heading: "Returnarea mașinii",
                body: [
                    "Adu vehiculul la ora stabilită, cu nivelul de combustibil menționat în contract. Poți selecta opțiunea \"Returnare rapidă\" pentru verificare fără contact.",
                    "După inspecția finală primești raportul pe e-mail, iar garanția se eliberează automat în 24-48 de ore, în funcție de banca emitentă.",
                ],
            },
        ],
    },
    {
        slug: "siguranta-si-asistenta",
        title: "Siguranță și asistență",
        description: "Tot ce trebuie să știi despre asigurări, incidente și suportul DaCars pe durata călătoriei.",
        lastUpdated: "2025-01-07",
        sections: [
            {
                heading: "Asigurări incluse și opționale",
                body: [
                    "Fiecare rezervare include RCA și asigurare de bază cu franșiză. Poți adăuga Extra Cover pentru reducerea garanției și asigurare pentru anvelope și parbriz.",
                    "Vizualizează nivelul de acoperire direct din Contul meu > Asigurări pentru a compara opțiunile disponibile pe rezervarea curentă.",
                ],
            },
            {
                heading: "Ce faci în caz de incident",
                body: [
                    "Contactează imediat Call Center-ul DaCars la +40 723 817 551 sau folosește butonul SOS din aplicație pentru asistență 24/7.",
                    "Completează constatarea amiabilă din aplicație și încarcă fotografii ale vehiculului; dosarul ajunge automat la echipa de suport.",
                ],
            },
            {
                heading: "Resurse utile pe parcurs",
                body: [
                    "Monitorizează kilometrii parcurși și programările de service recomandate din tab-ul \"Status mașină\".",
                    "Accesează ghidurile video și lista stațiilor partenere pentru alimentare și încărcare direct din secțiunea Ajutor.",
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
        path: "/cars",
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
