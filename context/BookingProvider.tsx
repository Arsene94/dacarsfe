"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import type { BookingData } from "@/types/booking";
import {
  BOOKING_STORAGE_KEY,
  BookingContext,
  defaultBooking,
  normalizeBooking,
} from "./booking-store";

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [booking, setBookingState] = useState<BookingData>(defaultBooking);

  useEffect(() => {
    const stored = localStorage.getItem(BOOKING_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setBookingState(normalizeBooking(parsed));
    } catch (error) {
      console.error("Nu am putut interpreta booking-ul din localStorage", error);
      setBookingState(defaultBooking);
    }
  }, []);

  const setBooking = (data: BookingData) => {
    const normalized = normalizeBooking(data);
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(normalized));
    setBookingState(normalized);
  };

  return (
    <BookingContext.Provider value={{ booking, setBooking }}>
      {children}
    </BookingContext.Provider>
  );
};
