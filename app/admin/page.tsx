"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar,
    Car,
    Users,
    Eye,
    Clock,
    User,
    Phone,
    Plane,
    Newspaper,
} from "lucide-react";
import Link from "next/link";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popup } from "@/components/ui/popup";
import BookingForm from "@/components/admin/BookingForm";
import { Label } from "@/components/ui/label";
import type { Column } from "@/types/ui";
import { AdminReservation } from "@/types/admin";
import type { ActivityReservation } from "@/types/activity";
import apiClient from "@/lib/api";
import {getStatusText} from "@/lib/utils";

const STORAGE_BASE =
    process.env.NEXT_PUBLIC_STORAGE_URL ?? 'https://backend.dacars.ro/storage';

const getStatusColor = (status: string) => {
    switch (status) {
        case "reserved":
            return "bg-green-100 text-green-800";
        case "pending":
            return "bg-yellow-100 text-yellow-800";
        case "cancelled":
            return "bg-red-100 text-red-800";
        case "completed":
            return "bg-blue-100 text-blue-800";
        case "no_answer":
            return "bg-orange-100 text-orange-800";
        case "waiting_advance_payment":
            return "bg-purple-100 text-purple-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
};

const reservationColumns: Column<AdminReservation>[] = [
    {
        id: "id",
        header: "ID",
        accessor: (r) => r.id,
        sortable: true,
        cell: (r) => (
            <span className="font-dm-sans text-sm text-berkeley font-semibold">
        {r.id}
      </span>
        ),
    },
    {
        id: "customer",
        header: "Client",
        accessor: (r) => r.customerName,
        sortable: true,
        cell: (r) => (
            <span className="font-dm-sans text-sm text-gray-900">
        {r.customerName}
      </span>
        ),
    },
    {
        id: "phone",
        header: "Telefon",
        accessor: (r) => r.phone,
        cell: (r) => (
            <span className="font-dm-sans text-sm text-gray-600">{r.phone}</span>
        ),
    },
    {
        id: "car",
        header: "Mașină",
        accessor: (r) => r.carName,
        cell: (r) => (
            <span className="font-dm-sans text-sm text-gray-900">{r.carName}</span>
        ),
    },
    {
        id: "period",
        header: "Perioada",
        accessor: (r) => new Date(r.startDate).getTime(),
        cell: (r) => (
            <span className="font-dm-sans text-sm text-gray-600">
        {new Date(r.startDate).toLocaleDateString("ro-RO")} -
                {" "}
                {new Date(r.endDate).toLocaleDateString("ro-RO")}
      </span>
        ),
    },
    {
        id: "status",
        header: "Status",
        accessor: (r) => r.status,
        cell: (r) => (
            <span
                className={`px-2 py-1 rounded-full text-xs font-dm-sans ${getStatusColor(
                    r.status,
                )}`}
            >
                {getStatusText(r.status)}
            </span>
        ),
    },
    {
        id: "total",
        header: "Total",
        accessor: (r) => r.total,
        sortable: true,
        cell: (r) => (
            <span className="font-dm-sans text-sm font-semibold text-berkeley">
        {r.total}€
      </span>
        ),
    },
];

const toLocalDateTimeInput = (iso?: string | null) => {
    if (!iso) return "";
    const date = new Date(iso);
    const tzOffset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
};

const AdminDashboard = () => {
    const router = useRouter();
    const [reservations, setReservations] = useState<AdminReservation[]>([]);
    const [carActivityDay, setCarActivityDay] = useState<string>('azi');
    const [activityDay, setActivityDay] = useState<string>('');
    const [activityHours, setActivityHours] = useState<string[]>([]);
    const [activityReservations, setActivityReservations] = useState<ActivityReservation[]>([]);
    const [popupOpen, setPopupOpen] = useState(false);
    const [activityDetails, setActivityDetails] = useState<{
        id: number;
        customer: string;
        phone: string;
        car: string;
        days: number;
        price_per_day: number;
        sub_total: number;
        total: number;
        services: { id:number, name: string }[];
        total_services: number;
        coupon_amount: number;
        coupon_type: string;
        with_deposit: boolean;
        note: string | null;
        arrivalDate: string;
        arrivalTime: string;
        returnDate: string;
        returnTime: string;
    } | null>(null);
    const [editPopupOpen, setEditPopupOpen] = useState(false);
    const [bookingInfo, setBookingInfo] = useState<any>(null);
    const [bookingsTodayCount, setBookingsTodayCount] = useState<number>(0);
    const [availableCarsCount, setAvailableCarsCount] = useState<number>(0);
    const [bookingsTotalCount, setBookingsTotalCount] = useState<number>(0);

    const openActivity = (details: {
        id: number;
        customer: string;
        phone: string;
        car: string;
        days: number;
        price_per_day: number;
        sub_total: number;
        total: number;
        services: {  id: number, name: string }[];
        total_services: number;
        coupon_amount: number;
        coupon_type: string;
        with_deposit: boolean;
        note: string | null;
        arrivalDate: string;
        arrivalTime: string;
        returnDate: string;
        returnTime: string;
    }) => {
        setActivityDetails(details);
        setPopupOpen(true);
    };

    const loadActivity = useCallback(async () => {
        try {
            const res = await apiClient.fetchWidgetActivity(carActivityDay);
            setActivityDay(res.day);
            setActivityHours(res.hours);
            setActivityReservations(res.data);
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    }, [carActivityDay]);

    useEffect(() => {
        loadActivity();
    }, [loadActivity]);

    useEffect(() => {
        const loadMetrics = async () => {
            try {
                const [bookingsToday, carsTotal, bookingsTotal] = await Promise.all([
                    apiClient.fetchAdminBookingsToday(),
                    apiClient.fetchAdminCarsTotal({ status: 'available' }),
                    apiClient.fetchAdminBookingsTotal({ statuses: 'all' }),
                ]);
                setBookingsTodayCount(bookingsToday.count);
                setAvailableCarsCount(carsTotal.count);
                setBookingsTotalCount(bookingsTotal.count);
            } catch (error) {
                console.error('Error loading metrics:', error);
            }
        };
        loadMetrics();
    }, []);


    // Mock data pentru demo
    useEffect(() => {
        const mockReservations: AdminReservation[] = [
            {
                id: "DC001",
                customerName: "Ana Popescu",
                phone: "+40722123456",
                carId: 1,
                carName: "Dacia Logan",
                startDate: "2025-01-15",
                endDate: "2025-01-18",
                plan: 1,
                status: "reserved",
                total: 135,
                couponAmount: 0,
                subTotal: 0,
                taxAmount: 0
            },
            {
                id: "DC002",
                customerName: "Mihai Ionescu",
                phone: "+40733987654",
                carId: 2,
                carName: "VW Golf",
                startDate: "2025-01-20",
                endDate: "2025-01-25",
                plan: 0,
                status: "reserved",
                total: 325,
                couponAmount: 0,
                subTotal: 0,
                taxAmount: 0
            },
            {
                id: "DC003",
                customerName: "Elena Dumitrescu",
                phone: "+40744555666",
                carId: 3,
                carName: "BMW Seria 3",
                startDate: "2025-01-22",
                endDate: "2025-01-24",
                plan: 0,
                status: "pending",
                total: 190,
                couponAmount: 0,
                subTotal: 0,
                taxAmount: 0
            },
            {
                id: "DC004",
                customerName: "Radu Constantin",
                phone: "+40755111222",
                carId: 1,
                carName: "Dacia Logan",
                startDate: "2025-02-01",
                endDate: "2025-02-05",
                plan: 1,
                status: "completed",
                total: 180,
                couponAmount: 0,
                subTotal: 0,
                taxAmount: 0
            },
            {
                id: "DC005",
                customerName: "Maria Georgescu",
                phone: "+40766333444",
                carId: 4,
                carName: "Ford Transit",
                startDate: "2025-02-10",
                plan: 1,
                endDate: "2025-02-12",
                status: "cancelled",
                total: 170,
                couponAmount: 0,
                subTotal: 0,
                taxAmount: 0
            },
        ];

        setReservations(mockReservations);
    }, []);

    const getCarActivityLabel = (status: string) => {
        switch (status) {
            case 'azi':
                return `Astăzi ${new Date().toLocaleDateString('ro-RO')}`;
            case 'maine':
                return `Mâine ${new Date(Date.now() + 86400000).toLocaleDateString('ro-RO')}`;
            case '2zile':
                return `Peste 2 zile ${new Date(Date.now() + 172800000).toLocaleDateString('ro-RO')}`;
            case '3zile':
                return `Peste 3 zile ${new Date(Date.now() + 259200000).toLocaleDateString('ro-RO')}`;
            case '4zile':
                return `Peste 4 zile ${new Date(Date.now() + 345600000).toLocaleDateString('ro-RO')}`;
            case '5zile':
                return `Peste 5 zile ${new Date(Date.now() + 432000000).toLocaleDateString('ro-RO')}`;
        }
    }

    const updateDateTime = async () => {
        try {
            const payload = {
                arrivalDate: activityDetails?.arrivalDate,
                arrivalTime: activityDetails?.arrivalTime,
                returnDate: activityDetails?.returnDate,
                returnTime: activityDetails?.returnTime,
            }

            await apiClient.updateBookingDate(activityDetails?.id, payload);

        } catch (err) {
            console.log(err);
        } finally {
            setPopupOpen(false);
            loadActivity();
        }
    }

    const handleEditBooking = async () => {
        if (!activityDetails) return;
        try {
            const res = await apiClient.getBookingInfo(activityDetails.id);
            const info = res.data;
            const formatted = {
                ...info,
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
                coupon_code: info.coupon_code ?? "",
                customer_name: info.customer_name ?? "",
                customer_email: info.customer_email ?? "",
                customer_phone: info.customer_phone ?? "",
                customer_age: info.customer_age ?? "",
                customer_id: info.customer_id ?? "",
                car_id: info.car_id ?? 0,
                car_name: info.car_name ?? "",
                car_image: info.car_image ?? info.image_preview ?? "",
                car_license_plate: info.car.license_plate ?? info.license_plate ?? "",
                car_transmission: info.car.transmission.name ?? info.transmission_name ?? "",
                car_fuel: info.car.fuel.name ?? info.fuel_name ?? "",
                car_deposit: info.car.deposit,
                booking_number: info.booking_number ?? "",
                note: info.note ?? "",
                days: info.days ?? 0,
                price_per_day: info.price_per_day ?? 0,
                keep_old_price: info.keep_old_price ?? true,
                send_email: info.send_email ?? false,
                with_deposit: info.with_deposit ?? false,
                tax_amount: info.tax_amount ?? 0,
                currency_id: info.currency_id ?? "",
                status: info.status ?? "",
                total: info.total ?? 0,
                advance_payment: info.advance_payment ?? 0
            };
            setBookingInfo(formatted);
            setPopupOpen(false);
            setEditPopupOpen(true);
        } catch (err) {
            console.error('Error loading booking info:', err);
        }
    }


    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-dm-sans text-gray-600">
                                    Rezervări astăzi
                                </p>
                                <p className="text-2xl font-poppins font-bold text-berkeley">
                                    {bookingsTodayCount}
                                </p>
                            </div>
                            <Calendar className="h-8 w-8 text-jade" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-dm-sans text-gray-600">
                                    Mașini disponibile
                                </p>
                                <p className="text-2xl font-poppins font-bold text-berkeley">
                                    {availableCarsCount}
                                </p>
                            </div>
                            <Car className="h-8 w-8 text-jade" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-dm-sans text-gray-600">
                                    Total rezervări
                                </p>
                                <p className="text-2xl font-poppins font-bold text-berkeley">
                                    {bookingsTotalCount}
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-jade" />
                        </div>
                    </div>

                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Calendar */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-poppins font-semibold text-berkeley">
                                Activitate Auto - {getCarActivityLabel(carActivityDay)}
                            </h2>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-sm font-dm-sans text-gray-600">Plecare</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <span className="text-sm font-dm-sans text-gray-600">Sosire</span>
                                </div>
                            </div>
                        </div>

                        {/* Day Selector */}
                        <div className="mb-6">
                            <div className="flex items-center space-x-3">
                                <Calendar className="h-5 w-5 text-jade" />
                                <Label htmlFor="day-selector" className="text-sm font-dm-sans font-semibold text-gray-700">
                                    Selectează ziua:
                                </Label>
                            </div>
                            <div className="mt-2">
                                <Select
                                    id="day-selector"
                                    value={carActivityDay}
                                    className="w-full max-w-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent"
                                    aria-label="Selectează ziua"
                                    onValueChange={setCarActivityDay}
                                >
                                    <option value="azi">Astăzi - {new Date().toLocaleDateString('ro-RO')}</option>
                                    <option value="maine">Mâine - {new Date(Date.now() + 86400000).toLocaleDateString('ro-RO')}</option>
                                    <option value="2zile">Peste 2 zile - {new Date(Date.now() + 172800000).toLocaleDateString('ro-RO')}</option>
                                    <option value="3zile">Peste 3 zile - {new Date(Date.now() + 259200000).toLocaleDateString('ro-RO')}</option>
                                    <option value="4zile">Peste 4 zile - {new Date(Date.now() + 345600000).toLocaleDateString('ro-RO')}</option>
                                    <option value="5zile">Peste 5 zile - {new Date(Date.now() + 432000000).toLocaleDateString('ro-RO')}</option>
                                </Select>
                            </div>
                        </div>

                        {/* Activity Schedule */}
                        <div className="space-y-6">
                            {activityHours.map((hour) => {
                                const events = activityReservations.filter((res) => {
                                    const startStr = res.rental_start_date.slice(0, 10);
                                    const endStr = res.rental_end_date.slice(0, 10);
                                    return (
                                        (startStr === activityDay && res.start_hour_group.slice(0, 5) === hour) ||
                                        (endStr === activityDay && res.end_hour_group.slice(0, 5) === hour)
                                    );
                                });
                                return (
                                    <div key={hour} className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gradient-to-r from-berkeley/5 to-jade/5 px-6 py-4 border-b border-gray-200">
                                            <div className="flex items-center space-x-3">
                                                <Clock className="h-5 w-5 text-berkeley" />
                                                <h3 className="text-lg font-poppins font-semibold text-berkeley">{hour}</h3>
                                                <span className="text-sm font-dm-sans text-gray-600">
                                                    {events.length} activitate{events.length !== 1 ? 'i' : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {events.map((r) => {
                                                const startStr = r.rental_start_date.slice(0, 10);
                                                const isDeparture =
                                                    startStr === activityDay &&
                                                    r.start_hour_group.slice(0, 5) === hour;
                                                return (
                                                    <div
                                                        key={r.id + (isDeparture ? 'start' : 'end')}
                                                        className={`px-6 py-4 ${
                                                            isDeparture ? 'hover:bg-green-50' : 'hover:bg-red-50'
                                                        } transition-colors duration-200`}
                                                    >
                                                        <div className="flex items-center space-x-4">
                                                            <div className="flex-shrink-0">
                                                                <div
                                                                    className={`w-4 h-4 ${
                                                                        isDeparture ? 'bg-green-500' : 'bg-red-500'
                                                                    } rounded-full flex items-center justify-center`}
                                                                >
                                                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center flex-col md:flex-row space-x-3">
                                                                    <span
                                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                            isDeparture
                                                                                ? 'bg-green-100 text-green-800'
                                                                                : 'bg-red-100 text-red-800'
                                                                        }`}
                                                                    >
                                                                        {isDeparture ? 'Plecare' : 'Sosire'}
                                                                    </span>
                                                                    <span className="text-sm font-dm-sans font-semibold text-gray-900">
                                                                        {r.car?.license_plate}
                                                                    </span>
                                                                    {r.child_seat_service_name && (
                                                                        <span className="text-sm text-red-500 font-bold">
                                                                            - {r.child_seat_service_name}
                                                                        </span>
                                                                    )}
                                                                    {r.note && (
                                                                        <span className="text-sm text-red-500 font-bold">
                                                                            - {r.note}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="mt-1 grid grid-cols-1 gap-4 text-sm text-gray-600">
                                                                    <div className="flex items-center space-x-1">
                                                                        <User className="h-4 w-4" />
                                                                        <span>{r.customer_name}</span>
                                                                    </div>
                                                                    <div className="flex items-center space-x-1">
                                                                        <Phone className="h-4 w-4" />
                                                                        <span>{r.customer_phone}</span>
                                                                    </div>

                                                                    {r.flight_number && (
                                                                        <div className="flex items-center space-x-1">
                                                                            <Plane className="h-4 w-4" />
                                                                            <span>{r.flight_number}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex-shrink-0">
                                                                <button
                                                                    onClick={() =>
                                                                        openActivity({
                                                                            id: r.id,
                                                                            customer: r.customer_name,
                                                                            phone: r.customer_phone,
                                                                            car: r.car?.license_plate || '',
                                                                            days: r.days,
                                                                            price_per_day: r.price_per_day,
                                                                            sub_total: r.sub_total,
                                                                            total: r.total,
                                                                            services: (r.services ?? []).map((s: any) => ({
                                                                                id: Number(s.id),
                                                                                name: String(s.name),
                                                                            })),
                                                                            total_services: r.total_services,
                                                                            coupon_amount: r.coupon_amount,
                                                                            coupon_type: r.coupon_type,
                                                                            with_deposit: r.with_deposit,
                                                                            note: r.note ?? null,
                                                                            arrivalDate: r.rental_start_date.slice(0, 10),
                                                                            arrivalTime: r.start_hour_group.slice(0, 5),
                                                                            returnDate: r.rental_end_date.slice(0, 10),
                                                                            returnTime: r.end_hour_group.slice(0, 5),
                                                                        })
                                                                    }
                                                                    className="p-2 text-gray-400 hover:text-berkeley hover:bg-gray-100 rounded-lg transition-colors duration-200"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </button>

                                                                <button
                                                                    className="p-2 text-gray-400 hover:text-berkeley hover:bg-gray-100 rounded-lg transition-colors duration-200"
                                                                >
                                                                    <Newspaper className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            {activityHours.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-poppins font-semibold text-gray-600 mb-2">
                                        Nu există alte activități
                                    </h3>
                                    <p className="text-gray-500 font-dm-sans">
                                        Toate activitățile pentru ziua selectată sunt afișate mai sus.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Reservations */}
                <div className="mt-8">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-poppins font-semibold text-berkeley">
                                Rezervări Recente
                            </h2>
                            <Link
                                href="/admin/bookings"
                                className="px-4 py-2 bg-jade text-white font-dm-sans font-semibold rounded-lg hover:bg-jade/90 transition-colors"
                                aria-label="Vezi toate rezervările"
                            >
                                Vezi toate
                            </Link>
                        </div>

                        <DataTable data={reservations.slice(0, 5)} columns={reservationColumns} />
                    </div>
                </div>
            </div>
            {activityDetails && (
                <Popup
                    open={popupOpen}
                    onClose={() => setPopupOpen(false)}
                    className="max-w-xl"
                >
                    <h3 className="text-lg font-poppins font-semibold text-berkeley mb-4">Detalii rezervare</h3>
                    <div className="space-y-2 mb-4">
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Client:</span> {activityDetails.customer}</div>
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Telefon:</span> {activityDetails.phone}</div>
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Mașină:</span> {activityDetails.car}</div>
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Preț per zi:</span> {activityDetails.price_per_day}€ x {activityDetails.days}</div>
                        {activityDetails.services.length > 0 && (
                            <div className="text-sm font-dm-sans">
                                <span className="font-semibold">Servicii:</span>
                                <ul className="list-disc list-inside">
                                    {activityDetails.services.map((s: { id: number; name: string }, index: number) => (
                                        <li key={s.id ?? index}>{s.name}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {activityDetails.services.length > 0 && (<div className="text-sm font-dm-sans"><span className="font-semibold">Preț servicii:</span> {activityDetails.total_services}€</div>)}
                        {activityDetails.coupon_amount > 0 && (<div className="text-sm font-dm-sans"><span className="font-semibold">Discount:</span> {activityDetails.coupon_amount}€</div>)}
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Total:</span> {activityDetails.total}€</div>
                        {activityDetails.note && (<div className="text-sm font-dm-sans"><span className="font-semibold">Notițe:</span> {activityDetails.note}</div>)}

                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="activity-arrival-date">Sosire</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="activity-arrival-date"
                                    type="date"
                                    value={activityDetails.arrivalDate}
                                    onChange={(e) =>
                                        setActivityDetails({
                                            ...activityDetails,
                                            arrivalDate: e.target.value,
                                        })
                                    }
                                />
                                <Input
                                    id="activity-arrival-time"
                                    type="time"
                                    value={activityDetails.arrivalTime}
                                    onChange={(e) =>
                                        setActivityDetails({
                                            ...activityDetails,
                                            arrivalTime: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="activity-return-date">Retur</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="activity-return-date"
                                    type="date"
                                    value={activityDetails.returnDate}
                                    onChange={(e) =>
                                        setActivityDetails({
                                            ...activityDetails,
                                            returnDate: e.target.value,
                                        })
                                    }
                                />
                                <Input
                                    id="activity-return-time"
                                    type="time"
                                    value={activityDetails.returnTime}
                                    onChange={(e) =>
                                        setActivityDetails({
                                            ...activityDetails,
                                            returnTime: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-6">
                        <div className="space-x-2">
                            <Button className="!px-4 py-4" variant="danger" onClick={() => setPopupOpen(false)}>Anulează</Button>
                            <Button className="!px-4 py-4" onClick={() => updateDateTime()}>Salvează</Button>
                            <Button className="!px-4 py-4" variant="blue" onClick={handleEditBooking}>Editează</Button>
                        </div>
                    </div>
                </Popup>
            )}
            {bookingInfo && (
                <BookingForm
                    open={editPopupOpen}
                    onClose={() => setEditPopupOpen(false)}
                    bookingInfo={bookingInfo}
                    setBookingInfo={setBookingInfo}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
