"use client";

import React from "react";
import Link from "next/link";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import LazyMap from "./LazyMap";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { trackTikTokEvent, TIKTOK_EVENTS } from "@/lib/tiktokPixel";
import { trackMetaPixelEvent, META_PIXEL_EVENTS } from "@/lib/metaPixel";

type ContactMessages = {
    title?: { main?: string; highlight?: string };
    description?: string;
    items?: {
        phone?: { title?: string; description?: string; aria?: string };
        whatsapp?: { title?: string; description?: string; aria?: string };
        email?: { title?: string; description?: string; aria?: string };
        location?: { title?: string; description?: string; address?: string; city?: string };
        schedule?: { title?: string; description?: string; details?: string[] };
    };
    quickLinks?: {
        title?: string;
        offers?: string;
        cars?: string;
        faq?: string;
    };
    map?: {
        title?: string;
        advisor?: string;
        advisorText?: string;
        clientDialog?: Array<{ speaker?: string; message?: string }>;
    };
};

const phoneNumber = "+40 723 817 551";
const phoneHref = "tel:+40723817551";
const whatsappHref = "https://wa.me/40723817551";
const emailAddress = "contact@dacars.ro";

const ContactSection = () => {
    const { messages, t } = useTranslations("home");
    const contact = (messages.contact ?? {}) as ContactMessages;
    const mapMessages = contact.map ?? {};
    const quickLinks = contact.quickLinks ?? {};

    return (
        <section id="contact" className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16 animate-fade-in">
                    <h2 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
                        {contact.title?.main ?? "Contactează-ne"}{" "}
                        <span className="text-jade">{contact.title?.highlight ?? "oricând"}</span>
                    </h2>
                    <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        {t("contact.description", {
                            fallback:
                                "Suntem aici să te ajutăm 24/7. Ia legătura cu noi prin oricare dintre metodele de mai jos.",
                        })}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-berkeley shadow-sm">
                            {quickLinks.title ?? t("contact.quickLinks.title", { fallback: "Linkuri rapide" })}
                        </span>
                        <Link
                            href="/offers"
                            className="inline-flex items-center rounded-full border border-berkeley px-4 py-2 text-sm font-semibold text-berkeley transition hover:bg-berkeley hover:text-white"
                        >
                            {quickLinks.offers ?? t("contact.quickLinks.offers", { fallback: "Promoții active" })}
                        </Link>
                        <Link
                            href="/cars"
                            className="inline-flex items-center rounded-full border border-jade px-4 py-2 text-sm font-semibold text-jade transition hover:bg-jade hover:text-white"
                        >
                            {quickLinks.cars ?? t("contact.quickLinks.cars", { fallback: "Flota disponibilă" })}
                        </Link>
                        <Link
                            href="/faq"
                            className="inline-flex items-center rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                        >
                            {quickLinks.faq ?? t("contact.quickLinks.faq", { fallback: "Întrebări frecvente" })}
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <ul className="space-y-8">
                        <li className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group flex items-start space-x-4">
                            <div className="bg-jade/10 p-3 rounded-xl group-hover:bg-jade group-hover:text-white transition-colors duration-300">
                                <Phone className="h-6 w-6 text-jade group-hover:text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">
                                    {contact.items?.phone?.title ?? "Telefon"}
                                </h3>
                                <p className="text-gray-600 font-dm-sans mb-3">
                                    {contact.items?.phone?.description ?? "Suntem disponibili 24/7 pentru urgențe"}
                                </p>
                                <a
                                    href={phoneHref}
                                    className="text-jade font-dm-sans font-semibold hover:text-jade/80 transition-colors duration-300"
                                    aria-label={contact.items?.phone?.aria ?? `Sună la ${phoneNumber}`}
                                    onClick={() => {
                                        trackTikTokEvent(TIKTOK_EVENTS.CONTACT, {
                                            contact_method: "phone",
                                            value: phoneNumber,
                                        });
                                        trackMetaPixelEvent(META_PIXEL_EVENTS.CONTACT, {
                                            contact_method: "phone",
                                            value: phoneNumber,
                                        });
                                    }}
                                >
                                    {phoneNumber}
                                </a>
                            </div>
                        </li>
                        <li className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group flex items-start space-x-4">
                            <div className="bg-jade/10 p-3 rounded-xl group-hover:bg-jade group-hover:text-white transition-colors duration-300">
                                <MessageCircle className="h-6 w-6 text-jade group-hover:text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">
                                    {contact.items?.whatsapp?.title ?? "WhatsApp"}
                                </h3>
                                <p className="text-gray-600 font-dm-sans mb-3">
                                    {contact.items?.whatsapp?.description ?? "Scrie-ne pentru răspuns rapid"}
                                </p>
                                <a
                                    href={whatsappHref}
                                    className="text-jade font-dm-sans font-semibold hover:text-jade/80 transition-colors duration-300"
                                    aria-label={contact.items?.whatsapp?.aria ?? `Contactează pe WhatsApp la ${phoneNumber}`}
                                    onClick={() => {
                                        trackTikTokEvent(TIKTOK_EVENTS.CONTACT, {
                                            contact_method: "whatsapp",
                                            value: phoneNumber,
                                        });
                                        trackMetaPixelEvent(META_PIXEL_EVENTS.CONTACT, {
                                            contact_method: "whatsapp",
                                            value: phoneNumber,
                                        });
                                    }}
                                >
                                    {phoneNumber}
                                </a>
                            </div>
                        </li>
                        <li className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group flex items-start space-x-4">
                            <div className="bg-jade/10 p-3 rounded-xl group-hover:bg-jade group-hover:text-white transition-colors duration-300">
                                <Mail className="h-6 w-6 text-jade group-hover:text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">
                                    {contact.items?.email?.title ?? "Email"}
                                </h3>
                                <p className="text-gray-600 font-dm-sans mb-3">
                                    {contact.items?.email?.description ?? "Pentru întrebări generale"}
                                </p>
                                <a
                                    href={`mailto:${emailAddress}`}
                                    className="text-jade font-dm-sans font-semibold hover:text-jade/80 transition-colors duration-300"
                                    aria-label={contact.items?.email?.aria ?? `Trimite email la ${emailAddress}`}
                                    onClick={() => {
                                        trackTikTokEvent(TIKTOK_EVENTS.CONTACT, {
                                            contact_method: "email",
                                            value: emailAddress,
                                        });
                                        trackMetaPixelEvent(META_PIXEL_EVENTS.CONTACT, {
                                            contact_method: "email",
                                            value: emailAddress,
                                        });
                                    }}
                                >
                                    {emailAddress}
                                </a>
                            </div>
                        </li>
                        <li className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group flex items-start space-x-4">
                            <div className="bg-jade/10 p-3 rounded-xl group-hover:bg-jade group-hover:text-white transition-colors duration-300">
                                <MapPin className="h-6 w-6 text-jade group-hover:text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">
                                    {contact.items?.location?.title ?? "Locație"}
                                </h3>
                                <p className="text-gray-600 font-dm-sans mb-3">
                                    {contact.items?.location?.description ?? "Punct de predare principal"}
                                </p>
                                <p className="text-berkeley font-dm-sans font-semibold">
                                    {contact.items?.location?.address ?? "Calea Bucurestilor 305"}
                                    <br />
                                    {contact.items?.location?.city ?? "Otopeni, Ilfov"}
                                </p>
                            </div>
                        </li>
                        <li className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group flex items-start space-x-4">
                            <div className="bg-jade/10 p-3 rounded-xl group-hover:bg-jade group-hover:text-white transition-colors duration-300">
                                <Clock className="h-6 w-6 text-jade group-hover:text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">
                                    {contact.items?.schedule?.title ?? "Program"}
                                </h3>
                                <p className="text-gray-600 font-dm-sans mb-3">
                                    {contact.items?.schedule?.description ?? "Predare și ridicare"}
                                </p>
                                <p className="text-berkeley font-dm-sans font-semibold">
                                    {contact.items?.schedule?.details?.[0] ?? "24/7 - Non-stop"}
                                    <br />
                                    <span className="text-jade">
                                        {contact.items?.schedule?.details?.[1] ?? "Disponibili oricând"}
                                    </span>
                                </p>
                            </div>
                        </li>
                    </ul>

                    <div className="bg-white rounded-2xl p-8 shadow-lg">
                        <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6">
                            {mapMessages.title ?? "Locația noastră"}
                        </h3>
                        <LazyMap />

                        <div className="mt-6 p-4 bg-jade/5 rounded-xl">
                            <p className="text-berkeley font-dm-sans">
                                <strong>{mapMessages.advisor ?? "Consultant:"}</strong>{" "}
                                {mapMessages.advisorText ?? "Când aterizezi, sună-ne la numărul de telefon"}{" "}
                                <a href={phoneHref}>{phoneNumber}</a>
                            </p>
                        </div>

                        {(mapMessages.clientDialog ?? []).map((entry, index) => (
                            <div key={`${entry.speaker}-${index}`} className="mt-6 p-4 bg-jade/5 rounded-xl">
                                <p className="text-berkeley font-dm-sans">
                                    <strong>{entry.speaker}:</strong> {entry.message}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ContactSection;
