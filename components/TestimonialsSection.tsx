"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const TestimonialsSection = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      name: "Ana Popescu",
      location: "București",
      rating: 5,
      text: "Prietenul de nădejde de la sosire! Am aterizat la 23:30 și în 5 minute aveam mașina. Fără bătăi de cap, fără taxe surpriză. Exact ce mi-au promis!",
      avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Mihai Ionescu",
      location: "Cluj-Napoca",
      rating: 5,
      text: "Am folosit DaCars pentru nunta mea. Mașina era impecabilă, decorațiunile incluse și prețul foarte corect. Recomand cu încredere!",
      avatar: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Elena Dumitrescu",
      location: "Timișoara",
      rating: 5,
      text: "Serviciu excepțional! Am avut nevoie să modific rezervarea de 3 ori și au fost foarte înțelegători. Fără taxe suplimentare, chiar așa cum au spus.",
      avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Radu Constantinescu",
      location: "Iași",
      rating: 5,
      text: "Am închirat pentru o săptămână întreagă. Mașina în stare perfectă, consum redus și personal foarte amabil. Sunt client fidel de acum!",
      avatar: "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-sans font-bold text-berkeley mb-6">
            Prietenul de nădejde <span className="text-jade">de la sosire</span>
          </h2>
          <p className="text-xl font-sans text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Citește experiențele clienților noștri și descoperă de ce ne aleg an de an.
          </p>
        </div>

        {/* Main testimonial */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-xl relative">
            <Quote className="h-16 w-16 text-jade/20 absolute top-6 left-6" />

            <div className="relative z-10">
              <div className="flex items-center justify-center mb-6">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                ))}
              </div>

              <blockquote className="text-2xl lg:text-3xl font-sans text-gray-800 text-center leading-relaxed mb-8">
                  &quot;{testimonials[currentTestimonial].text}&quot;
              </blockquote>

              <div className="flex items-center justify-center space-x-4">
                <Image
                  src={testimonials[currentTestimonial].avatar}
                  alt={testimonials[currentTestimonial].name}
                  width={64}
                  height={64}
                  className="rounded-full object-cover ring-4 ring-jade/20"
                />
                <div className="text-center">
                  <div className="font-sans font-semibold text-berkeley text-lg">
                    {testimonials[currentTestimonial].name}
                  </div>
                  <div className="font-sans text-gray-600">
                    {testimonials[currentTestimonial].location}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            <button
              onClick={prevTestimonial}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-lg hover:bg-gray-50 transition-colors duration-300"
              aria-label="Testimonial anterior"
            >
              <ChevronLeft className="h-6 w-6 text-berkeley" />
            </button>

            <button
              onClick={nextTestimonial}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-lg hover:bg-gray-50 transition-colors duration-300"
              aria-label="Testimonial următor"
            >
              <ChevronRight className="h-6 w-6 text-berkeley" />
            </button>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center space-x-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className="w-11 h-11 flex items-center justify-center rounded-full transition-colors duration-300 hover:bg-gray-100"
                aria-label={`Selectează testimonialul ${index + 1}`}
              >
                <span
                  className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                    index === currentTestimonial ? 'bg-jade' : 'bg-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* All testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl p-6 shadow-lg transition-all duration-300 cursor-pointer ${
                index === currentTestimonial ? 'ring-2 ring-jade shadow-xl transform scale-105' : 'hover:shadow-xl'
              }`}
              onClick={() => setCurrentTestimonial(index)}
            >
              <div className="flex items-center space-x-3 mb-4">
                <Image
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
                <div>
                  <div className="font-sans font-semibold text-berkeley">
                    {testimonial.name}
                  </div>
                  <div className="flex">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-gray-600 font-sans text-sm line-clamp-3">
                {testimonial.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
