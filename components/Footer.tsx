import React from 'react';
import { Car, Phone, Mail, MapPin, Clock } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-berkeley text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo și descriere */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-jade p-2 rounded-lg">
                <Car className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-poppins font-bold">DaCars</span>
            </div>
            <p className="text-gray-300 font-dm-sans leading-relaxed">
              Mașini oneste pentru români onești. Predare în aeroport în sub 5 minute, fără taxe ascunse.
            </p>
          </div>

          {/* Linkuri rapide */}
          <div>
            <h3 className="text-lg font-poppins font-semibold mb-4">Linkuri Rapide</h3>
            <ul className="space-y-2 font-dm-sans">
              <li>
                <a href="/" className="text-gray-300 hover:text-jade transition-colors duration-300" aria-label="Acasă">
                  Acasă
                </a>
              </li>
              <li>
                <a
                  href="#flota"
                  className="text-gray-300 hover:text-jade transition-colors duration-300"
                  aria-label="Flota Auto"
                >
                  Flota Auto
                </a>
              </li>
              <li>
                <a href="#oferte" className="text-gray-300 hover:text-jade transition-colors duration-300" aria-label="Oferte Speciale">
                  Oferte Speciale
                </a>
              </li>
              <li>
                <a href="/rezervare" className="text-gray-300 hover:text-jade transition-colors duration-300" aria-label="Rezervare">
                  Rezervare
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-poppins font-semibold mb-4">Contact</h3>
            <div className="space-y-3 font-dm-sans">
              <div className="flex items-center space-x-3 text-gray-300">
                <Phone className="h-4 w-4 text-jade" />
                <span>+40 722 123 456</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <Mail className="h-4 w-4 text-jade" />
                <span>contact@dacars.ro</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <MapPin className="h-4 w-4 text-jade" />
                <span>Aeroportul Henri Coandă, Otopeni</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <Clock className="h-4 w-4 text-jade" />
                <span>Disponibil 24/7</span>
              </div>
            </div>
          </div>

          {/* Program și social */}
          <div>
            <h3 className="text-lg font-poppins font-semibold mb-4">Program</h3>
            <div className="space-y-2 font-dm-sans text-gray-300">
              <p>Luni - Duminică</p>
              <p className="text-white font-semibold">24/7</p>
              <p className="text-sm mt-4">Predare și ridicare non-stop la aeroport</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-300 font-dm-sans text-sm">
            © 2024 DaCars. Toate drepturile rezervate.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a
              href="#"
              className="text-gray-300 hover:text-jade transition-colors duration-300 text-sm font-dm-sans"
              aria-label="Termeni și Condiții"
            >
              Termeni și Condiții
            </a>
            <a
              href="#"
              className="text-gray-300 hover:text-jade transition-colors duration-300 text-sm font-dm-sans"
              aria-label="Politica de Confidențialitate"
            >
              Politica de Confidențialitate
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
