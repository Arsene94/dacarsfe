"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Car, Users, BarChart3, Plus, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Reservation {
  id: string;
  customerName: string;
  phone: string;
  carId: number;
  carName: string;
  startDate: string;
  endDate: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  total: number;
}

interface Car {
  id: number;
  name: string;
  type: string;
  status: 'available' | 'rented' | 'maintenance';
  price: number;
}

const AdminDashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<number | null>(null);

  // Mock data pentru demo
  useEffect(() => {
    const mockReservations: Reservation[] = [
      {
        id: 'DC001',
        customerName: 'Ana Popescu',
        phone: '+40722123456',
        carId: 1,
        carName: 'Dacia Logan',
        startDate: '2025-01-15',
        endDate: '2025-01-18',
        status: 'confirmed',
        total: 135
      },
      {
        id: 'DC002',
        customerName: 'Mihai Ionescu',
        phone: '+40733987654',
        carId: 2,
        carName: 'VW Golf',
        startDate: '2025-01-20',
        endDate: '2025-01-25',
        status: 'confirmed',
        total: 325
      },
      {
        id: 'DC003',
        customerName: 'Elena Dumitrescu',
        phone: '+40744555666',
        carId: 3,
        carName: 'BMW Seria 3',
        startDate: '2025-01-22',
        endDate: '2025-01-24',
        status: 'pending',
        total: 190
      },
      {
        id: 'DC004',
        customerName: 'Radu Constantin',
        phone: '+40755111222',
        carId: 1,
        carName: 'Dacia Logan',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        status: 'confirmed',
        total: 180
      },
      {
        id: 'DC005',
        customerName: 'Maria Georgescu',
        phone: '+40766333444',
        carId: 4,
        carName: 'Ford Transit',
        startDate: '2025-02-10',
        endDate: '2025-02-12',
        status: 'confirmed',
        total: 170
      }
    ];

    const mockCars: Car[] = [
      { id: 1, name: 'Dacia Logan', type: 'Economic', status: 'available', price: 45 },
      { id: 2, name: 'VW Golf', type: 'Comfort', status: 'rented', price: 65 },
      { id: 3, name: 'BMW Seria 3', type: 'Premium', status: 'available', price: 95 },
      { id: 4, name: 'Ford Transit', type: 'Van', status: 'available', price: 85 },
      { id: 5, name: 'Skoda Octavia', type: 'Comfort', status: 'maintenance', price: 68 },
      { id: 6, name: 'Audi A4', type: 'Premium', status: 'available', price: 98 }
    ];

    setReservations(mockReservations);
    setCars(mockCars);
  }, []);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getReservationsForDate = (date: string, carId?: number) => {
    return reservations.filter(reservation => {
      const startDate = new Date(reservation.startDate);
      const endDate = new Date(reservation.endDate);
      const checkDate = new Date(date);
      
      const isInRange = checkDate >= startDate && checkDate <= endDate;
      const matchesCar = !carId || reservation.carId === carId;
      
      return isInRange && matchesCar;
    });
  };

  const renderCalendarMonth = (month: number, year: number) => {
    const daysInMonth = getDaysInMonth(month, year);
    const firstDay = getFirstDayOfMonth(month, year);
    const monthNames = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ];
    const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayReservations = getReservationsForDate(dateStr, selectedCar || undefined);
      const isToday = new Date().toDateString() === new Date(dateStr).toDateString();

      days.push(
        <div
          key={day}
          className={`h-8 text-xs flex items-center justify-center relative cursor-pointer transition-colors duration-200 ${
            isToday ? 'bg-jade text-white font-semibold rounded' : 'hover:bg-gray-100'
          }`}
          title={dayReservations.length > 0 ? dayReservations.map(r => `${r.customerName} - ${r.phone}`).join('\n') : ''}
        >
          <span className="relative z-10">{day}</span>
          {dayReservations.length > 0 && (
            <div className={`absolute inset-0 rounded text-white text-[10px] flex items-center justify-center ${
              dayReservations[0].status === 'confirmed' ? 'bg-jade' : 
              dayReservations[0].status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              <div className="text-center leading-tight">
                <div className="font-semibold">{dayReservations[0].customerName.split(' ')[0]}</div>
                <div className="text-[8px]">{dayReservations[0].phone.slice(-4)}</div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold text-berkeley mb-3 text-center">{monthNames[month]} {year}</h3>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="h-6 text-xs font-semibold text-gray-500 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  const filteredCars = selectedCar ? cars.filter(car => car.id === selectedCar) : cars;
  const todayReservations = getReservationsForDate(new Date().toISOString().split('T')[0]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="bg-jade p-2 rounded-lg">
                  <Car className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-poppins font-bold text-berkeley">DaCars Admin</span>
              </Link>
            </div>
            
            <nav className="flex items-center space-x-6">
              <Link href="/admin" className="text-berkeley font-dm-sans font-medium hover:text-jade transition-colors">
                Dashboard
              </Link>
              <Link href="/admin/rezervari" className="text-gray-600 font-dm-sans font-medium hover:text-jade transition-colors">
                Rezervări
              </Link>
              <Link href="/admin/masini" className="text-gray-600 font-dm-sans font-medium hover:text-jade transition-colors">
                Mașini
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-dm-sans text-gray-600">Rezervări astăzi</p>
                <p className="text-2xl font-poppins font-bold text-berkeley">{todayReservations.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-jade" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-dm-sans text-gray-600">Mașini disponibile</p>
                <p className="text-2xl font-poppins font-bold text-berkeley">
                  {cars.filter(car => car.status === 'available').length}
                </p>
              </div>
              <Car className="h-8 w-8 text-jade" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-dm-sans text-gray-600">Total rezervări</p>
                <p className="text-2xl font-poppins font-bold text-berkeley">{reservations.length}</p>
              </div>
              <Users className="h-8 w-8 text-jade" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-dm-sans text-gray-600">Venituri luna</p>
                <p className="text-2xl font-poppins font-bold text-berkeley">
                  {reservations.reduce((sum, r) => sum + r.total, 0)}€
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-jade" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Cars List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-poppins font-semibold text-berkeley">Flota Auto</h2>
                <Link
                  href="/admin/masini"
                  className="p-2 bg-jade text-white rounded-lg hover:bg-jade/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </Link>
              </div>

              <div className="mb-4">
                <select
                  value={selectedCar || ''}
                  onChange={(e) => setSelectedCar(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent"
                >
                  <option value="">Toate mașinile</option>
                  {cars.map(car => (
                    <option key={car.id} value={car.id}>{car.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {filteredCars.map(car => (
                  <div
                    key={car.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedCar === car.id 
                        ? 'border-jade bg-jade/5' 
                        : 'border-gray-200 hover:border-jade/50'
                    }`}
                    onClick={() => setSelectedCar(selectedCar === car.id ? null : car.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-dm-sans font-semibold text-berkeley">{car.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-dm-sans ${
                        car.status === 'available' ? 'bg-green-100 text-green-800' :
                        car.status === 'rented' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {car.status === 'available' ? 'Disponibilă' :
                         car.status === 'rented' ? 'Închiriată' : 'Service'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 font-dm-sans">{car.type} • {car.price}€/zi</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-poppins font-semibold text-berkeley">
                  Calendar Rezervări {selectedYear}
                </h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setSelectedYear(selectedYear - 1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <span className="font-dm-sans font-semibold text-berkeley">{selectedYear}</span>
                  <button
                    onClick={() => setSelectedYear(selectedYear + 1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Year Calendar Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }, (_, month) => (
                  <div key={month}>
                    {renderCalendarMonth(month, selectedYear)}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-jade rounded"></div>
                  <span className="text-sm font-dm-sans text-gray-600">Confirmat</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-sm font-dm-sans text-gray-600">În așteptare</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm font-dm-sans text-gray-600">Anulat</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reservations */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-poppins font-semibold text-berkeley">Rezervări Recente</h2>
              <Link
                href="/admin/rezervari"
                className="px-4 py-2 bg-jade text-white font-dm-sans font-semibold rounded-lg hover:bg-jade/90 transition-colors"
              >
                Vezi toate
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-dm-sans font-semibold text-gray-600">ID</th>
                    <th className="text-left py-3 px-4 font-dm-sans font-semibold text-gray-600">Client</th>
                    <th className="text-left py-3 px-4 font-dm-sans font-semibold text-gray-600">Telefon</th>
                    <th className="text-left py-3 px-4 font-dm-sans font-semibold text-gray-600">Mașină</th>
                    <th className="text-left py-3 px-4 font-dm-sans font-semibold text-gray-600">Perioada</th>
                    <th className="text-left py-3 px-4 font-dm-sans font-semibold text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-dm-sans font-semibold text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.slice(0, 5).map(reservation => (
                    <tr key={reservation.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-dm-sans text-sm text-berkeley font-semibold">
                        {reservation.id}
                      </td>
                      <td className="py-3 px-4 font-dm-sans text-sm text-gray-900">
                        {reservation.customerName}
                      </td>
                      <td className="py-3 px-4 font-dm-sans text-sm text-gray-600">
                        {reservation.phone}
                      </td>
                      <td className="py-3 px-4 font-dm-sans text-sm text-gray-900">
                        {reservation.carName}
                      </td>
                      <td className="py-3 px-4 font-dm-sans text-sm text-gray-600">
                        {new Date(reservation.startDate).toLocaleDateString('ro-RO')} - {new Date(reservation.endDate).toLocaleDateString('ro-RO')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-dm-sans ${
                          reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {reservation.status === 'confirmed' ? 'Confirmat' :
                           reservation.status === 'pending' ? 'În așteptare' : 'Anulat'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-dm-sans text-sm font-semibold text-berkeley">
                        {reservation.total}€
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;