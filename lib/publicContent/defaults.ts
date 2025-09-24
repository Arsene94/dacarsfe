import type { PublicContentDictionary } from "@/types/public-content";

export const LANGUAGE_SWITCHER_FALLBACK = {
  label: "Limba",
  ariaLabel: "Schimbă limba",
} as const;

export const HEADER_COPY_FALLBACK = {
  brandAria: "DaCars — închirieri auto rapide și oneste",
  navigation: {
    items: [
      { label: "Acasă", href: "/", ariaLabel: "Acasă" },
      { label: "Flotă", href: "/cars", ariaLabel: "Flotă" },
      { label: "Oferte", href: "#oferte", ariaLabel: "Oferte" },
      { label: "Rezervare", href: "/checkout", ariaLabel: "Rezervare" },
      { label: "Contact", href: "#contact", ariaLabel: "Contact" },
    ],
  },
  mobile: {
    openLabel: "Deschide meniul",
    closeLabel: "Închide meniul",
  },
  cta: {
    label: "Rezervă acum",
    ariaLabel: "Rezervă acum",
    href: "/checkout",
  },
  languageSwitcher: LANGUAGE_SWITCHER_FALLBACK,
} as const;

export const HERO_COPY_FALLBACK = {
  badge: "Te ținem aproape de casă",
  title: "Închiriere auto București - Otopeni",
  subtitle: "Predare în aeroport în sub 5 minute.",
  highlight: "Fără taxe ascunse.",
  metrics: {
    fast: {
      title: "Sub 5 min",
      description: "Predare rapidă",
    },
    transparent: {
      title: "Fără taxe",
      description: "Preț transparent",
    },
    availability: {
      title: "24/7",
      description: "Disponibil non-stop",
    },
  },
  form: {
    startDate: {
      label: "Data ridicare",
    },
    endDate: {
      label: "Data returnare",
    },
    location: {
      label: "Locația",
      placeholder: "Alege locația",
      options: [{ value: "otopeni", label: "Aeroport Otopeni" }],
    },
    carType: {
      label: "Tip mașină",
      all: "Toate tipurile",
    },
    submit: {
      label: "Caută mașini",
      aria: "Caută mașini",
    },
  },
  background: {
    alt: "Fundal aeroport",
  },
} as const;

export const BENEFITS_COPY_FALLBACK = {
  title: "De ce să alegi <span class=\"text-jade\">DaCars</span>?",
  description:
    "Serviciu de încredere, creat special pentru românii care călătoresc și au nevoie de o mașină la întoarcerea acasă.",
  items: [
    {
      icon: "file",
      title: "Fără birocrație",
      description:
        "Proces simplu și rapid, fără acte complicate sau așteptare lungă.",
    },
    {
      icon: "clock",
      title: "Disponibil 24/7",
      description:
        "Predare și ridicare non-stop la aeroport, oricând ai nevoie.",
    },
    {
      icon: "zap",
      title: "Flexibilitate maximă",
      description:
        "Modifici sau anulezi rezervarea fără taxe suplimentare.",
    },
    {
      icon: "dollar",
      title: "Fără taxe ascunse",
      description:
        "Preț transparent și clar de la început. Ce vezi, asta plătești.",
    },
  ],
  stats: [
    { value: "500+", label: "Clienți fericiți" },
    { value: "24/7", label: "Disponibilitate" },
    { value: "<5min", label: "Timp predare" },
    { value: "0", label: "Taxe ascunse" },
  ],
} as const;

export const FOOTER_COPY_FALLBACK = {
  brand: {
    title: "DaCars",
    description:
      "Mașini oneste pentru români onești. Predare în aeroport în sub 5 minute, fără taxe ascunse.",
  },
  navigation: {
    title: "Linkuri Rapide",
    items: [
      { label: "Acasă", href: "/", ariaLabel: "Acasă" },
      { label: "Flota Auto", href: "/cars", ariaLabel: "Flota Auto" },
      { label: "Oferte Speciale", href: "#oferte", ariaLabel: "Oferte Speciale" },
      { label: "Rezervare", href: "/checkout", ariaLabel: "Rezervare" },
    ],
  },
  contact: {
    title: "Contact",
    items: [
      { label: "+40 723 817 551", href: "tel:+40723817551", icon: "phone" },
      { label: "contact@dacars.ro", href: "mailto:contact@dacars.ro", icon: "mail" },
      {
        label: "Aeroportul Henri Coandă, Otopeni",
        href: "https://maps.app.goo.gl/gBDghMRHkRkNvztg6",
        icon: "map",
      },
      { label: "Disponibil 24/7", icon: "clock" },
    ],
  },
  schedule: {
    title: "Program",
    subtitle: "Luni - Duminică",
    highlight: "24/7",
    description: "Predare și ridicare non-stop la aeroport",
  },
  policies: {
    items: [
      { label: "Termeni și Condiții", href: "#", ariaLabel: "Termeni și Condiții" },
      {
        label: "Politica de Confidențialitate",
        href: "#",
        ariaLabel: "Politica de Confidențialitate",
      },
    ],
  },
  copyright: "© 2024 DaCars. Toate drepturile rezervate.",
} as const;

export const HOME_FLEET_COPY_FALLBACK = {
  heading: {
    title: "Flota noastră <span class=\"text-jade\">premium</span>",
    description:
      "Mașini moderne, verificate și întreținute cu grijă pentru confortul și siguranța ta.",
  },
  carousel: {
    regionAriaLabel: "Carousel cu mașini recomandate",
    previousAriaLabel: "Mașina precedentă",
    nextAriaLabel: "Mașina următoare",
    slideLabelTemplate: "{{current}} din {{total}}",
  },
  passengersTemplate: "{{count}} persoane",
  cta: {
    label: "Vezi toată flota",
    ariaLabel: "Vezi toată flota",
    href: "/cars",
  },
} as const;

export const HOME_OFFERS_COPY_FALLBACK = {
  title: "Oferte <span class=\"text-jadeLight\">speciale</span>",
  description: "Promoții exclusive pentru momentele importante din viața ta.",
  cards: [
    {
      icon: "heart",
      title: "Pachet Nuntă",
      discount: "10% reducere",
      description:
        "Pentru cei mai frumoși ani din viața voastră. Mașină elegantă pentru ziua specială.",
      features: [
        "Decorațiuni incluse",
        "Predare la locație",
        "Șofer opțional",
      ],
      color: "bg-gradient-to-br from-pink-500 to-rose-600",
      textColor: "text-white",
      button: {
        label: "Profită acum",
        ariaLabel: "Profită acum",
        href: "/checkout",
      },
    },
    {
      icon: "users",
      title: "Reducere Prieteni",
      discount: "20% reducere",
      description:
        "Adu-ți prietenii și economisește! Cu cât sunteți mai mulți, cu atât mai avantajos.",
      features: [
        "Pentru grupuri 4+",
        "Valabil 30 zile",
        "Cumulabilă cu alte oferte",
      ],
      color: "bg-gradient-to-br from-jade to-emerald-600",
      textColor: "text-white",
      button: {
        label: "Profită acum",
        ariaLabel: "Profită acum",
        href: "/checkout",
      },
    },
  ],
  seasonal: {
    icon: "calendar",
    title: "Ofertă limitată de sezon",
    description:
      "Rezervă acum pentru perioada sărbătorilor și beneficiezi de tarife preferențiale și servicii premium incluse.",
    button: {
      label: "Rezervă cu reducere",
      ariaLabel: "Rezervă cu reducere",
      href: "/checkout",
    },
  },
} as const;

export const HOME_PROCESS_COPY_FALLBACK = {
  title: "Procesul nostru <span class=\"text-jade\">simplu</span>",
  description:
    "Doar 3 pași simpli te despart de mașina ta. Fără complicații, fără stres.",
  steps: [
    {
      icon: "mousePointer",
      number: "01",
      title: "Rezervă online",
      description:
        "Completează formularul simplu și alege mașina potrivită pentru tine.",
      color: "bg-jade",
    },
    {
      icon: "mapPin",
      number: "02",
      title: "Ridici la aeroport",
      description: "Te întâlnim la sosiri în sub 5 minute cu mașina pregătită.",
      color: "bg-berkeley",
    },
    {
      icon: "route",
      number: "03",
      title: "Drum bun acasă",
      description: "Ajungi acasă în siguranță cu mașina ta închiriată.",
      color: "bg-jade",
    },
  ],
  cta: {
    title: "Gata să începi?",
    description: "Rezervarea durează doar 2 minute. Mașina ta te așteaptă la aeroport!",
    primary: {
      label: "Rezervă acum",
      ariaLabel: "Rezervă acum",
      href: "/checkout",
    },
    secondary: {
      label: "Vezi flota",
      ariaLabel: "Vezi flota",
      href: "#flota",
    },
  },
} as const;

export const HOME_CONTACT_COPY_FALLBACK = {
  title: "Contactează-ne <span class=\"text-jade\">oricând</span>",
  description:
    "Suntem aici să te ajutăm 24/7. Ia legătura cu noi prin oricare dintre metodele de mai jos.",
  items: [
    {
      icon: "phone",
      title: "Telefon",
      description: "Suntem disponibili 24/7 pentru urgențe",
      link: {
        href: "tel:+40723817551",
        label: "+40 723 817 551",
        ariaLabel: "Sună la +40 723 817 551",
      },
    },
    {
      icon: "messageCircle",
      title: "WhatsApp",
      description: "Scrie-ne pentru răspuns rapid",
      link: {
        href: "https://wa.me/40723817551",
        label: "+40 723 817 551",
        ariaLabel: "Contactează pe WhatsApp la +40 723 817 551",
      },
    },
    {
      icon: "mail",
      title: "Email",
      description: "Pentru întrebări generale",
      link: {
        href: "mailto:contact@dacars.ro",
        label: "contact@dacars.ro",
        ariaLabel: "Trimite email la contact@dacars.ro",
      },
    },
    {
      icon: "mapPin",
      title: "Locație",
      description: "Punct de predare principal",
      lines: [
        { text: "Calea Bucureștilor 305" },
        { text: "Otopeni, Ilfov" },
      ],
    },
    {
      icon: "clock",
      title: "Program",
      description: "Predare și ridicare",
      lines: [
        { text: "24/7 - Non-stop" },
        { text: "Disponibili oricând", highlight: true },
      ],
    },
  ],
  map: {
    title: "Locația noastră",
    notes: [
      {
        html:
          "<strong>Consultant:</strong> Când aterizezi, sună-ne la numărul de telefon <a href=\"tel:+40723817551\">+40 723 817 551</a>",
      },
      {
        html:
          "<strong>Instrucțiuni de sosire:</strong> După apel, ne întâlnim în fața stației CFR, la cupola verde de sticlă din terminalul Sosiri.",
      },
    ],
  },
} as const;

export const CARS_PAGE_COPY_FALLBACK = {
  header: {
    title: "Flota noastră <span class=\"text-jade\">completă</span>",
    description:
      "Descoperă toate mașinile disponibile și alege cea potrivită pentru călătoria ta.",
  },
  search: {
    placeholder: "Caută mașină...",
    ariaLabel: "Caută mașină",
    sort: {
      ariaLabel: "Sortează mașinile",
      options: [
        { value: "cheapest", label: "Preț crescător" },
        { value: "most_expensive", label: "Preț descrescător" },
      ],
    },
    filtersToggle: {
      label: "Filtre",
      ariaLabel: "Comută filtrele",
    },
  },
  filters: {
    categoriesLabel: "Categorie",
    typeLabel: "Tip mașină",
    transmissionLabel: "Transmisie",
    fuelLabel: "Combustibil",
    allOption: "Toate",
    clear: {
      label: "Resetează filtrele",
      ariaLabel: "Resetează filtrele",
    },
    removeFilterAria: "Elimină filtrul {{label}}",
    passengersTemplate: "{{count}} persoane",
  },
  features: {
    passengersTemplate: "{{count}} persoane",
  },
  results: {
    countLabel: "mașini găsite",
    emptyState: {
      title: "Nu am găsit mașini",
      description: "Încearcă să modifici filtrele sau să cauți altceva.",
      clearButton: {
        label: "Resetează filtrele",
        ariaLabel: "Resetează filtrele",
      },
    },
  },
  booking: {
    reserveAria: "Rezervă",
    withoutDeposit: {
      label: "Fără garanție",
      button: {
        label: "Rezervă fără garanție",
        ariaLabel: "Rezervă fără garanție",
      },
      perDaySuffix: "/zi",
      totalPrefixTemplate: "x {{days}} zile = ",
    },
    withDeposit: {
      label: "Cu garanție",
      button: {
        label: "Rezervă cu garanție",
        ariaLabel: "Rezervă cu garanție",
      },
      perDaySuffix: "/zi",
      totalPrefixTemplate: "x {{days}} zile = ",
    },
  },
  cta: {
    title: "Nu găsești mașina potrivită?",
    description:
      "Contactează-ne și te ajutăm să găsești soluția perfectă pentru călătoria ta.",
    primary: {
      label: "Rezervă acum",
      ariaLabel: "Rezervă acum",
      href: "/checkout",
    },
    secondary: {
      label: "Contactează-ne",
      ariaLabel: "Contactează-ne",
      href: "#contact",
    },
  },
} as const;

export const CHECKOUT_PAGE_COPY_FALLBACK = {
  guard: {
    missingSelection: "Trebuie să completezi datele și să selectezi mașina.",
  },
  hero: {
    title: {
      lead: "Rezervă-ți",
      highlight: "mașina",
    },
    subtitle:
      "Completează formularul și te întâlnim la aeroport în sub 5 minute!",
  },
  validation: {
    endBeforeStart:
      "Data de returnare trebuie să fie mai mare decât data de ridicare.",
    carUnavailable: "Mașina nu este disponibilă în perioada selectată.",
  },
  form: {
    personal: {
      title: "Informații personale",
      name: {
        label: "Nume *",
        placeholder: "Introduceți numele complet",
      },
      email: {
        label: "Email *",
        placeholder: "nume@email.com",
      },
      phone: {
        label: "Telefon",
        placeholder: "+40 722 123 456",
      },
    },
    flight: {
      label: "Zbor (opțional)",
      placeholder: "Ex: RO123 sau Blue Air 456",
    },
    discount: {
      title: "Cod de reducere",
      placeholder: "Ex: WHEEL10",
      validateLabel: "Validează",
      validateAriaLabel: "Validează codul",
      removeLabel: "Șterge cod",
      successMessage: "Reducere aplicată!",
      errorMessage: "Eroare la validarea codului.",
      processingLabel: "Se procesează...",
    },
    services: {
      title: "Servicii Extra",
      emptyState: "Niciun serviciu disponibil",
    },
    reservation: {
      title: "Detalii rezervare",
      startDateLabel: "Dată ridicare *",
      startTimeLabel: "Oră ridicare *",
      endDateLabel: "Dată returnare *",
      endTimeLabel: "Oră returnare *",
    },
    deposit: {
      label: "Garanție",
      without: "Fără garanție",
      with: "Cu garanție",
    },
    submit: {
      label: "Finalizează rezervarea",
      processing: "Se procesează...",
      ariaLabel: "Finalizează rezervarea",
    },
  },
  wheelPrize: {
    title: "Premiu Roata Norocului",
    applyNote:
      "Beneficiul va fi aplicat de echipa DaCars când finalizezi rezervarea.",
    expiryWithDateTemplate: "Valabil până la {{date}}.",
    expiryFallback: "Valabil 30 de zile de la momentul câștigării.",
    savingsTemplate: "Economisești {{amount}}€ la această rezervare.",
  },
  summary: {
    title: "Rezumatul rezervării",
    carLabel: "Mașină:",
    fromLabel: "De la:",
    toLabel: "Până la:",
    locationLabel: "Locație:",
    locationValues: {
      aeroport: "Aeroport Henri Coandă, Otopeni",
      city: "Centrul Bucureștiului",
      other: "Altă locație",
    },
    price: {
      summaryLabel: "Sumar:",
      priceTemplate: "{{rate}}€ x {{days}} zile",
      subtotalLabel: "Subtotal:",
      servicesLabel: "Servicii:",
      wheelPrizeLabel: "Premiu Roata Norocului:",
      totalBeforeDiscountLabel: "Total înainte de reducere:",
      discountLabel: "Reducere:",
      totalLabel: "Total:",
      depositLabel: "Garanție:",
      depositSuffixTemplate: "(+{{deposit}}€ garanție)",
      footnote: "*Preț final, fără taxe ascunse",
    },
    benefits: {
      title: "Include:",
      items: [
        "✓ Predare în sub 5 minute",
        "✓ Disponibilitate 24/7",
        "✓ Fără taxe ascunse",
        "✓ Modificare gratuită",
      ],
    },
  },
} as const;

export const SUCCESS_PAGE_COPY_FALLBACK = {
  loading: {
    message: "Se încarcă detaliile rezervării...",
  },
  header: {
    title: {
      lead: "Rezervarea este",
      highlight: "confirmată!",
    },
    subtitleTemplate:
      "Mulțumim, <strong>{{customerName}}</strong>! Mașina ta te așteaptă la aeroport.",
    tagline: "Ne vedem acasă!",
    badgeTemplate: "Rezervarea {{reservationId}}",
  },
  wheelPrize: {
    title: "Premiu Roata Norocului",
    fallbackTitle: "Premiu DaCars",
    usage: {
      prefix: "Ai folosit premiul",
      amountTemplate: " — {{amount}}",
    },
    savingsTemplate: "Economisești {{amount}}€ la această rezervare.",
    expiryWithDateTemplate: "Premiul este valabil până la {{date}}.",
    expiryFallback: "Premiul rămâne valabil 30 de zile de la momentul câștigării.",
  },
  details: {
    title: "Detaliile rezervării tale",
    car: {
      title: "Mașina ta",
    },
    period: {
      title: "Perioada",
      pickupLabel: "Ridicare",
      returnLabel: "Returnare",
    },
    location: {
      title: "Locația",
      values: {
        aeroport: "Aeroport Henri Coandă, Otopeni",
        city: "Centrul Bucureștiului",
        other: "Altă locație",
      },
    },
    cost: {
      title: "Costul total",
      subtotalLabel: "Subtotal:",
      servicesLabel: "Servicii:",
      wheelPrizeLabel: "Premiu Roata Norocului:",
      discountLabel: "Reducere:",
      totalLabel: "Total",
      footnote: "*Preț final, fără taxe ascunse",
    },
    flight: {
      title: "Zborul tău",
    },
  },
  nextSteps: {
    title: "Ce urmează?",
    items: [
      {
        step: "1",
        title: "La aterizare",
        description: "Sună-ne la numărul de telefon când ieși din terminal",
      },
      {
        step: "2",
        title: "Te întâlnim",
        description: "Ajungem la tine în parcarea de scurtă durată în sub 5 minute",
      },
      {
        step: "3",
        title: "Drum bun!",
        description: "Primești cheile și poți pleca acasă în siguranță",
      },
    ],
  },
  contact: {
    title: "Contactează-ne oricând:",
    phoneDisplay: "+40 722 123 456",
    phoneHref: "tel:+40722123456",
    phoneAriaLabel: "Sună la +40 722 123 456",
    availability: "Disponibili 24/7 pentru urgențe",
  },
  actions: {
    print: {
      label: "Printează detaliile",
      ariaLabel: "Printează detaliile",
    },
    home: {
      label: "Înapoi Acasă",
      ariaLabel: "Înapoi Acasă",
    },
  },
  footer: {
    confirmation:
      "Vei primi o confirmare prin email cu toate detaliile rezervării.",
  },
} as const;

export const PUBLIC_CONTENT_FALLBACKS: PublicContentDictionary = {
  header: HEADER_COPY_FALLBACK,
  hero: HERO_COPY_FALLBACK,
  benefits: BENEFITS_COPY_FALLBACK,
  footer: FOOTER_COPY_FALLBACK,
  home: {
    fleet: HOME_FLEET_COPY_FALLBACK,
    offers: HOME_OFFERS_COPY_FALLBACK,
    process: HOME_PROCESS_COPY_FALLBACK,
    contact: HOME_CONTACT_COPY_FALLBACK,
  },
  cars: CARS_PAGE_COPY_FALLBACK,
  checkout: CHECKOUT_PAGE_COPY_FALLBACK,
  success: SUCCESS_PAGE_COPY_FALLBACK,
};
