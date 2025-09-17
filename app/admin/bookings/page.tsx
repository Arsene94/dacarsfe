"use client";

import React, {useState, useEffect, useCallback} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Car,
  MapPin,
  X,
  Newspaper,
  Plus,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/table";
import type { Column } from "@/types/ui";
import { AdminReservation } from "@/types/admin";
import { Input } from "@/components/ui/input";
import DateRangePicker from "@/components/ui/date-range-picker";
import { Popup } from "@/components/ui/popup";
import BookingForm from "@/components/admin/BookingForm";
import BookingContractForm from "@/components/admin/BookingContractForm";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api";

const EMPTY_BOOKING = {
  rental_start_date: "",
  rental_end_date: "",
  with_deposit: true,
  service_ids: [] as number[],
  total_services: 0,
  coupon_type: "",
  coupon_amount: "",
  coupon_code: "",
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  car_id: null as number | null,
  car_name: "",
  car_image: "",
  car_license_plate: "",
  car_transmission: "",
  car_fuel: "",
  sub_total: 0,
  total: 0,
  price_per_day: 0,
};

const ReservationsPage = () => {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<AdminReservation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalReservations, setTotalReservations] = useState(0);
  const [contractOpen, setContractOpen] = useState(false);
  const [contractReservation, setContractReservation] =
    useState<AdminReservation | null>(null);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [bookingInfo, setBookingInfo] = useState<any>(null);

  const mapStatus = (status: string): AdminReservation["status"] => {
    switch (status) {
      case "no_answer":
        return "no_answer";
      case "waiting_advance_payment":
        return "waiting_advance_payment";
      case "reserved":
        return "reserved";
      case "cancelled":
        return "cancelled";
      case "completed":
        return "completed";
      case "pending":
      default:
        return "pending";
    }
  };

  const fetchBookings = useCallback(async () => {
    try {
      const params: {
        page: number;
        perPage: number;
        search?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
      } = { page: currentPage, perPage };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;
      if (startDateFilter) params.start_date = startDateFilter;
      if (endDateFilter) params.end_date = endDateFilter;
      const res = await apiClient.getBookings(params);
      const mapped: AdminReservation[] = res.data.map((b: any) => ({
        id: b.booking_number || b.id?.toString(),
        customerName: b.customer_name,
        email: b.customer_email,
        phone: b.customer_phone,
        carId: b.car_id,
        carName: b.car_name,
        carLicensePlate: b.car.license_plate ?? "",
        startDate: b.rental_start_date,
        endDate: b.rental_end_date,
        plan: b.with_deposit ? 1 : 0,
        pickupTime: new Date(b.rental_start_date).toLocaleTimeString("ro-RO", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        dropoffTime: new Date(b.rental_end_date).toLocaleTimeString("ro-RO", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        days: b.days,
        couponAmount: b.coupon_amount,
        subTotal: b.sub_total,
        taxAmount: b.tax_amount,
        location: b.location || "",
        status: mapStatus(b.status),
        total: b.total,
        discountCode: b.coupon_code || undefined,
        createdAt: b.created_at,
        pricePerDay: b.price_per_day,
        servicesPrice: b.total_services,
        discount: b.coupon_amount,
      }));
      const meta = res?.meta || {};
      const total = meta?.total ?? res?.total ?? mapped.length;
      setReservations(mapped);
      setLastPage(meta?.last_page ?? res?.last_page ?? 1);
      setTotalReservations(total);
    } catch (e) {
      console.error(e);
    }
  }, [currentPage, perPage, searchTerm, statusFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleViewReservation = useCallback((reservation: AdminReservation) => {
    setSelectedReservation(reservation);
    setShowModal(true);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setDateRange({ startDate: null, endDate: null });
    setCurrentPage(1);
  }, []);

  const handleDateRangeChange = useCallback(
    (range: { startDate: Date | null; endDate: Date | null }) => {
      setDateRange(range);
      setStartDateFilter(
        range.startDate ? range.startDate.toISOString().split("T")[0] : "",
      );
      setEndDateFilter(
        range.endDate ? range.endDate.toISOString().split("T")[0] : "",
      );
      setCurrentPage(1);
    },
    [],
  );

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

  const getPlanColor = (plan: number) => {
      switch (plan) {
          case 0:
              return "bg-lime-100 text-lime-800";
          case 1:
              return "bg-fuchsia-100 text-fuchsia-800";
      }
  }

  const getPlanText = (plan: number) => {
      switch (plan) {
          case 0:
              return 'Fara Garantie';
          case 1:
              return 'Cu Garantie';
      }
    }

  const reservationColumns = React.useMemo<Column<AdminReservation>[]>(
    () => [
      {
        id: "reservation",
        header: "Rezervare",
        accessor: (r) => r.id,
        sortable: true,
        cell: (r) => (
          <div>
            <div className="font-dm-sans font-semibold text-berkeley text-xs">
              {r.id}
            </div>
            <div className="text-gray-500 font-dm-sans text-xs">
              {r.createdAt &&
                new Date(r.createdAt).toLocaleDateString("ro-RO")}
            </div>
          </div>
        ),
      },
      {
        id: "client",
        header: "Client",
        accessor: (r) => r.customerName,
        sortable: true,
        cell: (r) => (
          <div>
            <div className="font-dm-sans font-semibold text-gray-900 text-xs">
              {r.customerName}
            </div>
            <div className="text-gray-500 font-dm-sans text-xs">
              {r.phone}
            </div>
          </div>
        ),
      },
      {
        id: "car",
        header: "Mașină",
        accessor: (r) => r.carLicensePlate || r.carName,
        cell: (r) => (
          <div className="font-dm-sans text-gray-900 text-xs">
            {r.carLicensePlate || r.carName}
          </div>
        ),
      },
      {
        id: "period",
        header: "Perioada",
        accessor: (r) => new Date(r.startDate).getTime(),
        cell: (r) => (
          <div>
            <div className="font-dm-sans text-gray-900 text-xs">
              {new Date(r.startDate).toLocaleDateString("ro-RO")} -
              {" "}
              {new Date(r.endDate).toLocaleDateString("ro-RO")}
            </div>
            <div className="text-gray-500 font-dm-sans text-xs">
              {r.pickupTime} - {r.dropoffTime}
            </div>
          </div>
        ),
      },
      {
          id: "plan",
          header: "Tip Plan",
          accessor: (r) => r.plan,
          cell: (r) => (
              <span
                  className={`px-3 py-1 rounded-full text-xs font-dm-sans ${getPlanColor(
                      r.plan,
                  )}`}
              >
                {getPlanText(r.plan)}
              </span>
          ),
      },
      {
        id: "status",
        header: "Status",
        accessor: (r) => r.status,
        cell: (r) => (
          <span
            className={`px-3 py-1 rounded-full text-xs font-dm-sans ${getStatusColor(
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
          <div className="font-dm-sans font-semibold text-berkeley text-xs">
            {r.total}€
            {r.discountCode && (
              <div className="text-jade font-dm-sans text-xs">
                Cod: {r.discountCode}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Acțiuni",
        accessor: (r) => r.id,
        cell: (r) => (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleViewReservation(r)}
              className="p-2 text-gray-600 hover:text-jade hover:bg-jade/10 rounded-lg transition-colors"
              aria-label="Vezi detalii"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              aria-label="Editează"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Șterge"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [handleViewReservation],
  );

  const renderReservationDetails = (r: AdminReservation) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-700 font-dm-sans">
      <div className="flex items-center space-x-2">
        <span className="font-bold">Preț per zi:</span>
        <span> {r.pricePerDay}€</span>
      </div>
      <div className="flex items-center space-x-2">
          <span className="font-bold">Zile:</span>
          <span> {r.days}</span>
      </div>
      <div className="flex items-center space-x-2">
          <span className="font-bold">Servicii:</span>
          <span>{r.servicesPrice}€</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="font-bold">Subtotal:</span>
        <span>{r.subTotal}€</span>
      </div>
      {r.discountCode && (
        <div className="flex items-center space-x-2">
          <span className="font-semibold">Reducere:</span>
          <span>{r.couponAmount}€</span>
        </div>
      )}
      {r.notes && (
        <div className="md:col-span-4">
          <span className="font-semibold">Notițe: </span>
          {r.notes}
        </div>
      )}
    </div>
  );

  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (lastPage <= 6) {
      return Array.from({ length: lastPage }, (_, i) => i + 1);
    }
    return [1, 2, 3, "ellipsis", lastPage - 2, lastPage - 1, lastPage];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Înapoi la dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-poppins font-semibold text-berkeley">
                Gestionare Rezervări
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="yellow"
                onClick={() => {
                  setContractReservation(null);
                  setContractOpen(true);
                }}
                className="flex items-center space-x-2 px-4 py-2"
              >
                <Newspaper className="h-4 w-4 me-1" />
                Crează contract
              </Button>
              <Button
                onClick={() => {
                  setBookingInfo({ ...EMPTY_BOOKING });
                  setEditPopupOpen(true);
                }}
                className="flex items-center space-x-2 px-4 py-2"
              >
                <Plus className="h-4 w-4 me-1" />
                Crează rezervare
              </Button>
              <button
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Exportă rezervări"
              >
                <Download className="h-4 w-4 text-gray-600" />
                <span className="font-dm-sans text-gray-600">Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Caută rezervări..."
                aria-label="Caută rezervări"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
              placeholder="Toate statusurile"
              aria-label="Filtrează după status"
            >
              <option value="all">Toate statusurile</option>
              <option value="pending">În așteptare</option>
              <option value="no_answer">Fără răspuns</option>
              <option value="waiting_advance_payment">Așteaptă avans</option>
              <option value="reserved">Rezervat</option>
              <option value="completed">Finalizat</option>
              <option value="cancelled">Anulat</option>
            </Select>

            <div className="relative">
              <button
                onClick={() => setShowCalendar(true)}
                className="w-full flex items-center pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-left hover:bg-gray-50"
                aria-label="Selectează perioada"
              >
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                {startDateFilter && endDateFilter ? (
                  <span>
                    {new Date(startDateFilter).toLocaleDateString("ro-RO")} - {""}
                    {new Date(endDateFilter).toLocaleDateString("ro-RO")}
                  </span>
                ) : (
                  <span className="text-gray-500">Perioada</span>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-dm-sans text-gray-600">
                {totalReservations} rezervări găsite
              </span>
            </div>
          </div>

          {(searchTerm || statusFilter !== "all" || (startDateFilter && endDateFilter)) && (
            <div className="flex items-center flex-wrap gap-2 mt-4">
              {searchTerm && (
                <span className="flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  Caută: {searchTerm}
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                    aria-label="Șterge filtrul de căutare"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  Status: {getStatusText(statusFilter)}
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setCurrentPage(1);
                    }}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                    aria-label="Șterge filtrul de status"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {startDateFilter && endDateFilter && (
                <span className="flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  {new Date(startDateFilter).toLocaleDateString("ro-RO")} - {""}
                  {new Date(endDateFilter).toLocaleDateString("ro-RO")}
                  <button
                    onClick={() => {
                      setStartDateFilter("");
                      setEndDateFilter("");
                      setDateRange({ startDate: null, endDate: null });
                      setCurrentPage(1);
                    }}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                    aria-label="Șterge filtrul de perioadă"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="ml-auto text-sm text-red-600 hover:underline"
                aria-label="Șterge toate filtrele"
              >
                Șterge filtrele
              </button>
            </div>
          )}
        </div>
        <Popup
          open={showCalendar}
          onClose={() => setShowCalendar(false)}
          className="p-0"
        >
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            onClose={() => setShowCalendar(false)}
          />
        </Popup>

        {/* Reservations Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <DataTable
            data={reservations}
            columns={reservationColumns}
            renderRowDetails={renderReservationDetails}
          />

          <div className="flex items-center justify-between py-2 px-4 text-sm">
            <div className="flex items-center space-x-2 w-[10rem]">
              <span className="text-gray-600 w-full">Pe pagină:</span>
              <Select
                value={perPage.toString()}
                onValueChange={(v) => {
                  setPerPage(Number(v));
                  setCurrentPage(1);
                }}
                aria-label="Rezervări pe pagină"
                className="w-20"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </Select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-gray-600 disabled:opacity-50"
                aria-label="Pagina anterioară"
              >
                Anterior
              </button>
              {getPageNumbers().map((page, idx) =>
                page === "ellipsis" ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page as number)}
                    className={`px-2 py-1 rounded ${
                      currentPage === page
                        ? "bg-jade text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    aria-label={`Pagina ${page}`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, lastPage))}
                disabled={currentPage === lastPage}
                className="px-2 py-1 text-gray-600 disabled:opacity-50"
                aria-label="Pagina următoare"
              >
                Următoarea
              </button>
            </div>
          </div>

          {reservations.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-poppins font-semibold text-gray-600 mb-2">
                Nu există rezervări
              </h3>
              <p className="text-gray-500 font-dm-sans">
                Nu am găsit rezervări care să corespundă criteriilor de căutare.
              </p>
            </div>
          )}
        </div>

        {/* Reservation Details Modal */}
        {showModal && selectedReservation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-poppins font-bold text-berkeley">
                  Detalii Rezervare {selectedReservation.id}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Închide detaliile rezervării"
                >
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="space-y-4">
                  <h4 className="font-poppins font-semibold text-berkeley text-lg">
                    Informații Client
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-jade/10 p-2 rounded-lg">
                        <Phone className="h-4 w-4 text-jade" />
                      </div>
                      <div>
                        <p className="font-dm-sans font-semibold text-gray-900">
                          {selectedReservation.customerName}
                        </p>
                        <p className="text-sm text-gray-600 font-dm-sans">
                          {selectedReservation.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="bg-jade/10 p-2 rounded-lg">
                        <Mail className="h-4 w-4 text-jade" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-dm-sans">
                          Email
                        </p>
                        <p className="font-dm-sans text-gray-900">
                          {selectedReservation.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reservation Info */}
                <div className="space-y-4">
                  <h4 className="font-poppins font-semibold text-berkeley text-lg">
                    Detalii Rezervare
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-jade/10 p-2 rounded-lg">
                        <Car className="h-4 w-4 text-jade" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-dm-sans">
                          Mașină
                        </p>
                        <p className="font-dm-sans font-semibold text-gray-900">
                          {selectedReservation.carLicensePlate ||
                            selectedReservation.carName}
                        </p>
                        {selectedReservation.carLicensePlate &&
                          selectedReservation.carName && (
                            <p className="text-sm text-gray-600 font-dm-sans">
                              {selectedReservation.carName}
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="bg-jade/10 p-2 rounded-lg">
                        <Calendar className="h-4 w-4 text-jade" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-dm-sans">
                          Perioada
                        </p>
                        <p className="font-dm-sans text-gray-900">
                          {new Date(
                            selectedReservation.startDate,
                          ).toLocaleDateString("ro-RO")}{" "}
                          -{" "}
                          {new Date(
                            selectedReservation.endDate,
                          ).toLocaleDateString("ro-RO")}
                        </p>
                        <p className="text-sm text-gray-600 font-dm-sans">
                          {selectedReservation.pickupTime} -{" "}
                          {selectedReservation.dropoffTime}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="bg-jade/10 p-2 rounded-lg">
                        <MapPin className="h-4 w-4 text-jade" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-dm-sans">
                          Locație
                        </p>
                        <p className="font-dm-sans text-gray-900">
                          {selectedReservation.location}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-poppins font-semibold text-berkeley mb-3">
                      Status & Plată
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-dm-sans text-gray-600">
                          Status:
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-dm-sans ${getStatusColor(selectedReservation.status)}`}
                        >
                          {getStatusText(selectedReservation.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-dm-sans text-gray-600">
                          Preț/zi:
                        </span>
                        <span className="font-dm-sans text-gray-900">
                          {selectedReservation.pricePerDay}€
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-dm-sans text-gray-600">
                          Servicii:
                        </span>
                        <span className="font-dm-sans text-gray-900">
                          {selectedReservation.servicesPrice}€
                        </span>
                      </div>
                      {selectedReservation.discount && selectedReservation.discount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-dm-sans text-gray-600">
                            Discount:
                          </span>
                          <span className="font-dm-sans text-gray-900">
                            -{selectedReservation.discount}€
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-dm-sans text-gray-600">
                          Total:
                        </span>
                        <span className="font-dm-sans font-bold text-berkeley text-lg">
                          {selectedReservation.total}€
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedReservation.notes && (
                    <div>
                      <h4 className="font-poppins font-semibold text-berkeley mb-3">
                        Notițe
                      </h4>
                      <p className="font-dm-sans text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {selectedReservation.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  className="flex-1 bg-jade text-white py-3 rounded-lg font-semibold font-dm-sans hover:bg-jade/90 transition-colors"
                  aria-label="Confirmă Rezervarea"
                >
                  Confirmă Rezervarea
                </button>
                <button
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold font-dm-sans hover:bg-gray-50 transition-colors"
                  aria-label="Editează rezervarea"
                >
                  Editează
                </button>
                <button
                  className="flex-1 border-2 border-red-300 text-red-600 py-3 rounded-lg font-semibold font-dm-sans hover:bg-red-50 transition-colors"
                  aria-label="Anulează rezervarea"
                >
                  Anulează
                </button>
              </div>
            </div>
          </div>
        )}
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
          />
        )}
        <BookingContractForm
          open={contractOpen}
          onClose={() => setContractOpen(false)}
          reservation={contractReservation}
        />
      </div>
    );
};

export default ReservationsPage;
