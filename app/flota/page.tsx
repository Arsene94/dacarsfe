"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Fuel,
  Settings,
  Star,
  Filter,
  Grid,
  List,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const FleetPage = () => {
  const [filters, setFilters] = useState({
    type: "all",
    transmission: "all",
    fuel: "all",
    passengers: "all",
    priceRange: "all",
  });

  const [sortBy, setSortBy] = useState("price-asc");
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const allCars = [
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
      rating: 4.8,
      description:
        "Mașină economică și fiabilă, perfectă pentru călătoriile în oraș și pe distanțe medii.",
      specs: [
        "Aer condiționat",
        "Radio/USB",
        "Geamuri electrice",
        "Servo direcție",
      ],
    },
    {
      id: 2,
      name: "Dacia Sandero",
      type: "Economic",
      image:
        "https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=600",
      price: 48,
      features: {
        passengers: 5,
        transmission: "Manual",
        fuel: "Benzină",
        doors: 5,
        luggage: 2,
      },
      rating: 4.7,
      description:
        "Hatchback spațios cu consum redus, ideal pentru familii mici.",
      specs: ["Aer condiționat", "Bluetooth", "Geamuri electrice", "ESP"],
    },
    {
      id: 3,
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
      rating: 4.9,
      description:
        "Mașină de clasă medie cu tehnologie avansată și confort superior.",
      specs: [
        "Climatronic",
        "Navigație GPS",
        "Senzori parcare",
        "Cruise control",
      ],
    },
    {
      id: 4,
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
      rating: 4.8,
      description:
        "Sedan spațios cu portbagaj generos, perfect pentru călătorii lungi.",
      specs: [
        "Climatronic",
        "Navigație",
        "Scaune încălzite",
        "Senzori parcare",
      ],
    },
    {
      id: 5,
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
      rating: 4.9,
      description:
        "Sedan premium cu performanțe excepționale și tehnologie de vârf.",
      specs: [
        "Piele",
        "Navigație premium",
        "Scaune sport",
        "Sistem audio premium",
      ],
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
      rating: 4.9,
      description:
        "Luxul german la cel mai înalt nivel, cu tehnologie inovatoare.",
      specs: [
        "Quattro",
        "Virtual Cockpit",
        "Scaune ventilate",
        "Bang & Olufsen",
      ],
    },
    {
      id: 7,
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
      rating: 4.7,
      description:
        "Van spațios pentru grupuri mari, ideal pentru excursii și evenimente.",
      specs: ["9 locuri", "Aer condiționat", "Radio", "Spațiu generos bagaje"],
    },
    {
      id: 8,
      name: "Mercedes Vito",
      type: "Van",
      image:
        "https://images.pexels.com/photos/1007410/pexels-photo-1007410.jpeg?auto=compress&cs=tinysrgb&w=600",
      price: 95,
      features: {
        passengers: 8,
        transmission: "Automat",
        fuel: "Diesel",
        doors: 4,
        luggage: 4,
      },
      rating: 4.8,
      description: "Van premium cu confort superior pentru călătorii de grup.",
      specs: ["8 locuri", "Climatronic", "Navigație", "Scaune confortabile"],
    },
  ];

  const filteredAndSortedCars = useMemo(() => {
    let filtered = allCars.filter((car) => {
      const matchesSearch =
        car.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        car.type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        filters.type === "all" ||
        car.type.toLowerCase() === filters.type.toLowerCase();
      const matchesTransmission =
        filters.transmission === "all" ||
        car.features.transmission.toLowerCase() ===
          filters.transmission.toLowerCase();
      const matchesFuel =
        filters.fuel === "all" ||
        car.features.fuel.toLowerCase() === filters.fuel.toLowerCase();

      const matchesPassengers =
        filters.passengers === "all" ||
        (filters.passengers === "1-4" && car.features.passengers <= 4) ||
        (filters.passengers === "5-7" &&
          car.features.passengers >= 5 &&
          car.features.passengers <= 7) ||
        (filters.passengers === "8+" && car.features.passengers >= 8);

      const matchesPrice =
        filters.priceRange === "all" ||
        (filters.priceRange === "0-50" && car.price <= 50) ||
        (filters.priceRange === "51-80" && car.price > 50 && car.price <= 80) ||
        (filters.priceRange === "81+" && car.price > 80);

      return (
        matchesSearch &&
        matchesType &&
        matchesTransmission &&
        matchesFuel &&
        matchesPassengers &&
        matchesPrice
      );
    });

    // Sort cars
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "rating":
          return b.rating - a.rating;
        case "name":
          return a.name.localeCompare(b.name);
        case "passengers":
          return b.features.passengers - a.features.passengers;
        default:
          return 0;
      }
    });

    return filtered;
  }, [allCars, filters, sortBy, searchTerm]);

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: "all",
      transmission: "all",
      fuel: "all",
      passengers: "all",
      priceRange: "all",
    });
    setSearchTerm("");
  };

  const CarCard = ({
    car,
    isListView = false,
  }: {
    car: any;
    isListView?: boolean;
  }) => (
    <div
      className={`bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100 ${
        isListView ? "flex flex-col md:flex-row" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden ${isListView ? "md:w-1/3" : ""}`}
      >
        <img
          src={car.image}
          alt={car.name}
          className={`object-cover group-hover:scale-110 transition-transform duration-500 ${
            isListView ? "w-full h-48 md:h-full" : "w-full h-48"
          }`}
        />
        <div className="absolute top-4 left-4 bg-jade text-white px-3 py-1 rounded-full text-sm font-dm-sans font-semibold">
          {car.type}
        </div>
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center space-x-1">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="text-sm font-dm-sans font-semibold text-berkeley">
            {car.rating}
          </span>
        </div>
      </div>

      <div
        className={`p-6 ${isListView ? "md:w-2/3 flex flex-col justify-between" : ""}`}
      >
        <div>
          <h3 className="text-xl font-poppins font-semibold text-berkeley mb-2">
            {car.name}
          </h3>

          {isListView && (
            <p className="text-gray-600 font-dm-sans mb-4 leading-relaxed">
              {car.description}
            </p>
          )}

          <div
            className={`${isListView ? "grid grid-cols-2 gap-4 mb-4" : "space-y-2 mb-6"}`}
          >
            <div className="flex items-center justify-between text-sm text-gray-600 font-dm-sans">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-jade" />
                <span>{car.features.passengers} persoane</span>
              </div>
              {!isListView && (
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-jade" />
                  <span>{car.features.transmission}</span>
                </div>
              )}
            </div>

            {isListView && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 font-dm-sans">
                <Settings className="h-4 w-4 text-jade" />
                <span>{car.features.transmission}</span>
              </div>
            )}

            <div className="flex items-center space-x-2 text-sm text-gray-600 font-dm-sans">
              <Fuel className="h-4 w-4 text-jade" />
              <span>{car.features.fuel}</span>
            </div>

            {isListView && (
              <div className="text-sm text-gray-600 font-dm-sans">
                <span className="font-semibold">{car.features.doors} uși</span>{" "}
                •{" "}
                <span className="font-semibold">
                  {car.features.luggage} bagaje
                </span>
              </div>
            )}
          </div>

          {isListView && (
            <div className="mb-4">
              <h4 className="font-dm-sans font-semibold text-berkeley mb-2">
                Dotări incluse:
              </h4>
              <div className="flex flex-wrap gap-2">
                {car.specs.map((spec: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-jade/10 text-jade text-xs font-dm-sans rounded-full"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-poppins font-bold text-berkeley">
              {car.price}€
            </span>
            <span className="text-gray-600 font-dm-sans">/zi</span>
          </div>

          <Link
            href="/rezervare"
            className="px-4 py-2 bg-jade text-white font-dm-sans font-semibold rounded-lg hover:bg-jade/90 transition-colors duration-300"
          >
            Rezervă
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pt-16 lg:pt-20 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl lg:text-5xl font-poppins font-bold text-berkeley mb-6">
            Flota noastră <span className="text-jade">completă</span>
          </h1>
          <p className="text-xl font-dm-sans text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Descoperă toate mașinile disponibile și alege cea potrivită pentru
            călătoria ta.
          </p>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Caută mașină..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
              />
            </div>

            {/* View Mode and Sort */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors duration-300 ${
                    viewMode === "grid"
                      ? "bg-jade text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  aria-label="Afișare grilă"
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors duration-300 ${
                    viewMode === "list"
                      ? "bg-jade text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  aria-label="Afișare listă"
                >
                  <List className="h-5 w-5" />
                </button>
              </div>

              <Select
                className="w-auto px-4 py-2 transition-all duration-300"
                value={sortBy}
                onValueChange={setSortBy}
              >
                <option value="price-asc">Preț crescător</option>
                <option value="price-desc">Preț descrescător</option>
                <option value="rating">Rating</option>
                <option value="name">Nume A-Z</option>
                <option value="passengers">Nr. pasageri</option>
              </Select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-300 ${
                  showFilters
                    ? "bg-jade text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <SlidersHorizontal className="h-5 w-5" />
                <span className="font-dm-sans">Filtre</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-6 animate-slide-up">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                    Tip mașină
                  </label>
                  <Select
                    className="px-3 py-2 transition-all duration-300"
                    value={filters.type}
                    onValueChange={(value) => handleFilterChange("type", value)}
                  >
                    <option value="all">Toate</option>
                    <option value="economic">Economic</option>
                    <option value="comfort">Comfort</option>
                    <option value="premium">Premium</option>
                    <option value="van">Van</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                    Transmisie
                  </label>
                  <Select
                    className="px-3 py-2 transition-all duration-300"
                    value={filters.transmission}
                    onValueChange={(value) =>
                      handleFilterChange("transmission", value)
                    }
                  >
                    <option value="all">Toate</option>
                    <option value="manual">Manual</option>
                    <option value="automat">Automat</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                    Combustibil
                  </label>
                  <Select
                    className="px-3 py-2 transition-all duration-300"
                    value={filters.fuel}
                    onValueChange={(value) => handleFilterChange("fuel", value)}
                  >
                    <option value="all">Toate</option>
                    <option value="benzină">Benzină</option>
                    <option value="diesel">Diesel</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                    Pasageri
                  </label>
                  <Select
                    className="px-3 py-2 transition-all duration-300"
                    value={filters.passengers}
                    onValueChange={(value) =>
                      handleFilterChange("passengers", value)
                    }
                  >
                    <option value="all">Toți</option>
                    <option value="1-4">1-4 persoane</option>
                    <option value="5-7">5-7 persoane</option>
                    <option value="8+">8+ persoane</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
                    Preț/zi
                  </label>
                  <Select
                    className="px-3 py-2 transition-all duration-300"
                    value={filters.priceRange}
                    onValueChange={(value) =>
                      handleFilterChange("priceRange", value)
                    }
                  >
                    <option value="all">Toate</option>
                    <option value="0-50">0-50€</option>
                    <option value="51-80">51-80€</option>
                    <option value="81+">81€+</option>
                  </Select>
                </div>
              </div>

              <button
                onClick={clearFilters}
                className="px-4 py-2 text-jade font-dm-sans font-semibold hover:bg-jade/10 rounded-lg transition-colors duration-300"
              >
                Resetează filtrele
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-gray-600 font-dm-sans">
            <span className="font-semibold text-berkeley">
              {filteredAndSortedCars.length}
            </span>{" "}
            mașini găsite
          </p>
        </div>

        {/* Cars Grid/List */}
        {filteredAndSortedCars.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                : "space-y-6"
            }
          >
            {filteredAndSortedCars.map((car, index) => (
              <div
                key={car.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CarCard car={car} isListView={viewMode === "list"} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Filter className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-poppins font-semibold text-berkeley mb-4">
              Nu am găsit mașini
            </h3>
            <p className="text-gray-600 font-dm-sans mb-6 max-w-md mx-auto">
              Încearcă să modifici filtrele sau să cauți altceva.
            </p>
            <Button onClick={clearFilters} className="px-6 py-3">
              Resetează filtrele
            </Button>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-berkeley/5 to-jade/5 rounded-3xl p-8 lg:p-12 text-center">
          <h3 className="text-3xl font-poppins font-bold text-berkeley mb-4">
            Nu găsești mașina potrivită?
          </h3>
          <p className="text-xl font-dm-sans text-gray-600 mb-8 max-w-2xl mx-auto">
            Contactează-ne și te ajutăm să găsești soluția perfectă pentru
            călătoria ta.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/rezervare">
              <Button className="transform hover:scale-105 shadow-lg">
                Rezervă acum
              </Button>
            </Link>

            <a href="#contact">
              <Button
                variant="outline"
                className="border-berkeley text-berkeley hover:bg-berkeley hover:text-white"
              >
                Contactează-ne
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetPage;
