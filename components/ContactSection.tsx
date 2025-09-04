import React from 'react';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import LazyMap from './LazyMap';

const contactItems = [
  {
    icon: Phone,
    title: 'Telefon',
    description: 'Suntem disponibili 24/7 pentru urgențe',
    content: (
      <a
        href="tel:+40723817551"
        className="text-jade font-dm-sans font-semibold hover:text-jade/80 transition-colors duration-300"
        aria-label="Sună la +40 723 817 551"
      >
        +40 723 817 551
      </a>
    ),
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    description: 'Scrie-ne pentru răspuns rapid',
    content: (
      <a
        href="https://wa.me/40723817551"
        className="text-jade font-dm-sans font-semibold hover:text-jade/80 transition-colors duration-300"
        aria-label="Contactează pe WhatsApp la +40 723 817 551"
      >
        +40 723 817 551
      </a>
    ),
  },
  {
    icon: Mail,
    title: 'Email',
    description: 'Pentru întrebări generale',
    content: (
      <a
        href="mailto:contact@dacars.ro"
        className="text-jade font-dm-sans font-semibold hover:text-jade/80 transition-colors duration-300"
        aria-label="Trimite email la contact@dacars.ro"
      >
        contact@dacars.ro
      </a>
    ),
  },
  {
    icon: MapPin,
    title: 'Locație',
    description: 'Punct de predare principal',
    content: (
      <p className="text-berkeley font-dm-sans font-semibold">
        Calea Bucurestilor 305<br />
        Otopeni, Ilfov
      </p>
    ),
  },
  {
    icon: Clock,
    title: 'Program',
    description: 'Predare și ridicare',
    content: (
      <p className="text-berkeley font-dm-sans font-semibold">
        24/7 - Non-stop<br />
        <span className="text-jade">Disponibili oricând</span>
      </p>
    ),
  },
];

const ContactSection = () => {
  return (
    <section id="contact" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
            Contactează-ne <span className="text-jade">oricând</span>
          </h2>
          <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Suntem aici să te ajutăm 24/7. Ia legătura cu noi prin oricare dintre metodele de mai jos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact info */}
          <ul className="space-y-8">
            {contactItems.map(({ icon: Icon, title, description, content }) => (
              <li
                key={title}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group flex items-start space-x-4"
              >
                <div className="bg-jade/10 p-3 rounded-xl group-hover:bg-jade group-hover:text-white transition-colors duration-300">
                  <Icon className="h-6 w-6 text-jade group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">{title}</h3>
                  <p className="text-gray-600 font-dm-sans mb-3">{description}</p>
                  {content}
                </div>
              </li>
            ))}
          </ul>

          {/* Map */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6">Locația noastră</h3>
            <LazyMap />

            <div className="mt-6 p-4 bg-jade/5 rounded-xl">
              <p className="text-berkeley font-dm-sans">
                <strong>Instrucțiuni de sosire:</strong> Când aterizezi, sună-ne la numărul de telefon, iar apoi ne întâlnim în fața stației CFR, în fața cupolei verde de sticlă, la terminalul Sosiri.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
