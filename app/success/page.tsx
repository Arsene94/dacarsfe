"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Car, CheckCircle, Clock, Gift, Home, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReservationPayload } from "@/types/reservation";
import type { WheelPrize } from "@/types/wheel";
import { formatWheelPrizeExpiry } from "@/lib/wheelFormatting";
import { useTranslations } from "@/lib/i18n/useTranslations";
import type { Locale } from "@/lib/i18n/config";
import successMessagesRo from "@/messages/success/ro.json";

type SuccessMessages = typeof successMessagesRo;

const LOCALE_TO_INTL: Record<Locale, string> = {
    ro: "ro-RO",
    en: "en-US",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    it: "it-IT",
};

const SuccessPage = () => {
    const [reservationData, setReservationData] = useState<ReservationPayload | null>(null);
    const { locale, messages, t } = useTranslations<SuccessMessages>("success");
    const intlLocale = LOCALE_TO_INTL[locale] ?? LOCALE_TO_INTL.ro;

    const priceFormatter = useMemo(
        () =>
            new Intl.NumberFormat(intlLocale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }),
        [intlLocale],
    );

    const dateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(intlLocale, {
                day: "numeric",
                month: "long",
                year: "numeric",
            }),
        [intlLocale],
    );

    const formatPrice = useCallback(
        (value: number): string => {
            if (!Number.isFinite(value)) {
                return "0";
            }
            const normalized = Math.round(value * 100) / 100;
            return priceFormatter.format(normalized);
        },
        [priceFormatter],
    );

    const formatReservationDate = useCallback(
        (value: string): string => {
            const parsed = Date.parse(value);
            if (Number.isNaN(parsed)) {
                return value;
            }
            try {
                return dateFormatter.format(new Date(parsed));
            } catch (error) {
                console.warn("Nu s-a putut formata data rezervării", error);
                return new Date(parsed).toLocaleDateString(intlLocale);
            }
        },
        [dateFormatter, intlLocale],
    );

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        const storedData = window.localStorage.getItem("reservationData");
        if (storedData) {
            try {
                setReservationData(JSON.parse(storedData));
            } catch (error) {
                console.warn("Nu s-au putut citi detaliile rezervării din localStorage", error);
            }
        }
    }, []);

    const wheelPrize = reservationData?.wheel_prize ?? null;
    const wheelPrizeDiscount = reservationData?.wheel_prize_discount ?? wheelPrize?.discount_value ?? 0;

    const wheelPrizeDescriptionSource = useMemo<WheelPrize | null>(() => {
        if (!wheelPrize) {
            return null;
        }
        const amountValue =
            typeof wheelPrize.amount === "number"
                ? wheelPrize.amount
                : Number.isFinite(Number(wheelPrize.amount))
                  ? Number(wheelPrize.amount)
                  : null;
        return {
            id: wheelPrize.prize_id ?? 0,
            period_id: wheelPrize.wheel_of_fortune_id ?? 0,
            title: wheelPrize.title ?? "Premiu DaCars",
            description: wheelPrize.description ?? null,
            amount: amountValue,
            color: "#1E7149",
            probability: 0,
            type: wheelPrize.type ?? "other",
        };
    }, [wheelPrize]);

    const wheelPrizeAmountLabel = useMemo(() => {
        if (!wheelPrizeDescriptionSource) {
            return wheelPrize?.amount_label ?? null;
        }
        const { amount, type } = wheelPrizeDescriptionSource;
        if (typeof amount !== "number" || !Number.isFinite(amount)) {
            return wheelPrize?.amount_label ?? null;
        }
        const formatted = new Intl.NumberFormat(intlLocale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(Math.round(amount * 100) / 100);
        const normalizedType = typeof type === "string" ? type : "other";
        if (normalizedType === "percentage_discount") {
            return t("wheelPrize.amount.percentage_discount", { values: { amount: formatted } });
        }
        if (normalizedType === "fixed_discount") {
            return t("wheelPrize.amount.fixed_discount", { values: { amount: formatted } });
        }
        if (normalizedType === "extra_rental_day") {
            const pluralKey = Math.abs(amount) === 1 ? "one" : "other";
            return t(`wheelPrize.amount.extra_rental_day.${pluralKey}` as const, {
                values: { amount: formatted },
            });
        }
        return t("wheelPrize.amount.other", { values: { amount: formatted } });
    }, [intlLocale, t, wheelPrize, wheelPrizeDescriptionSource]);

    const wheelPrizeExpiryLabel = wheelPrize?.expires_at
        ? formatWheelPrizeExpiry(wheelPrize.expires_at, intlLocale)
        : null;
    const hasWheelPrize = Boolean(wheelPrize);
    const wheelPrizeAmountSuffix = wheelPrizeAmountLabel
        ? t("wheelPrize.amountSuffix", { values: { amount: wheelPrizeAmountLabel } })
        : "";

    const locationOptions =
        (messages.summary?.location?.options as SuccessMessages["summary"]["location"]["options"]) ?? {};
    const instructionsSteps = messages.instructions?.steps ?? [];
    const contactPhone = messages.contact?.phone ?? "+40 722 123 456";
    const contactAriaLabel = t("contact.ariaLabel", { values: { phone: contactPhone } });

    if (!reservationData) {
        return (
            <div className="pt-16 lg:pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 font-dm-sans">{t("loading")}</p>
                </div>
            </div>
        );
    }

    const customerName = reservationData.customer_name?.trim().length
        ? reservationData.customer_name
        : t("fallbacks.guestName");
    const locationKey = reservationData.location as keyof typeof locationOptions;
    const locationLabel =
        locationOptions[locationKey] ?? locationOptions.other ?? reservationData.location ?? "";

    const pickupDate = formatReservationDate(reservationData.rental_start_date);
    const dropoffDate = formatReservationDate(reservationData.rental_end_date);

    return (
        <div className="pt-16 lg:pt-20 min-h-screen bg-gradient-to-br from-jade/5 to-berkeley/5">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Success Header */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="bg-jade/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-12 w-12 text-jade" />
                    </div>

                    <h1 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
                        {t("header.title.prefix")} <span className="text-jade">{t("header.title.highlight")}</span>
                    </h1>

                    <p className="text-xl lg:text-2xl font-dm-sans text-gray-700 leading-relaxed max-w-3xl mx-auto">
                        {t("header.thanks", { values: { name: customerName } })}
                        <br className="hidden sm:block" />
                        <span className="text-jade font-semibold">{t("header.tagline")}</span>
                    </p>

                    <div className="mt-8 inline-flex items-center px-6 py-3 bg-jade/10 rounded-full">
                        <span className="text-jade font-dm-sans font-semibold">
                            {t("header.reference", { values: { id: reservationData.reservationId } })}
                        </span>
                    </div>
                </div>

                {/* Reservation Details */}
                <div className="bg-white rounded-3xl shadow-xl p-8 lg:p-12 mb-12 animate-slide-up">
                    {hasWheelPrize && (
                        <div className="mb-8 flex items-start gap-4 rounded-2xl border border-jade/30 bg-jade/10 p-6">
                            <div className="rounded-full bg-white/70 p-3">
                                <Gift className="h-5 w-5 text-jade" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-poppins font-semibold text-berkeley text-lg">
                                    {t("wheelPrize.title")}
                                </h3>
                                <p className="font-dm-sans text-gray-700">
                                    {t("wheelPrize.applied", {
                                        values: {
                                            title: wheelPrize?.title ?? "",
                                            amount: wheelPrizeAmountSuffix,
                                        },
                                    })}
                                </p>
                                {wheelPrizeDiscount > 0 && (
                                    <p className="font-dm-sans text-sm font-semibold text-jade">
                                        {t("wheelPrize.savings", {
                                            values: { amount: formatPrice(wheelPrizeDiscount) },
                                        })}
                                    </p>
                                )}
                                <p className="font-dm-sans text-xs text-gray-600">
                                    {wheelPrizeExpiryLabel
                                        ? t("wheelPrize.expiry.withDate", { values: { date: wheelPrizeExpiryLabel } })
                                        : t("wheelPrize.expiry.fallback")}
                                </p>
                            </div>
                        </div>
                    )}
                    <h2 className="text-3xl font-poppins font-bold text-berkeley mb-8 text-center">
                        {t("summary.title")}
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-6">
                            <div className="flex items-start space-x-4">
                                <div className="bg-jade/10 p-3 rounded-xl">
                                    <Car className="h-6 w-6 text-jade" />
                                </div>
                                <div>
                                    <h3 className="font-poppins font-semibold text-berkeley text-lg">
                                        {t("summary.car.title")}
                                    </h3>
                                    <p className="font-dm-sans text-gray-600 capitalize">
                                        {reservationData.selectedCar.name}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <div className="bg-jade/10 p-3 rounded-xl">
                                    <Calendar className="h-6 w-6 text-jade" />
                                </div>
                                <div>
                                    <h3 className="font-poppins font-semibold text-berkeley text-lg">
                                        {t("summary.period.title")}
                                    </h3>
                                    <p className="font-dm-sans text-gray-600">
                                        <strong>{t("summary.period.pickupLabel")}</strong> {pickupDate} · {reservationData.rental_start_time}
                                    </p>
                                    <p className="font-dm-sans text-gray-600">
                                        <strong>{t("summary.period.dropoffLabel")}</strong> {dropoffDate} · {reservationData.rental_end_time}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <div className="bg-jade/10 p-3 rounded-xl">
                                    <MapPin className="h-6 w-6 text-jade" />
                                </div>
                                <div>
                                    <h3 className="font-poppins font-semibold text-berkeley text-lg">
                                        {t("summary.location.title")}
                                    </h3>
                                    <p className="font-dm-sans text-gray-600">{locationLabel}</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            <div className="bg-jade/5 rounded-2xl p-6">
                                <h3 className="font-poppins font-semibold text-berkeley text-lg mb-4">
                                    {t("summary.pricing.title")}
                                </h3>
                                <div className="text-lg font-dm-sans text-gray-600 mb-1">
                                    {t("summary.pricing.subtotalLabel")} {formatPrice(reservationData.sub_total)}€
                                </div>
                                {reservationData.total_services > 0 && (
                                    <div className="text-lg font-dm-sans text-gray-600 mb-1">
                                        {t("summary.pricing.servicesLabel")} +{formatPrice(reservationData.total_services)}€
                                    </div>
                                )}
                                {wheelPrizeDiscount > 0 && (
                                    <div className="text-lg font-dm-sans text-jade mb-1">
                                        {t("summary.pricing.wheelPrizeLabel")} -{formatPrice(wheelPrizeDiscount)}€
                                    </div>
                                )}
                                {reservationData.coupon_amount > 0 && (
                                    <div className="text-lg font-dm-sans text-jade mb-2">
                                        {t("summary.pricing.discountLabel")} -{formatPrice(reservationData.coupon_amount)}€
                                    </div>
                                )}
                                <div className="text-4xl font-poppins font-bold text-jade mb-2">
                                    {formatPrice(reservationData.total)}€
                                </div>
                                <p className="font-dm-sans text-gray-600 text-sm">{t("summary.pricing.note")}</p>
                            </div>

                            {reservationData.flight_number && (
                                <div className="flex items-start space-x-4">
                                    <div className="bg-jade/10 p-3 rounded-xl">
                                        <Clock className="h-6 w-6 text-jade" />
                                    </div>
                                    <div>
                                        <h3 className="font-poppins font-semibold text-berkeley text-lg">
                                            {t("summary.flight.title")}
                                        </h3>
                                        <p className="font-dm-sans text-gray-600">{reservationData.flight_number}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Important Information */}
                <div
                    className="bg-berkeley text-white rounded-3xl p-8 lg:p-12 mb-12 animate-slide-up"
                    style={{ animationDelay: "0.2s" }}
                >
                    <h2 className="text-3xl font-poppins font-bold mb-8 text-center">{t("instructions.title")}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {instructionsSteps.map((step, index) => (
                            <div className="text-center" key={step?.title ?? index}>
                                <div className="bg-jade w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-poppins font-bold">{index + 1}</span>
                                </div>
                                <h3 className="font-poppins font-semibold text-xl mb-2">{step?.title}</h3>
                                <p className="font-dm-sans text-gray-300">{step?.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-8 p-6 bg-jade/20 rounded-2xl">
                        <Phone className="h-8 w-8 text-jade mx-auto mb-3" />
                        <p className="font-dm-sans text-lg mb-2">{t("contact.title")}</p>
                        <a
                            href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                            className="text-jade font-poppins font-bold text-2xl hover:text-jade/80 transition-colors duration-300"
                            aria-label={contactAriaLabel}
                        >
                            {contactPhone}
                        </a>
                        <p className="font-dm-sans text-sm text-gray-300 mt-2">{t("contact.availability")}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.4s" }}>
                    <Button
                        onClick={() => window.print()}
                        variant="outline"
                        className="border-berkeley text-berkeley hover:bg-berkeley hover:text-white"
                        aria-label={t("actions.print.aria")}
                    >
                        <Calendar className="h-5 w-5 mr-2" />
                        {t("actions.print.label")}
                    </Button>

                    <Link href="/" aria-label={t("actions.home.aria")}>
                        <Button className="transform hover:scale-105 shadow-lg">
                            <Home className="h-5 w-5 mr-2" />
                            {t("actions.home.label")}
                        </Button>
                    </Link>
                </div>

                {/* Footer note */}
                <div className="text-center mt-12">
                    <p className="font-dm-sans text-gray-600">{t("footer.message")}</p>
                </div>
            </div>
        </div>
    );
};

export default SuccessPage;
