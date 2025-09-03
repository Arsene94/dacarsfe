"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Search,
  Plus,
  Edit,
  Trash2,
  Car,
  Settings,
  Users,
  Fuel,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Star } from "lucide-react";
import { Select } from "@/components/ui/select";

interface Car {
  id: number;
  name: string;
  type: string;
  image: string;
  price: number;
  features: {
    passengers: number;
    transmission: string;
    fuel: string;
    doors: number;
    luggage: number;
  };
  status: "available" | "rented" | "maintenance";
  rating: number;
  description: string;
  specs: string[];
  licensePlate: string;
  year: number;
  mileage: number;
  lastService: string;
  nextService: string;
}

const CarsPage = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Mock data pentru demo
  useEffect(() => {
    const mockCars: Car[] = [
      {
        id: 1,
        name: "Dacia Logan",
        type: "Economic",
        image:
          "https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=600",
        price: 45,
        features: {
          passengers: 5,
          transmission: "Manual",
          fuel: "Benzină",
          doors: 4,
          luggage: 2,
        },
        status: "available",
        rating: 4.8,
        description:
          "Mașină economică și fiabilă, perfectă pentru călătoriile în oraș și pe distanțe medii.",
        specs: [
          "Aer condiționat",
          "Radio/USB",
          "Geamuri electrice",
          "Servo direcție",
        ],
        licensePlate: "B 123 ABC",
        year: 2022,
        mileage: 45000,
        lastService: "2024-12-15",
        nextService: "2025-06-15",
      },
      {
        id: 2,
        name: "Volkswagen Golf",
        type: "Comfort",
        image:
          "https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=600",
        price: 65,
        features: {
          passengers: 5,
          transmission: "Automat",
          fuel: "Benzină",
          doors: 5,
          luggage: 3,
        },
        status: "rented",
        rating: 4.9,
        description:
          "Mașină de clasă medie cu tehnologie avansată și confort superior.",
        specs: [
          "Climatronic",
          "Navigație GPS",
          "Senzori parcare",
          "Cruise control",
        ],
        licensePlate: "B 456 DEF",
        year: 2023,
        mileage: 28000,
        lastService: "2024-11-20",
        nextService: "2025-05-20",
      },
      {
        id: 3,
        name: "BMW Seria 3",
        type: "Premium",
        image:
          "https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg?auto=compress&cs=tinysrgb&w=600",
        price: 95,
        features: {
          passengers: 5,
          transmission: "Automat",
          fuel: "Diesel",
          doors: 4,
          luggage: 3,
        },
        status: "available",
        rating: 4.9,
        description:
          "Sedan premium cu performanțe excepționale și tehnologie de vârf.",
        specs: [
          "Piele",
          "Navigație premium",
          "Scaune sport",
          "Sistem audio premium",
        ],
        licensePlate: "B 789 GHI",
        year: 2023,
        mileage: 15000,
        lastService: "2024-12-01",
        nextService: "2025-06-01",
      },
      {
        id: 4,
        name: "Ford Transit",
        type: "Van",
        image:
          "https://images.pexels.com/photos/1007410/pexels-photo-1007410.jpeg?auto=compress&cs=tinysrgb&w=600",
        price: 85,
        features: {
          passengers: 9,
          transmission: "Manual",
          fuel: "Diesel",
          doors: 4,
          luggage: 5,
        },
        status: "maintenance",
        rating: 4.7,
        description:
          "Van spațios pentru grupuri mari, ideal pentru excursii și evenimente.",
        specs: [
          "9 locuri",
          "Aer condiționat",
          "Radio",
          "Spațiu generos bagaje",
        ],
        licensePlate: "B 321 JKL",
        year: 2021,
        mileage: 78000,
        lastService: "2025-01-05",
        nextService: "2025-07-05",
      },
      {
        id: 5,
        name: "Skoda Octavia",
        type: "Comfort",
        image:
          "https://images.pexels.com/photos/1719648/pexels-photo-1719648.jpeg?auto=compress&cs=tinysrgb&w=600",
        price: 68,
        features: {
          passengers: 5,
          transmission: "Automat",
          fuel: "Diesel",
          doors: 4,
          luggage: 4,
        },
        status: "available",
        rating: 4.8,
        description:
          "Sedan spațios cu portbagaj generos, perfect pentru călătorii lungi.",
        specs: [
          "Climatronic",
          "Navigație",
          "Scaune încălzite",
          "Senzori parcare",
        ],
        licensePlate: "B 654 MNO",
        year: 2022,
        mileage: 52000,
        lastService: "2024-10-30",
        nextService: "2025-04-30",
      },
      {
        id: 6,
        name: "Audi A4",
        type: "Premium",
        image:
          "https://images.pexels.com/photos/1719648/pexels-photo-1719648.jpeg?auto=compress&cs=tinysrgb&w=600",
        price: 98,
        features: {
          passengers: 5,
          transmission: "Automat",
          fuel: "Diesel",
          doors: 4,
          luggage: 3,
        },
        status: "available",
        rating: 4.9,
        description:
          "Luxul german la cel mai înalt nivel, cu tehnologie inovatoare.",
        specs: [
          "Quattro",
          "Virtual Cockpit",
          "Scaune ventilate",
          "Bang & Olufsen",
        ],
        licensePlate: "B 987 PQR",
        year: 2023,
        mileage: 12000,
        lastService: "2024-12-10",
        nextService: "2025-06-10",
      },
    ];

    setCars(mockCars);
    setFilteredCars(mockCars);
  }, []);

  // Filter cars
  useEffect(() => {
    let filtered = cars;

    if (searchTerm) {
      filtered = filtered.filter(
        (car) =>
          car.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          car.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
          car.type.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((car) => car.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(
        (car) => car.type.toLowerCase() === typeFilter.toLowerCase(),
      );
    }

    setFilteredCars(filtered);
  }, [cars, searchTerm, statusFilter, typeFilter]);

  const handleViewCar = (car: Car) => {
    setSelectedCar(car);
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "rented":
        return "bg-yellow-100 text-yellow-800";
      case "maintenance":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Disponibilă";
      case "rented":
        return "Închiriată";
      case "maintenance":
        return "Service";
      default:
        return status;
    }
  };

  const isServiceDue = (nextServiceDate: string) => {
    const nextService = new Date(nextServiceDate);
    const today = new Date();
    const daysUntilService = Math.ceil(
      (nextService.getTime() - today.getTime()) / (1000 * 3600 * 24),
    );
    return daysUntilService <= 30;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Înapoi la dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-poppins font-semibold text-berkeley">
                Gestionare Flota Auto
              </h1>
            </div>

            <button
              className="flex items-center space-x-2 px-4 py-2 bg-jade text-white rounded-lg hover:bg-jade/90 transition-colors"
              aria-label="Adaugă Mașină"
            >
              <Plus className="h-4 w-4" />
              <span className="font-dm-sans font-semibold">Adaugă Mașină</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-dm-sans text-gray-600">
                  Total Mașini
                </p>
                <p className="text-2xl font-poppins font-bold text-berkeley">
                  {cars.length}
                </p>
              </div>
              <Car className="h-8 w-8 text-jade" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-dm-sans text-gray-600">
                  Disponibile
                </p>
                <p className="text-2xl font-poppins font-bold text-green-600">
                  {cars.filter((car) => car.status === "available").length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-dm-sans text-gray-600">Închiriate</p>
                <p className="text-2xl font-poppins font-bold text-yellow-600">
                  {cars.filter((car) => car.status === "rented").length}
                </p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-dm-sans text-gray-600">În Service</p>
                <p className="text-2xl font-poppins font-bold text-red-600">
                  {cars.filter((car) => car.status === "maintenance").length}
                </p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Caută mașini..."
                aria-label="Caută mașini"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent"
              />
            </div>

            <Select
              className="px-4 py-3"
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="Toate statusurile"
              aria-label="Filtrează după status"
            >
              <option value="all">Toate statusurile</option>
              <option value="available">Disponibile</option>
              <option value="rented">Închiriate</option>
              <option value="maintenance">În Service</option>
            </Select>

            <Select
              className="px-4 py-3"
              value={typeFilter}
              onValueChange={setTypeFilter}
              placeholder="Toate tipurile"
              aria-label="Filtrează după tip"
            >
              <option value="all">Toate tipurile</option>
              <option value="economic">Economic</option>
              <option value="comfort">Comfort</option>
              <option value="premium">Premium</option>
              <option value="van">Van</option>
            </Select>

            <div className="flex items-center justify-between">
              <span className="font-dm-sans text-gray-600">
                {filteredCars.length} mașini găsite
              </span>
            </div>
          </div>
        </div>

        {/* Cars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCars.map((car) => (
            <div
              key={car.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              <div className="relative w-full h-48">
                <Image
                  src={car.image}
                  alt={car.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-4 left-4 bg-jade text-white px-3 py-1 rounded-full text-sm font-dm-sans font-semibold">
                  {car.type}
                </div>
                <div
                  className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-dm-sans font-semibold ${getStatusColor(car.status)}`}
                >
                  {getStatusText(car.status)}
                </div>
                {isServiceDue(car.nextService) && (
                  <div className="absolute bottom-4 left-4 bg-red-500 text-white px-2 py-1 rounded-lg flex items-center space-x-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-xs font-dm-sans">Service</span>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-poppins font-semibold text-berkeley">
                    {car.name}
                  </h3>
                  <div className="flex items-center space-x-1"></div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 font-dm-sans">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-jade" />
                      <span>{car.features.passengers} persoane</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-jade" />
                      <span>{car.features.transmission}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 font-dm-sans">
                    <div className="flex items-center space-x-2">
                      <Fuel className="h-4 w-4 text-jade" />
                      <span>{car.features.fuel}</span>
                    </div>
                    <span className="font-semibold">{car.licensePlate}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-2xl font-poppins font-bold text-berkeley">
                      {car.price}€
                    </span>
                    <span className="text-gray-600 font-dm-sans">/zi</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 font-dm-sans">
                      Anul {car.year}
                    </p>
                    <p className="text-sm text-gray-600 font-dm-sans">
                      {car.mileage.toLocaleString()} km
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewCar(car)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-jade text-jade font-dm-sans font-semibold rounded-lg hover:bg-jade hover:text-white transition-colors"
                    aria-label="Vezi mașina"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Vezi</span>
                  </button>
                  <button
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label="Editează"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Șterge"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCars.length === 0 && (
          <div className="text-center py-12">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-poppins font-semibold text-gray-600 mb-2">
              Nu există mașini
            </h3>
            <p className="text-gray-500 font-dm-sans">
              Nu am găsit mașini care să corespundă criteriilor de căutare.
            </p>
          </div>
        )}

        {/* Car Details Modal */}
        {showModal && selectedCar && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-poppins font-bold text-berkeley">
                  {selectedCar.name}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Închide detalii mașină"
                >
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Car Image and Basic Info */}
                <div>
                  <div className="relative w-full h-64 mb-6">
                    <Image
                      src={selectedCar.image}
                      alt={selectedCar.name}
                      fill
                      className="object-cover rounded-xl"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-dm-sans text-gray-600">
                        Status:
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-dm-sans ${getStatusColor(selectedCar.status)}`}
                      >
                        {getStatusText(selectedCar.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-dm-sans text-gray-600">
                        Număr înmatriculare:
                      </span>
                      <span className="font-dm-sans font-semibold text-berkeley">
                        {selectedCar.licensePlate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-dm-sans text-gray-600">
                        An fabricație:
                      </span>
                      <span className="font-dm-sans font-semibold text-berkeley">
                        {selectedCar.year}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-dm-sans text-gray-600">
                        Kilometraj:
                      </span>
                      <span className="font-dm-sans font-semibold text-berkeley">
                        {selectedCar.mileage.toLocaleString()} km
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-dm-sans text-gray-600">
                        Preț/zi:
                      </span>
                      <span className="font-dm-sans font-bold text-jade text-lg">
                        {selectedCar.price}€
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detailed Info */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-poppins font-semibold text-berkeley text-lg mb-3">
                      Specificații
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-jade" />
                        <span className="font-dm-sans text-gray-600">
                          {selectedCar.features.passengers} persoane
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Settings className="h-4 w-4 text-jade" />
                        <span className="font-dm-sans text-gray-600">
                          {selectedCar.features.transmission}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Fuel className="h-4 w-4 text-jade" />
                        <span className="font-dm-sans text-gray-600">
                          {selectedCar.features.fuel}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Car className="h-4 w-4 text-jade" />
                        <span className="font-dm-sans text-gray-600">
                          {selectedCar.features.doors} uși
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-poppins font-semibold text-berkeley text-lg mb-3">
                      Dotări
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCar.specs.map((spec, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-jade/10 text-jade text-sm font-dm-sans rounded-full"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-poppins font-semibold text-berkeley text-lg mb-3">
                      Service
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-dm-sans text-gray-600">
                          Ultimul service:
                        </span>
                        <span className="font-dm-sans text-gray-900">
                          {new Date(selectedCar.lastService).toLocaleDateString(
                            "ro-RO",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-dm-sans text-gray-600">
                          Următorul service:
                        </span>
                        <span
                          className={`font-dm-sans ${isServiceDue(selectedCar.nextService) ? "text-red-600 font-semibold" : "text-gray-900"}`}
                        >
                          {new Date(selectedCar.nextService).toLocaleDateString(
                            "ro-RO",
                          )}
                          {isServiceDue(selectedCar.nextService) && (
                            <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              Urgent
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-poppins font-semibold text-berkeley text-lg mb-3">
                      Descriere
                    </h4>
                    <p className="font-dm-sans text-gray-600 leading-relaxed">
                      {selectedCar.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  className="flex-1 bg-jade text-white py-3 rounded-lg font-semibold font-dm-sans hover:bg-jade/90 transition-colors"
                  aria-label="Editează Mașina"
                >
                  Editează Mașina
                </button>
                <button
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold font-dm-sans hover:bg-gray-50 transition-colors"
                  aria-label="Vezi Rezervări"
                >
                  Vezi Rezervări
                </button>
                {selectedCar.status === "available" && (
                  <button
                    className="flex-1 border-2 border-yellow-300 text-yellow-700 py-3 rounded-lg font-semibold font-dm-sans hover:bg-yellow-50 transition-colors"
                    aria-label="Trimite la Service"
                  >
                    Trimite la Service
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarsPage;
