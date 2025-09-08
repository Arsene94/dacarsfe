"use client";

import React, {useState, useEffect, useCallback} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Car,
  MapPin,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/table";
import type { Column } from "@/types/ui";
import { AdminReservation } from "@/types/admin";

const ReservationsPage = () => {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<
    AdminReservation[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedReservation, setSelectedReservation] =
    useState<AdminReservation | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Mock data pentru demo
  useEffect(() => {
    const mockReservations: AdminReservation[] = [
      {
        id: "DC001",
        customerName: "Ana Popescu",
        email: "ana.popescu@email.com",
        phone: "+40722123456",
        carId: 1,
        carName: "Dacia Logan",
        startDate: "2025-01-15",
        endDate: "2025-01-18",
        pickupTime: "14:30",
        dropoffTime: "10:00",
        location: "Aeroport Otopeni",
        status: "confirmed",
        total: 135,
        discountCode: "WHEEL10",
        notes: "Client VIP, zbor RO123",
        createdAt: "2025-01-10T10:30:00Z",
      },
      {
        id: "DC002",
        customerName: "Mihai Ionescu",
        email: "mihai.ionescu@gmail.com",
        phone: "+40733987654",
        carId: 2,
        carName: "VW Golf",
        startDate: "2025-01-20",
        endDate: "2025-01-25",
        pickupTime: "16:45",
        dropoffTime: "12:00",
        location: "Aeroport Otopeni",
        status: "confirmed",
        total: 325,
        notes: "Rezervare pentru vacanță",
        createdAt: "2025-01-12T15:20:00Z",
      },
      {
        id: "DC003",
        customerName: "Elena Dumitrescu",
        email: "elena.d@yahoo.com",
        phone: "+40744555666",
        carId: 3,
        carName: "BMW Seria 3",
        startDate: "2025-01-22",
        endDate: "2025-01-24",
        pickupTime: "09:15",
        dropoffTime: "18:30",
        location: "București Centru",
        status: "pending",
        total: 190,
        createdAt: "2025-01-14T09:45:00Z",
      },
      {
        id: "DC004",
        customerName: "Radu Constantin",
        email: "radu.c@outlook.com",
        phone: "+40755111222",
        carId: 1,
        carName: "Dacia Logan",
        startDate: "2025-02-01",
        endDate: "2025-02-05",
        pickupTime: "11:00",
        dropoffTime: "14:00",
        location: "Aeroport Otopeni",
        status: "confirmed",
        total: 180,
        discountCode: "FRIEND20",
        createdAt: "2025-01-16T14:10:00Z",
      },
      {
        id: "DC005",
        customerName: "Maria Georgescu",
        email: "maria.georgescu@email.ro",
        phone: "+40766333444",
        carId: 4,
        carName: "Ford Transit",
        startDate: "2025-02-10",
        endDate: "2025-02-12",
        pickupTime: "08:30",
        dropoffTime: "20:00",
        location: "Aeroport Otopeni",
        status: "completed",
        total: 170,
        notes: "Grup de prieteni, 8 persoane",
        createdAt: "2025-01-18T11:25:00Z",
      },
    ];

    setReservations(mockReservations);
    setFilteredReservations(mockReservations);
  }, []);

  // Filter reservations
  useEffect(() => {
    let filtered = reservations;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (reservation) =>
          reservation.customerName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          reservation.phone.includes(searchTerm) ||
          reservation.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reservation.carName.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (reservation) => reservation.status === statusFilter,
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const today = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "today":
          filterDate.setDate(today.getDate());
          break;
        case "week":
          filterDate.setDate(today.getDate() + 7);
          break;
        case "month":
          filterDate.setMonth(today.getMonth() + 1);
          break;
      }

      filtered = filtered.filter((reservation) => {
        const startDate = new Date(reservation.startDate);
        return startDate <= filterDate;
      });
    }

    setFilteredReservations(filtered);
  }, [reservations, searchTerm, statusFilter, dateFilter]);

  const handleViewReservation = useCallback((reservation: AdminReservation) => {
    setSelectedReservation(reservation);
    setShowModal(true);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmat";
      case "pending":
        return "În așteptare";
      case "cancelled":
        return "Anulat";
      case "completed":
        return "Finalizat";
      default:
        return status;
    }
  };

  const reservationColumns = React.useMemo<Column<AdminReservation>[]>(
    () => [
      {
        id: "reservation",
        header: "Rezervare",
        accessor: (r) => r.id,
        sortable: true,
        cell: (r) => (
          <div>
            <div className="font-dm-sans font-semibold text-berkeley">
              {r.id}
            </div>
            <div className="text-sm text-gray-500 font-dm-sans">
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
            <div className="font-dm-sans font-semibold text-gray-900">
              {r.customerName}
            </div>
            <div className="text-sm text-gray-500 font-dm-sans">
              {r.phone}
            </div>
          </div>
        ),
      },
      {
        id: "car",
        header: "Mașină",
        accessor: (r) => r.carName,
        cell: (r) => (
          <div className="font-dm-sans text-gray-900">{r.carName}</div>
        ),
      },
      {
        id: "period",
        header: "Perioada",
        accessor: (r) => new Date(r.startDate).getTime(),
        cell: (r) => (
          <div>
            <div className="font-dm-sans text-gray-900">
              {new Date(r.startDate).toLocaleDateString("ro-RO")} -
              {" "}
              {new Date(r.endDate).toLocaleDateString("ro-RO")}
            </div>
            <div className="text-sm text-gray-500 font-dm-sans">
              {r.pickupTime} - {r.dropoffTime}
            </div>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessor: (r) => r.status,
        cell: (r) => (
          <span
            className={`px-3 py-1 rounded-full text-sm font-dm-sans ${getStatusColor(
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
          <div className="font-dm-sans font-semibold text-berkeley">
            {r.total}€
            {r.discountCode && (
              <div className="text-sm text-jade font-dm-sans">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Caută rezervări..."
                aria-label="Caută rezervări"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent"
              />
            </div>

            <Select
              className="px-4 py-3"
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="Toate statusurile"
              aria-label="Filtrează după status"
            >
              <option value="all">Toate statusurile</option>
              <option value="confirmed">Confirmat</option>
              <option value="pending">În așteptare</option>
              <option value="cancelled">Anulat</option>
              <option value="completed">Finalizat</option>
            </Select>

            <Select
              className="px-4 py-3"
              value={dateFilter}
              onValueChange={setDateFilter}
              placeholder="Toate perioadele"
              aria-label="Filtrează după perioadă"
            >
              <option value="all">Toate perioadele</option>
              <option value="today">Astăzi</option>
              <option value="week">Următoarea săptămână</option>
              <option value="month">Următoarea lună</option>
            </Select>

            <div className="flex items-center justify-between">
              <span className="font-dm-sans text-gray-600">
                {filteredReservations.length} rezervări găsite
              </span>
            </div>
          </div>
        </div>

        {/* Reservations Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <DataTable
            data={filteredReservations}
            columns={reservationColumns}
            pageSize={10}
          />

          {filteredReservations.length === 0 && (
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
                          {selectedReservation.carName}
                        </p>
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
                          Total:
                        </span>
                        <span className="font-dm-sans font-bold text-berkeley text-lg">
                          {selectedReservation.total}€
                        </span>
                      </div>
                      {selectedReservation.discountCode && (
                        <div className="flex items-center justify-between">
                          <span className="font-dm-sans text-gray-600">
                            Cod reducere:
                          </span>
                          <span className="font-dm-sans text-jade font-semibold">
                            {selectedReservation.discountCode}
                          </span>
                        </div>
                      )}
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
    </div>
  );
};

export default ReservationsPage;
