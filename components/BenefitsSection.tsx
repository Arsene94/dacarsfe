"use client";

import { DollarSign, FileX, Zap, Clock } from "lucide-react";
import { usePublicContentSection } from "@/context/PublicContentContext";

const BENEFITS_COPY_FALLBACK = {
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

type BenefitIcon = "file" | "clock" | "zap" | "dollar";

const resolveIcon = (icon?: string) => {
  const key = icon?.toLowerCase() ?? "";
  switch (key) {
    case "clock":
      return Clock;
    case "zap":
      return Zap;
    case "dollar":
      return DollarSign;
    case "file":
    default:
      return FileX;
  }
};

const BenefitsSection = () => {
  const copy = usePublicContentSection("benefits", BENEFITS_COPY_FALLBACK);

  const title =
    (copy?.title as string | undefined) ?? BENEFITS_COPY_FALLBACK.title;
  const description =
    (copy?.description as string | undefined) ??
    BENEFITS_COPY_FALLBACK.description;

  const benefits = Array.isArray(copy?.items)
    ? copy.items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const data = item as Record<string, unknown>;
          const titleValue =
            typeof data.title === "string" ? data.title.trim() : "";
          const descriptionValue =
            typeof data.description === "string" ? data.description.trim() : "";
          const icon = typeof data.icon === "string" ? data.icon : undefined;
          if (!titleValue || !descriptionValue) return null;
          return { title: titleValue, description: descriptionValue, icon };
        })
        .filter((item): item is { title: string; description: string; icon?: string } => item !== null)
    : BENEFITS_COPY_FALLBACK.items;

  const stats = Array.isArray(copy?.stats)
    ? copy.stats
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const data = item as Record<string, unknown>;
          const value = typeof data.value === "string" ? data.value.trim() : "";
          const label = typeof data.label === "string" ? data.label.trim() : "";
          if (!value || !label) return null;
          return { value, label };
        })
        .filter((item): item is { value: string; label: string } => item !== null)
    : BENEFITS_COPY_FALLBACK.stats;

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2
            className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6"
            dangerouslySetInnerHTML={{ __html: title }}
          />
          <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => {
            const IconComponent = resolveIcon(benefit.icon);
            return (
              <div
                key={`${benefit.title}-${index}`}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="bg-jade/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-jade/20 transition-colors duration-300">
                  <IconComponent className="h-8 w-8 text-jade" />
                </div>

                <h3 className="text-xl font-poppins font-semibold text-berkeley mb-4">
                  {benefit.title}
                </h3>

                <p className="text-gray-600 font-dm-sans leading-relaxed">
                  {benefit.description}
                </p>

                <div className="mt-6 w-0 h-1 bg-jade rounded-full group-hover:w-full transition-all duration-500"></div>
              </div>
            );
          })}
        </div>

        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div className="text-center" key={`${stat.value}-${stat.label}`}>
              <div className="text-4xl font-poppins font-bold text-jade mb-2">
                {stat.value}
              </div>
              <div className="text-gray-600 font-dm-sans">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;

