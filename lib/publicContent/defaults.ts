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

export const PUBLIC_CONTENT_FALLBACKS: PublicContentDictionary = {
  header: HEADER_COPY_FALLBACK,
  hero: HERO_COPY_FALLBACK,
  benefits: BENEFITS_COPY_FALLBACK,
  footer: FOOTER_COPY_FALLBACK,
};
