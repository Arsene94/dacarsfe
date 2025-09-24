"use client";

import React from "react";
import Link from "next/link";
import { Calendar, Gift, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicContentSection } from "@/context/PublicContentContext";
import { HOME_OFFERS_COPY_FALLBACK } from "@/lib/publicContent/defaults";

const ICON_MAP = {
  heart: Heart,
  users: Users,
} as const;

const OffersSection = () => {
  const copy = usePublicContentSection("home.offers", HOME_OFFERS_COPY_FALLBACK);

  return (
    <section id="oferte" className="py-20 bg-berkeley">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2
            className="text-4xl lg:text-5xl font-poppins font-bold text-white mb-6"
            dangerouslySetInnerHTML={{ __html: copy.title }}
          />
          <p className="text-xl font-dm-sans text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {copy.description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {copy.cards.map((offer, index) => {
            const Icon = ICON_MAP[offer.icon as keyof typeof ICON_MAP] ?? Heart;
            return (
              <div
                key={`${offer.title}-${index}`}
                className={`${offer.color} rounded-3xl p-8 relative overflow-hidden group transform hover:scale-105 transition-all duration-300 animate-slide-up`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />

                <div className={`${offer.textColor} relative z-10`}>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="bg-white/20 p-3 rounded-2xl">
                      <Icon className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-poppins font-bold">{offer.title}</h3>
                      <div className="text-3xl font-poppins font-bold text-yellow-300">{offer.discount}</div>
                    </div>
                  </div>

                  <p className="text-lg font-dm-sans mb-6 opacity-90 leading-relaxed">{offer.description}</p>

                  <div className="space-y-2 mb-8">
                    {offer.features.map((feature, featureIndex) => (
                      <div key={`${feature}-${featureIndex}`} className="flex items-center space-x-3">
                        <Gift className="h-4 w-4 text-yellow-300" />
                        <span className="font-dm-sans">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link href={offer.button.href} aria-label={offer.button.ariaLabel}>
                    <Button
                      className="px-6 py-3 bg-white !text-berkeley hover:!bg-gray-100"
                      aria-label={offer.button.ariaLabel}
                    >
                      {offer.button.label}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-jade/20 to-jade/10 border border-jade/30 rounded-2xl p-8 text-center">
          <Calendar className="h-12 w-12 text-jade mx-auto mb-4" />
          <h3 className="text-2xl font-poppins font-bold text-white mb-4">{copy.seasonal.title}</h3>
          <p className="text-gray-300 font-dm-sans mb-6 max-w-2xl mx-auto">{copy.seasonal.description}</p>
          <Link href={copy.seasonal.button.href} aria-label={copy.seasonal.button.ariaLabel}>
            <Button className="px-8 py-4" aria-label={copy.seasonal.button.ariaLabel}>
              {copy.seasonal.button.label}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default OffersSection;
