import React from 'react';
import Link from 'next/link';
import { MousePointer, MapPin, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProcessSection = () => {
  const steps = [
    {
      icon: MousePointer,
      number: "01",
      title: "Rezervă online",
      description: "Completează formularul simplu și alege mașina potrivită pentru tine.",
      color: "bg-jade"
    },
    {
      icon: MapPin,
      number: "02", 
      title: "Ridici la aeroport",
      description: "Te întâlnim la sosiri în sub 5 minute cu mașina pregătită.",
      color: "bg-berkeley"
    },
    {
      icon: Route,
      number: "03",
      title: "Drum bun acasă",
      description: "Ajungi acasă în siguranță cu mașina ta închiriată.",
      color: "bg-jade"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
            Procesul nostru <span className="text-jade">simplu</span>
          </h2>
          <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Doar 3 pași simpli te despart de mașina ta. Fără complicații, fără stres.
          </p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-jade via-berkeley to-jade hidden lg:block"></div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="relative text-center group animate-slide-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Step number background */}
                <div className={`${step.color} w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-2xl font-poppins font-bold text-white">{step.number}</span>
                </div>

                {/* Icon */}
                <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-jade/10 transition-colors duration-300">
                  <step.icon className="h-8 w-8 text-berkeley group-hover:text-jade transition-colors duration-300" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-4 group-hover:text-jade transition-colors duration-300">
                  {step.title}
                </h3>
                
                <p className="text-gray-600 font-dm-sans leading-relaxed max-w-sm mx-auto">
                  {step.description}
                </p>

                {/* Decorative element */}
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0 h-1 bg-jade group-hover:w-20 transition-all duration-500 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-berkeley/5 to-jade/5 rounded-3xl p-8 lg:p-12">
            <h3 className="text-3xl font-poppins font-bold text-berkeley mb-4">
              Gata să începi?
            </h3>
            <p className="text-xl font-dm-sans text-gray-600 mb-8 max-w-2xl mx-auto">
              Rezervarea durează doar 2 minute. Mașina ta te așteaptă la aeroport!
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/rezervare" aria-label="Rezervă acum">
                <Button
                  className="transform hover:scale-105 shadow-lg"
                  aria-label="Rezervă acum"
                >
                  Rezervă acum
                </Button>
              </Link>

              <a href="#flota" aria-label="Vezi flota">
                <Button
                  variant="outline"
                  className="border-berkeley text-berkeley hover:bg-berkeley hover:text-white"
                  aria-label="Vezi flota"
                >
                  Vezi flota
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
