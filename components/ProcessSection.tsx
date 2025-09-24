"use client";

import Link from "next/link";
import { MapPin, MousePointer, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicContentSection } from "@/context/PublicContentContext";
import { HOME_PROCESS_COPY_FALLBACK } from "@/lib/publicContent/defaults";

const ICON_MAP = {
  mousePointer: MousePointer,
  mapPin: MapPin,
  route: Route,
} as const;

const ProcessSection = () => {
  const copy = usePublicContentSection("home.process", HOME_PROCESS_COPY_FALLBACK);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2
            className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6"
            dangerouslySetInnerHTML={{ __html: copy.title }}
          />
          <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {copy.description}
          </p>
        </div>

        <div className="relative">
          <div className="absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-jade via-berkeley to-jade hidden lg:block" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {copy.steps.map((step, index) => {
              const Icon = ICON_MAP[step.icon as keyof typeof ICON_MAP] ?? MousePointer;
              return (
                <div
                  key={`${step.title}-${index}`}
                  className="relative text-center group animate-slide-up"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div
                    className={`${step.color} w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <span className="text-2xl font-poppins font-bold text-white">{step.number}</span>
                  </div>

                  <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-jade/10 transition-colors duration-300">
                    <Icon className="h-8 w-8 text-berkeley group-hover:text-jade transition-colors duration-300" />
                  </div>

                  <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-4 group-hover:text-jade transition-colors duration-300">
                    {step.title}
                  </h3>

                  <p className="text-gray-600 font-dm-sans leading-relaxed max-w-sm mx-auto">{step.description}</p>

                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0 h-1 bg-jade group-hover:w-20 transition-all duration-500 rounded-full" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-berkeley/5 to-jade/5 rounded-3xl p-8 lg:p-12">
            <h3 className="text-3xl font-poppins font-bold text-berkeley mb-4">{copy.cta.title}</h3>
            <p className="text-xl font-dm-sans text-gray-600 mb-8 max-w-2xl mx-auto">{copy.cta.description}</p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href={copy.cta.primary.href} aria-label={copy.cta.primary.ariaLabel}>
                <Button
                  className="transform hover:scale-105 shadow-lg"
                  aria-label={copy.cta.primary.ariaLabel}
                >
                  {copy.cta.primary.label}
                </Button>
              </Link>

              <Link href={copy.cta.secondary.href} aria-label={copy.cta.secondary.ariaLabel}>
                <Button
                  variant="outline"
                  className="border-berkeley text-berkeley hover:bg-berkeley hover:text-white"
                  aria-label={copy.cta.secondary.ariaLabel}
                >
                  {copy.cta.secondary.label}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
