"use client";

import React, {useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {useSearchParams} from "next/navigation";
import {Filter, Fuel, Search, Settings, SlidersHorizontal, Star, Users,} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Select} from "@/components/ui/select";
import {Label} from "@/components/ui/label";
import apiClient from "@/lib/api";

type ApiCar = {
  id: number;
  name?: string;
  rental_rate:  number | string;
  rental_rate_casco:  number | string;
  image_preview?: string | null;
  images?: Record<string, string>;
  avg_review?: number;
  number_of_seats: number;
  fuel?: { name?: string | null } | null;
  type?: { name?: string | null } | null;
  transmission?: { name?: string | null } | null;
  content?: string | null;
};

type Car = {
  id: number;
  name: string;
  type: string;
  image: string;
  price: number;
  rental_rate: string;
  rental_rate_casco: string;
  features: {
    passengers: number;
    transmission: string;
    fuel: string;
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
    // fallback: încearcă să-l stringify-uiască
    try {
        return parsePrice(String(raw));
    } catch {
        return 0;
    }
};

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
  const searchParams = useSearchParams();
  const initialPage = Number(searchParams.get("page")) || 1;
  const [cars, setCars] = useState<Car[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCars, setTotalCars] = useState(0);
  const [loading, setLoading] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const startDate = searchParams.get("start_date") || "";
  const endDate = searchParams.get("end_date") || "";
  const carTypeParam = searchParams.get("car_type") || "";
  const location = searchParams.get("location") || "";

  useEffect(() => {
    const fetchCars = async () => {
      const payload: any = {
        start_date: startDate,
        end_date: endDate,
        car_type: carTypeParam,
        location,
        page: currentPage,
        sortBy: sortBy
      };
      try {
        setLoading(true);
        const response = await apiClient.getCarsByDateCriteria(payload);
        const list = Array.isArray(response?.data)
          ? (response.data as ApiCar[])
          : [];
          const mapped: Car[] = list.map((c) => ({
              id: c.id,
              name: c.name ?? "Autovehicul",
              type: (c.type?.name ?? "—").trim(),
              image: toImageUrl(
                  c.image_preview || Object.values(c.images ?? {})[0] || null
              ),
              price: parsePrice(c.rental_rate ?? c.rental_rate_casco),
              rental_rate: String(c.rental_rate ?? ""),
              rental_rate_casco: String(c.rental_rate_casco ?? ""),
              features: {
                  passengers: Number(c.number_of_seats) || 0,
                  transmission: c.transmission?.name ?? "—",
                  fuel: c.fuel?.name ?? "—",
                  doors: 4,
                  luggage: 2,
              },
              rating: Number(c.avg_review ?? 0) || 0,
              description: c.content ?? "",
              specs: [],
          }));
        setCars((prev) => (currentPage === 1 ? mapped : [...prev, ...mapped]));
        setTotalCars(response?.total ?? mapped.length);
        setTotalPages(response?.last_page ?? 1);
      } catch (error) {
        console.error(error);
        setCars([]);
        setTotalCars(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };
    fetchCars();
  }, [startDate, endDate, carTypeParam, location, currentPage, sortBy]);

  const filteredAndSortedCars = useMemo(() => {
      return cars.filter((car) => {
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
  }, [cars, filters, sortBy, searchTerm]);

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
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && currentPage < totalPages && !loading) {
          setLoading(true);
          setCurrentPage((prev) => prev + 1);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [currentPage, totalPages, loading]);

  const CarCard = ({
    car,
    isListView = false,
  }: {
    car: Car;
    isListView?: boolean;
  }) => (
    <div
      className={`bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100 ${
        isListView ? "flex flex-col md:flex-row" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden ${
          isListView ? "md:w-1/3 h-48 md:h-full" : "h-48"
        }`}
      >
        <Image
          src={car.image}
          alt={car.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
          sizes={isListView ? "(max-width: 768px) 100vw, 33vw" : "100vw"}
        />
        <div className="absolute top-4 left-4 bg-jade text-white px-3 py-1 rounded-full text-sm font-dm-sans font-semibold">
          {car.type}
        </div>
        {/*<div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center space-x-1">*/}
        {/*  <Star className="h-4 w-4 text-yellow-400 fill-current" />*/}
        {/*  <span className="text-sm font-dm-sans font-semibold text-berkeley">*/}
        {/*    {car.rating}*/}
        {/*  </span>*/}
        {/*</div>*/}
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


              <>
                  <div className="flex items-center justify-between mb-5">
                      <div className="me-1">
                          <span className="text-jade font-bold font-dm-sans">Fără garanție{" "}</span>
                          <span className="text-2xl font-poppins font-bold text-jade">
               {car.rental_rate_casco}€
            </span>
                          <span className="text-jade font-bold font-dm-sans">/zi</span>
                      </div>

                      <Link
                          href="/rezervare"
                          className="px-2 py-2 text-xs bg-jade text-white font-dm-sans font-semibold rounded-lg hover:bg-jade/90 transition-colors duration-300"
                          aria-label="Rezervă"
                      >
                          Rezervă fără garanție
                      </Link>
                  </div>

                  <div className="flex items-center justify-between">
                      <div className="me-3">
                          <span className="text-gray-600 font-dm-sans">Cu garanție{" "}</span>
                          <span className="text-2xl font-poppins font-bold text-berkeley">
               {car.rental_rate}€
            </span>
                          <span className="text-gray-600 font-dm-sans">/zi</span>
                      </div>

                      <Link
                          href="/rezervare"
                          className="px-4 py-2 text-xs border border-jade  text-jade font-dm-sans font-semibold rounded-lg hover:bg-jade/90 hover:text-white transition-colors duration-300"
                          aria-label="Rezervă"
                      >
                          Rezervă cu garanție
                      </Link>
                  </div>
              </>

      </div>
    </div>
  );

  return (
    <>
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
          <div className="h-12 w-12 border-4 border-jade border-t-transparent rounded-full animate-spin" />
        </div>
      )}
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
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Caută mașină..."
                aria-label="Caută mașină"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
              />
            </div>

            {/* View Mode and Sort */}
            <div className="flex items-center space-x-4">
              {/*<div className="flex items-center space-x-2">*/}
              {/*  <button*/}
              {/*    onClick={() => setViewMode("grid")}*/}
              {/*    className={`p-2 rounded-lg transition-colors duration-300 ${*/}
              {/*      viewMode === "grid"*/}
              {/*        ? "bg-jade text-white"*/}
              {/*        : "bg-gray-100 text-gray-600 hover:bg-gray-200"*/}
              {/*    }`}*/}
              {/*    aria-label="Afișare grilă"*/}
              {/*  >*/}
              {/*    <Grid className="h-5 w-5" />*/}
              {/*  </button>*/}
              {/*  <button*/}
              {/*    onClick={() => setViewMode("list")}*/}
              {/*    className={`p-2 rounded-lg transition-colors duration-300 ${*/}
              {/*      viewMode === "list"*/}
              {/*        ? "bg-jade text-white"*/}
              {/*        : "bg-gray-100 text-gray-600 hover:bg-gray-200"*/}
              {/*    }`}*/}
              {/*    aria-label="Afișare listă"*/}
              {/*  >*/}
              {/*    <List className="h-5 w-5" />*/}
              {/*  </button>*/}
              {/*</div>*/}

              <Select
                className="w-auto px-4 py-2 transition-all duration-300"
                value={sortBy}
                onValueChange={setSortBy}
                aria-label="Sortează mașinile"
              >
                <option value="cheapest">Preț crescător</option>
                <option value="most_expensive">Preț descrescător</option>
              </Select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-300 ${
                  showFilters
                    ? "bg-jade text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                aria-label="Comută filtrele"
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
                  <Label
                    htmlFor="filter-type"
                    className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                  >
                    Tip mașină
                  </Label>
                  <Select
                    id="filter-type"
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
                  <Label
                    htmlFor="filter-transmission"
                    className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                  >
                    Transmisie
                  </Label>
                  <Select
                    id="filter-transmission"
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
                  <Label
                    htmlFor="filter-fuel"
                    className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                  >
                    Combustibil
                  </Label>
                  <Select
                    id="filter-fuel"
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
                  <Label
                    htmlFor="filter-passengers"
                    className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                  >
                    Pasageri
                  </Label>
                  <Select
                    id="filter-passengers"
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
                  <Label
                    htmlFor="filter-price"
                    className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                  >
                    Preț/zi
                  </Label>
                  <Select
                    id="filter-price"
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
                aria-label="Resetează filtrele"
              >
                Resetează filtrele
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div
          id="results-section"
          className="flex items-center mb-8"
        >
          <p className="text-gray-600 font-dm-sans">
            <span className="font-semibold text-berkeley">{totalCars}</span>{" "}
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
                key={index}
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
            <Button
              onClick={clearFilters}
              className="px-6 py-3"
              aria-label="Resetează filtrele"
            >
              Resetează filtrele
            </Button>
          </div>
        )}

        <div ref={loadMoreRef} className="h-1" />

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
            <Link href="/rezervare" aria-label="Rezervă acum">
              <Button
                className="transform hover:scale-105 shadow-lg"
                aria-label="Rezervă acum"
              >
                Rezervă acum
              </Button>
            </Link>

            <a href="#contact" aria-label="Contactează-ne">
              <Button
                variant="outline"
                className="border-berkeley text-berkeley hover:bg-berkeley hover:text-white"
                aria-label="Contactează-ne"
              >
                Contactează-ne
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  </>
  );
};

export default FleetPage;
