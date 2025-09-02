import React from 'react';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';

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
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group">
              <div className="flex items-start space-x-4">
                <div className="bg-jade/10 p-3 rounded-xl group-hover:bg-jade group-hover:text-white transition-colors duration-300">
                  <Phone className="h-6 w-6 text-jade group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">Telefon</h3>
                  <p className="text-gray-600 font-dm-sans mb-3">Suntem disponibili 24/7 pentru urgențe</p>
                  <a
                    href="tel:+40722123456"
                    className="text-jade font-dm-sans font-semibold hover:text-jade/80 transition-colors duration-300"
                    aria-label="Sună la +40 722 123 456"
                  >
                    +40 722 123 456
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group">
              <div className="flex items-start space-x-4">
                <div className="bg-jade/10 p-3 rounded-xl group-hover:bg-jade group-hover:text-white transition-colors duration-300">
                  <MessageCircle className="h-6 w-6 text-jade group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">WhatsApp</h3>
                  <p className="text-gray-600 font-dm-sans mb-3">Scrie-ne pentru răspuns rapid</p>
                  <a
                    href="https://wa.me/40722123456"
                    className="text-jade font-dm-sans font-semibold hover:text-jade/80 transition-colors duration-300"
                    aria-label="Contactează pe WhatsApp la +40 722 123 456"
                  >
                    +40 722 123 456
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group">
              <div className="flex items-start space-x-4">
                <div className="bg-jade/10 p-3 rounded-xl group-hover:bg-jade group-hover:text-white transition-colors duration-300">
                  <Mail className="h-6 w-6 text-jade group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">Email</h3>
                  <p className="text-gray-600 font-dm-sans mb-3">Pentru întrebări generale</p>
                  <a
                    href="mailto:contact@dacars.ro"
                    className="text-jade font-dm-sans font-semibold hover:text-jade/80 transition-colors duration-300"
                    aria-label="Trimite email la contact@dacars.ro"
                  >
                    contact@dacars.ro
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group">
              <div className="flex items-start space-x-4">
                <div className="bg-jade/10 p-3 rounded-xl group-hover:bg-jade group-hover:text-white transition-colors duration-300">
                  <MapPin className="h-6 w-6 text-jade group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">Locație</h3>
                  <p className="text-gray-600 font-dm-sans mb-3">Punct de predare principal</p>
                  <p className="text-berkeley font-dm-sans font-semibold">
                    Aeroportul Henri Coandă<br />
                    Otopeni, Ilfov
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group">
              <div className="flex items-start space-x-4">
                <div className="bg-jade/10 p-3 rounded-xl group-hover:bg-jade group-hover:text-white transition-colors duration-300">
                  <Clock className="h-6 w-6 text-jade group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">Program</h3>
                  <p className="text-gray-600 font-dm-sans mb-3">Predare și ridicare</p>
                  <p className="text-berkeley font-dm-sans font-semibold">
                    24/7 - Non-stop<br />
                    <span className="text-jade">Disponibili oricând</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6">
              Locația noastră
            </h3>
            <div className="bg-gray-200 rounded-xl h-96 flex items-center justify-center relative overflow-hidden">
              {/* Google Maps Embed would go here */}
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2846.4739945633546!2d26.075859776834645!3d44.571436871071816!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40b20b4b1c9b9b9b%3A0x1c9b9b9b9b9b9b9b!2sHenri%20Coand%C4%83%20International%20Airport!5e0!3m2!1sen!2sro!4v1634567890123!5m2!1sen!2sro"
                width="100%"
                height="100%"
                className="rounded-xl"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Harta DaCars Otopeni"
              ></iframe>
            </div>
            
            <div className="mt-6 p-4 bg-jade/5 rounded-xl">
              <p className="text-berkeley font-dm-sans">
                <strong>Instrucțiuni de sosire:</strong> După ce ieși din terminal, sună-ne la numărul de telefon și te întâlnim în parcarea de scurtă durată în maximum 5 minute.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
