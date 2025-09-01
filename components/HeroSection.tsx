"use client";

import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {ArrowRight, Calendar, Clock, MapPin, Shield, Star, Users} from 'lucide-react';
import apiClient from "@/lib/api";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';

type CarCategory = {
    id: number;
    name: string;
}

const HeroSection = () => {
    const [formData, setFormData] = useState({
        pickupDate: '',
        returnDate: '',
        location: '',
        carType: ''
    });
    const [categories, setCategories] = useState<CarCategory[]>([]);

    useEffect(() => {
        const getCategories = async () => {
            const response = await apiClient.getCarCategories();

            setCategories(response);
        }

        getCategories();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSelectChange = (name: string) => (value: string) => {
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Rezervare:', formData);
    };
  return (
    <section className="relative bg-berkeley text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-berkeley/90 to-berkeley/70 z-10"></div>
        <img
          src="https://images.pexels.com/photos/2816458/pexels-photo-2816458.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop"
          alt="Aeroport background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:pt-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-in-left">
            <div className="inline-flex items-center px-4 py-2 bg-jade/20 rounded-full mb-6">
              <Star className="h-4 w-4 text-jade mr-2" />
              <span className="text-jade font-dm-sans font-medium">Cel mai de încredere serviciu</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-poppins font-bold leading-tight mb-6">
              Mașini oneste, pentru <span className="text-jade">români onești</span>
            </h1>

            <p className="text-xl lg:text-2xl font-dm-sans text-gray-200 mb-8 leading-relaxed">
              Predare în aeroport în sub 5 minute. <br />
              <span className="text-jade font-semibold">Fără taxe ascunse.</span>
            </p>

            <div className="hidden sm:flex flex-col sm:flex-row gap-4 mb-8">
              <Link href="/rezervare">
                <Button className="transform hover:scale-105 shadow-xl group">
                  Rezervă mașina
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>

              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
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
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                      <label className="text-sm font-medium font-['DM_Sans']">Data ridicare</label>
                      <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                              type="date"
                              name="pickupDate"
                              value={formData.pickupDate}
                              onChange={handleInputChange}
                              className="pl-10"
                          />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-medium font-['DM_Sans']">Data returnare</label>
                      <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                              type="date"
                              name="returnDate"
                              value={formData.returnDate}
                              onChange={handleInputChange}
                              className="pl-10"
                          />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-medium font-['DM_Sans']">Locația</label>
                      <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Select
                              value={formData.location}
                              onValueChange={handleSelectChange('location')}
                          >
                              <SelectTrigger className="pl-10 pr-4">
                                  <SelectValue placeholder="Alege locația" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="otopeni">Aeroport Otopeni</SelectItem>
                                  <SelectItem value="baneasa">Aeroport Băneasa</SelectItem>
                                  <SelectItem value="bucuresti">București Centru</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-medium font-['DM_Sans']">Tip mașină</label>
                      <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Select
                              value={formData.carType}
                              onValueChange={handleSelectChange('carType')}
                          >
                              <SelectTrigger className="pl-10 pr-4">
                                  <SelectValue placeholder="Toate tipurile" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="economy">Economic</SelectItem>
                                  <SelectItem value="compact">Compact</SelectItem>
                                  <SelectItem value="suv">SUV</SelectItem>
                                  <SelectItem value="premium">Premium</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>

                    <Button
                        type="submit"
                        className="bg-[#38B275] hover:bg-[#32a066] px-6 py-3 self-end"
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
