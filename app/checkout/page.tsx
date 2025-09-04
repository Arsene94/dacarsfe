"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Plane,
  Gift,
} from "lucide-react";
import {
  validateDiscountCode,
  applyDiscountCode,
} from "@/services/wheelApi";
import { Label } from "@/components/ui/label";
import PhoneInput from "@/components/PhoneInput";
import { useBooking } from "@/context/BookingContext";
import apiClient from "@/lib/api";

interface ReservationFormData {
  name: string;
  email: string;
  phone: string;
  flight: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  location: string;
  car_id: number | null;
  discountCode: string;
}

type ApiCar = {
  id: number;
  name?: string;
  rental_rate: number | string;
  rental_rate_casco: number | string;
  image_preview?: string | null;
  images?: Record<string, string>;
  avg_review?: number;
  number_of_seats: number;
  fuel?: { id?: number; name?: string | null } | null;
  type?: { id?: number; name?: string | null } | null;
  transmission?: { id?: number; name?: string | null } | null;
  content?: string | null;
  days: number;
  deposit: number;
  total_deposit: number | string;
  total_without_deposit: number | string;
};

type Car = {
  id: number;
  name: string;
  type: string;
  typeId: number | null;
  image: string;
  price: number;
  rental_rate: string;
  rental_rate_casco: string;
  days: number;
  deposit: number;
  total_deposit: number | string;
  total_without_deposit: number | string;
  features: {
    passengers: number;
    transmission: string;
    transmissionId: number | null;
    fuel: string;
    fuelId: number | null;
    doors: number;
    luggage: number;
  };
  rating: number;
  description: string;
  specs: string[];
};

const STORAGE_BASE = "https://dacars.ro/storage";

const toImageUrl = (p?: string | null): string => {
  if (!p) return "/images/placeholder-car.svg";
  if (/^https?:\/\//i.test(p)) return p;
  const base = STORAGE_BASE.replace(/\/$/, "");
  const path = p.replace(/^\//, "");
  return `${base}/${path}`;
};

const parsePrice = (raw: unknown): number => {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === "string") {
    const m = raw.match(/[\d.,]+/);
    if (!m) return 0;
    const n = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  try {
    return parsePrice(String(raw));
  } catch {
    return 0;
  }
};

const ReservationPage = () => {
  const router = useRouter();
  const { booking, setBooking } = useBooking();
  const [formData, setFormData] = useState<ReservationFormData>({
    name: "",
    email: "",
    phone: "",
    flight: "",
    pickupDate: "",
    pickupTime: "",
    dropoffDate: "",
    dropoffTime: "",
    location: "aeroport",
    car_id: null,
    discountCode: "",
  });
  useEffect(() => {
    if (booking.startDate && booking.endDate && booking.selectedCar) {
      const [pickupDate, pickupTime] = booking.startDate.split("T");
      const [dropoffDate, dropoffTime] = booking.endDate.split("T");
      const selectedCar = booking.selectedCar;
      setFormData((prev) => ({
        ...prev,
        pickupDate,
        pickupTime,
        dropoffDate,
        dropoffTime,
        car_id: selectedCar.id,
      }));
    }
  }, [booking]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountStatus, setDiscountStatus] = useState<{
    isValid: boolean;
    message: string;
    discount: number;
  } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  if (!booking.startDate || !booking.endDate || !booking.selectedCar) {
    return (
      <div className="pt-16 lg:pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl font-dm-sans text-gray-600">
          Trebuie să completezi datele și să selectezi mașina.
        </p>
      </div>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    const fetchUpdatedCar = async () => {
      if (
        !booking.selectedCar ||
        !formData.pickupDate ||
        !formData.pickupTime ||
        !formData.dropoffDate ||
        !formData.dropoffTime
      ) {
        return;
      }

      const start = `${formData.pickupDate}T${formData.pickupTime}`;
      const end = `${formData.dropoffDate}T${formData.dropoffTime}`;

      try {
        const res = await apiClient.getCarForBooking({
          car_id: booking.selectedCar.id,
          start_date: start,
          end_date: end,
        });
        const apiCar: ApiCar = Array.isArray(res?.data)
          ? res.data[0]
          : (res?.data ?? (Array.isArray(res) ? res[0] : res));
        if (!apiCar) return;
        const mapped: Car = {
          id: apiCar.id,
          name: apiCar.name ?? "Autovehicul",
          type: (apiCar.type?.name ?? "—").trim(),
          typeId: apiCar.type?.id ?? null,
          image: toImageUrl(
            apiCar.image_preview || Object.values(apiCar.images ?? {})[0] || null,
          ),
          price: parsePrice(
            Math.round(Number(apiCar.rental_rate)) ??
              Math.round(Number(apiCar.rental_rate_casco)),
          ),
          rental_rate: String(Math.round(Number(apiCar.rental_rate)) ?? ""),
          rental_rate_casco: String(
            Math.round(Number(apiCar.rental_rate_casco)) ?? "",
          ),
          days: Number(apiCar.days),
          deposit: Number(apiCar.deposit),
          total_deposit: String(apiCar.total_deposit),
          total_without_deposit: String(apiCar.total_without_deposit),
          features: {
            passengers: Number(apiCar.number_of_seats) || 0,
            transmission: apiCar.transmission?.name ?? "—",
            transmissionId: apiCar.transmission?.id ?? null,
            fuel: apiCar.fuel?.name ?? "—",
            fuelId: apiCar.fuel?.id ?? null,
            doors: 4,
            luggage: 2,
          },
          rating: Number(apiCar.avg_review ?? 0) || 0,
          description: apiCar.content ?? "",
          specs: [],
        };

        setBooking({
          ...booking,
          startDate: start,
          endDate: end,
          selectedCar: mapped,
        });
      } catch (error) {
        console.error(error);
      }
    };

    fetchUpdatedCar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.pickupDate,
    formData.pickupTime,
    formData.dropoffDate,
    formData.dropoffTime,
  ]);

  const calculateTotal = () => {
    const selectedCar = booking.selectedCar;

    if (!selectedCar || !booking.startDate || !booking.endDate) return 0;

    const pickupDate = new Date(booking.startDate);
    const dropoffDate = new Date(booking.endDate);
    const timeDiff = dropoffDate.getTime() - pickupDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const bookingWithDeposit = booking.withDeposit;
    return daysDiff > 0 && bookingWithDeposit
      ? Number(selectedCar.total_deposit)
      : Number(selectedCar.total_without_deposit);
  };

  const handleDiscountCodeValidation = async () => {
    if (!formData.discountCode.trim()) {
      setDiscountStatus(null);
      return;
    }

    setIsValidatingCode(true);
    try {
      const isValid = await validateDiscountCode(formData.discountCode);

      if (isValid) {
        // Simulare extragere procent reducere din cod
        const discountMatch = formData.discountCode.match(/WHEEL(\d+)/);
        const discount = discountMatch ? parseInt(discountMatch[1]) : 10;

        setDiscountStatus({
          isValid: true,
          message: `Cod valid! Reducere ${discount}% aplicată.`,
          discount,
        });
      } else {
        setDiscountStatus({
          isValid: false,
          message: "Cod invalid sau expirat.",
          discount: 0,
        });
      }
    } catch (error) {
      setDiscountStatus({
        isValid: false,
        message: "Eroare la validarea codului.",
        discount: 0,
      });
    } finally {
      setIsValidatingCode(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalTotal = calculateTotal();

    // Aplică reducerea dacă există cod valid
    if (discountStatus?.isValid && discountStatus.discount > 0) {
      finalTotal = finalTotal * (1 - discountStatus.discount / 100);
    }
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Store reservation data for success page
    localStorage.setItem(
      "reservationData",
      JSON.stringify({
        ...formData,
        total: Math.round(finalTotal),
        originalTotal: calculateTotal(),
        appliedDiscount: discountStatus?.isValid ? discountStatus.discount : 0,
        reservationId:
          "DC" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      }),
    );

    router.push("/success");
  };

  const selectedCar = booking.selectedCar;
  const total = calculateTotal();

  const finalTotal =
    discountStatus?.isValid && discountStatus.discount > 0
      ? total * (1 - discountStatus.discount / 100)
      : total;

  return (
    <div className="pt-16 lg:pt-20 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
            Rezervă-ți <span className="text-jade">mașina</span>
          </h1>
          <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto">
            Completează formularul și te întâlnim la aeroport în sub 5 minute!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reservation Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <div>
                  <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6 flex items-center">
                    <User className="h-6 w-6 text-jade mr-3" />
                    Informații personale
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label
                        htmlFor="reservation-last-name"
                        className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                      >
                        Nume *
                      </Label>
                      <input
                        id="reservation-last-name"
                        type="text"
                        name="lastName"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                        placeholder="Introducă numele complet"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="reservation-email"
                        className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                      >
                        Email *
                      </Label>
                      <input
                        id="reservation-email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                        placeholder="nume@email.com"
                      />
                    </div>

                    <PhoneInput
                      value={formData.phone}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, phone: val }))
                      }
                      required
                      placeholder="+40 722 123 456"
                    />
                  </div>

                  <div className="mt-6">
                    <Label
                      htmlFor="reservation-flight"
                      className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                    >
                      <Plane className="h-4 w-4 inline text-jade mr-1" />
                      Zbor (opțional)
                    </Label>
                    <input
                      id="reservation-flight"
                      type="text"
                      name="flight"
                      value={formData.flight}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                      placeholder="Ex: RO123 sau Blue Air 456"
                    />
                  </div>

                  {/* Discount Code */}
                    <div className="mt-6">
                        <Label
                            htmlFor="reservation-discount"
                            className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                        >
                            <Gift className="h-4 w-4 inline text-jade mr-1" />
                            Cod de reducere (opțional)
                        </Label>
                        <div className="flex space-x-2">
                            <input
                                id="reservation-discount"
                                type="text"
                                name="discountCode"
                                value={formData.discountCode}
                                onChange={handleInputChange}
                                onBlur={handleDiscountCodeValidation}
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                                placeholder="Ex: WHEEL10"
                            />
                            <button
                                type="button"
                                onClick={handleDiscountCodeValidation}
                                disabled={
                                    isValidatingCode || !formData.discountCode.trim()
                                }
                                className="px-4 py-3 bg-berkeley text-white font-dm-sans font-semibold rounded-lg hover:bg-berkeley/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                                aria-label="Validează codul"
                            >
                                {isValidatingCode ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                    "Validează"
                                )}
                            </button>
                        </div>

                        {discountStatus && (
                            <div
                                className={`mt-2 p-3 rounded-lg ${
                                    discountStatus.isValid
                                        ? "bg-jade/10 text-jade"
                                        : "bg-red-50 text-red-600"
                                }`}
                            >
                                <p className="text-sm font-dm-sans font-semibold">
                                    {discountStatus.message}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reservation Details */}
                <div>
                  <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6 flex items-center">
                    <Calendar className="h-6 w-6 text-jade mr-3" />
                    Detalii rezervare
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label
                        htmlFor="reservation-pickup-date"
                        className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                      >
                        Dată ridicare *
                      </Label>
                      <input
                        id="reservation-pickup-date"
                        type="date"
                        name="pickupDate"
                        value={formData.pickupDate}
                        onChange={handleInputChange}
                        required
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="reservation-pickup-time"
                        className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                      >
                        Oră ridicare *
                      </Label>
                      <input
                        id="reservation-pickup-time"
                        type="time"
                        name="pickupTime"
                        value={formData.pickupTime}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="reservation-dropoff-date"
                        className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                      >
                        Dată returnare *
                      </Label>
                      <input
                        id="reservation-dropoff-date"
                        type="date"
                        name="dropoffDate"
                        value={formData.dropoffDate}
                        onChange={handleInputChange}
                        required
                        min={
                          formData.pickupDate ||
                          new Date().toISOString().split("T")[0]
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="reservation-dropoff-time"
                        className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                      >
                        Oră returnare *
                      </Label>
                      <input
                        id="reservation-dropoff-time"
                        type="time"
                        name="dropoffTime"
                        value={formData.dropoffTime}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-jade text-white font-dm-sans font-semibold text-lg rounded-lg hover:bg-jade/90 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg flex items-center justify-center space-x-2"
                  aria-label="Finalizează rezervarea"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Se procesează...</span>
                    </>
                  ) : (
                    <span>Finalizează rezervarea</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Reservation Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-24">
              <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-6">
                Rezumatul rezervării
              </h3>

              <div className="space-y-4 mb-6">
                {selectedCar && (
                  <div className="flex justify-between items-center">
                    <span className="font-dm-sans text-gray-600">Mașină:</span>
                    <span className="font-dm-sans font-semibold text-berkeley">
                      {selectedCar.name.split(" - ")[0]}
                    </span>
                  </div>
                )}

                {formData.pickupDate && (
                  <div className="flex justify-between items-center">
                    <span className="font-dm-sans text-gray-600">De la:</span>
                    <span className="font-dm-sans font-semibold text-berkeley">
                      {new Date(formData.pickupDate).toLocaleDateString(
                        "ro-RO",
                      )} {formData.pickupTime}
                    </span>
                  </div>
                )}

                {formData.dropoffDate && (
                  <div className="flex justify-between items-center">
                    <span className="font-dm-sans text-gray-600">Până la:</span>
                    <span className="font-dm-sans font-semibold text-berkeley">
                      {new Date(formData.dropoffDate).toLocaleDateString(
                          "ro-RO",
                      )} {formData.dropoffTime}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="font-dm-sans text-gray-600">Locație:</span>
                  <span className="font-dm-sans font-semibold text-berkeley">
                    Aeroport Henri Coandă, Otopeni
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                {discountStatus?.isValid && discountStatus.discount > 0 && (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-dm-sans text-gray-600">
                        Subtotal:
                      </span>
                      <span className="font-dm-sans text-gray-600">
                        {total}€
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-dm-sans text-jade">
                        Reducere ({discountStatus.discount}%):
                      </span>
                      <span className="font-dm-sans text-jade">
                        -{Math.round((total * discountStatus.discount) / 100)}€
                      </span>
                    </div>
                  </>
                )}
                  <div className="flex justify-between items-center text-xl">
                  <span className="font-poppins font-semibold text-berkeley">
                    Sumar:
                  </span>
                      <span className="font-poppins font-bold text-jade">
                        {booking.withDeposit ? booking.selectedCar.rental_rate : booking.selectedCar.rental_rate_casco}€ x {booking.selectedCar.days} zile
                  </span>
                  </div>
                <div className="flex justify-between items-center text-xl">
                  <span className="font-poppins font-semibold text-berkeley">
                    Total:
                  </span>
                    <span className="font-poppins font-bold text-jade">
                        {Math.round(finalTotal)}€ {booking.withDeposit && (<span className=" text-xs font-dm-sans text-gray-600">(+100€ garanție)</span>)}
                  </span>
                </div>
                  {booking.withDeposit && (
                    <div className="flex justify-between items-center text-xl">
                        <span className="font-poppins font-semibold text-berkeley">
                            Garanție:
                        </span>
                        <span className="font-poppins font-bold text-jade">
                            {selectedCar.deposit}€
                        </span>
                    </div>
                )}
                <p className="text-sm text-gray-600 font-dm-sans mt-2">
                  *Preț final, fără taxe ascunse
                </p>
              </div>

              {/* Benefits reminder */}
              <div className="mt-8 p-4 bg-jade/5 rounded-lg">
                <h4 className="font-poppins font-semibold text-berkeley mb-2">
                  Include:
                </h4>
                <ul className="text-sm font-dm-sans text-gray-600 space-y-1">
                  <li>✓ Predare în sub 5 minute</li>
                  <li>✓ Disponibilitate 24/7</li>
                  <li>✓ Fără taxe ascunse</li>
                  <li>✓ Modificare gratuită</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationPage;
