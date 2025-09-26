export type BlogPost = {
    slug: string;
    title: string;
    excerpt: string;
    content: string[];
    author: string;
    publishedAt: string;
    updatedAt: string;
    tags: string[];
    category: string;
    coverImage: {
        src: string;
        width: number;
        height: number;
        alt: string;
    };
    keywords: string[];
};

export const BLOG_POSTS: BlogPost[] = [
    {
        slug: 'cum-optimizam-flota-in-sezonul-de-varf',
        title: 'Cum optimizăm flota în sezonul de vârf',
        excerpt:
            'Strategii practice pentru a crește disponibilitatea mașinilor și a proteja marja în perioadele cele mai aglomerate.',
        content: [
            'Monitorizăm în timp real rotația mașinilor și deschidem automat sloturi suplimentare pentru segmentele cu cerere ridicată.',
            'Pentru mașinile premium, ajustăm dinamic tarifele în funcție de ratele de ocupare și evenimentele din oraș pentru a proteja marja.',
            'Suplimentăm personalul de livrare pe aeroport și pregătim proceduri rapide de predare pentru clienții fideli.',
        ],
        author: 'Raluca Ionescu',
        publishedAt: '2025-02-01T08:00:00+02:00',
        updatedAt: '2025-02-15T09:30:00+02:00',
        tags: ['optimizare flotă', 'sezon de vârf', 'tarife dinamice'],
        category: 'Strategie',
        coverImage: {
            src: '/images/bg-hero-820x380.webp',
            width: 820,
            height: 380,
            alt: 'Flotă de mașini DaCars pregătite pentru livrare rapidă',
        },
        keywords: ['optimizare flotă', 'rent a car sezon de vârf', 'tarife dinamice'],
    },
    {
        slug: 'automatizam-comunicarea-cu-clientii',
        title: 'Automatizăm comunicarea cu clienții în fiecare etapă',
        excerpt:
            'De la confirmarea rezervării la follow-up post-închiriere: cum folosim DaCars pentru mesaje clare și rapide.',
        content: [
            'Începem cu notificări automate pe email și SMS pentru confirmare și remindere de plată.',
            'Segmentăm clienții în funcție de istoricul rezervărilor și trimitem recomandări personalizate.',
            'După retur, cerem feedback și oferim vouchere dedicate pentru a încuraja următoarea rezervare.',
        ],
        author: 'Vlad Pop',
        publishedAt: '2025-01-18T10:00:00+02:00',
        updatedAt: '2025-01-20T12:00:00+02:00',
        tags: ['comunicare', 'automatizare', 'customer experience'],
        category: 'Operațional',
        coverImage: {
            src: '/images/bg-hero-520x380.webp',
            width: 520,
            height: 380,
            alt: 'Consultant DaCars discutând cu un client la telefon',
        },
        keywords: ['automatizare comunicare', 'retentie clienti rent a car', 'notificari inteligente'],
    },
    {
        slug: 'ghidul-pentru-oferte-flexibile',
        title: 'Ghidul pentru oferte flexibile și profitabile',
        excerpt:
            'Cum construim pachete de weekend, abonamente corporate și promoții last-minute fără să canibalizăm prețurile de listă.',
        content: [
            'Pornim de la analiza datelor istorice și identificăm segmentele cu cele mai mari rate de conversie.',
            'Pentru companii, includem servicii de mentenanță și mașini de schimb pentru a crește valoarea contractului.',
            'Promoțiile last-minute sunt limitate în timp și volum pentru a evita efectele asupra rezervărilor confirmate.',
        ],
        author: 'Adrian Dima',
        publishedAt: '2024-12-05T07:30:00+02:00',
        updatedAt: '2025-01-08T08:45:00+02:00',
        tags: ['oferte', 'pricing', 'analiza date'],
        category: 'Marketing',
        coverImage: {
            src: '/images/bg-hero-520x520.webp',
            width: 520,
            height: 520,
            alt: 'Voucher de reducere DaCars pentru oferte sezoniere',
        },
        keywords: ['oferte rent a car', 'abonamente auto', 'discount weekend'],
    },
];

export type CarListing = {
    slug: string;
    name: string;
    description: string;
    image: {
        src: string;
        width: number;
        height: number;
        alt: string;
    };
    brand: string;
    seats: number;
    transmission: 'manuală' | 'automată';
    fuel: 'benzină' | 'motorină' | 'hibrid';
    pricePerDay: number;
};

export const CAR_LISTINGS: CarListing[] = [
    {
        slug: 'compact-urban',
        name: 'Compact Urban',
        description: 'Perfect pentru oraș: consum redus, senzori de parcare și conectivitate Apple CarPlay.',
        image: {
            src: '/images/placeholder-car.svg',
            width: 640,
            height: 360,
            alt: 'Mașină compactă din flota DaCars',
        },
        brand: 'Volkswagen Polo',
        seats: 5,
        transmission: 'manuală',
        fuel: 'benzină',
        pricePerDay: 29,
    },
    {
        slug: 'suv-familie',
        name: 'SUV Familie',
        description: 'Spațiu pentru 7 locuri, tracțiune integrală și sisteme avansate de siguranță.',
        image: {
            src: '/images/placeholder-car.svg',
            width: 640,
            height: 360,
            alt: 'SUV din flota DaCars pregătit pentru drumuri lungi',
        },
        brand: 'Hyundai Santa Fe',
        seats: 7,
        transmission: 'automată',
        fuel: 'motorină',
        pricePerDay: 62,
    },
    {
        slug: 'premium-business',
        name: 'Premium Business',
        description: 'Ideal pentru delegații: interior din piele, pilot automat adaptiv și conectivitate 5G.',
        image: {
            src: '/images/placeholder-car.svg',
            width: 640,
            height: 360,
            alt: 'Sedan premium DaCars pentru clienți corporate',
        },
        brand: 'BMW Seria 5',
        seats: 5,
        transmission: 'automată',
        fuel: 'hibrid',
        pricePerDay: 95,
    },
    {
        slug: 'electric-city',
        name: 'Electric City',
        description: 'Zero emisii, autonomie de 420 km și carduri de încărcare incluse.',
        image: {
            src: '/images/placeholder-car.svg',
            width: 640,
            height: 360,
            alt: 'Mașină electrică din flota DaCars',
        },
        brand: 'Renault Megane E-Tech',
        seats: 5,
        transmission: 'automată',
        fuel: 'hibrid',
        pricePerDay: 55,
    },
];

export type RentalOffer = {
    slug: string;
    name: string;
    description: string;
    price: number;
    priceCurrency: string;
    validFrom: string;
    validThrough: string;
    category: string;
    relatedCar: string;
};

export const RENTAL_OFFERS: RentalOffer[] = [
    {
        slug: 'weekend-dubai',
        name: 'Weekend în doi fără griji',
        description: '3 zile de închiriere pentru gama Compact Urban cu 15% reducere și kilometraj nelimitat.',
        price: 74,
        priceCurrency: 'EUR',
        validFrom: '2025-03-01',
        validThrough: '2025-05-31',
        category: 'weekend',
        relatedCar: 'compact-urban',
    },
    {
        slug: 'abonament-corporate',
        name: 'Abonament Corporate Flex',
        description: 'Pachet lunar cu 2 schimburi incluse pentru segmentul Premium Business și livrare dedicată.',
        price: 1299,
        priceCurrency: 'EUR',
        validFrom: '2025-01-10',
        validThrough: '2025-12-31',
        category: 'corporate',
        relatedCar: 'premium-business',
    },
    {
        slug: 'electric-spring',
        name: 'Electric Spring Start',
        description: 'Reducere de 20% la rezervările de minimum 5 zile pentru gama Electric City.',
        price: 220,
        priceCurrency: 'EUR',
        validFrom: '2025-03-15',
        validThrough: '2025-06-30',
        category: 'sustenabilitate',
        relatedCar: 'electric-city',
    },
];

export const CONTACT_INFO = {
    name: 'DaCars Headquarters',
    email: 'contact@dacars.ro',
    phone: '+40 755 123 456',
    street: 'Str. Traian Vuia 10',
    city: 'București',
    region: 'RO-B',
    postalCode: '020001',
    country: 'RO',
    openingHours: {
        weekdays: '08:00-20:00',
        weekend: '09:00-18:00',
    },
};
