"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Users, Fuel, Settings } from "lucide-react";
import apiClient from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Car {
  id: number;
  name: string;
  number_of_seats: number;
  price_per_day_deposit?: string;
  fuel?: { name?: string };
  type?: { name?: string };
  transmission?: { name?: string };
  image_preview?: string | null;
  thumbnail?: string | null;
}

const ITEMS_PER_PAGE = 6;

const FleetPage = () => {
  const searchParams = useSearchParams();
  const [cars, setCars] = useState<Car[]>([]);
  const [page, setPage] = useState(1);

  const start_date = searchParams.get("start_date");
  const end_date = searchParams.get("end_date");
  const car_type = searchParams.get("car_type") || "";

  useEffect(() => {
    const fetchCars = async () => {
      if (!start_date || !end_date) return;
      try {
        const payload = {
          start_date,
          end_date,
          location: "otopeni",
          car_type,
        };
        const response = await apiClient.getCarsByDateCriteria(payload);
        const items = Array.isArray(response) ? response : response?.data;
        setCars(Array.isArray(items) ? items : []);
        setPage(1);
      } catch (error) {
        console.error("Failed to load cars", error);
        setCars([]);
      }
    };
    fetchCars();
  }, [start_date, end_date, car_type]);

  const paginatedCars = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return cars.slice(start, start + ITEMS_PER_PAGE);
  }, [cars, page]);

  const pageCount = Math.ceil(cars.length / ITEMS_PER_PAGE);

  const getImage = (car: Car) =>
    car.image_preview || car.thumbnail || "/images/placeholder-car.svg";

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-poppins font-bold mb-8">Flota</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedCars.map((car) => (
          <div
            key={car.id}
            className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition"
          >
            <div className="relative h-48 w-full">
              <Image
                src={getImage(car)}
                alt={car.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <h2 className="text-xl font-semibold text-berkeley mb-2">
                {car.name}
              </h2>
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-jade" />
                  <span>{car.number_of_seats} persoane</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-jade" />
                  <span>{car.transmission?.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Fuel className="h-4 w-4 text-jade" />
                  <span>{car.fuel?.name}</span>
                </div>
              </div>
              <div className="font-dm-sans font-semibold">
                {car.price_per_day_deposit} / zi
              </div>
            </div>
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm font-dm-sans">
            Pagina {page} din {pageCount}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
            disabled={page === pageCount}
          >
            Următoarea
          </Button>
        </div>
      )}
    </div>
  );
};

export default FleetPage;

