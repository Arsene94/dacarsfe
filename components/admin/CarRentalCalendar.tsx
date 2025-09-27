"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Car as CarIcon, Plus, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookingForm from '@/components/admin/BookingForm';
import apiClient from '@/lib/api';
import { extractItem, extractList } from '@/lib/apiResponse';
import type { ApiCar } from '@/types/car';
import { createEmptyBookingForm, type AdminBookingResource, type AdminBookingFormValues } from '@/types/admin';

interface Car {
    id: string;
    model: string;
    license?: string;
    image?: string;
    transmission?: string;
    fuel?: string;
    year?: number;
    type?: string;
    color?: string;
}

interface Reservation {
    id: string;
    bookingNumber?: string;
    carId: string;
    startDate: Date;
    endDate: Date;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    status: 'confirmed' | 'pending' | 'completed';
    totalDays: number;
}

const ROMANIAN_LOCALE = 'ro-RO';
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.2;

const toNumericId = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const resolveServiceIds = (booking: AdminBookingResource): number[] => {
    const directIds = Array.isArray(booking.service_ids) ? booking.service_ids : [];
    const normalized = directIds
        .map((value) => toNumericId(value))
        .filter((value): value is number => value != null);

    if (normalized.length > 0) {
        return normalized;
    }

    if (!Array.isArray(booking.services)) {
        return [];
    }

    return booking.services
        .map((service) => toNumericId(service?.id ?? (service as { service_id?: unknown })?.service_id))
        .filter((value): value is number => value != null);
};

const parseOptionalNumber = (value: unknown): number | null => {
    if (value == null || value === '') return null;
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const normalized = Number(value.replace(/[^0-9.,-]/g, '').replace(',', '.'));
        return Number.isFinite(normalized) ? normalized : null;
    }
    return null;
};

const pickNonEmptyString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const pickLookupName = (value: unknown): string | undefined => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    if (value && typeof value === 'object' && 'name' in value) {
        return pickNonEmptyString((value as { name?: unknown }).name);
    }

    return undefined;
};

const toSafeString = (value: unknown, fallback = ''): string => {
    return pickNonEmptyString(value) ?? fallback;
};

const toBoolean = (value: unknown, defaultValue = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value !== 0 : defaultValue;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['1', 'true', 'da', 'yes'].includes(normalized)) return true;
        if (['0', 'false', 'nu', 'no'].includes(normalized)) return false;
    }
    return defaultValue;
};

const toOptionalId = (value: unknown): number | string | null => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const numeric = Number(trimmed);
        return Number.isFinite(numeric) ? numeric : trimmed;
    }
    return null;
};

const toNumberOrString = (value: unknown): number | string | null => {
    const numeric = parseOptionalNumber(value);
    if (numeric != null) {
        return numeric;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    return null;
};

const parseDateValue = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const isoLike = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
    const isoDate = new Date(isoLike);
    if (!Number.isNaN(isoDate.getTime())) {
        return isoDate;
    }

    const match = trimmed.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2})(?::(\d{2})(?::(\d{2}))?)?)?$/,
    );
    if (!match) return null;
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
    const parsed = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const capitalize = (value: string): string => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatWeekdayShort = (date: Date): string => {
    const formatted = date.toLocaleDateString(ROMANIAN_LOCALE, { weekday: 'short' });
    const cleaned = formatted.replace('.', '');
    return capitalize(cleaned);
};

const formatMonthText = (date: Date, options: Intl.DateTimeFormatOptions): string => {
    const formatted = date.toLocaleDateString(ROMANIAN_LOCALE, options);
    return capitalize(formatted);
};

interface Selection {
    type: 'car' | 'date' | 'reservation' | 'cell';
    carId?: string;
    date?: Date;
    reservationId?: string;
    cellKey?: string;
}

const BASE_ROW_HEIGHT = 64;  // Tailwind h-16
const LANE_HEIGHT = 34;
const ROW_VPAD = 8;
const BAR_VINSET = 4;
const BOOKINGS_SCROLL_THRESHOLD = 0.8;

const CarRentalCalendar: React.FC = () => {
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState<'month' | 'quarter' | 'year'>('year');
    const [zoomLevel, setZoomLevel] = useState(1);
    const [selectedItems, setSelectedItems] = useState<Selection[]>([]);

    const [bookingInfo, setBookingInfo] = useState<AdminBookingFormValues | null>(null);
    const [editPopupOpen, setEditPopupOpen] = useState(false);

    const [cars, setCars] = useState<Car[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);

    const [nextCarsPage, setNextCarsPage] = useState(1);
    const [hasMoreCars, setHasMoreCars] = useState(true);
    const loadingCarsRef = useRef(false);

    const [nextBookingsPage, setNextBookingsPage] = useState(2);
    const [hasMoreNextBookings, setHasMoreNextBookings] = useState(true);
    const [prevBookingsPage, setPrevBookingsPage] = useState(0);
    const [hasPrevBookings, setHasPrevBookings] = useState(false);
    const loadingBookingsRef = useRef(false);
    const loadedBookingPages = useRef<Set<number>>(new Set());
    const minBookingPage = useRef(1);
    const maxBookingPage = useRef(1);

    const [lastSelectedDate, setLastSelectedDate] = useState<Date | null>(null);
    const [dateDrag, setDateDrag] = useState<{ active: boolean; start: Date | null }>({ active: false, start: null });

    useEffect(() => {
        const onUp = () => setDateDrag((d) => (d.active ? { active: false, start: null } : d));
        window.addEventListener('mouseup', onUp);
        return () => window.removeEventListener('mouseup', onUp);
    }, []);

    const fetchCars = async (page: number) => {
        if (loadingCarsRef.current || (!hasMoreCars && page !== 1)) return;
        loadingCarsRef.current = true;
        try {
            const res = await apiClient.getCars({ page, perPage: 50 });
            const list = extractList<ApiCar>(res);
            const mapped = list
                .map<Car | null>((car) => {
                    if (!car) return null;
                    const rawSlug = (car as { slug?: unknown }).slug;
                    const id =
                        car.id != null
                            ? String(car.id)
                            : typeof rawSlug === 'string' && rawSlug.trim().length > 0
                                ? rawSlug
                                : null;
                    if (!id) return null;
                    const transmission =
                        typeof car.transmission === 'string'
                            ? car.transmission
                            : car.transmission?.name ?? (car as { transmission_name?: string }).transmission_name ?? '';
                    const fuel =
                        typeof car.fuel === 'string'
                            ? car.fuel
                            : car.fuel?.name ?? (car as { fuel_name?: string }).fuel_name ?? '';
                    const firstImage =
                        (Array.isArray(car.images_array) && car.images_array.find((value) => typeof value === 'string')) ||
                        car.image_preview ||
                        car.image ||
                        null;

                    return {
                        id,
                        model: car.name ?? '',
                        license: typeof car.license_plate === 'string' ? car.license_plate : '',
                        image: typeof firstImage === 'string' ? firstImage : '',
                        transmission,
                        fuel,
                        year: car.year ? Number(car.year) : undefined,
                        type: typeof car.type === 'string' ? car.type : car.type?.name ?? '',
                        color: typeof car.color === 'string' ? car.color : '',
                    };
                })
                .filter((car): car is Car => car !== null);
            setCars((prev) => (page === 1 ? mapped : [...prev, ...mapped]));
            if (mapped.length < 50) {
                setHasMoreCars(false);
            } else {
                setNextCarsPage(page + 1);
            }
        } catch (e) {
            console.error('Error fetching cars', e);
        } finally {
            loadingCarsRef.current = false;
        }
    };

    useEffect(() => {
        setCars([]);
        setNextCarsPage(1);
        setHasMoreCars(true);
        fetchCars(1);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchBookings = async (page: number, direction: 'next' | 'prev' = 'next') => {
        if (loadingBookingsRef.current) return;
        if (direction === 'next' && !hasMoreNextBookings) return;
        if (direction === 'prev' && (!hasPrevBookings || page < 1)) return;
        loadingBookingsRef.current = true;
        try {
            const params = {
                page,
                perPage: 200,
                status: 'reserved,completed',
                start_date: `${currentYear}-01-01`,
                end_date: `${currentYear}-12-31`,
            };
            const res = await apiClient.getBookings(params);
            const list = extractList<AdminBookingResource>(res);
            const mapped = list
                .map<Reservation | null>((booking) => {
                    if (!booking) return null;
                    const id =
                        booking.id != null
                            ? String(booking.id)
                            : booking.booking_number != null
                                ? String(booking.booking_number)
                                : null;
                    if (!id) return null;
                    const startDate =
                        parseDateValue(
                            booking.rental_start_date ??
                            (booking as { start_date?: unknown }).start_date ??
                            (booking as { rental_start?: unknown }).rental_start ??
                            (booking as { rental_start_at?: unknown }).rental_start_at,
                        );
                    const endDate =
                        parseDateValue(
                            booking.rental_end_date ??
                            (booking as { end_date?: unknown }).end_date ??
                            (booking as { rental_end?: unknown }).rental_end ??
                            (booking as { rental_end_at?: unknown }).rental_end_at,
                        );
                    if (!startDate || Number.isNaN(startDate.getTime()) || !endDate || Number.isNaN(endDate.getTime())) {
                        return null;
                    }

                    const status = booking.status === 'reserved'
                        ? 'confirmed'
                        : booking.status === 'completed'
                            ? 'completed'
                            : 'pending';

                    return {
                        id,
                        bookingNumber:
                            booking.booking_number != null
                                ? String(booking.booking_number)
                                : booking.bookingNumber != null
                                    ? String(booking.bookingNumber)
                                    : undefined,
                        carId: booking.car_id != null ? String(booking.car_id) : '',
                        startDate,
                        endDate,
                        customerName: booking.customer_name ?? '',
                        customerPhone: booking.customer_phone ?? '',
                        customerEmail: booking.customer_email ?? '',
                        status,
                        totalDays: Number(booking.days ?? 0),
                    };
                })
                .filter((reservation): reservation is Reservation => reservation !== null);
            setReservations((prev) =>
                direction === 'next' ? (page === 1 ? mapped : [...prev, ...mapped]) : [...mapped, ...prev]
            );
            loadedBookingPages.current.add(page);
            minBookingPage.current = Math.min(minBookingPage.current, page);
            maxBookingPage.current = Math.max(maxBookingPage.current, page);
            setPrevBookingsPage(minBookingPage.current - 1);
            setHasPrevBookings(minBookingPage.current > 1);
            setNextBookingsPage(maxBookingPage.current + 1);
            if (direction === 'next') {
                if (mapped.length < 200) {
                    setHasMoreNextBookings(false);
                }
            } else {
                if (mapped.length < 200 || page <= 1) {
                    setHasPrevBookings(false);
                }
            }
        } catch (e) {
            console.error('Error fetching bookings', e);
        } finally {
            loadingBookingsRef.current = false;
        }
    };

    useEffect(() => {
        setReservations([]);
        loadedBookingPages.current = new Set();
        minBookingPage.current = 1;
        maxBookingPage.current = 1;
        setNextBookingsPage(2);
        setHasMoreNextBookings(true);
        setPrevBookingsPage(0);
        setHasPrevBookings(false);
        fetchBookings(1);
    }, [currentYear]); // eslint-disable-line react-hooks/exhaustive-deps

    const reloadBookings = () => {
        setReservations([]);
        loadedBookingPages.current = new Set();
        minBookingPage.current = 1;
        maxBookingPage.current = 1;
        setNextBookingsPage(2);
        setHasMoreNextBookings(true);
        setPrevBookingsPage(0);
        setHasPrevBookings(false);
        fetchBookings(1);
    };

    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const monthHeaderRef = useRef<HTMLDivElement>(null);
    const dateHeaderRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef(false);

    const rowDragRef = useRef<{ down: boolean; selecting: boolean; startIdx: number; startClientX: number }>({
        down: false,
        selecting: false,
        startIdx: -1,
        startClientX: 0,
    });

    const maybeLoadMoreBookings = (el: HTMLDivElement) => {
        if (loadingBookingsRef.current) return;
        const rightRatio = (el.scrollLeft + el.clientWidth) / el.scrollWidth;
        const leftRatio = el.scrollLeft / el.scrollWidth;
        if (hasMoreNextBookings && rightRatio >= BOOKINGS_SCROLL_THRESHOLD) {
            fetchBookings(nextBookingsPage, 'next');
        } else if (hasPrevBookings && leftRatio <= 1 - BOOKINGS_SCROLL_THRESHOLD) {
            fetchBookings(prevBookingsPage, 'prev');
        }
    };

    const maybeLoadMoreCars = (el: HTMLDivElement) => {
        if (!hasMoreCars || loadingCarsRef.current) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
            fetchCars(nextCarsPage);
        }
    };

    const handleGlobalMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (!selectedItems.length) return;
        const target = e.target as HTMLElement;
        const insideSelected = target.closest('[data-selected="true"]');
        const keepSelection = target.closest('[data-keep-selection="true"]');
        if (insideSelected || keepSelection) return;
        setSelectedItems([]);
    };

    const reservationByCarDate = React.useMemo(() => {
        const m = new Map<string, Reservation>();
        for (const r of reservations) {
            const start = new Date(r.startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(r.endDate);     end.setHours(0, 0, 0, 0);
            for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                const key = `${r.carId}-${dt.toISOString().split('T')[0]}`;
                m.set(key, r);
            }
        }
        return m;
    }, [reservations]);

    const selectedDateKeys = React.useMemo(() => {
        const s = new Set<string>();
        selectedItems.forEach((it) => {
            if (it.type === 'date' && it.date) s.add(it.date.toISOString().split('T')[0]);
        });
        return s;
    }, [selectedItems]);

    const selectedCarIds = React.useMemo(
        () => new Set(selectedItems.filter(i => i.type === 'car').map(i => i.carId!)),
        [selectedItems]
    );
    const selectedReservationIds = React.useMemo(
        () => new Set(selectedItems.filter(i => i.type === 'reservation').map(i => i.reservationId!)),
        [selectedItems]
    );
    const selectedCellKeys = React.useMemo(
        () => new Set(selectedItems.filter(i => i.type === 'cell').map(i => i.cellKey!)),
        [selectedItems]
    );

    const generateDates = () => {
        const dates: Date[] = [];
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31);
        if (viewMode === 'year') {
            const current = new Date(startDate);
            while (current <= endDate) {
                dates.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }
        } else if (viewMode === 'quarter') {
            const current = new Date(startDate);
            while (current <= endDate) {
                dates.push(new Date(current));
                current.setDate(current.getDate() + 7);
            }
        } else {
            for (let month = 0; month < 12; month++) {
                dates.push(new Date(currentYear, month, 1));
            }
        }
        return dates;
    };

    const dates = generateDates();
    const dateKeys = React.useMemo(() => dates.map((d) => d.toISOString().split('T')[0]), [dates]);

    const indexByDateKey = React.useMemo(() => {
        const m = new Map<string, number>();
        dateKeys.forEach((k, i) => m.set(k, i));
        return m;
    }, [dateKeys]);

    const normalize = (d: Date) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
    };

    const findIndexForDate = (d: Date) => {
        const key = new Date(d).toISOString().split('T')[0];
        if (viewMode === 'year') {
            const idx = indexByDateKey.get(key);
            if (idx !== undefined) return idx;
        }
        for (let i = 0; i < dates.length; i++) {
            const start = new Date(dates[i]);
            const end = i < dates.length - 1 ? new Date(dates[i + 1]) : new Date(currentYear, 11, 31, 23, 59, 59, 999);
            if (new Date(d) >= start && new Date(d) < end) return i;
        }
        return -1;
    };

    const buildDateRange = (a: Date, b: Date) => {
        const ai = findIndexForDate(a);
        const bi = findIndexForDate(b);
        if (ai === -1 || bi === -1) return [];
        const [startIdx, endIdx] = ai <= bi ? [ai, bi] : [bi, ai];
        return dates.slice(startIdx, endIdx + 1);
    };

    const setDateSelection = (datesToSelect: Date[], append = false) => {
        const newItems = datesToSelect.map((d) => ({ type: 'date', date: d } as Selection));
        setSelectedItems((prev) => {
            const others = prev.filter((it) => it.type !== 'date');
            return append ? [...others, ...newItems] : [...others, ...newItems];
        });
        if (datesToSelect.length) setLastSelectedDate(datesToSelect[datesToSelect.length - 1]);
    };

    const getIndexFromRowEvent = (e: React.MouseEvent<HTMLElement>) => {
        const rowEl = e.currentTarget as HTMLElement;
        const rect = rowEl.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const scrollLeft = rightPanelRef.current?.scrollLeft ?? 0;
        let idx = Math.floor((localX + scrollLeft) / getCellWidth());
        if (idx < 0) idx = 0;
        if (idx > dates.length - 1) idx = dates.length - 1;
        return idx;
    };

    const handleScroll = (source: 'left' | 'right' | 'header') => (e: React.UIEvent<HTMLDivElement>) => {
        if (isScrolling.current) return;
        isScrolling.current = true;
        const sourceElement = e.currentTarget as HTMLDivElement;

        if (source === 'left' || source === 'right') {
            const targetElement = source === 'left' ? rightPanelRef.current : leftPanelRef.current;
            if (targetElement) {
                targetElement.scrollTop = sourceElement.scrollTop;
            }
            if (leftPanelRef.current) {
                maybeLoadMoreCars(leftPanelRef.current);
            }
        }

        if (source === 'right' || source === 'header') {
            const scrollLeft = sourceElement.scrollLeft;
            if (rightPanelRef.current && sourceElement !== rightPanelRef.current) {
                rightPanelRef.current.scrollLeft = scrollLeft;
            }
            if (monthHeaderRef.current && sourceElement !== monthHeaderRef.current) {
                monthHeaderRef.current.scrollLeft = scrollLeft;
            }
            if (dateHeaderRef.current && sourceElement !== dateHeaderRef.current) {
                dateHeaderRef.current.scrollLeft = scrollLeft;
            }
            if (rightPanelRef.current) {
                maybeLoadMoreBookings(rightPanelRef.current);
            }
        }

        requestAnimationFrame(() => {
            isScrolling.current = false;
        });
    };

    const handleCarSelect = (carId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        const isSelected = selectedItems.some((item) => item.type === 'car' && item.carId === carId);
        if (event.ctrlKey || event.metaKey) {
            setSelectedItems((prev) =>
                isSelected
                    ? prev.filter((item) => !(item.type === 'car' && item.carId === carId))
                    : [...prev, { type: 'car', carId } as Selection]
            );
        } else if (event.shiftKey) {
            const dates = selectedItems.filter((it) => it.type === 'date');
            setSelectedItems([...dates, { type: 'car', carId } as Selection]);
        } else {
            setSelectedItems([{ type: 'car', carId } as Selection]);
        }
    };

    const handleDateSelect = (date: Date, event: React.MouseEvent) => {
        event.stopPropagation();
        const isShift = event.shiftKey;
        const isCtrl = event.ctrlKey || event.metaKey;

        if (isShift && lastSelectedDate) {
            const range = buildDateRange(lastSelectedDate, date);
            setDateSelection(range, false);
            return;
        }

        if (isCtrl) {
            const dateKey = date.toISOString().split('T')[0];
            const already = selectedItems.some((it) => it.type === 'date' && it.date?.toISOString().split('T')[0] === dateKey);
            setSelectedItems((prev) => {
                const others = prev.filter((it) => it.type !== 'date');
                const currentDates = prev.filter((it) => it.type === 'date') as Selection[];
                if (already) {
                    return [...others, ...currentDates.filter((d) => d.date?.toISOString().split('T')[0] !== dateKey)];
                } else {
                    return [...others, ...currentDates, { type: 'date', date } as Selection];
                }
            });
            setLastSelectedDate(date);
            return;
        }

        setDateSelection([date], false);
    };

    const toLocalDateTimeInput = (iso?: string | null) => {
        if (!iso) return '';
        const date = new Date(iso);
        const tzOffset = date.getTimezoneOffset();
        const local = new Date(date.getTime() - tzOffset * 60000);
        return local.toISOString().slice(0, 16);
    };

    const handleReservationSelect = async (reservationId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        const isSelected = selectedItems.some((item) => item.type === 'reservation' && item.reservationId === reservationId);
        if (event.ctrlKey || event.metaKey) {
            setSelectedItems((prev) =>
                isSelected
                    ? prev.filter((item) => !(item.type === 'reservation' && item.reservationId === reservationId))
                    : [...prev, { type: 'reservation', reservationId } as Selection]
            );
            return;
        }
        setSelectedItems([{ type: 'reservation', reservationId } as Selection]);
        try {
            const res = await apiClient.getBookingInfo(reservationId);
            const info = extractItem(res);
            if (!info) {
                throw new Error('Rezervarea nu a putut fi încărcată.');
            }
            const carInfo = info.car ?? null;
            const baseForm = createEmptyBookingForm();
            const couponAmount = parseOptionalNumber(info.coupon_amount) ?? baseForm.coupon_amount;
            const totalServices = parseOptionalNumber(info.total_services) ?? baseForm.total_services;
            const subTotal =
                parseOptionalNumber(info.sub_total ?? (info as { subTotal?: unknown }).subTotal) ??
                baseForm.sub_total;
            const serviceIds = resolveServiceIds(info);
            const carId = toNumericId(info.car_id ?? carInfo?.id) ?? baseForm.car_id;
            const rentalStart = toLocalDateTimeInput(info.rental_start_date) || baseForm.rental_start_date;
            const rentalEnd = toLocalDateTimeInput(info.rental_end_date) || baseForm.rental_end_date;
            const pricePerDayCandidate =
                parseOptionalNumber(info.price_per_day) ?? parseOptionalNumber(info.original_price_per_day);
            const pricePerDay = pricePerDayCandidate ?? baseForm.price_per_day;
            const originalPricePerDay =
                parseOptionalNumber(info.original_price_per_day) ?? pricePerDayCandidate ?? baseForm.original_price_per_day;
            const basePrice = parseOptionalNumber(info.base_price) ?? pricePerDay;
            const basePriceCasco = parseOptionalNumber(info.base_price_casco) ?? pricePerDay;
            const total =
                parseOptionalNumber(info.total ?? info.total_price) ?? baseForm.total;
            const taxAmount = parseOptionalNumber(info.tax_amount) ?? (baseForm.tax_amount ?? 0);
            const advancePayment = parseOptionalNumber(info.advance_payment) ?? baseForm.advance_payment;
            const totalBeforeWheelPrize =
                parseOptionalNumber(
                    info.total_before_wheel_prize ??
                        (info as { totalBeforeWheelPrize?: unknown }).totalBeforeWheelPrize,
                ) ?? baseForm.total_before_wheel_prize;
            const wheelPrizeDiscount =
                parseOptionalNumber(info.wheel_prize_discount ?? info.wheel_prize?.discount_value) ??
                baseForm.wheel_prize_discount;
            const bookingId = toOptionalId(info.id ?? reservationId) ?? baseForm.id;
            const bookingNumber =
                toOptionalId(
                    info.booking_number ??
                        info.bookingNumber ??
                        info.id ??
                        reservationId,
                ) ?? baseForm.booking_number;
            const currencyRaw =
                (info as { currency_id?: unknown }).currency_id ??
                (info as { currencyId?: unknown }).currencyId;
            const currencyId = toOptionalId(currencyRaw) ?? baseForm.currency_id;
            const customerId = toNumberOrString(info.customer_id ?? info.customer?.id) ?? baseForm.customer_id;
            const customerAge = toNumberOrString(info.customer_age ?? info.customer?.age) ?? baseForm.customer_age;
            const customerName =
                pickNonEmptyString(info.customer_name) ??
                pickNonEmptyString(info.customer?.name) ??
                baseForm.customer_name;
            const customerPhone =
                pickNonEmptyString(info.customer_phone) ??
                pickNonEmptyString(info.customer?.phone) ??
                baseForm.customer_phone;
            const customerEmail =
                pickNonEmptyString(info.customer_email) ??
                pickNonEmptyString(info.customer?.email) ??
                baseForm.customer_email;
            const carName =
                pickNonEmptyString(info.car_name) ??
                pickNonEmptyString(carInfo?.name) ??
                baseForm.car_name;
            const carImage =
                pickNonEmptyString(info.car_image) ??
                pickNonEmptyString(info.image_preview) ??
                pickNonEmptyString(carInfo?.image_preview) ??
                pickNonEmptyString(carInfo?.image) ??
                baseForm.car_image;
            const carLicensePlate =
                pickNonEmptyString(info.car_license_plate) ??
                pickNonEmptyString((info as { license_plate?: unknown }).license_plate) ??
                pickNonEmptyString(carInfo?.license_plate) ??
                baseForm.car_license_plate;
            const carTransmission =
                pickNonEmptyString(info.car_transmission) ??
                pickNonEmptyString((info as { transmission_name?: unknown }).transmission_name) ??
                pickLookupName(carInfo?.transmission) ??
                baseForm.car_transmission;
            const carFuel =
                pickNonEmptyString(info.car_fuel) ??
                pickNonEmptyString((info as { fuel_name?: unknown }).fuel_name) ??
                pickLookupName(carInfo?.fuel) ??
                baseForm.car_fuel;
            const carDeposit =
                parseOptionalNumber(info.car_deposit ?? carInfo?.deposit) ?? baseForm.car_deposit;
            const couponType =
                pickNonEmptyString(info.coupon_type) ??
                pickNonEmptyString((info as { discount_type?: unknown }).discount_type) ??
                baseForm.coupon_type;
            const couponCode = toSafeString(info.coupon_code, baseForm.coupon_code);
            const days = parseOptionalNumber(info.days) ?? baseForm.days;
            const status = toSafeString(info.status, baseForm.status);
            const note =
                pickNonEmptyString(info.note) ??
                pickNonEmptyString((info as { notes?: unknown }).notes) ??
                baseForm.note;
            const locationValue =
                pickNonEmptyString((info as { location?: unknown }).location) ?? baseForm.location ?? '';
            const discountApplied =
                parseOptionalNumber((info as { discount?: unknown }).discount) ??
                baseForm.discount_applied ??
                null;
            const services = Array.isArray(info.services) ? info.services : baseForm.services;
            const wheelPrize = info.wheel_prize ?? baseForm.wheel_prize;
            const formatted: AdminBookingFormValues = {
                ...baseForm,
                id: bookingId,
                booking_number: bookingNumber,
                rental_start_date: rentalStart,
                rental_end_date: rentalEnd,
                with_deposit: toBoolean(info.with_deposit, baseForm.with_deposit),
                service_ids: serviceIds,
                services,
                total_services: totalServices,
                coupon_type: couponType,
                coupon_amount: couponAmount,
                coupon_code: couponCode,
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_email: customerEmail,
                customer_id: customerId,
                customer_age: customerAge,
                car_id: carId,
                car_name: carName,
                car_image: carImage,
                car_license_plate: carLicensePlate,
                car_transmission: carTransmission,
                car_fuel: carFuel,
                car_deposit: carDeposit,
                sub_total: subTotal,
                total,
                price_per_day: pricePerDay,
                original_price_per_day: originalPricePerDay,
                base_price: basePrice,
                base_price_casco: basePriceCasco,
                days,
                keep_old_price: toBoolean(info.keep_old_price, baseForm.keep_old_price),
                send_email: toBoolean(info.send_email, baseForm.send_email),
                advance_payment: advancePayment,
                status,
                note,
                currency_id: currencyId,
                total_before_wheel_prize: totalBeforeWheelPrize,
                wheel_prize_discount: wheelPrizeDiscount,
                wheel_prize: wheelPrize,
                discount_applied: discountApplied,
                location: locationValue,
                tax_amount: taxAmount,
            };
            setBookingInfo(formatted);
            setEditPopupOpen(true);
        } catch (err) {
            console.error('Error fetching booking info', err);
        }
    };

    const handleCellSelect = (carId: string, date: Date, event: React.MouseEvent) => {
        event.stopPropagation();
        const cellKey = `${carId}-${date.toISOString().split('T')[0]}`;
        const isSelected = selectedItems.some((item) => item.type === 'cell' && item.cellKey === cellKey);
        const newSel: Selection = { type: 'cell', cellKey, carId, date };
        if (event.ctrlKey || event.metaKey) {
            setSelectedItems((prev) =>
                isSelected
                    ? prev.filter((item) => !(item.type === 'cell' && item.cellKey === cellKey))
                    : [...prev, newSel]
            );
        } else {
            setSelectedItems([{ type: 'car', carId } as Selection, { type: 'date', date } as Selection, newSel]);
        }
    };

    const clearSelection = () => setSelectedItems([]);

    const navigateYear = (direction: 'prev' | 'next') => setCurrentYear((prev) => prev + (direction === 'next' ? 1 : -1));
    const goToCurrentYear = () => setCurrentYear(new Date().getFullYear());

    const formatDateInput = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T10:00`;
    };

    const handleAddReservation = () => {
        const dateSelections = selectedItems
            .filter((it) => it.type === 'date' && it.date)
            .map((it) => it.date as Date)
            .sort((a, b) => a.getTime() - b.getTime());
        const start = dateSelections[0];
        const end = dateSelections[dateSelections.length - 1];
        const selectedCarId = selectedItems.find((it) => it.type === 'car')?.carId;
        const car = cars.find((c) => c.id === selectedCarId);
        const baseForm = createEmptyBookingForm();
        const normalizedCarId = selectedCarId ? toNumericId(selectedCarId) : null;
        setBookingInfo({
            ...baseForm,
            rental_start_date: start ? formatDateInput(start) : baseForm.rental_start_date,
            rental_end_date: end ? formatDateInput(end) : baseForm.rental_end_date,
            car_id: normalizedCarId ?? baseForm.car_id,
            car_name: car?.model ?? baseForm.car_name,
            car_image: car?.image ?? baseForm.car_image,
            car_license_plate: car?.license ?? baseForm.car_license_plate,
            car_transmission: car?.transmission ?? baseForm.car_transmission,
            car_fuel: car?.fuel ?? baseForm.car_fuel,
        });
        setEditPopupOpen(true);
    };

    const formatDate = (date: Date) => {
        if (viewMode === 'year') return formatMonthText(date, { month: 'short', day: 'numeric' });
        if (viewMode === 'quarter') return `S${Math.ceil(date.getDate() / 7)}`;
        return formatMonthText(date, { month: 'short' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-blue-500';
            case 'pending':   return 'bg-amber-500';
            case 'completed': return 'bg-green-500';
            default:          return 'bg-gray-500';
        }
    };

    const getNameFontSize = (name: string, width: number) => {
        const approx = width / (name.length * 0.6);
        const clamped = Math.max(8, Math.min(14, approx));
        return `${clamped}px`;
    };

    const isCarSelected = (carId: string) => selectedCarIds.has(carId);
    const isDateSelected = (date: Date) => selectedDateKeys.has(date.toISOString().split('T')[0]);
    const isReservationSelected = (reservationId: string) => selectedReservationIds.has(reservationId);
    const isCellSelected = (carId: string, date: Date) => selectedCellKeys.has(`${carId}-${date.toISOString().split('T')[0]}`);

    const getCellWidth = React.useCallback(() => {
        const baseWidth = viewMode === 'year' ? 40 : viewMode === 'quarter' ? 80 : 120;
        const scaled = baseWidth * zoomLevel;
        return Math.max(24, Math.min(360, scaled));
    }, [viewMode, zoomLevel]);

    const changeZoom = (delta: number) => {
        setZoomLevel((prev) => {
            const next = Number((prev + delta).toFixed(2));
            const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
            return clamped;
        });
    };

    const handleZoomIn = () => changeZoom(ZOOM_STEP);
    const handleZoomOut = () => changeZoom(-ZOOM_STEP);

    const getHeaderHeight = () => (viewMode === 'year' ? 'h-20' : 'h-16');

    const getMonthGroups = () => {
        const months = [] as { name: string; daysCount: number }[];
        for (let month = 0; month < 12; month++) {
            const monthStart = new Date(currentYear, month, 1);
            const monthEnd = new Date(currentYear, month + 1, 0);
            const daysInMonth = monthEnd.getDate();
            months.push({
                name: formatMonthText(monthStart, { month: 'long' }),
                daysCount: viewMode === 'year' ? daysInMonth : viewMode === 'quarter' ? Math.ceil(daysInMonth / 7) : 1,
            });
        }
        return months;
    };

    const cellWidth = getCellWidth();
    const totalWidth = dates.length * cellWidth;
    const zoomPercentage = Math.round(zoomLevel * 100);
    const canZoomIn = zoomLevel < MAX_ZOOM - 0.01;
    const canZoomOut = zoomLevel > MIN_ZOOM + 0.01;

    const weekBgStyle = React.useMemo(() => {
        const A = '#fdecc8';
        const B = '#cfe8e3';
        const stripePx = viewMode === 'year' ? cellWidth * 7 : viewMode === 'quarter' ? cellWidth * 1 : 0;
        const jan1 = new Date(currentYear, 0, 1);
        const mondayIndex = (jan1.getDay() + 6) % 7;
        const offsetPx = viewMode === 'year' ? -mondayIndex * cellWidth : 0;
        if (stripePx <= 0) return {} as React.CSSProperties;
        const gradient = `repeating-linear-gradient(
      90deg,
      ${A}, ${A} ${stripePx}px,
      ${B} ${stripePx}px, ${B} ${stripePx * 2}px
    )`;
        return { backgroundImage: gradient, backgroundPositionX: `${offsetPx}px`, backgroundRepeat: 'repeat' } as React.CSSProperties;
    }, [cellWidth, currentYear, viewMode]);

    type LaneInfo = { laneByResId: Map<string, number>; laneCount: number };
    const laneLayoutByCar = React.useMemo(() => {
        const localFindIdx = (d: Date) => {
            const key = new Date(d).toISOString().split('T')[0];
            if (viewMode === 'year') {
                const idx = indexByDateKey.get(key);
                if (idx !== undefined) return idx;
            }
            for (let i = 0; i < dates.length; i++) {
                const start = new Date(dates[i]);
                const end = i < dates.length - 1 ? new Date(dates[i + 1]) : new Date(currentYear, 11, 31, 23, 59, 59, 999);
                if (new Date(d) >= start && new Date(d) < end) return i;
            }
            return -1;
        };

        const map = new Map<string, LaneInfo>();
        cars.forEach((car) => {
            const items = reservations
                .filter((r) => r.carId === car.id)
                .map((r) => {
                    let startIdx = localFindIdx(normalize(r.startDate));
                    if (startIdx < 0) startIdx = 0;
                    const endExclusive = new Date(r.endDate);
                    endExclusive.setHours(23, 59, 59, 999);
                    endExclusive.setDate(endExclusive.getDate() + 1);
                    let endIdx = localFindIdx(endExclusive);
                    if (endIdx === -1) endIdx = dates.length;
                    return { r, startIdx, endIdx };
                })
                .sort((a, b) => (a.startIdx - b.startIdx) || (a.endIdx - b.endIdx));

            const laneEnds: number[] = [];
            const laneByResId = new Map<string, number>();

            for (const it of items) {
                let lane = laneEnds.findIndex((end) => it.startIdx >= end);
                if (lane === -1) {
                    lane = laneEnds.length;
                    laneEnds.push(it.endIdx);
                } else {
                    laneEnds[lane] = it.endIdx;
                }
                laneByResId.set(it.r.id, lane);
            }
            map.set(car.id, { laneByResId, laneCount: Math.max(1, laneEnds.length) });
        });
        return map;
    }, [cars, reservations, dates, indexByDateKey, currentYear, viewMode]);

    const getRowHeightForCar = React.useCallback((carId: string) => {
        const laneCount = laneLayoutByCar.get(carId)?.laneCount ?? 1;
        const stackedHeight = ROW_VPAD * 2 + laneCount * LANE_HEIGHT;
        return laneCount > 1 ? Math.max(BASE_ROW_HEIGHT, stackedHeight) : LANE_HEIGHT;
    }, [laneLayoutByCar]);

    const initialScrollDone = useRef(false);
    useEffect(() => {
        if (initialScrollDone.current) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayKey = today.toISOString().split('T')[0];
        const idx = indexByDateKey.get(todayKey);
        setSelectedItems([{ type: 'date', date: today }]);
        setLastSelectedDate(today);
        if (idx !== undefined) {
            const scrollPos = idx * cellWidth - (rightPanelRef.current ? rightPanelRef.current.clientWidth / 2 - cellWidth / 2 : 0);
            if (rightPanelRef.current) {
                rightPanelRef.current.scrollLeft = scrollPos;
            }
            if (monthHeaderRef.current) monthHeaderRef.current.scrollLeft = scrollPos;
            if (dateHeaderRef.current) dateHeaderRef.current.scrollLeft = scrollPos;
        }
        initialScrollDone.current = true;
    }, [cellWidth, indexByDateKey]);

    return (
        <div
            className="h-screen w-full flex flex-col bg-gray-50 overflow-hidden"
            onMouseDownCapture={handleGlobalMouseDown}
        >
            <div className="bg-white shadow-sm border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <CarIcon className="mr-2 h-6 w-6 text-blue-600" />
                            DaCars Calendar
                        </h1>
                        <div className="text-sm text-gray-600">
                            {selectedItems.length > 0 && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">{selectedItems.length} selected</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            {(['month', 'quarter', 'year'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                        viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center bg-gray-100 rounded-lg px-2 py-1 space-x-2">
                            <button
                                onClick={handleZoomOut}
                                disabled={!canZoomOut}
                                className={`p-1 rounded-md transition-colors ${
                                    canZoomOut ? 'text-gray-600 hover:text-gray-900 hover:bg-white/70' : 'text-gray-400'
                                }`}
                                aria-label="Micșorează zoom"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </button>
                            <span className="min-w-[44px] text-center text-sm font-medium text-gray-700">
                                {zoomPercentage}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                disabled={!canZoomIn}
                                className={`p-1 rounded-md transition-colors ${
                                    canZoomIn ? 'text-gray-600 hover:text-gray-900 hover:bg-white/70' : 'text-gray-400'
                                }`}
                                aria-label="Mărește zoom"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </button>
                        </div>
                        <button
                            onClick={goToCurrentYear}
                            className="hidden md:block px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Current Year
                        </button>
                        <Button
                            data-keep-selection="true"
                            onClick={handleAddReservation}
                            className="flex items-center space-x-2 px-4 py-2"
                        >
                            <Plus className="h-4 w-4 me-1" />
                            Add Reservation
                        </Button>
                        <div className="hidden md:flex items-center space-x-2">
                            <button onClick={() => navigateYear('prev')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-lg font-medium text-gray-900 min-w-[80px] text-center">{currentYear}</span>
                            <button onClick={() => navigateYear('next')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full flex overflow-hidden min-w-0">
                <div className="w-40 md:w-80 bg-white border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900">Fleet Vehicles</h2>
                        <p className="text-sm text-gray-600">{cars.length} vehicles available</p>
                    </div>
                    {viewMode === 'year' && (
                        <div className="border-b border-gray-200 bg-gray-50 h-9">
                            <div className="h-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">Vehicles</span>
                            </div>
                        </div>
                    )}
                    <div ref={leftPanelRef} className="flex-1 overflow-y-auto overflow-x-hidden" onScroll={handleScroll('left')} style={{ scrollbarWidth: 'thin' }}>
                        {cars.map((car) => (
                            <div
                                key={car.id}
                                data-selected={isCarSelected(car.id) ? 'true' : undefined}
                                className={`border-b border-gray-100 flex items-center px-4 cursor-pointer transition-colors ${
                                    isCarSelected(car.id) ? 'bg-blue-100 border-blue-200' : 'hover:bg-gray-50'
                                } transition-[height] duration-200`}
                                style={{ height: getRowHeightForCar(car.id) }}
                                onClick={(e) => handleCarSelect(car.id, e)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                        <div className="flex-shrink-0">
                                            <div className={`w-3 h-3 rounded-full ${isCarSelected(car.id) ? 'bg-blue-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 truncate uppercase">
                                                {car.license?.trim() ? car.license.trim().toUpperCase() : 'Fără număr'}
                                            </p>
                                            {car.model && (
                                                <p className="text-xs text-gray-600 truncate">{car.model}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 w-full flex flex-col bg-white overflow-x-hidden min-w-0">
                    {viewMode === 'year' && (
                        <div
                            ref={monthHeaderRef}
                            onScroll={handleScroll('header')}
                            className="w-full border-b border-gray-200 bg-gray-50 overflow-x-auto month-header-scroll"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <div className="flex" style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}>
                                {getMonthGroups().map((month, index) => (
                                    <div
                                        key={index}
                                        className="border-r border-gray-300 last:border-r-0 bg-gray-100"
                                        style={{ width: `${month.daysCount * cellWidth}px`, minWidth: `${month.daysCount * cellWidth}px`, flexShrink: 0 }}
                                    >
                                        <div className="p-2 text-center">
                                            <div className="text-sm font-semibold text-gray-700">{month.name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div
                        ref={dateHeaderRef}
                        onScroll={handleScroll('header')}
                        className={`w-full border-b border-gray-200 bg-gray-50 ${getHeaderHeight()} overflow-x-auto date-header-scroll select-none`}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <div className="flex h-full" style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px`, ...weekBgStyle }}>
                            {dates.map((date, index) => (
                                <div
                                    key={index}
                                    data-selected={isDateSelected(date) ? 'true' : undefined}
                                    className={`p-2 border-r border-gray-200 last:border-r-0 cursor-pointer transition-colors ${
                                        isDateSelected(date) ? 'bg-blue-200 border-blue-400' : 'bg-transparent hover:bg-gray-100/60'
                                    }`}
                                    style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px`, flexShrink: 0 }}
                                    onClick={(e) => handleDateSelect(date, e)}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (lastSelectedDate && e.shiftKey) {
                                            const range = buildDateRange(lastSelectedDate, date);
                                            setDateSelection(range, false);
                                        } else {
                                            setDateDrag({ active: true, start: date });
                                            setDateSelection([date], false);
                                        }
                                    }}
                                    onMouseEnter={() => {
                                        if (dateDrag.active && dateDrag.start) {
                                            const range = buildDateRange(dateDrag.start, date);
                                            setDateSelection(range, false);
                                        }
                                    }}
                                    onMouseUp={(e) => {
                                        e.stopPropagation();
                                        if (dateDrag.active) setDateDrag({ active: false, start: null });
                                    }}
                                >
                                    <div className="text-center h-full flex flex-col justify-center">
                                        {viewMode === 'year' && (
                                            <>
                                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                    {formatWeekdayShort(date)}
                                                </div>
                                                <div className={`text-sm font-semibold mt-1 ${date.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-900'}`}>
                                                    {date.getDate()}
                                                </div>
                                            </>
                                        )}
                                        {viewMode === 'quarter' && <div className="text-sm font-medium text-gray-700">{formatDate(date)}</div>}
                                        {viewMode === 'month' && <div className="text-sm font-medium text-gray-700">{formatMonthText(date, { month: 'short' })}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div ref={rightPanelRef} className="flex-1 overflow-auto" onScroll={handleScroll('right')} style={{ scrollbarWidth: 'thin' }}>
                        <div style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px`, height: 'fit-content', ...weekBgStyle }}>
                            {cars.map((car) => {
                                const carReservations = reservations.filter((r) => r.carId === car.id);
                                const layout = laneLayoutByCar.get(car.id);
                                const laneCount = layout?.laneCount ?? 1;

                                const stackedHeight = ROW_VPAD * 2 + laneCount * LANE_HEIGHT;
                                const rowHeight = laneCount > 1 ? Math.max(BASE_ROW_HEIGHT, stackedHeight) : LANE_HEIGHT;

                                return (
                                    <div
                                        key={car.id}
                                        className="border-b border-gray-300 relative transition-[height] duration-200"
                                        style={{ height: rowHeight }}
                                        onMouseDownCapture={(e) => {
                                            rowDragRef.current.down = true;
                                            rowDragRef.current.selecting = false;
                                            rowDragRef.current.startClientX = e.clientX;

                                            const startIdx = getIndexFromRowEvent(e);
                                            rowDragRef.current.startIdx = startIdx;

                                            if (e.shiftKey && lastSelectedDate) {
                                                const startDate = dates[startIdx];
                                                const range = buildDateRange(lastSelectedDate, startDate);
                                                setDateSelection(range, false);
                                                setDateDrag({ active: false, start: null });
                                                e.preventDefault();
                                                e.stopPropagation();
                                            } else if (e.ctrlKey || e.metaKey) {
                                                const date = dates[startIdx];
                                                const dateKey = date.toISOString().split('T')[0];
                                                setSelectedItems((prev) => {
                                                    const others = prev.filter((it) => it.type !== 'date');
                                                    const currentDates = prev.filter((it) => it.type === 'date') as Selection[];
                                                    const already = currentDates.some((d) => d.date?.toISOString().split('T')[0] === dateKey);
                                                    return already
                                                        ? [...others, ...currentDates.filter((d) => d.date?.toISOString().split('T')[0] !== dateKey)]
                                                        : [...others, ...currentDates, { type: 'date', date } as Selection];
                                                });
                                                setLastSelectedDate(date);
                                                setDateDrag({ active: false, start: null });
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }
                                        }}
                                        onMouseMoveCapture={(e) => {
                                            if (!rowDragRef.current.down) return;
                                            const dx = Math.abs(e.clientX - rowDragRef.current.startClientX);
                                            const threshold = 3;
                                            const idx = getIndexFromRowEvent(e);

                                            if (!rowDragRef.current.selecting && dx > threshold) {
                                                rowDragRef.current.selecting = true;
                                                const startDate = dates[rowDragRef.current.startIdx];
                                                setDateDrag({ active: true, start: startDate });
                                                setDateSelection([startDate], false);
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }

                                            if (rowDragRef.current.selecting && dateDrag.start) {
                                                const range = buildDateRange(dateDrag.start, dates[idx]);
                                                setDateSelection(range, false);
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }
                                        }}
                                        onMouseUpCapture={(e) => {
                                            if (!rowDragRef.current.down) return;
                                            const wasSelecting = rowDragRef.current.selecting;

                                            rowDragRef.current.down = false;
                                            rowDragRef.current.selecting = false;
                                            if (dateDrag.active) setDateDrag({ active: false, start: null });

                                            if (wasSelecting) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }
                                        }}
                                    >
                                        <div className="flex h-full">
                                            {dates.map((date, dateIndex) => {
                                                const dateKey = date.toISOString().split('T')[0];
                                                const reservation = reservationByCarDate.get(`${car.id}-${dateKey}`);
                                                const cellSelected = isCellSelected(car.id, date);
                                                return (
                                                    <div
                                                        key={dateIndex}
                                                        data-selected={cellSelected ? 'true' : undefined}
                                                        className={`border-r border-gray-300 last:border-r-0 p-1 relative cursor-pointer transition-colors ${
                                                            cellSelected
                                                                ? 'bg-blue-50 border-blue-200'
                                                                : (isCarSelected(car.id) || isDateSelected(date))
                                                                    ? 'bg-gray-50/70'
                                                                    : 'bg-transparent'
                                                        } hover:bg-gray-50/60`}
                                                        style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px`, flexShrink: 0 }}
                                                        onClick={(e) => {
                                                            if (reservation) {
                                                                handleReservationSelect(reservation.id, e);
                                                            } else {
                                                                handleCellSelect(car.id, date, e);
                                                            }
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>

                                        <div className="absolute inset-0 z-10">
                                            {carReservations.map((res) => {
                                                const startIdxRaw = findIndexForDate(normalize(res.startDate));
                                                const startIdx = Math.max(0, startIdxRaw === -1 ? 0 : startIdxRaw);

                                                const endExclusive = new Date(res.endDate);
                                                endExclusive.setHours(23, 59, 59, 999);
                                                endExclusive.setDate(endExclusive.getDate() + 1);
                                                let endIdx = findIndexForDate(endExclusive);
                                                if (endIdx === -1) endIdx = dates.length;

                                                const left = startIdx * cellWidth;

                                                const singleCell = endIdx - startIdx === 1;
                                                const startCapLeft = left;
                                                const endCapLeft = singleCell ? left + Math.floor(cellWidth / 2) : (endIdx - 1) * cellWidth;

                                                const startCapWidth = singleCell ? Math.floor(cellWidth / 2) : Math.max(10, cellWidth - 2);
                                                const endCapWidth = singleCell ? Math.ceil(cellWidth / 2) : Math.max(10, cellWidth - 2);

                                                const middleLeft = singleCell ? left : startCapLeft + startCapWidth;
                                                const middleRight = singleCell ? left : endCapLeft;
                                                const middleWidth = Math.max(0, middleRight - middleLeft);

                                                const totalWidth = (endCapLeft + endCapWidth) - startCapLeft;

                                                const isStacked = (layout?.laneCount ?? 1) > 1;
                                                const laneIndex = (layout?.laneByResId.get(res.id) ?? 0);
                                                const top = isStacked ? (ROW_VPAD + laneIndex * LANE_HEIGHT + BAR_VINSET) : undefined;
                                                const barHeight = isStacked ? (LANE_HEIGHT - BAR_VINSET * 2) : undefined;

                                                const barSelected = isReservationSelected(res.id);

                                                return (
                                                    <React.Fragment key={res.id}>
                                                        <div
                                                            data-selected={barSelected ? 'true' : undefined}
                                                            className={`absolute shadow-sm bg-green-500 text-white text-xs flex items-center px-3 whitespace-nowrap overflow-hidden text-ellipsis transition-all hover:opacity-95 z-20 ${
                                                                isStacked ? '' : 'top-1 bottom-1 rounded-l-md rounded-r-none'
                                                            }`}
                                                            style={{
                                                                left: `${startCapLeft}px`,
                                                                width: `${startCapWidth}px`,
                                                                ...(isStacked
                                                                    ? { top, height: barHeight, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }
                                                                    : {}),
                                                            }}
                                                            title={`${res.customerName} • start`}
                                                            onClick={(e) => handleReservationSelect(res.id, e)}
                                                        />

                                                        {middleWidth > 0 && (
                                                            <div
                                                                data-selected={barSelected ? 'true' : undefined}
                                                                className={`absolute shadow-sm ${getStatusColor(res.status)} text-white items-center
                flex ${isStacked ? 'items-start py-0.5' : ''}
                ps-1 pe-2
                ${isStacked ? 'whitespace-normal leading-tight' : 'whitespace-nowrap'}
                overflow-hidden text-ellipsis transition-all
                ${barSelected ? 'ring-2 ring-white ring-opacity-60' : 'hover:opacity-95'}`}
                                                                style={{
                                                                    left: `${middleLeft}px`,
                                                                    width: `${middleWidth}px`,
                                                                    zIndex: 15,
                                                                    ...(isStacked ? { top, height: barHeight } : { top: 4, bottom: 4, height: barHeight }),
                                                                }}
                                                                title={`${res.customerName} • ${res.status} • ${res.totalDays}d`}
                                                                onClick={(e) => handleReservationSelect(res.id, e)}
                                                            />
                                                        )}

                                                        <div
                                                            className="absolute pointer-events-none flex items-center text-white text-xs overflow-hidden text-ellipsis z-30"
                                                            style={{
                                                                left: `${startCapLeft}px`,
                                                                width: `${totalWidth}px`,
                                                                ...(isStacked ? { top, height: barHeight } : { top: 4, bottom: 4, height: barHeight }),
                                                            }}
                                                        >
                                                            <span
                                                                className="font-medium whitespace-nowrap ps-1 pe-2"
                                                                style={{ fontSize: getNameFontSize(res.customerName, totalWidth) }}
                                                            >
                                                                {res.customerName}
                                                            </span>
                                                        </div>


                                                        <div
                                                            data-selected={barSelected ? 'true' : undefined}
                                                            className={`absolute shadow-sm bg-red-500 text-white text-xs flex items-center px-3 whitespace-nowrap overflow-hidden text-ellipsis transition-all hover:opacity-95 z-20 ${
                                                                isStacked ? '' : 'top-1 bottom-1 rounded-r-md rounded-l-none'
                                                            }`}
                                                            style={{
                                                                left: `${endCapLeft}px`,
                                                                width: `${endCapWidth}px`,
                                                                ...(isStacked
                                                                    ? { top, height: barHeight, borderTopRightRadius: 6, borderBottomRightRadius: 6 }
                                                                    : {}),
                                                            }}
                                                            title={`${res.customerName} • end`}
                                                            onClick={(e) => handleReservationSelect(res.id, e)}
                                                        />
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {selectedItems.length > 0 && (
                <div className="bg-white border-t border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h3 className="text-sm font-medium text-gray-900">Selection Details</h3>
                            <div className="flex items-center space-x-2 text-xs text-gray-600">
                                {selectedItems.map((item, index) => (
                                    <span key={index} className="bg-gray-100 px-2 py-1 rounded">
                    {item.type === 'car' && `Car: ${cars.find((c) => c.id === item.carId)?.model}`}
                                        {item.type === 'date' && `Date: ${item.date?.toLocaleDateString()}`}
                                        {item.type === 'reservation' && `Reservation: ${reservations.find((r) => r.id === item.reservationId)?.customerName}`}
                                        {item.type === 'cell' && `Cell: ${cars.find((c) => c.id === item.carId)?.model} - ${item.date?.toLocaleDateString()}`}
                  </span>
                                ))}
                            </div>
                        </div>
                        <button onClick={clearSelection} className="text-sm text-gray-500 hover:text-gray-700">Clear Selection</button>
                    </div>
                </div>
            )}

            <div className="bg-white border-t border-gray-200 px-4 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6 text-xs">
                        <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded bg-blue-500" />
                            <span className="text-gray-600">Confirmed</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded bg-amber-500" />
                            <span className="text-gray-600">Pending</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded bg-green-500" />
                            <span className="text-gray-600">Completed</span>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500">
                        Ctrl/Cmd = toggle zi • Shift+Click = interval • Drag pe header/GRID = interval continuu
                    </div>
                </div>
            </div>
            {bookingInfo && (
                <BookingForm
                    open={editPopupOpen}
                    onClose={() => {
                        setEditPopupOpen(false);
                        setBookingInfo(null);
                    }}
                    bookingInfo={bookingInfo}
                    setBookingInfo={setBookingInfo}
                    onUpdated={reloadBookings}
                />
            )}
        </div>
    );
};

export default CarRentalCalendar;

