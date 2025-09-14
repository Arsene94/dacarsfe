"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Car as CarIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookingForm from '@/components/admin/BookingForm';
import apiClient from '@/lib/api';

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

const EMPTY_BOOKING = {
    rental_start_date: '',
    rental_end_date: '',
    with_deposit: true,
    service_ids: [] as number[],
    total_services: 0,
    coupon_type: '',
    coupon_amount: '',
    coupon_code: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    car_id: null as number | null,
    car_name: '',
    car_image: '',
    car_license_plate: '',
    car_transmission: '',
    car_fuel: '',
    sub_total: 0,
    total: 0,
    price_per_day: 0,
};

const CarRentalCalendar: React.FC = () => {
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState<'month' | 'quarter' | 'year'>('year');
    const [selectedItems, setSelectedItems] = useState<Selection[]>([]);

    const [bookingInfo, setBookingInfo] = useState<any>(null);
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
            const mapped: Car[] = (res.data || []).map((c: any) => ({
                id: c.id?.toString() ?? '',
                model: c.name ?? '',
                license: c.license_plate ?? '',
                image: c.image_preview || c.image || '',
                transmission:
                    typeof c.transmission === 'string'
                        ? c.transmission
                        : c.transmission?.name || c.transmission_name || '',
                fuel:
                    typeof c.fuel === 'string'
                        ? c.fuel
                        : c.fuel?.name || c.fuel_name || '',
                year: c.year ? Number(c.year) : undefined,
                type: c.type?.name ?? '',
                color: c.color ?? '',
            }));
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
            const mapped: Reservation[] = (res.data || []).map((b: any) => ({
                id: b.id?.toString() ?? '',
                bookingNumber: b.booking_number ?? '',
                carId: b.car_id ? b.car_id.toString() : '',
                startDate: new Date(b.rental_start_date),
                endDate: new Date(b.rental_end_date),
                customerName: b.customer_name,
                customerPhone: b.customer_phone,
                customerEmail: b.customer_email,
                status: b.status === 'reserved' ? 'confirmed' : b.status === 'completed' ? 'completed' : 'pending',
                totalDays: b.days ?? 0,
            }));
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
            const info = res.data;
            const formatted = {
                ...info,
                id: info.id ?? reservationId,
                rental_start_date: toLocalDateTimeInput(info.rental_start_date),
                rental_end_date: toLocalDateTimeInput(info.rental_end_date),
                coupon_amount: info.coupon_amount ?? 0,
                coupon_type: info.coupon_type ?? null,
                total_services: info.total_services ?? 0,
                service_ids: Array.isArray(info.service_ids)
                    ? info.service_ids
                    : Array.isArray(info.services)
                        ? info.services.map((s: any) => s.id)
                        : [],
                sub_total: info.sub_total ?? 0,
                coupon_code: info.coupon_code ?? '',
                customer_name: info.customer_name ?? '',
                customer_email: info.customer_email ?? '',
                customer_phone: info.customer_phone ?? '',
                customer_age: info.customer_age ?? '',
                customer_id: info.customer_id ?? '',
                car_id: info.car_id ?? 0,
                car_name: info.car_name ?? '',
                car_image: info.car_image ?? info.image_preview ?? '',
                car_license_plate: info.car?.license_plate ?? info.license_plate ?? '',
                car_transmission: info.car?.transmission?.name ?? info.transmission_name ?? '',
                car_fuel: info.car?.fuel?.name ?? info.fuel_name ?? '',
                car_deposit: info.car?.deposit,
                booking_number: info.booking_number ?? '',
                note: info.note ?? '',
                days: info.days ?? 0,
                price_per_day: info.price_per_day ?? 0,
                original_price_per_day: info.price_per_day ?? 0,
                keep_old_price: info.keep_old_price ?? true,
                send_email: info.send_email ?? false,
                with_deposit: info.with_deposit ?? false,
                tax_amount: info.tax_amount ?? 0,
                currency_id: info.currency_id ?? '',
                status: info.status ?? '',
                total: info.total ?? 0,
                advance_payment: info.advance_payment ?? 0,
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
        setBookingInfo({
            ...EMPTY_BOOKING,
            rental_start_date: start ? formatDateInput(start) : '',
            rental_end_date: end ? formatDateInput(end) : '',
            car_id: selectedCarId ? Number(selectedCarId) : null,
            car_name: car?.model ?? '',
            car_image: car?.image ?? '',
            car_license_plate: car?.license ?? '',
            car_transmission: car?.transmission ?? '',
            car_fuel: car?.fuel ?? '',
        });
        setEditPopupOpen(true);
    };

    const formatDate = (date: Date) => {
        if (viewMode === 'year') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (viewMode === 'quarter') return `W${Math.ceil(date.getDate() / 7)}`;
        return date.toLocaleDateString('en-US', { month: 'short' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-blue-500';
            case 'pending':   return 'bg-amber-500';
            case 'completed': return 'bg-green-500';
            default:          return 'bg-gray-500';
        }
    };

    const isCarSelected = (carId: string) => selectedCarIds.has(carId);
    const isDateSelected = (date: Date) => selectedDateKeys.has(date.toISOString().split('T')[0]);
    const isReservationSelected = (reservationId: string) => selectedReservationIds.has(reservationId);
    const isCellSelected = (carId: string, date: Date) => selectedCellKeys.has(`${carId}-${date.toISOString().split('T')[0]}`);

    const getCellWidth = () => {
        switch (viewMode) {
            case 'year': return 40;
            case 'quarter': return 80;
            case 'month': return 120;
            default: return 40;
        }
    };

    const getHeaderHeight = () => (viewMode === 'year' ? 'h-20' : 'h-16');

    const getMonthGroups = () => {
        const months = [] as { name: string; daysCount: number }[];
        for (let month = 0; month < 12; month++) {
            const monthStart = new Date(currentYear, month, 1);
            const monthEnd = new Date(currentYear, month + 1, 0);
            const daysInMonth = monthEnd.getDate();
            months.push({
                name: monthStart.toLocaleDateString('en-US', { month: 'long' }),
                daysCount: viewMode === 'year' ? daysInMonth : viewMode === 'quarter' ? Math.ceil(daysInMonth / 7) : 1,
            });
        }
        return months;
    };

    const cellWidth = getCellWidth();
    const totalWidth = dates.length * cellWidth;

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
                                            <p className="text-sm font-medium text-gray-900 truncate">{car.model}</p>
                                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                                                {car.license && <span>{car.license}</span>}
                                                {car.year && <><span>•</span><span>{car.year}</span></>}
                                                {car.type && <><span>•</span><span className="capitalize">{car.type}</span></>}
                                            </div>
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
                                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                                </div>
                                                <div className={`text-sm font-semibold mt-1 ${date.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-900'}`}>
                                                    {date.getDate()}
                                                </div>
                                            </>
                                        )}
                                        {viewMode === 'quarter' && <div className="text-sm font-medium text-gray-700">{formatDate(date)}</div>}
                                        {viewMode === 'month' && <div className="text-sm font-medium text-gray-700">{date.toLocaleDateString('en-US', { month: 'short' })}</div>}
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
                                                                className={`absolute shadow-sm ${getStatusColor(res.status)} text-white text-xs items-center
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
                                                            >
                                                                <span className="font-medium whitespace-normal">{res.customerName}</span>
                                                            </div>
                                                        )}


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

