"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Car, Calendar, MapPin, Clock, Phone, ArrowLeft, Home, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReservationPayload } from '@/types/reservation';
import { describeWheelPrizeAmount, formatWheelPrizeExpiry } from '@/lib/wheelFormatting';
import type { WheelPrize } from '@/types/wheel';

const priceFormatter = new Intl.NumberFormat('ro-RO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatPrice = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const normalized = Math.round(value * 100) / 100;
  return priceFormatter.format(normalized);
};

const SuccessPage = () => {
  const [reservationData, setReservationData] = useState<ReservationPayload | null>(null);

  useEffect(() => {
    const storedData = localStorage.getItem('reservationData');
    if (storedData) {
      setReservationData(JSON.parse(storedData));
    }
  }, []);

  if (!reservationData) {
    return (
      <div className="pt-16 lg:pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-dm-sans">Se încarcă detaliile rezervării...</p>
        </div>
      </div>
    );
  }

  const wheelPrize = reservationData.wheel_prize ?? null;
  const wheelPrizeDiscount = reservationData.wheel_prize_discount ?? wheelPrize?.discount_value ?? 0;
  const wheelPrizeDescriptionSource: WheelPrize | null = wheelPrize
    ? {
        id: wheelPrize.prize_id ?? 0,
        period_id: wheelPrize.wheel_of_fortune_id ?? 0,
        title: wheelPrize.title ?? 'Premiu DaCars',
        description: wheelPrize.description ?? null,
        amount: typeof wheelPrize.amount === 'number' ? wheelPrize.amount : null,
        color: '#1E7149',
        probability: 0,
        type: wheelPrize.type ?? 'other',
      }
    : null;
  const wheelPrizeAmountLabel = wheelPrize?.amount_label
    ?? (wheelPrizeDescriptionSource ? describeWheelPrizeAmount(wheelPrizeDescriptionSource) : null);
  const wheelPrizeExpiryLabel = wheelPrize ? formatWheelPrizeExpiry(wheelPrize.expires_at) : null;
  const hasWheelPrize = Boolean(wheelPrize);

  return (
    <div className="pt-16 lg:pt-20 min-h-screen bg-gradient-to-br from-jade/5 to-berkeley/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="bg-jade/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-jade" />
          </div>

          <h1 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
            Rezervarea este <span className="text-jade">confirmată!</span>
          </h1>

          <p className="text-xl lg:text-2xl font-dm-sans text-gray-700 leading-relaxed max-w-3xl mx-auto">
            Mulțumim, <strong>{reservationData.customer_name}</strong>! Mașina ta te așteaptă la aeroport.
            <br className="hidden sm:block" />
            <span className="text-jade font-semibold">Ne vedem acasă!</span>
          </p>

          <div className="mt-8 inline-flex items-center px-6 py-3 bg-jade/10 rounded-full">
            <span className="text-jade font-dm-sans font-semibold">
              Rezervarea {reservationData.reservationId}
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
                  Premiu Roata Norocului
                </h3>
                <p className="font-dm-sans text-gray-700">
                  Ai folosit premiul <span className="font-semibold text-berkeley">{wheelPrize?.title}</span>
                  {wheelPrizeAmountLabel ? ` — ${wheelPrizeAmountLabel}` : ''}.
                </p>
                {wheelPrizeDiscount > 0 && (
                  <p className="font-dm-sans text-sm font-semibold text-jade">
                    Economisești {formatPrice(wheelPrizeDiscount)}€ la această rezervare.
                  </p>
                )}
                <p className="font-dm-sans text-xs text-gray-600">
                  {wheelPrizeExpiryLabel
                    ? `Premiul este valabil până la ${wheelPrizeExpiryLabel}.`
                    : 'Premiul rămâne valabil 30 de zile de la momentul câștigării.'}
                </p>
              </div>
            </div>
          )}
          <h2 className="text-3xl font-poppins font-bold text-berkeley mb-8 text-center">
            Detaliile rezervării tale
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-jade/10 p-3 rounded-xl">
                  <Car className="h-6 w-6 text-jade" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-berkeley text-lg">Mașina ta</h3>
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
                  <h3 className="font-poppins font-semibold text-berkeley text-lg">Perioada</h3>
                  <p className="font-dm-sans text-gray-600">
                    <strong>Ridicare:</strong> {new Date(reservationData.rental_start_date).toLocaleDateString('ro-RO')} la {reservationData.rental_start_time}
                  </p>
                  <p className="font-dm-sans text-gray-600">
                    <strong>Returnare:</strong> {new Date(reservationData.rental_end_date).toLocaleDateString('ro-RO')} la {reservationData.rental_end_time}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-jade/10 p-3 rounded-xl">
                  <MapPin className="h-6 w-6 text-jade" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-berkeley text-lg">Locația</h3>
                  <p className="font-dm-sans text-gray-600">
                    {reservationData.location === 'aeroport' && 'Aeroport Henri Coandă, Otopeni'}
                    {reservationData.location === 'city' && 'Centrul Bucureștiului'}
                    {reservationData.location === 'other' && 'Altă locație'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
                <div className="bg-jade/5 rounded-2xl p-6">
                <h3 className="font-poppins font-semibold text-berkeley text-lg mb-4">
                  Costul total
                </h3>
                <div className="text-lg font-dm-sans text-gray-600 mb-1">
                  Subtotal: {formatPrice(reservationData.sub_total)}€
                </div>
                {reservationData.total_services > 0 && (
                  <div className="text-lg font-dm-sans text-gray-600 mb-1">
                    Servicii: +{formatPrice(reservationData.total_services)}€
                  </div>
                )}
                {wheelPrizeDiscount > 0 && (
                  <div className="text-lg font-dm-sans text-jade mb-1">
                    Premiu Roata Norocului: -{formatPrice(wheelPrizeDiscount)}€
                  </div>
                )}
                {reservationData.coupon_amount > 0 && (
                  <div className="text-lg font-dm-sans text-jade mb-2">
                    Reducere: -{formatPrice(reservationData.coupon_amount)}€
                  </div>
                )}
                <div className="text-4xl font-poppins font-bold text-jade mb-2">
                  {formatPrice(reservationData.total)}€
                </div>
                <p className="font-dm-sans text-gray-600 text-sm">
                  *Preț final, fără taxe ascunse
                </p>
              </div>

              {reservationData.flight_number && (
                <div className="flex items-start space-x-4">
                  <div className="bg-jade/10 p-3 rounded-xl">
                    <Clock className="h-6 w-6 text-jade" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-berkeley text-lg">Zborul tău</h3>
                    <p className="font-dm-sans text-gray-600">
                      {reservationData.flight_number}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-berkeley text-white rounded-3xl p-8 lg:p-12 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-3xl font-poppins font-bold mb-8 text-center">
            Ce urmează?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-jade w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-poppins font-bold">1</span>
              </div>
              <h3 className="font-poppins font-semibold text-xl mb-2">La aterizare</h3>
              <p className="font-dm-sans text-gray-300">
                Sună-ne la numărul de telefon când ieși din terminal
              </p>
            </div>

            <div className="text-center">
              <div className="bg-jade w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-poppins font-bold">2</span>
              </div>
              <h3 className="font-poppins font-semibold text-xl mb-2">Te întâlnim</h3>
              <p className="font-dm-sans text-gray-300">
                Ajungem la tine în parcarea de scurtă durată în sub 5 minute
              </p>
            </div>

            <div className="text-center">
              <div className="bg-jade w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-poppins font-bold">3</span>
              </div>
              <h3 className="font-poppins font-semibold text-xl mb-2">Drum bun!</h3>
              <p className="font-dm-sans text-gray-300">
                Primești cheile și poți pleca acasă în siguranță
              </p>
            </div>
          </div>

          <div className="text-center mt-8 p-6 bg-jade/20 rounded-2xl">
            <Phone className="h-8 w-8 text-jade mx-auto mb-3" />
            <p className="font-dm-sans text-lg mb-2">Contactează-ne oricând:</p>
            <a
              href="tel:+40722123456"
              className="text-jade font-poppins font-bold text-2xl hover:text-jade/80 transition-colors duration-300"
              aria-label="Sună la +40 722 123 456"
            >
              +40 722 123 456
            </a>
            <p className="font-dm-sans text-sm text-gray-300 mt-2">
              Disponibili 24/7 pentru urgențe
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="border-berkeley text-berkeley hover:bg-berkeley hover:text-white"
            aria-label="Printează detaliile"
          >
            <Calendar className="h-5 w-5 mr-2" />
            Printează detaliile
          </Button>

          <Link href="/" aria-label="Înapoi Acasă">
            <Button
              className="transform hover:scale-105 shadow-lg"
              aria-label="Înapoi Acasă"
            >
              <Home className="h-5 w-5 mr-2" />
              Înapoi Acasă
            </Button>
          </Link>
        </div>

        {/* Footer note */}
        <div className="text-center mt-12">
          <p className="font-dm-sans text-gray-600">
            Vei primi o confirmare prin email cu toate detaliile rezervării.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
