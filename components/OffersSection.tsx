import React from 'react';
import Link from 'next/link';
import { Heart, Users, Gift, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OffersSection = () => {
  const offers = [
    {
      icon: Heart,
      title: "Pachet Nuntă",
      discount: "10% reducere",
      description: "Pentru cei mai frumoși ani din viața voastră. Mașină elegantă pentru ziua specială.",
      features: ["Decorațiuni incluse", "Predare la locație", "Șofer opțional"],
      color: "bg-gradient-to-br from-pink-500 to-rose-600",
      textColor: "text-white"
    },
    {
      icon: Users,
      title: "Reducere Prieteni",
      discount: "20% reducere",
      description: "Adu-ți prietenii și economisește! Cu cât sunteți mai mulți, cu atât mai avantajos.",
      features: ["Pentru grupuri 4+", "Valabil 30 zile", "Cumulabilă cu alte oferte"],
      color: "bg-gradient-to-br from-jade to-emerald-600",
      textColor: "text-white"
    }
  ];

  return (
    <section id="oferte" className="py-20 bg-berkeley">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-poppins font-bold text-white mb-6">
            Oferte <span className="text-jade">speciale</span>
          </h2>
          <p className="text-xl font-dm-sans text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Promoții exclusive pentru momentele importante din viața ta.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {offers.map((offer, index) => (
            <div 
              key={index}
              className={`${offer.color} rounded-3xl p-8 relative overflow-hidden group transform hover:scale-105 transition-all duration-300 animate-slide-up`}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>

              <div className={`${offer.textColor} relative z-10`}>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="bg-white/20 p-3 rounded-2xl">
                    <offer.icon className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-poppins font-bold">{offer.title}</h3>
                    <div className="text-3xl font-poppins font-bold text-yellow-300">{offer.discount}</div>
                  </div>
                </div>

                <p className="text-lg font-dm-sans mb-6 opacity-90 leading-relaxed">
                  {offer.description}
                </p>

                <div className="space-y-2 mb-8">
                  {offer.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-3">
                      <Gift className="h-4 w-4 text-yellow-300" />
                      <span className="font-dm-sans">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link href="/rezervare" aria-label="Profită acum">
                  <Button
                    className="px-6 py-3 bg-white text-berkeley hover:bg-gray-100"
                    aria-label="Profită acum"
                  >
                    Profită acum
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Seasonal offer */}
        <div className="bg-gradient-to-r from-jade/20 to-jade/10 border border-jade/30 rounded-2xl p-8 text-center">
          <Calendar className="h-12 w-12 text-jade mx-auto mb-4" />
          <h3 className="text-2xl font-poppins font-bold text-white mb-4">
            Ofertă limitată de sezon
          </h3>
          <p className="text-gray-300 font-dm-sans mb-6 max-w-2xl mx-auto">
            Rezervă acum pentru perioada sărbătorilor și beneficiezi de tarife preferențiale și servicii premium incluse.
          </p>
            <Link href="/rezervare" aria-label="Rezervă cu reducere">
              <Button className="px-8 py-4" aria-label="Rezervă cu reducere">
                Rezervă cu reducere
              </Button>
            </Link>
          </div>
      </div>
    </section>
  );
};

export default OffersSection;
