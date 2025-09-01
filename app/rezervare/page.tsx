"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, User, Phone, Mail, Plane, Gift } from 'lucide-react';
import { validateDiscountCode, applyDiscountCode } from '../../services/wheelApi';
import { Select } from '@/components/ui/select';

const ReservationPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    flight: '',
    pickupDate: '',
    pickupTime: '',
    dropoffDate: '',
    dropoffTime: '',
    location: 'aeroport',
    carType: 'economic',
    discountCode: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountStatus, setDiscountStatus] = useState<{
    isValid: boolean;
    message: string;
    discount: number;
  } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  const carTypes = [
    { value: 'economic', label: 'Economic - Dacia Logan', price: 45 },
    { value: 'comfort', label: 'Comfort - Volkswagen Golf', price: 65 },
    { value: 'premium', label: 'Premium - BMW Seria 3', price: 95 },
    { value: 'van', label: 'Van 9 locuri - Ford Transit', price: 85 }
  ];

  const locations = [
    { value: 'aeroport', label: 'Aeroport Henri Coandă, Otopeni' },
    { value: 'city', label: 'Centrul Bucureștiului' },
    { value: 'other', label: 'Altă locație (se percepe taxă)' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotal = () => {
    const selectedCar = carTypes.find(car => car.value === formData.carType);
    if (!selectedCar || !formData.pickupDate || !formData.dropoffDate) return 0;

    const pickupDate = new Date(formData.pickupDate);
    const dropoffDate = new Date(formData.dropoffDate);
    const timeDiff = dropoffDate.getTime() - pickupDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return daysDiff > 0 ? daysDiff * selectedCar.price : selectedCar.price;
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
          discount
        });
      } else {
        setDiscountStatus({
          isValid: false,
          message: 'Cod invalid sau expirat.',
          discount: 0
        });
      }
    } catch (error) {
      setDiscountStatus({
        isValid: false,
        message: 'Eroare la validarea codului.',
        discount: 0
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
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Store reservation data for success page
    localStorage.setItem('reservationData', JSON.stringify({
      ...formData,
      total: Math.round(finalTotal),
      originalTotal: calculateTotal(),
      appliedDiscount: discountStatus?.isValid ? discountStatus.discount : 0,
      reservationId: 'DC' + Math.random().toString(36).substr(2, 9).toUpperCase()
    }));

    router.push('/succes');
  };

  const selectedCar = carTypes.find(car => car.value === formData.carType);
  const total = calculateTotal();
  const finalTotal = discountStatus?.isValid && discountStatus.discount > 0 
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
                      <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                        Nume *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                        placeholder="Introducă numele"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                        Prenume *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                        placeholder="Introducă prenumele"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                        placeholder="nume@email.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                        Telefon *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                        placeholder="+40 722 123 456"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                      <Plane className="h-4 w-4 inline text-jade mr-1" />
                      Zbor (opțional)
                    </label>
                    <input
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
                    <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                      <Gift className="h-4 w-4 inline text-jade mr-1" />
                      Cod de reducere (opțional)
                    </label>
                    <div className="flex space-x-2">
                      <input
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
                        disabled={isValidatingCode || !formData.discountCode.trim()}
                        className="px-4 py-3 bg-berkeley text-white font-dm-sans font-semibold rounded-lg hover:bg-berkeley/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        {isValidatingCode ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Validează'
                        )}
                      </button>
                    </div>
                    
                    {discountStatus && (
                      <div className={`mt-2 p-3 rounded-lg ${
                        discountStatus.isValid ? 'bg-jade/10 text-jade' : 'bg-red-50 text-red-600'
                      }`}>
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
                      <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                        Dată ridicare *
                      </label>
                      <input
                        type="date"
                        name="pickupDate"
                        value={formData.pickupDate}
                        onChange={handleInputChange}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                        Oră ridicare *
                      </label>
                      <input
                        type="time"
                        name="pickupTime"
                        value={formData.pickupTime}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                        Dată returnare *
                      </label>
                      <input
                        type="date"
                        name="dropoffDate"
                        value={formData.dropoffDate}
                        onChange={handleInputChange}
                        required
                        min={formData.pickupDate || new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                        Oră returnare *
                      </label>
                      <input
                        type="time"
                        name="dropoffTime"
                        value={formData.dropoffTime}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                      <MapPin className="h-4 w-4 inline text-jade mr-1" />
                      Locația ridicării *
                    </label>
                    <Select
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                      className="transition-all duration-300"
                    >
                      {locations.map(location => (
                        <option key={location.value} value={location.value}>
                          {location.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                      Tip mașină *
                    </label>
                    <Select
                      name="carType"
                      value={formData.carType}
                      onChange={handleInputChange}
                      required
                      className="transition-all duration-300"
                    >
                      {carTypes.map(car => (
                        <option key={car.value} value={car.value}>
                          {car.label} - {car.price}€/zi
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-jade text-white font-dm-sans font-semibold text-lg rounded-lg hover:bg-jade/90 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg flex items-center justify-center space-x-2"
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
                    <span className="font-dm-sans font-semibold text-berkeley">{selectedCar.label.split(' - ')[0]}</span>
                  </div>
                )}

                {formData.pickupDate && (
                  <div className="flex justify-between items-center">
                    <span className="font-dm-sans text-gray-600">De la:</span>
                    <span className="font-dm-sans font-semibold text-berkeley">
                      {new Date(formData.pickupDate).toLocaleDateString('ro-RO')}
                    </span>
                  </div>
                )}

                {formData.dropoffDate && (
                  <div className="flex justify-between items-center">
                    <span className="font-dm-sans text-gray-600">Până la:</span>
                    <span className="font-dm-sans font-semibold text-berkeley">
                      {new Date(formData.dropoffDate).toLocaleDateString('ro-RO')}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="font-dm-sans text-gray-600">Locație:</span>
                  <span className="font-dm-sans font-semibold text-berkeley">
                    {locations.find(loc => loc.value === formData.location)?.label.split(',')[0] || 'Aeroport'}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                {discountStatus?.isValid && discountStatus.discount > 0 && (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-dm-sans text-gray-600">Subtotal:</span>
                      <span className="font-dm-sans text-gray-600">{total}€</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-dm-sans text-jade">Reducere ({discountStatus.discount}%):</span>
                      <span className="font-dm-sans text-jade">-{Math.round(total * discountStatus.discount / 100)}€</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center text-xl">
                  <span className="font-poppins font-semibold text-berkeley">Total:</span>
                  <span className="font-poppins font-bold text-jade">{Math.round(finalTotal)}€</span>
                </div>
                <p className="text-sm text-gray-600 font-dm-sans mt-2">
                  *Preț final, fără taxe ascunse
                </p>
              </div>

              {/* Benefits reminder */}
              <div className="mt-8 p-4 bg-jade/5 rounded-lg">
                <h4 className="font-poppins font-semibold text-berkeley mb-2">Include:</h4>
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
