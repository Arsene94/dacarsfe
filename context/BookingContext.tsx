'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BookingData, BookingContextType } from '@/types/booking'

const defaultBooking: BookingData = {
    startDate: null,
    endDate: null,
    withDeposit: false,
    selectedCar: null,
}

const BookingContext = createContext<BookingContextType>({
    booking: defaultBooking,
    setBooking: () => {},
})

export const BookingProvider = ({ children }: { children: ReactNode }) => {
    const [booking, setBookingState] = useState<BookingData>(defaultBooking)

    // persist data to localStorage
    useEffect(() => {
        const stored = localStorage.getItem('booking')
        if (stored) {
            setBookingState(JSON.parse(stored))
        }
    }, [])

    const setBooking = (data: BookingData) => {
        localStorage.setItem('booking', JSON.stringify(data))
        setBookingState(data)
    }

    return (
        <BookingContext.Provider value={{ booking, setBooking }}>
            {children}
        </BookingContext.Provider>
    )
}

export const useBooking = () => useContext(BookingContext)
