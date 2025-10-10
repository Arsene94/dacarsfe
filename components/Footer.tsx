"use client";

import React from "react";
import { Car, Phone, Mail, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n/useTranslations";

type FooterLink = { label?: string; href?: string; aria?: string };

type FooterMessages = {
    brand?: { name?: string; tagline?: string };
    quickLinks?: { title?: string; links?: FooterLink[] };
    contact?: { title?: string; items?: { phone?: string; email?: string; address?: string; schedule?: string } };
    schedule?: { title?: string; days?: string; hours?: string; note?: string };
    bottom?: { copyright?: string; links?: FooterLink[] };
};

const Footer = () => {
    const { messages } = useTranslations("layout");
    const footer = (messages.footer ?? {}) as FooterMessages;

    const quickLinks = footer.quickLinks?.links?.filter((item) => item?.label) ?? [];
    const bottomLinks = footer.bottom?.links?.filter((item) => item?.label) ?? [];

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
                            <span className="text-2xl font-poppins font-bold">{footer.brand?.name ?? "DaCars"}</span>
                        </div>
                        <p className="text-gray-300 font-dm-sans leading-relaxed">
                            {footer.brand?.tagline ??
                                "Mașini oneste pentru români onești. Predare în aeroport în sub 5 minute, fără taxe ascunse."}
                        </p>
                    </div>

                    {/* Linkuri rapide */}
                    <div>
                        <h3 className="text-lg font-poppins font-semibold mb-4">
                            {footer.quickLinks?.title ?? "Linkuri Rapide"}
                        </h3>
                        <ul className="space-y-2 font-dm-sans">
                            {quickLinks.map((link) => (
                                <li key={`${link.href}-${link.label}`}>
                                    <Link
                                        href={link.href ?? "#"}
                                        className="text-gray-300 hover:text-jade transition-colors duration-300"
                                        aria-label={link.aria ?? link.label}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-lg font-poppins font-semibold mb-4">{footer.contact?.title ?? "Contact"}</h3>
                        <ul className="space-y-3 font-dm-sans text-gray-300">
                            <li className="flex items-center space-x-3">
                                <Phone className="h-4 w-4 text-jade" />
                                <span><Link target="_blank" href={`https://wa.me/${footer.contact?.items?.phone ?? "https://wa.me/40 723 817 551"}`}>{footer.contact?.items?.phone ?? "+40 723 817 551"}</Link></span>
                            </li>
                            <li className="flex items-center space-x-3">
                                <Mail className="h-4 w-4 text-jade" />
                                <span>{footer.contact?.items?.email ?? "contact@dacars.ro"}</span>
                            </li>
                            <li className="flex items-center space-x-3">
                                <MapPin className="h-4 w-4 text-jade" />
                                <span>{footer.contact?.items?.address ?? "Calea Bucureștilor 305, Otopeni, Ilfov"}</span>
                            </li>
                            <li className="flex items-center space-x-3">
                                <Clock className="h-4 w-4 text-jade" />
                                <span>{footer.contact?.items?.schedule ?? "Disponibil 24/7"}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Program */}
                    <div>
                        <h3 className="text-lg font-poppins font-semibold mb-4">{footer.schedule?.title ?? "Program"}</h3>
                        <div className="space-y-2 font-dm-sans text-gray-300">
                            <p>{footer.schedule?.days ?? "Luni - Duminică"}</p>
                            <p className="text-white font-semibold">{footer.schedule?.hours ?? "24/7"}</p>
                            <p className="text-sm mt-4">
                                {footer.schedule?.note ?? "Program non-stop la sediul DaCars din Calea Bucureștilor 305"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-600 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-gray-300 font-dm-sans text-sm">
                        {footer.bottom?.copyright ?? "© 2024 DaCars. Toate drepturile rezervate."}
                    </p>
                    <div className="flex space-x-6 mt-4 md:mt-0">
                        {bottomLinks.map((link) => (
                            <Link
                                key={`${link.href}-${link.label}`}
                                href={link.href ?? "#"}
                                className="text-gray-300 hover:text-jade transition-colors duration-300 text-sm font-dm-sans"
                                aria-label={link.aria ?? link.label}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
