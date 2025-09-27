"use client";

import { useContext } from "react";

import { BookingContext } from "./booking-store";

export const useBooking = () => useContext(BookingContext);
