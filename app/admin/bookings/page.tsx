"use client";

import React, { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/table";
import type { Column } from "@/types/ui";
import type { AdminBooking } from "@/types/admin";
import apiClient from "@/lib/api";

const BookingsPage = () => {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await apiClient.getBookings({ page, perPage });
        setBookings(res.data);
        setLastPage(res.meta.last_page);
      } catch (error) {
        console.error("Failed to load bookings", error);
      }
    };
    fetchBookings();
  }, [page]);

  const columns: Column<AdminBooking>[] = [
    {
      id: "booking",
      header: "Rezervare",
      accessor: (r) => r.booking_number,
    },
    {
      id: "customer",
      header: "Client",
      accessor: (r) => r.customer_name,
    },
    {
      id: "price_per_day",
      header: "Preț/zi",
      accessor: (r) => r.price_per_day,
      cell: (r) => <span>{r.price_per_day}€</span>,
    },
    {
      id: "services",
      header: "Preț servicii",
      accessor: (r) => r.total_services,
      cell: (r) => <span>{r.total_services}€</span>,
    },
    {
      id: "discount",
      header: "Discount",
      accessor: (r) => r.coupon_amount,
      cell: (r) => <span>{r.coupon_amount}€</span>,
    },
    {
      id: "total",
      header: "Total",
      accessor: (r) => r.total,
      cell: (r) => <span>{r.total}€</span>,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Rezervări</h1>
      <DataTable data={bookings} columns={columns} />
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-sm">
          Pagina {page} din {lastPage}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(p + 1, lastPage))}
          disabled={page === lastPage}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Următoarea
        </button>
      </div>
    </div>
  );
};

export default BookingsPage;
