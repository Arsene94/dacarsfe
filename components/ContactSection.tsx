"use client";

import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import LazyMap from "./LazyMap";
import { usePublicContentSection } from "@/context/PublicContentContext";
import { HOME_CONTACT_COPY_FALLBACK } from "@/lib/publicContent/defaults";

const ICON_MAP = {
  phone: Phone,
  messageCircle: MessageCircle,
  mail: Mail,
  mapPin: MapPin,
  clock: Clock,
} as const;

const ContactSection = () => {
  const copy = usePublicContentSection("home.contact", HOME_CONTACT_COPY_FALLBACK);

  return (
    <section id="contact" className="py-20 bg-gray-50">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <ul className="space-y-8">
            {copy.items.map((item, index) => {
              const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP] ?? Phone;
              return (
                <li
                  key={`${item.title}-${index}`}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group flex items-start space-x-4"
                >
                  <div className="bg-jade/10 p-3 rounded-xl group-hover:bg-jade group-hover:text-white transition-colors duration-300">
                    <Icon className="h-6 w-6 text-jade group-hover:text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">{item.title}</h3>
                    <p className="text-gray-600 font-dm-sans mb-3">{item.description}</p>
                    {item.link ? (
                      <a
                        href={item.link.href}
                        className="text-jade font-dm-sans font-semibold hover:text-jade/80 transition-colors duration-300"
                        aria-label={item.link.ariaLabel}
                      >
                        {item.link.label}
                      </a>
                    ) : null}
                    {item.lines ? (
                      <p className="text-berkeley font-dm-sans font-semibold">
                        {item.lines.map((line, lineIndex) => (
                          <span
                            key={`${line.text}-${lineIndex}`}
                            className={line.highlight ? "text-jade" : undefined}
                          >
                            {line.text}
                            {lineIndex < item.lines!.length - 1 ? <br /> : null}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6">{copy.map.title}</h3>
            <LazyMap />

            <div className="mt-6 space-y-4">
              {copy.map.notes.map((note, index) => (
                <div key={`note-${index}`} className="p-4 bg-jade/5 rounded-xl text-berkeley font-dm-sans">
                  <p dangerouslySetInnerHTML={{ __html: note.html }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
