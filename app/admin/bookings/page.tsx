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
import { extractItem, extractList } from "@/lib/apiResponse";
import type {
  AdminBookingFormValues,
  AdminBookingResource,
  AdminReservation,
} from "@/types/admin";
import type { ReservationWheelPrizeSummary } from "@/types/reservation";
import { Input } from "@/components/ui/input";
import DateRangePicker from "@/components/ui/date-range-picker";
import { Popup } from "@/components/ui/popup";
import BookingForm from "@/components/admin/BookingForm";
import BookingContractForm from "@/components/admin/BookingContractForm";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api";
import {
  describeWheelPrizeSummaryAmount,
  formatWheelPrizeExpiry,
} from "@/lib/wheelFormatting";

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
  total_before_wheel_prize: null as number | null,
  wheel_prize_discount: 0,
  wheel_prize: null as ReservationWheelPrizeSummary | null,
};

const parseOptionalNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^0-9.,-]/g, "").replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const formatTimeLabel = (iso?: string | null): string | undefined => {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
};

const normalizeWheelPrizeSummary = (
  raw: unknown,
): ReservationWheelPrizeSummary | null => {
  if (!isRecord(raw)) return null;
  const wheelId =
    parseOptionalNumber(
      raw.wheel_of_fortune_id ??
        (raw as { wheelId?: unknown }).wheelId ??
        raw.period_id,
    ) ?? null;
  const prizeId =
    parseOptionalNumber(
      raw.prize_id ?? raw.id ?? (raw as { prizeId?: unknown }).prizeId ?? raw.slice_id,
    ) ?? null;
  const amount = parseOptionalNumber(raw.amount ?? raw.value ?? raw.discount_value);
  const discountValue =
    parseOptionalNumber(raw.discount_value ?? raw.discount ?? raw.value) ?? 0;
  const wheelInfo = isRecord(raw.wheel_of_fortune) ? raw.wheel_of_fortune : null;
  const title =
    (typeof raw.title === "string" && raw.title.trim().length > 0
      ? raw.title
      : typeof raw.name === "string" && raw.name.trim().length > 0
        ? raw.name
        : null) ?? "Premiu DaCars";
  const prizeType =
    (typeof raw.type === "string" && raw.type) ??
    (typeof raw.prize_type === "string" && raw.prize_type) ??
    (wheelInfo && typeof wheelInfo.type === "string" ? wheelInfo.type : undefined) ??
    "other";

  return {
    wheel_of_fortune_id: wheelId,
    prize_id: prizeId,
    title,
    type: prizeType,
    amount,
    description:
      typeof raw.description === "string" && raw.description.length > 0
        ? raw.description
        : null,
    amount_label:
      typeof raw.amount_label === "string"
        ? raw.amount_label
        : typeof (raw as { amountLabel?: unknown }).amountLabel === "string"
          ? (raw as { amountLabel: string }).amountLabel
          : null,
    expires_at:
      typeof raw.expires_at === "string"
        ? raw.expires_at
        : typeof (raw as { expiresAt?: unknown }).expiresAt === "string"
          ? (raw as { expiresAt: string }).expiresAt
          : null,
    discount_value: discountValue,
  };
};

const extractWheelPrizeDisplay = (
  prize: ReservationWheelPrizeSummary | null | undefined,
  discount: unknown,
  totalBefore: unknown,
) => {
  const normalizedPrize = prize ?? null;
  const amountLabel = describeWheelPrizeSummaryAmount(normalizedPrize);
  const expiryLabel = normalizedPrize?.expires_at
    ? formatWheelPrizeExpiry(normalizedPrize.expires_at)
    : null;
  const discountRaw = discount ?? normalizedPrize?.discount_value ?? null;
  const discountValue =
    typeof discountRaw === "number"
      ? discountRaw
      : parseOptionalNumber(discountRaw) ?? 0;
  const totalBeforeValue =
    typeof totalBefore === "number"
      ? (Number.isFinite(totalBefore) ? totalBefore : null)
      : parseOptionalNumber(totalBefore);

  return {
    prize: normalizedPrize,
    amountLabel,
    expiryLabel,
    discountValue,
    totalBefore: totalBeforeValue ?? null,
  };
};

const euroFormatter = new Intl.NumberFormat("ro-RO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const EMPTY_WHEEL_PRIZE_DETAILS: ReturnType<typeof extractWheelPrizeDisplay> = {
  prize: null,
  amountLabel: null,
  expiryLabel: null,
  discountValue: 0,
  totalBefore: null,
};

const toLocalDateTimeInput = (iso?: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - tzOffset * 60000);
  return local.toISOString().slice(0, 16);
};

const normalizeBoolean = (value: unknown, defaultValue = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "da", "yes"].includes(normalized)) return true;
    if (["0", "false", "nu", "no"].includes(normalized)) return false;
  }
  return defaultValue;
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
  const [bookingInfo, setBookingInfo] = useState<AdminBookingFormValues | null>(
    null,
  );

  const formatEuro = (value: number | string | null | undefined) => {
    if (typeof value === "string") {
      const parsed = parseOptionalNumber(value);
      if (typeof parsed === "number") {
        return `${euroFormatter.format(parsed)}€`;
      }
      return "—";
    }
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    return `${euroFormatter.format(value)}€`;
  };

  const selectedWheelPrizeDetails = selectedReservation
    ? extractWheelPrizeDisplay(
        selectedReservation.wheelPrize,
        selectedReservation.wheelPrizeDiscount,
        selectedReservation.totalBeforeWheelPrize,
      )
    : EMPTY_WHEEL_PRIZE_DETAILS;

  const {
    prize: selectedWheelPrize,
    amountLabel: selectedWheelPrizeAmountLabel,
    expiryLabel: selectedWheelPrizeExpiry,
    discountValue: selectedWheelPrizeDiscount,
    totalBefore: selectedTotalBeforeWheelPrize,
  } = selectedWheelPrizeDetails;

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
      const response = await apiClient.getBookings(params);
      const bookings = extractList<AdminBookingResource>(response);
      const mapped = bookings.map<AdminReservation>((booking) => {
        const wheelPrize = normalizeWheelPrizeSummary(booking.wheel_prize);
        const wheelPrizeDiscount =
          booking.wheel_prize_discount ?? wheelPrize?.discount_value ?? null;
        const normalizedDiscount =
          typeof wheelPrizeDiscount === "number"
            ? wheelPrizeDiscount
            : parseOptionalNumber(wheelPrizeDiscount);
        const totalBeforeWheelPrize = parseOptionalNumber(
          booking.total_before_wheel_prize,
        );
        const identifier =
          booking.booking_number ??
          booking.bookingNumber ??
          booking.id ??
          null;
        const id =
          typeof identifier === "string"
            ? identifier
            : identifier != null
            ? String(identifier)
            : "";
        const customerName =
          booking.customer_name ?? booking.customer?.name ?? "";
        const phone = booking.customer_phone ?? booking.customer?.phone ?? "";
        const email = booking.customer_email ?? booking.customer?.email ?? undefined;
        const carId = parseOptionalNumber(booking.car_id) ?? 0;
        const carName = booking.car_name ?? booking.car?.name ?? "";
        const carLicensePlate =
          booking.car?.license_plate ??
          booking.car?.licensePlate ??
          booking.car_license_plate ??
          undefined;
        const startDate = booking.rental_start_date ?? "";
        const endDate = booking.rental_end_date ?? "";
        const pickupTime = formatTimeLabel(booking.rental_start_date);
        const dropoffTime = formatTimeLabel(booking.rental_end_date);
        const days = parseOptionalNumber(booking.days);
        const couponAmount = parseOptionalNumber(booking.coupon_amount) ?? 0;
        const subTotal =
          parseOptionalNumber(booking.sub_total ?? booking.subTotal) ?? 0;
        const taxAmount = parseOptionalNumber(booking.tax_amount) ?? 0;
        const location = booking.location ?? undefined;
        const status = mapStatus(booking.status ?? "pending");
        const total =
          parseOptionalNumber(booking.total ?? booking.total_price) ?? 0;
        const discountCode = booking.coupon_code ?? undefined;
        const createdAt = booking.created_at ?? undefined;
        const pricePerDay =
          parseOptionalNumber(
            booking.price_per_day ?? booking.original_price_per_day,
          ) ?? 0;
        const servicesPrice = parseOptionalNumber(booking.total_services) ?? 0;
        const discount =
          parseOptionalNumber(booking.discount ?? booking.coupon_amount) ??
          couponAmount;

        return {
          id,
          customerName,
          email,
          phone,
          carId,
          carName,
          carLicensePlate,
          startDate,
          endDate,
          plan: normalizeBoolean(booking.with_deposit, true) ? 1 : 0,
          pickupTime,
          dropoffTime,
          days: days ?? undefined,
          couponAmount,
          subTotal,
          taxAmount,
          location: location ?? "",
          status,
          total,
          discountCode,
          createdAt,
          pricePerDay,
          servicesPrice,
          discount,
          totalBeforeWheelPrize,
          wheelPrizeDiscount: normalizedDiscount ?? null,
          wheelPrize,
        };
      });
      const listMeta = !Array.isArray(response)
        ? response.meta ?? response.pagination ?? null
        : null;
      const total =
        listMeta?.total ??
        listMeta?.count ??
        (!Array.isArray(response)
          ? response.total ?? response.count ?? bookings.length
          : bookings.length);
      setReservations(mapped);
      const resolvedLastPage =
        listMeta?.last_page ??
        listMeta?.lastPage ??
        (!Array.isArray(response)
          ? response.last_page ?? response.lastPage ?? 1
          : 1);
      setLastPage(resolvedLastPage > 0 ? resolvedLastPage : 1);
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

  const handleEditReservation = useCallback(
    async (reservationId: string) => {
      try {
        const response = await apiClient.getBookingInfo(reservationId);
        const info = extractItem(response);
        if (!info) {
          throw new Error("Nu am putut găsi rezervarea solicitată.");
        }

        const rawServiceIds = Array.isArray(info.service_ids)
          ? info.service_ids
          : Array.isArray(info.services)
            ? info.services.map((service) =>
                service?.id ?? (service?.pivot ? (service.pivot as { service_id?: unknown }).service_id : null),
              )
            : [];
        const normalizedServiceIds = rawServiceIds
          .map((value) => parseOptionalNumber(value))
          .filter((value): value is number => value != null);

        const pricePerDay =
          parseOptionalNumber(info?.price_per_day ?? info?.pricePerDay) ?? 0;
        const originalPricePerDay =
          parseOptionalNumber(
            info?.original_price_per_day ?? info?.price_per_day ?? info?.pricePerDay,
          ) ?? pricePerDay;
        const basePrice =
          parseOptionalNumber(info?.base_price ?? pricePerDay) ?? pricePerDay;
        const basePriceCasco =
          parseOptionalNumber(
            info?.base_price_casco ?? info?.rental_rate_casco ?? basePrice,
          ) ?? basePrice;
        const totalServices =
          parseOptionalNumber(info.total_services) ??
          (Array.isArray(info.services)
            ? info.services.reduce((sum, svc) => {
                const directPrice = parseOptionalNumber(svc?.price);
                const pivotPrice = svc?.pivot
                  ? parseOptionalNumber((svc.pivot as { price?: unknown }).price)
                  : null;
                return sum + (directPrice ?? pivotPrice ?? 0);
              }, 0)
            : 0);
        const totalBeforeWheelPrize =
          parseOptionalNumber(
            info.total_before_wheel_prize ??
              (info as { totalBeforeWheelPrize?: unknown }).totalBeforeWheelPrize,
          ) ?? null;
        const wheelPrize = normalizeWheelPrizeSummary(info.wheel_prize);
        const wheelPrizeDiscount =
          parseOptionalNumber(info.wheel_prize_discount) ??
          (wheelPrize?.discount_value ?? null);
        const advancePayment =
          parseOptionalNumber(info.advance_payment ?? (info as { advancePayment?: unknown }).advancePayment) ?? 0;
        const couponAmount =
          parseOptionalNumber(info.coupon_amount ?? info.discount) ??
          info.coupon_amount ??
          0;
        const subTotal =
          parseOptionalNumber(info.sub_total ?? (info as { subTotal?: unknown }).subTotal) ??
          info.sub_total ??
          0;
        const total =
          parseOptionalNumber(info.total) ?? info.total ??
          parseOptionalNumber(info.total_price) ?? info.total_price ??
          0;
        const taxAmount =
          parseOptionalNumber(info.tax_amount ?? (info as { taxAmount?: unknown }).taxAmount) ??
          info.tax_amount ??
          0;

        const formatted = {
          ...EMPTY_BOOKING,
          ...info,
          id: info?.id ?? reservationId,
          booking_number: info?.booking_number ?? info?.id ?? reservationId,
          rental_start_date: toLocalDateTimeInput(info?.rental_start_date),
          rental_end_date: toLocalDateTimeInput(info?.rental_end_date),
          coupon_amount: couponAmount,
          coupon_type: info?.coupon_type ?? info?.discount_type ?? null,
          coupon_code: info?.coupon_code ?? "",
          customer_name: info?.customer_name ?? info?.customer?.name ?? "",
          customer_email: info?.customer_email ?? info?.customer?.email ?? "",
          customer_phone: info?.customer_phone ?? info?.customer?.phone ?? "",
          customer_age: info?.customer_age ?? info?.customer?.age ?? "",
          customer_id: info?.customer_id ?? info?.customer?.id ?? "",
          car_id: info?.car_id ?? info?.car?.id ?? null,
          car_name: info?.car_name ?? info?.car?.name ?? "",
          car_image:
            info?.car_image ??
            info?.car?.image_preview ??
            info?.image_preview ??
            info?.car?.image ??
            "",
          car_license_plate:
            info?.car?.license_plate ?? info?.license_plate ?? info?.car?.plate ?? "",
          car_transmission:
            info?.car?.transmission?.name ?? info?.transmission_name ?? "",
          car_fuel: info?.car?.fuel?.name ?? info?.fuel_name ?? "",
          car_deposit:
            parseOptionalNumber(info?.car_deposit ?? info?.car?.deposit) ??
            info?.car_deposit ??
            info?.car?.deposit ??
            null,
          service_ids: normalizedServiceIds,
          services: Array.isArray(info?.services) ? info.services : [],
          total_services: totalServices ?? 0,
          sub_total: subTotal,
          total,
          tax_amount: taxAmount,
          price_per_day: pricePerDay,
          original_price_per_day: originalPricePerDay,
          base_price: basePrice,
          base_price_casco: basePriceCasco,
          days: parseOptionalNumber(info?.days ?? info?.total_days) ?? info?.days ?? 0,
          keep_old_price: normalizeBoolean(info?.keep_old_price, true),
          send_email: normalizeBoolean(info?.send_email, false),
          with_deposit: normalizeBoolean(info?.with_deposit, true),
          status: info?.status ?? "",
          total_before_wheel_prize: totalBeforeWheelPrize,
          wheel_prize_discount: wheelPrizeDiscount ?? 0,
          wheel_prize: wheelPrize ?? null,
          advance_payment: advancePayment,
          note: info?.note ?? info?.notes ?? "",
          currency_id: info?.currency_id ?? info?.currencyId ?? "",
        };

        setBookingInfo(formatted);
        setEditPopupOpen(true);
        setShowModal(false);
      } catch (error) {
        console.error("Error fetching booking info", error);
      }
    },
    [],
  );

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
              onClick={() => handleEditReservation(r.id)}
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
    [handleViewReservation, handleEditReservation],
  );

  const renderReservationDetails = (r: AdminReservation) => {
    const { prize, amountLabel, expiryLabel, discountValue, totalBefore } =
      extractWheelPrizeDisplay(r.wheelPrize, r.wheelPrizeDiscount, r.totalBeforeWheelPrize);

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-700 font-dm-sans">
        <div className="flex items-center space-x-2">
          <span className="font-bold">Preț per zi:</span>
          <span>{formatEuro(r.pricePerDay ?? 0)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-bold">Zile:</span>
          <span>{r.days}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-bold">Servicii:</span>
          <span>{formatEuro(r.servicesPrice ?? 0)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-bold">Subtotal:</span>
          <span>{formatEuro(r.subTotal ?? 0)}</span>
        </div>
        {typeof totalBefore === "number" && (
          <div className="flex items-center space-x-2">
            <span className="font-bold">Total înainte premiu:</span>
            <span>{formatEuro(totalBefore)}</span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <span className="font-bold">Roata Norocului:</span>
          <span>{prize ? prize.title : "—"}</span>
        </div>
        {prize && amountLabel && (
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <span className="font-semibold">Valoare premiu:</span>
            <span>{amountLabel}</span>
          </div>
        )}
        {prize && discountValue > 0 && (
          <div className="flex items-center space-x-2">
            <span className="font-semibold">Reducere premiu:</span>
            <span>-{formatEuro(discountValue)}</span>
          </div>
        )}
        {prize && expiryLabel && (
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <span className="font-semibold">Valabil până la:</span>
            <span>{expiryLabel}</span>
          </div>
        )}
        {r.discountCode && (
          <div className="flex items-center space-x-2">
            <span className="font-semibold">Reducere:</span>
            <span>{formatEuro(r.couponAmount ?? 0)}</span>
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
  };

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
                          {formatEuro(selectedReservation.pricePerDay ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-dm-sans text-gray-600">
                          Servicii:
                        </span>
                        <span className="font-dm-sans text-gray-900">
                          {formatEuro(selectedReservation.servicesPrice ?? 0)}
                        </span>
                      </div>
                      {typeof selectedTotalBeforeWheelPrize === "number" && (
                        <div className="flex items-center justify-between">
                          <span className="font-dm-sans text-gray-600">
                            Total înainte premiu:
                          </span>
                          <span className="font-dm-sans text-gray-900">
                            {formatEuro(selectedTotalBeforeWheelPrize)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-dm-sans text-gray-600">
                          Premiu Roata Norocului:
                        </span>
                        <div className="text-right">
                          <p className="font-dm-sans text-gray-900">
                            {selectedWheelPrize ? selectedWheelPrize.title : "—"}
                          </p>
                          {selectedWheelPrizeAmountLabel && (
                            <p className="text-xs text-gray-500">
                              {selectedWheelPrizeAmountLabel}
                            </p>
                          )}
                          {selectedWheelPrizeExpiry && (
                            <p className="text-xs text-gray-500">
                              Valabil până la {selectedWheelPrizeExpiry}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedWheelPrizeDiscount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-dm-sans text-gray-600">
                            Reducere premiu:
                          </span>
                          <span className="font-dm-sans text-gray-900">
                            -{formatEuro(selectedWheelPrizeDiscount)}
                          </span>
                        </div>
                      )}
                      {typeof selectedReservation.discount === "number" &&
                        selectedReservation.discount > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="font-dm-sans text-gray-600">
                              Discount:
                            </span>
                            <span className="font-dm-sans text-gray-900">
                              -{formatEuro(selectedReservation.discount)}
                            </span>
                          </div>
                        )}
                      <div className="flex items-center justify-between">
                        <span className="font-dm-sans text-gray-600">
                          Total:
                        </span>
                        <span className="font-dm-sans font-bold text-berkeley text-lg">
                          {formatEuro(selectedReservation.total ?? 0)}
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
                  onClick={() => handleEditReservation(selectedReservation.id)}
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
            onUpdated={fetchBookings}
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
