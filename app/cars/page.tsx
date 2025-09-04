"use client";

import React, {useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {
  Filter,
  Fuel,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Select} from "@/components/ui/select";
import {Label} from "@/components/ui/label";
import apiClient from "@/lib/api";
import {useBooking} from "@/context/BookingContext";

type ApiCar = {
  id: number;
  name?: string;
  rental_rate: number | string;
  rental_rate_casco:  number | string;
  image_preview?: string | null;
  images?: Record<string, string>;
  avg_review?: number;
  number_of_seats: number;
  fuel?: { id?: number; name?: string | null } | null;
  type?: { id?: number; name?: string | null } | null;
  transmission?: { id?: number; name?: string | null } | null;
  content?: string | null;
  days: number;
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

type CarCategory = {
    id: number;
    name: string;
}

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState(() => ({
    car_type: searchParams.get("car_type") || "all",
    type: searchParams.get("type") || "all",
    transmission: searchParams.get("transmission") || "all",
    fuel: searchParams.get("fuel") || "all",
    passengers: searchParams.get("passengers") || "all",
    priceRange: searchParams.get("priceRange") || "all",
  }));
  const { setBooking } = useBooking();

  const [sortBy, setSortBy] = useState("cheapest");
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const initialPage = Number(searchParams.get("page")) || 1;
  const [cars, setCars] = useState<Car[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCars, setTotalCars] = useState(0);
  const [loading, setLoading] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [categories, setCategories] = useState<CarCategory[]>();

  const filterOptions = useMemo(() => {
    const types = new Map<number, string>();
    const transmissions = new Map<number, string>();
    const fuels = new Map<number, string>();
    const passengers = new Set<number>();

    cars.forEach((car) => {
      if (car.typeId && car.type && car.type !== "—") types.set(car.typeId, car.type);
      if (car.features.transmissionId && car.features.transmission && car.features.transmission !== "—")
        transmissions.set(car.features.transmissionId, car.features.transmission);
      if (car.features.fuelId && car.features.fuel && car.features.fuel !== "—")
        fuels.set(car.features.fuelId, car.features.fuel);
      if (car.features.passengers) passengers.add(car.features.passengers);
    });

    return {
      types: Array.from(types, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      transmissions: Array.from(transmissions, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      fuels: Array.from(fuels, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      passengers: Array.from(passengers).sort((a, b) => a - b),
    };
  }, [cars]);

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
        sort_by: sortBy,
      };
      if (filters.car_type !== "all") payload.car_type = Number(filters.car_type);
      if (filters.type !== "all") payload.vehicle_type = Number(filters.type);
      if (filters.transmission !== "all") payload.transmission = Number(filters.transmission);
      if (filters.fuel !== "all") payload.fuel_type = Number(filters.fuel);
      if (filters.passengers !== "all") payload.seats = Number(filters.passengers);
      if (filters.priceRange !== "all") payload.price_range = filters.priceRange;
      if (searchTerm) payload.search = searchTerm;
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
          typeId: c.type?.id ?? null,
          image: toImageUrl(
            c.image_preview || Object.values(c.images ?? {})[0] || null
          ),
          price: parsePrice(Math.round(Number(c.rental_rate)) ?? Math.round(Number(c.rental_rate_casco))),
          rental_rate: String(Math.round(Number(c.rental_rate)) ?? ""),
          rental_rate_casco: String(Math.round(Number(c.rental_rate_casco)) ?? ""),
          days: c.days,
          total_deposit: String(c.total_deposit),
          total_without_deposit: String(c.total_without_deposit),
          features: {
            passengers: Number(c.number_of_seats) || 0,
            transmission: c.transmission?.name ?? "—",
            transmissionId: c.transmission?.id ?? null,
            fuel: c.fuel?.name ?? "—",
            fuelId: c.fuel?.id ?? null,
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
  }, [startDate, endDate, carTypeParam, location, currentPage, sortBy, filters, searchTerm]);

    useEffect(() => {
        const getCategories = async () => {
            const res = await apiClient.getCarCategories();

            const obj: Record<string, string> = (res?.data ?? res) as Record<string, string>;

            const cat: CarCategory[] = Object.entries(obj)
                .map(([id, name]) => ({ id: Number(id), name: String(name) }))
                .sort((a, b) => a.id - b.id);

            setCategories(cat);
        };

        getCategories();
    }, []);

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      car_type: "all",
      type: "all",
      transmission: "all",
      fuel: "all",
      passengers: "all",
      priceRange: "all",
    });
    setSearchTerm("");
    setCurrentPage(1);
  };

  type ActiveFilter = { key: string; label: string };

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const active: ActiveFilter[] = [];

    if (filters.car_type !== "all") {
      const label = categories?.find((c) => String(c.id) === filters.car_type)?.name;
      if (label) active.push({ key: "car_type", label });
    }
    if (filters.type !== "all") {
      const label = filterOptions.types.find((t) => String(t.id) === filters.type)?.name;
      if (label) active.push({ key: "type", label });
    }
    if (filters.transmission !== "all") {
      const label = filterOptions.transmissions.find(
        (t) => String(t.id) === filters.transmission
      )?.name;
      if (label) active.push({ key: "transmission", label });
    }
    if (filters.fuel !== "all") {
      const label = filterOptions.fuels.find((f) => String(f.id) === filters.fuel)?.name;
      if (label) active.push({ key: "fuel", label });
    }
    if (filters.passengers !== "all") {
      active.push({ key: "passengers", label: `${filters.passengers} persoane` });
    }
    if (filters.priceRange !== "all") {
      active.push({ key: "priceRange", label: String(filters.priceRange) });
    }

    return active;
  }, [filters, categories, filterOptions]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(filters).forEach(([key, value]) => {
      if (value === "all") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [filters, router, pathname]);
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

  const handleBooking = (withDeposit: boolean, carId: number | string) => {
      if (startDate && endDate) {
          setBooking({
              startDate: startDate,
              endDate: endDate,
              withDeposit: withDeposit,
              selectedCar: carId,
          });

          router.push('/checkout');
      } else {
          router.push('/');
      }

  }

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

            {/*{isListView && (*/}
            {/*  <div className="text-sm text-gray-600 font-dm-sans">*/}
            {/*    <span className="font-semibold">{car.features.doors} uși</span>{" "}*/}
            {/*    •{" "}*/}
            {/*    <span className="font-semibold">*/}
            {/*      {car.features.luggage} bagaje*/}
            {/*    </span>*/}
            {/*  </div>*/}
            {/*)}*/}
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
                          {startDate && endDate && (
                            <div>
                              <span className="text-jade font-bold font-dm-sans">x {car.days} zile = </span>
                              <span className="text-2xl font-poppins font-bold text-jade">
                                {car.total_without_deposit}€
                              </span>
                            </div>
                          )}
                      </div>

                      <Button
                          onClick={startDate && endDate ? () => handleBooking(false, car.id) : undefined}
                          className="px-2 py-2 h-10 w-[150px] text-center text-xs bg-jade text-white font-dm-sans font-semibold rounded-lg hover:bg-jade/90 transition-colors duration-300"
                          aria-label="Rezervă"
                      >
                          Rezervă fără garanție
                      </Button>
                  </div>

                  <div className="flex items-center justify-between">
                      <div className="me-3">
                          <span className="text-gray-600 font-dm-sans">Cu garanție{" "}</span>
                          <span className="text-2xl font-poppins font-bold text-berkeley">
               {car.rental_rate}€
            </span>
                          <span className="text-gray-600 font-dm-sans">/zi</span>
                          {startDate && endDate && (
                              <div>
                                  <span className="text-gray-600 font-bold font-dm-sans">x {car.days} zile = </span>
                                  <span className="text-2xl font-poppins font-bold text-berkeley">
                                {car.total_deposit}€
                              </span>
                              </div>
                          )}
                      </div>

                      <Button
                          onClick={startDate && endDate ? () => handleBooking(true, car.id) : undefined}
                          className="px-4 py-2 h-10 w-[150px] !bg-transparent  text-center text-xs border border-jade  !text-jade font-dm-sans font-semibold rounded-lg hover:!bg-jade/90 hover:!text-white transition-colors duration-300"
                          aria-label="Rezervă"
                      >
                          Rezervă cu garanție
                      </Button>
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
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
                onValueChange={(value) => {
                  setSortBy(value);
                  setCurrentPage(1);
                }}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                      <Label
                          htmlFor="filter-type"
                          className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2"
                      >
                          Categorie
                      </Label>
                      <Select
                          id="filter-car-type"
                          className="px-3 py-2 transition-all duration-300"
                          value={filters.car_type}
                          onValueChange={(value) => handleFilterChange("car_type", value)}
                      >
                          <option value="all">Toate</option>
                          {categories?.map((category) => (
                              <option key={category.id} value={String(category.id)}>
                                  {category.name}
                              </option>
                          ))}
                      </Select>
                  </div>

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
                    {filterOptions.types.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name}
                      </option>
                    ))}
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
                    {filterOptions.transmissions.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name}
                      </option>
                    ))}
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
                    {filterOptions.fuels.map((f) => (
                      <option key={f.id} value={String(f.id)}>
                        {f.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                  {activeFilters.map((f) => (
                      <span
                          key={f.key}
                          className="flex items-center px-3 py-1 bg-jade/10 text-jade text-sm font-dm-sans rounded-full"
                      >
                    {f.label}
                          <button
                              onClick={() => handleFilterChange(f.key, "all")}
                              className="ml-2 hover:text-berkeley"
                              aria-label={`Elimină filtrul ${f.label}`}
                          >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                  ))}
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-jade font-dm-sans font-semibold hover:bg-jade/10 rounded-lg transition-colors duration-300"
                  aria-label="Resetează filtrele"
                >
                  Resetează filtrele
                </button>
              </div>
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
        {cars.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                : "space-y-6"
            }
          >
            {cars.map((car, index) => (
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
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                onClick={clearFilters}
                className="px-6 py-3"
                aria-label="Resetează filtrele"
              >
                Resetează filtrele
              </Button>
              {activeFilters.map((f) => (
                <span
                  key={f.key}
                  className="flex items-center px-3 py-1 bg-jade/10 text-jade text-sm font-dm-sans rounded-full"
                >
                  {f.label}
                  <button
                    onClick={() => handleFilterChange(f.key, "all")}
                    className="ml-2 hover:text-berkeley"
                    aria-label={`Elimină filtrul ${f.label}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
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
            <Link href="/checkout" aria-label="Rezervă acum">
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
