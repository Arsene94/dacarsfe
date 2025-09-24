import { Car, Clock, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { usePublicContentSection } from "@/context/PublicContentContext";

const FOOTER_COPY_FALLBACK = {
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

type ContactIcon = "phone" | "mail" | "map" | "clock";

const resolveContactIcon = (icon?: string): JSX.Element => {
  const normalized = icon?.toLowerCase() ?? "";
  switch (normalized) {
    case "phone":
      return <Phone className="h-4 w-4 text-jade" />;
    case "mail":
      return <Mail className="h-4 w-4 text-jade" />;
    case "map":
      return <MapPin className="h-4 w-4 text-jade" />;
    case "clock":
      return <Clock className="h-4 w-4 text-jade" />;
    default:
      return <Car className="h-4 w-4 text-jade" />;
  }
};

const Footer = () => {
  const copy = usePublicContentSection("footer", FOOTER_COPY_FALLBACK);

  const brandTitle =
    (copy?.brand?.title as string | undefined) ?? FOOTER_COPY_FALLBACK.brand.title;
  const brandDescription =
    (copy?.brand?.description as string | undefined) ??
    FOOTER_COPY_FALLBACK.brand.description;

  const navItems = Array.isArray(copy?.navigation?.items)
    ? copy.navigation.items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const data = item as Record<string, unknown>;
          const label = typeof data.label === "string" ? data.label.trim() : "";
          const href = typeof data.href === "string" ? data.href.trim() : "";
          const ariaLabel =
            typeof data.ariaLabel === "string" && data.ariaLabel.trim().length > 0
              ? data.ariaLabel.trim()
              : label;
          if (!label || !href) return null;
          return { label, href, ariaLabel };
        })
        .filter((item): item is { label: string; href: string; ariaLabel: string } => item !== null)
    : FOOTER_COPY_FALLBACK.navigation.items;

  const contactItems = Array.isArray(copy?.contact?.items)
    ? copy.contact.items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const data = item as Record<string, unknown>;
          const label = typeof data.label === "string" ? data.label.trim() : "";
          if (!label) return null;
          const href = typeof data.href === "string" ? data.href.trim() : undefined;
          const icon = typeof data.icon === "string" ? data.icon : undefined;
          return { label, href, icon };
        })
        .filter((item): item is { label: string; href?: string; icon?: string } => item !== null)
    : FOOTER_COPY_FALLBACK.contact.items;

  const schedule = {
    title:
      (copy?.schedule?.title as string | undefined) ??
      FOOTER_COPY_FALLBACK.schedule.title,
    subtitle:
      (copy?.schedule?.subtitle as string | undefined) ??
      FOOTER_COPY_FALLBACK.schedule.subtitle,
    highlight:
      (copy?.schedule?.highlight as string | undefined) ??
      FOOTER_COPY_FALLBACK.schedule.highlight,
    description:
      (copy?.schedule?.description as string | undefined) ??
      FOOTER_COPY_FALLBACK.schedule.description,
  };

  const policyLinks = Array.isArray(copy?.policies?.items)
    ? copy.policies.items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const data = item as Record<string, unknown>;
          const label = typeof data.label === "string" ? data.label.trim() : "";
          const href = typeof data.href === "string" ? data.href.trim() : "";
          const ariaLabel =
            typeof data.ariaLabel === "string" && data.ariaLabel.trim().length > 0
              ? data.ariaLabel.trim()
              : label;
          if (!label || !href) return null;
          return { label, href, ariaLabel };
        })
        .filter((item): item is { label: string; href: string; ariaLabel: string } => item !== null)
    : FOOTER_COPY_FALLBACK.policies.items;

  const navigationTitle =
    (copy?.navigation?.title as string | undefined) ??
    FOOTER_COPY_FALLBACK.navigation.title;

  const contactTitle =
    (copy?.contact?.title as string | undefined) ?? FOOTER_COPY_FALLBACK.contact.title;

  const copyrightText =
    (copy?.copyright as string | undefined) ?? FOOTER_COPY_FALLBACK.copyright;

  return (
    <footer className="bg-berkeley text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-jade p-2 rounded-lg">
                <Car className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-poppins font-bold">{brandTitle}</span>
            </div>
            <p className="text-gray-300 font-dm-sans leading-relaxed">{brandDescription}</p>
          </div>

          <div>
            <h3 className="text-lg font-poppins font-semibold mb-4">{navigationTitle}</h3>
            <ul className="space-y-2 font-dm-sans">
              {navItems.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-jade transition-colors duration-300"
                    aria-label={item.ariaLabel}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-poppins font-semibold mb-4">{contactTitle}</h3>
            <ul className="space-y-3 font-dm-sans text-gray-300">
              {contactItems.map((item) => {
                const icon = resolveContactIcon(item.icon as ContactIcon | undefined);
                const content = item.href ? (
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-jade transition-colors duration-300"
                    aria-label={item.label}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                );
                return (
                  <li key={`${item.label}-${item.href ?? "static"}`} className="flex items-center space-x-3">
                    {icon}
                    {content}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-poppins font-semibold mb-4">{schedule.title}</h3>
            <div className="space-y-2 font-dm-sans text-gray-300">
              <p>{schedule.subtitle}</p>
              <p className="text-white font-semibold">{schedule.highlight}</p>
              <p className="text-sm mt-4">{schedule.description}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-300 font-dm-sans text-sm">{copyrightText}</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            {policyLinks.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="text-gray-300 hover:text-jade transition-colors duration-300 text-sm font-dm-sans"
                aria-label={item.ariaLabel}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

