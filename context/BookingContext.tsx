'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BookingData, BookingContextType, type BookingAppliedOffer } from '@/types/booking'

const defaultBooking: BookingData = {
    startDate: null,
    endDate: null,
    withDeposit: false,
    selectedCar: null,
    appliedOffers: [],
}

const toNullableString = (value: unknown): string | null => {
    if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.length > 0 ? trimmed : null
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        const normalized = String(value).trim()
        return normalized.length > 0 ? normalized : null
    }
    return null
}

const normalizeAppliedOffer = (value: unknown): BookingAppliedOffer | null => {
    if (!value || typeof value !== 'object') {
        return null
    }

    const source = value as Partial<BookingAppliedOffer> &
        Partial<{ offer_type?: unknown; offer_value?: unknown; discount_label?: unknown; title?: unknown }>

    const idCandidate = (source as { id?: unknown }).id
    const id = typeof idCandidate === 'number' ? idCandidate : Number(idCandidate)
    if (!Number.isFinite(id)) {
        return null
    }

    const title = toNullableString(source.title)
    if (!title) {
        return null
    }

    const kind = toNullableString((source as { kind?: unknown }).kind ?? source.offer_type) ?? undefined
    const offerValue = toNullableString((source as { value?: unknown }).value ?? source.offer_value) ?? undefined
    const badge = toNullableString((source as { badge?: unknown }).badge ?? source.discount_label) ?? undefined

    return {
        id,
        title,
        kind: kind ?? undefined,
        value: offerValue ?? undefined,
        badge: badge ?? undefined,
    }
}

const normalizeAppliedOffers = (value: unknown): BookingAppliedOffer[] => {
    if (!Array.isArray(value)) {
        return []
    }

    const normalized = value
        .map((entry) => normalizeAppliedOffer(entry))
        .filter((entry): entry is BookingAppliedOffer => entry !== null)

    if (normalized.length === 0) {
        return []
    }

    const unique = new Map<number, BookingAppliedOffer>()
    normalized.forEach((entry) => {
        if (!unique.has(entry.id)) {
            unique.set(entry.id, entry)
        }
    })

    return Array.from(unique.values())
}

const normalizeBooking = (value: unknown): BookingData => {
    if (!value || typeof value !== 'object') {
        return defaultBooking
    }

    const source = value as Partial<BookingData> & { appliedOffers?: unknown; applied_offers?: unknown }

    const withDepositValue =
        typeof source.withDeposit === 'boolean'
            ? source.withDeposit
            : source.withDeposit === null
                ? null
                : typeof source.withDeposit === 'number'
                    ? Boolean(source.withDeposit)
                    : defaultBooking.withDeposit

    return {
        startDate: typeof source.startDate === 'string' ? source.startDate : defaultBooking.startDate,
        endDate: typeof source.endDate === 'string' ? source.endDate : defaultBooking.endDate,
        withDeposit: withDepositValue,
        selectedCar: source.selectedCar ?? defaultBooking.selectedCar,
        appliedOffers: normalizeAppliedOffers(source.appliedOffers ?? source.applied_offers),
    }
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
            try {
                const parsed = JSON.parse(stored)
                setBookingState(normalizeBooking(parsed))
            } catch (error) {
                console.error('Nu am putut interpreta booking-ul din localStorage', error)
                setBookingState(defaultBooking)
            }
        }
    }, [])

    const setBooking = (data: BookingData) => {
        const normalized = normalizeBooking(data)
        localStorage.setItem('booking', JSON.stringify(normalized))
        setBookingState(normalized)
    }

    return (
        <BookingContext.Provider value={{ booking, setBooking }}>
            {children}
        </BookingContext.Provider>
    )
}

export const useBooking = () => useContext(BookingContext)
