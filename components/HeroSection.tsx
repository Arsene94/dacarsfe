"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";

type CarCategory = {
  id: number;
  name: string;
};

const HeroSection = () => {
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    location: "otopeni",
    car_type: "",
  });
  const [categories, setCategories] = useState<CarCategory[]>([]);
  const router = useRouter();

  const formatDate = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const startOfDay = (date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const minstart_date = formatDate(new Date());

  useEffect(() => {
    const now = new Date();
    const pickup = formatDate(now);
    const ret = formatDate(addDays(now, 1));
    setFormData((prev) => ({
      ...prev,
      start_date: pickup,
      end_date: ret,
    }));
  }, []);

  const minend_date = formData.start_date
    ? formatDate(startOfDay(addDays(new Date(formData.start_date), 1)))
    : formatDate(startOfDay(addDays(new Date(), 1)));

  useEffect(() => {
    if (!formData.start_date) return;
    const minReturn = startOfDay(addDays(new Date(formData.start_date), 1));
    setFormData((prev) => {
      if (
        !prev.end_date ||
        startOfDay(new Date(prev.end_date)) < minReturn
      ) {
        const current = prev.end_date ? new Date(prev.end_date) : new Date();
        const adjusted = new Date(minReturn);
        adjusted.setHours(current.getHours(), current.getMinutes());
        return { ...prev, end_date: formatDate(adjusted) };
      }
      return prev;
    });
  }, [formData.start_date]);

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

    const params = new URLSearchParams({
      start_date: formData.start_date,
      end_date: formData.end_date,
    });
    if (formData.car_type) {
      params.append("car_type", formData.car_type);
    }
    router.push(`/flota?${params.toString()}`);
  };

  return (
    <section className="relative bg-berkeley text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <picture className="relative block w-full h-full">
          <source
            media="(min-width: 640px)"
            srcSet="/images/bg-hero-1920x1080.webp"
          />
          <Image
            src="/images/bg-hero-mobile.webp"
            alt="Fundal aeroport"
            fill
            priority
            sizes="100vw"
            className="w-full h-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-berkeley/90 to-berkeley/70 z-10"></div>
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:pt-32">
        <div className="grid lg:grid-cols-1 gap-12 items-center">
          <div className="animate-slide-in-left">
            <div className="inline-flex items-center px-4 py-2 bg-jade/40 rounded-full mb-6">
              <Star className="h-4 w-4 text-white mr-2" />
              <span className="text-white font-dm-sans font-medium">
                Te ținem aproape de casă
              </span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-poppins font-bold leading-tight mb-6">
                Închiriere auto București - Otopeni{" "}
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

          {/*<div className="hidden sm:block animate-slide-in-right">*/}
          {/*  <div className="relative">*/}
          {/*    <div className="absolute -inset-4 bg-gradient-to-r from-jade/20 to-transparent rounded-2xl blur-2xl"></div>*/}
          {/*    <Image*/}
          {/*      src="https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=600"*/}
          {/*      alt="Mașină elegantă"*/}
          {/*      width={600}*/}
          {/*      height={400}*/}
          {/*      className="relative rounded-2xl shadow-2xl"*/}
          {/*      loading="lazy"*/}
          {/*    />*/}
          {/*  </div>*/}
          {/*</div>*/}
        </div>

        <div className="mt-5">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            <div className="space-y-2">
              <Label
                htmlFor="hero-pickup-date"
                className="text-sm font-medium font-['DM_Sans']"
              >
                Data ridicare
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="hero-pickup-date"
                  type="datetime-local"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  min={minstart_date}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="hero-return-date"
                className="text-sm font-medium font-['DM_Sans']"
              >
                Data returnare
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="hero-return-date"
                  type="datetime-local"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  min={minend_date}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="hero-location"
                className="text-sm font-medium font-['DM_Sans']"
              >
                Locația
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Select
                  id="hero-location"
                  className="pl-10 pr-4 text-black h-[3.3rem]"
                  value={formData.location}
                  onValueChange={handleSelectChange("location")}
                  placeholder="Alege locația"
                >
                  <option value="otopeni">Aeroport Otopeni</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="hero-car-type"
                className="text-sm font-medium font-['DM_Sans']"
              >
                Tip mașină
              </Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Select
                  id="hero-car-type"
                  className="pl-10 pr-4 text-black h-[3.3rem]"
                  value={formData.car_type}
                  onValueChange={handleSelectChange("car_type")}
                >
                    <option value="">Toate tipurile</option>
                    {categories?.map((category) => {
                        return (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        );
                    })}
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
