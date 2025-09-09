"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar,
    Car,
    Users,
    BarChart3,
    Plus,
    Filter,
    Search,
    ChevronLeft,
    ChevronRight, Eye, Clock, User, Phone, Plane, Newspaper,
} from "lucide-react";
import Link from "next/link";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popup } from "@/components/ui/popup";
import type { Column } from "@/types/ui";
import { AdminReservation } from "@/types/admin";
import type { ActivityReservation } from "@/types/activity";
import apiClient from "@/lib/api";

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

const getStatusText = (status: string) => {
    switch (status) {
        case "reserved":
            return "Rezervat";
        case "pending":
            return "În așteptare";
        case "cancelled":
            return "Anulat";
        case "completed":
            return "Finalizat";
        case "no_answer":
            return "Fără răspuns";
        case "waiting_advance_payment":
            return "Așteaptă avans";
        default:
            return status;
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
        arrivalDate: string;
        arrivalTime: string;
        returnDate: string;
        returnTime: string;
    } | null>(null);
    const [bookingsTodayCount, setBookingsTodayCount] = useState<number>(0);
    const [availableCarsCount, setAvailableCarsCount] = useState<number>(0);
    const [bookingsTotalCount, setBookingsTotalCount] = useState<number>(0);

    const openActivity = (details: {
        id: number;
        customer: string;
        phone: string;
        car: string;
        arrivalDate: string;
        arrivalTime: string;
        returnDate: string;
        returnTime: string;
    }) => {
        setActivityDetails(details);
        setPopupOpen(true);
    };

    useEffect(() => {
        const loadActivity = async () => {
            try {
                const res = await apiClient.fetchWidgetActivity(carActivityDay);
                setActivityDay(res.day);
                setActivityHours(res.hours);
                setActivityReservations(res.data);
            } catch (error) {
                console.error('Error loading activity:', error);
            }
        };
        loadActivity();
    }, [carActivityDay]);

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
                                Program Activitate Auto
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
                                <label htmlFor="day-selector" className="text-sm font-dm-sans font-semibold text-gray-700">
                                    Selectează ziua:
                                </label>
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
                                                                <div className="flex items-center space-x-3">
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
                                                                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                                                                    <div className="flex items-center space-x-1">
                                                                        <User className="h-4 w-4" />
                                                                        <span>{r.customer_name}</span>
                                                                    </div>
                                                                    <div className="flex items-center space-x-1">
                                                                        <Phone className="h-4 w-4" />
                                                                        <span>{r.customer_phone}</span>
                                                                    </div>
                                                                </div>

                                                                {r.flight_number && (
                                                                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                                                                        <div className="flex items-center space-x-1">
                                                                            <Plane className="h-4 w-4" />
                                                                            <span>{r.flight_number}</span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                            </div>
                                                            <div className="flex-shrink-0">
                                                                <button
                                                                    onClick={() =>
                                                                        openActivity({
                                                                            id: r.id,
                                                                            customer: r.customer_name,
                                                                            phone: r.customer_phone,
                                                                            car: r.car?.license_plate || '',
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
                <Popup open={popupOpen} onClose={() => setPopupOpen(false)}>
                    <h3 className="text-lg font-poppins font-semibold text-berkeley mb-4">Detalii rezervare</h3>
                    <div className="space-y-2 mb-4">
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Client:</span> {activityDetails.customer}</div>
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Telefon:</span> {activityDetails.phone}</div>
                        <div className="text-sm font-dm-sans"><span className="font-semibold">Mașină:</span> {activityDetails.car}</div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-dm-sans font-semibold text-gray-700">Sosire</label>
                            <div className="flex gap-2">
                                <Input
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
                            <label className="text-sm font-dm-sans font-semibold text-gray-700">Retur</label>
                            <div className="flex gap-2">
                                <Input
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
                            <Button variant="outline" onClick={() => setPopupOpen(false)}>Anulează</Button>
                            <Button onClick={() => setPopupOpen(false)}>Salvează</Button>
                        </div>
                    </div>
                </Popup>
            )}
        </div>
    );
};

export default AdminDashboard;
