import React from 'react';
import { FileX, Clock, Zap, DollarSign } from 'lucide-react';

const BenefitsSection = () => {
  const benefits = [
    {
      icon: FileX,
      title: "Fără birocrație",
      description: "Proces simplu și rapid, fără acte complicate sau așteptare lungă."
    },
    {
      icon: Clock,
      title: "Disponibil 24/7",
      description: "Predare și ridicare non-stop la aeroport, oricând ai nevoie."
    },
    {
      icon: Zap,
      title: "Flexibilitate maximă",
      description: "Modifici sau anulezi rezervarea fără taxe suplimentare."
    },
    {
      icon: DollarSign,
      title: "Fără taxe ascunse",
      description: "Preț transparent și clar de la început. Ce vezi, asta plătești."
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-sans font-bold text-berkeley mb-6">
            De ce să alegi <span className="text-jade">DaCars</span>?
          </h2>
          <p className="text-xl font-sans text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Serviciu de încredere, creat special pentru românii care călătoresc și au nevoie de o mașină la întoarcerea acasă.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="bg-jade/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-jade/20 transition-colors duration-300">
                <benefit.icon className="h-8 w-8 text-jade" />
              </div>

              <h3 className="text-xl font-sans font-semibold text-berkeley mb-4">
                {benefit.title}
              </h3>

              <p className="text-gray-600 font-sans leading-relaxed">
                {benefit.description}
              </p>

              <div className="mt-6 w-0 h-1 bg-jade rounded-full group-hover:w-full transition-all duration-500"></div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl font-sans font-bold text-jade mb-2">500+</div>
            <div className="text-gray-600 font-sans">Clienți fericiți</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-sans font-bold text-jade mb-2">24/7</div>
            <div className="text-gray-600 font-sans">Disponibilitate</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-sans font-bold text-jade mb-2">&lt;5min</div>
            <div className="text-gray-600 font-sans">Timp predare</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-sans font-bold text-jade mb-2">0</div>
            <div className="text-gray-600 font-sans">Taxe ascunse</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
