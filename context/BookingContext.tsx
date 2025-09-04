'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type BookingData = {
    startDate: string | null,
    endDate: string | null,
    withDeposit: boolean | null,
    selectedCar: number | string | null
}

type BookingContextType = {
    booking: BookingData
    setBooking: (data: BookingData) => void
}

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
