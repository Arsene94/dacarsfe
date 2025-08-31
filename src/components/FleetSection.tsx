import React from 'react';
import Link from 'next/link';
import { Users, Fuel, Settings, Star } from 'lucide-react';

const FleetSection = () => {
  const cars = [
    {
      id: 1,
      name: "Dacia Logan",
      type: "Economic",
      image: "https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=600",
      price: "45",
      features: {
        passengers: 5,
        transmission: "Manual",
        fuel: "Benzină"
      },
      rating: 4.8
    },
    {
      id: 2,
      name: "Volkswagen Golf",
      type: "Comfort",
      image: "https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=600",
      price: "65",
      features: {
        passengers: 5,
        transmission: "Automat",
        fuel: "Benzină"
      },
      rating: 4.9
    },
    {
      id: 3,
      name: "BMW Seria 3",
      type: "Premium",
      image: "https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg?auto=compress&cs=tinysrgb&w=600",
      price: "95",
      features: {
        passengers: 5,
        transmission: "Automat",
        fuel: "Diesel"
      },
      rating: 4.9
    },
    {
      id: 4,
      name: "Ford Transit",
      type: "Van 9 locuri",
      image: "https://images.pexels.com/photos/1007410/pexels-photo-1007410.jpeg?auto=compress&cs=tinysrgb&w=600",
      price: "85",
      features: {
        passengers: 9,
        transmission: "Manual",
        fuel: "Diesel"
      },
      rating: 4.7
    }
  ];

  return (
    <section id="flota" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
            Flota noastră <span className="text-jade">premium</span>
          </h2>
          <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Mașini moderne, verificate și întreținute cu grijă pentru confortul și siguranța ta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {cars.map((car, index) => (
            <div 
              key={car.id}
              className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative overflow-hidden">
                <img 
                  src={car.image}
                  alt={car.name}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-jade text-white px-3 py-1 rounded-full text-sm font-dm-sans font-semibold">
                  {car.type}
                </div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-dm-sans font-semibold text-berkeley">{car.rating}</span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">
                  {car.name}
                </h3>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-sm text-gray-600 font-dm-sans">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-jade" />
                      <span>{car.features.passengers} persoane</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-jade" />
                      <span>{car.features.transmission}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 font-dm-sans">
                    <Fuel className="h-4 w-4 text-jade" />
                    <span>{car.features.fuel}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-poppins font-bold text-berkeley">{car.price}€</span>
                    <span className="text-gray-600 font-dm-sans">/zi</span>
                  </div>
                  
                  <Link
                    href="/rezervare"
                    className="px-4 py-2 bg-jade text-white font-dm-sans font-semibold rounded-lg hover:bg-jade/90 transition-colors duration-300"
                  >
                    Rezervă
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/flota"
            className="inline-flex items-center px-8 py-4 border-2 border-jade text-jade font-dm-sans font-semibold rounded-lg hover:bg-jade hover:text-white transition-all duration-300"
          >
            Vezi toată flota
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FleetSection;
