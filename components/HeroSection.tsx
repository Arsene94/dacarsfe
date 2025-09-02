"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Shield,
  Star,
  Users,
} from "lucide-react";
import apiClient from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type CarCategory = {
  id: number;
  name: string;
};

const HeroSection = () => {
  const [formData, setFormData] = useState({
    pickupDate: "",
    returnDate: "",
    location: "",
    carType: "",
  });
  const [categories, setCategories] = useState<CarCategory[]>([]);

  useEffect(() => {
    const getCategories = async () => {
      const response = await apiClient.getCarCategories();

      setCategories(response);
    };

    getCategories();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Rezervare:", formData);
  };
  return (
    <section className="relative bg-berkeley text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-berkeley/90 to-berkeley/70 z-10"></div>
        <picture>
          <source
            srcSet="/images/bg-hero-1920x1080.webp"
            media="(min-width: 1920px)"
          />
          <source
            srcSet="/images/bg-hero-820x380.webp"
            media="(min-width: 820px)"
          />
          <source
            srcSet="/images/bg-hero-800x800.webp"
            media="(min-width: 800px)"
          />
          <source
            srcSet="/images/bg-hero-520x520.webp"
            media="(min-width: 520px) and (orientation: portrait)"
          />
          <source
            srcSet="/images/bg-hero-520x380.webp"
            media="(min-width: 520px) and (orientation: landscape)"
          />
          <source
            srcSet="/images/bg-hero-mobile.webp"
            media="(max-width: 519px)"
            type="image/svg+xml"
          />
          <img
            src="/images/bg-hero-mobile.webp"
            alt="Fundal aeroport"
            className="w-full h-full object-cover"
          />
        </picture>
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:pt-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-in-left">
            <div className="inline-flex items-center px-4 py-2 bg-jade/40 rounded-full mb-6">
              <Star className="h-4 w-4 text-white mr-2" />
              <span className="text-white font-dm-sans font-medium">
                Cel mai de încredere serviciu
              </span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-poppins font-bold leading-tight mb-6">
              Mașini oneste, pentru{" "}
              <span className="inline-flex items-center px-4 py-2 bg-white/40 rounded-full text-jade">români onești</span>
            </h1>

            <p className="text-xl lg:text-2xl font-dm-sans text-gray-200 mb-8 leading-relaxed">
              Predare în aeroport în sub 5 minute. <br />
              <span className="text-jadeLight font-semibold">
                Fără taxe ascunse.
              </span>
            </p>

            <div className="hidden sm:flex flex-col sm:flex-row gap-4 mb-8">
              <Link href="/rezervare" aria-label="Rezervă mașina">
                <Button
                  className="transform hover:scale-105 shadow-xl group"
                  aria-label="Rezervă mașina"
                >
                  Rezervă mașina
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>

              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                aria-label="Vezi flota"
              >
                Vezi flota
              </Button>
            </div>

            {/* Features */}
            <div className="hidden sm:grid sm:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <div className="bg-jade/20 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-jade" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-dm-sans font-semibold">Sub 5 min</p>
                  <p className="text-sm text-gray-300">Predare rapidă</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-jade/20 p-2 rounded-lg">
                  <Shield className="h-5 w-5 text-jade" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-dm-sans font-semibold">Fără taxe</p>
                  <p className="text-sm text-gray-300">Preț transparent</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-jade/20 p-2 rounded-lg">
                  <Star className="h-5 w-5 text-jade" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-dm-sans font-semibold">24/7</p>
                  <p className="text-sm text-gray-300">Disponibil non-stop</p>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden sm:block animate-slide-in-right">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-jade/20 to-transparent rounded-2xl blur-2xl"></div>
              <img
                src="https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Mașină elegantă"
                className="relative rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            <div className="space-y-2">
              <label
                htmlFor="hero-pickup-date"
                className="text-sm font-medium font-['DM_Sans']"
              >
                Data ridicare
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="hero-pickup-date"
                  type="date"
                  name="pickupDate"
                  value={formData.pickupDate}
                  onChange={handleInputChange}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="hero-return-date"
                className="text-sm font-medium font-['DM_Sans']"
              >
                Data returnare
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="hero-return-date"
                  type="date"
                  name="returnDate"
                  value={formData.returnDate}
                  onChange={handleInputChange}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="hero-location"
                className="text-sm font-medium font-['DM_Sans']"
              >
                Locația
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Select
                  id="hero-location"
                  className="pl-10 pr-4"
                  value={formData.location}
                  onValueChange={handleSelectChange("location")}
                  placeholder="Alege locația"
                >
                  <option value="otopeni">Aeroport Otopeni</option>
                  <option value="baneasa">Aeroport Băneasa</option>
                  <option value="bucuresti">București Centru</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="hero-car-type"
                className="text-sm font-medium font-['DM_Sans']"
              >
                Tip mașină
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Select
                  id="hero-car-type"
                  className="pl-10 pr-4"
                  value={formData.carType}
                  onValueChange={handleSelectChange("carType")}
                  placeholder="Toate tipurile"
                >
                  <option value="economy">Economic</option>
                  <option value="compact">Compact</option>
                  <option value="suv">SUV</option>
                  <option value="premium">Premium</option>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              className="px-6 py-3 self-end"
              aria-label="Caută mașini"
            >
              Caută mașini
            </Button>
          </form>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-20 h-20 bg-jade/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-20 left-10 w-32 h-32 bg-jade/5 rounded-full blur-2xl"></div>
    </section>
  );
};

export default HeroSection;
