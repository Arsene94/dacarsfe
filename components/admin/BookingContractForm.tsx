"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import {
  extractFirstCar,
  mapCustomerSearchResults,
  normalizeAdminCarOption,
  resolveContractUrl,
} from "@/lib/adminBookingHelpers";
import type {
  AdminBookingCarOption,
  AdminBookingCustomerSummary,
  AdminReservation,
  BookingContractFormState,
} from "@/types/admin";



interface BookingContractFormProps {
  open: boolean;
  onClose: () => void;
  reservation?: AdminReservation | null;
}

const EMPTY_FORM: BookingContractFormState = {
  id: "",
  cnp: "",
  license: "",
  bookingNumber: "",
  name: "",
  phone: "",
  email: "",
  start: "",
  end: "",
  car: null,
  deposit: "",
  pricePerDay: "",
  advance: "",
  services: "",
  withDeposit: true,
};

const STORAGE_BASE =
  process.env.NEXT_PUBLIC_STORAGE_URL ?? "https://backend.dacars.ro/storage";

const toLocalDateTimeInput = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const tzOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - tzOffset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toSafeString = (value: unknown): string => {
  if (value == null) {
    return "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
};

const resolveAdminCarName = (car?: AdminBookingCarOption | null): string => {
  if (car && typeof car.name === "string") {
    const trimmed = car.name.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return "Autovehicul";
};

type CarRelation = AdminBookingCarOption["transmission"];

const resolveCarRelationName = (relation: CarRelation): string => {
  if (typeof relation === "string") {
    const trimmed = relation.trim();
    return trimmed.length > 0 ? trimmed : "";
  }

  if (relation && typeof relation === "object" && "name" in relation) {
    const name = (relation as { name?: unknown }).name;
    if (typeof name === "string") {
      const trimmed = name.trim();
      return trimmed.length > 0 ? trimmed : "";
    }
  }

  return "";
};

const BookingContractForm: React.FC<BookingContractFormProps> = ({ open, onClose, reservation }) => {
  const [form, setForm] = useState<BookingContractFormState>(EMPTY_FORM);
  const [carSearch, setCarSearch] = useState("");
  const [carResults, setCarResults] = useState<AdminBookingCarOption[]>([]);
  const [carSearchActive, setCarSearchActive] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<AdminBookingCustomerSummary[]>([]);
  const [customerSearchActive, setCustomerSearchActive] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const revokeRef = useRef<(() => void) | undefined>();

  useEffect(() => {
    const bookingNumber = reservation?.bookingNumber ?? reservation?.id ?? "";
    const nextForm: BookingContractFormState = {
      ...EMPTY_FORM,
      id: reservation?.id ?? EMPTY_FORM.id,
      bookingNumber: bookingNumber ? String(bookingNumber) : "",
    };

    if (reservation) {
      nextForm.name = reservation.customerName ?? "";
      nextForm.phone = reservation.phone ?? "";
      nextForm.email = reservation.email ?? "";
      nextForm.start = toLocalDateTimeInput(reservation.startDate);
      nextForm.end = toLocalDateTimeInput(reservation.endDate);
      nextForm.pricePerDay = toSafeString(reservation.pricePerDay);
      nextForm.services = toSafeString(reservation.servicesPrice);
      if (typeof reservation.plan === "number") {
        nextForm.withDeposit = reservation.plan !== 2;
      }
    }

    setForm(nextForm);
    setCarSearch("");
    setCarResults([]);
    setCarSearchActive(false);
    setCustomerSearch("");
    setCustomerResults([]);
    setCustomerSearchActive(false);
    revokeRef.current?.();
    revokeRef.current = undefined;
    setPdfUrl(null);
  }, [reservation, open]);

  useEffect(() => {
    if (!open || !reservation?.carId) {
      return;
    }

    let cancelled = false;

    const loadCar = async () => {
      try {
        const response = await apiClient.getCarForBooking({
          car_id: reservation.carId,
          start_date: reservation.startDate,
          end_date: reservation.endDate,
        });
        const car = extractFirstCar(response);
        if (!car || cancelled) {
          return;
        }

        const normalized = normalizeAdminCarOption(car);
        setForm((prev) => ({
          ...prev,
          car: { ...normalized },
          pricePerDay:
            prev.pricePerDay || toSafeString(normalized.rental_rate ?? reservation.pricePerDay),
          deposit: prev.deposit || toSafeString(normalized.total_deposit ?? normalized.deposit),
        }));
      } catch (error) {
        console.error("Error loading car for contract:", error);
      }
    };

    void loadCar();

    return () => {
      cancelled = true;
    };
  }, [open, reservation?.carId, reservation?.startDate, reservation?.endDate, reservation?.pricePerDay]);

  const fetchCars = useCallback(
    async (query: string) => {
      try {
        const resp = await apiClient.getCars({
          search: query,
          start_date: form.start,
          end_date: form.end,
          limit: 100,
        });
        const list = extractList(resp).map(normalizeAdminCarOption);
        setCarResults(list);
      } catch (error) {
        console.error("Error searching cars:", error);
      }
    },
    [form.start, form.end]
  );

  const fetchCustomers = useCallback(async (query: string) => {
    try {
      const resp = await apiClient.searchCustomersByPhone(query);
      const records = Array.isArray(resp) ? resp : extractList(resp);
      const list = mapCustomerSearchResults(records);
      setCustomerResults(list);
    } catch (error) {
      console.error("Error searching customers:", error);
    }
  }, []);

  useEffect(() => {
    if (!carSearchActive) return;
    const handler = setTimeout(() => fetchCars(carSearch), 300);
    return () => clearTimeout(handler);
  }, [carSearch, carSearchActive, fetchCars]);

  useEffect(() => {
    if (!customerSearchActive) return;
    if (customerSearch.trim().length === 0) {
      setCustomerResults([]);
      return;
    }
    const handler = setTimeout(() => fetchCustomers(customerSearch), 300);
    return () => clearTimeout(handler);
  }, [customerSearch, fetchCustomers, customerSearchActive]);

  const handleSelectCar = (car: AdminBookingCarOption) => {
    setForm((prev) => ({
      ...prev,
      car: { ...car },
      pricePerDay: prev.pricePerDay || toSafeString(car.rental_rate),
      deposit: prev.deposit || toSafeString(car.total_deposit ?? car.deposit),
    }));
  };

  const handleSelectCustomer = (customer: AdminBookingCustomerSummary) => {
    setForm((prev) => ({
      ...prev,
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
    }));
    setCustomerSearch("");
    setCustomerResults([]);
  };

  const handleChange = <Field extends keyof BookingContractFormState>(field: Field) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleCustomerSearchOpen = useCallback(() => {
    setCustomerSearchActive(true);
  }, []);

  const applyContractResponse = useCallback(
    (response: Parameters<typeof resolveContractUrl>[0]) => {
      const resolved = resolveContractUrl(response);
      revokeRef.current?.();
      revokeRef.current = resolved.revoke;

      if (resolved.url) {
        const finalUrl = resolved.url.startsWith("blob:")
          ? resolved.url
          : `/api/proxy?url=${encodeURIComponent(resolved.url)}`;

        setPdfUrl(finalUrl);
      } else {
        setPdfUrl(null);
      }
    },
    [],
  );

  const generateContract = async () => {
    try {
      // build payload explicitly to avoid carrying over read-only properties
      const payload = {
        id: form.id,
        cnp: form.cnp,
        license: form.license,
        bookingNumber: form.bookingNumber,
        name: form.name,
        phone: form.phone,
        email: form.email,
        start: form.start,
        end: form.end,
        car_id: form.car?.id,
        deposit: form.deposit,
        pricePerDay: form.pricePerDay,
        advance: form.advance,
        services: form.services,
        withDeposit: form.withDeposit,
      };
      const cleanPayload = JSON.parse(JSON.stringify(payload)) as typeof payload;

      const response =
        form.name.trim().length > 0 && form.email.trim().length > 0
          ? await apiClient.generateContract(cleanPayload)
          : await apiClient.generateContract(cleanPayload, form.id);

      applyContractResponse(response);
    } catch (error) {
      console.error(error);
    }
  };

  const storeAndGenerateContract = async () => {
    try {
      const payload = {
        cnp: form.cnp,
        license: form.license,
        bookingNumber: form.bookingNumber,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: form.email,
        rental_start_date: form.start,
        rental_end_date: form.end,
        car_id: form.car?.id,
        deposit: form.deposit,
        price_per_day: form.pricePerDay,
        advance_payment: form.advance,
        services: form.services,
        withDeposit: form.withDeposit,
      };
      const cleanPayload = JSON.parse(JSON.stringify(payload)) as typeof payload;
      const response = await apiClient.storeAndGenerateContract(cleanPayload);
      applyContractResponse(response);
    } catch (error) {
      console.error("Eroare:", error);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "contract.pdf";
    link.rel = "noopener";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!pdfUrl) {
      return;
    }

    const printWindow = window.open(pdfUrl, "_blank", "noopener,noreferrer");
    if (!printWindow) {
      return;
    }

    const handleLoad = () => {
      printWindow.print();
      printWindow.removeEventListener("load", handleLoad);
    };

    printWindow.addEventListener("load", handleLoad);
  };

  useEffect(() => {
    return () => {
      revokeRef.current?.();
      revokeRef.current = undefined;
    };
  }, []);

  return (
    <Popup
      open={open}
      onClose={onClose}
      className="max-w-5xl max-h-[95vh] overflow-y-auto"
    >
      {reservation ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <Label htmlFor="cnp">CNP</Label>
            <Input id="cnp" value={form.cnp} onChange={handleChange("cnp")} />
          </div>
          <div>
            <Label htmlFor="license">Număr permis</Label>
            <Input id="license" value={form.license} onChange={handleChange("license")} />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-2 lg:flex-row lg:justify-end">
            <Button variant="outline" onClick={generateContract}>Generează contract</Button>
            <Button variant="danger" onClick={onClose}>Închide</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <Label htmlFor="cnp">CNP</Label>
            <Input id="cnp" value={form.cnp} onChange={handleChange("cnp")} />
          </div>
          <div>
            <Label htmlFor="license">Număr permis</Label>
            <Input id="license" value={form.license} onChange={handleChange("license")} />
          </div>
          <div>
            <Label htmlFor="booking-number">Număr rezervare</Label>
            <Input
              id="booking-number"
              value={form.bookingNumber}
              onChange={handleChange("bookingNumber")}
            />
          </div>
          <div>
            <Label htmlFor="name">Nume</Label>
            <Input id="name" value={form.name} onChange={handleChange("name")} />
          </div>
          <div>
            <Label htmlFor="phone">Număr telefon</Label>
            <SearchSelect<AdminBookingCustomerSummary>
              id="phone"
              value={
                form.phone
                  ? {
                      id: undefined,
                      name: form.name,
                      phone: form.phone,
                      email: form.email,
                    }
                  : null
              }
              search={customerSearch}
              items={customerResults}
              onSearch={(v) => {
                const previousSearch = customerSearch;
                setCustomerSearch(v);
                if (!previousSearch && v === "") return;
                setForm((prev) => ({ ...prev, phone: v }));
              }}
              onSelect={handleSelectCustomer}
              onOpen={handleCustomerSearchOpen}
              placeholder="Selectează clientul"
              renderItem={(user) => (
                <div>
                  <div className="font-dm-sans font-semibold">{user.name}</div>
                  <div className="text-xs">{user.phone} • {user.email}</div>
                </div>
              )}
              renderValue={(user) => <span>{user.phone}</span>}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={form.email} onChange={handleChange("email")} />
          </div>
          <div>
            <Label htmlFor="start">Data început</Label>
            <Input
              id="start"
              type="datetime-local"
              value={form.start}
              onChange={handleChange("start")}
            />
          </div>
          <div>
            <Label htmlFor="end">Data sfârșit</Label>
            <Input
              id="end"
              type="datetime-local"
              value={form.end}
              onChange={handleChange("end")}
            />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="car-select">Mașină</Label>
            <SearchSelect<AdminBookingCarOption>
              id="car-select"
              value={form.car}
              search={carSearch}
              items={carResults}
              onSearch={setCarSearch}
              onSelect={handleSelectCar}
              onOpen={() => setCarSearchActive(true)}
              placeholder="Selectează mașina"
              renderItem={(car) => {
                const carName = resolveAdminCarName(car);
                const transmissionLabel = resolveCarRelationName(car.transmission);
                const fuelLabel = resolveCarRelationName(car.fuel);
                const imagePath = car.image_preview || car.image;

                return (
                  <>
                    <Image
                      src={
                        imagePath
                          ? STORAGE_BASE + "/" + imagePath
                          : "/images/placeholder-car.svg"
                      }
                      alt={carName}
                      width={64}
                      height={40}
                      className="w-16 h-10 object-cover rounded"
                    />
                    <div className="flex justify-between items-end w-full">
                      <div>
                        <div className="font-dm-sans font-semibold">{carName}</div>
                        <div className="text-xs">
                          {car.license_plate} • {transmissionLabel} • {fuelLabel}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs">
                          Preț cu garanție: {toSafeString(car.rental_rate)}€ x {toSafeString(car.days)} zile ={" "}
                          {toSafeString(car.total_deposit)}€
                        </div>
                        <div className="text-xs">
                          Preț fără garanție: {toSafeString(car.rental_rate_casco)}€ x {toSafeString(car.days)} zile ={" "}
                          {toSafeString(car.total_without_deposit)}€
                        </div>
                      </div>
                    </div>
                  </>
                );
              }}
              itemClassName={(car) =>
                car.available
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }
              renderValue={(car) => {
                const carName = resolveAdminCarName(car);
                const transmissionLabel = resolveCarRelationName(car.transmission);
                const fuelLabel = resolveCarRelationName(car.fuel);
                const imagePath = car.image_preview || car.image;

                return (
                  <div className="flex items-center gap-3">
                    <Image
                      src={
                        imagePath
                          ? STORAGE_BASE + "/" + imagePath
                          : "/images/placeholder-car.svg"
                      }
                      alt={carName}
                      width={64}
                      height={40}
                      className="w-16 h-10 object-cover rounded"
                    />
                    <div className="text-left">
                      <div className="font-dm-sans font-semibold text-gray-700">{carName}</div>
                      <div className="text-xs text-gray-600">
                        {car.license_plate} • {transmissionLabel} • {fuelLabel}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </div>
          <div>
            <Label htmlFor="deposit">Garanție</Label>
            <Input id="deposit" value={form.deposit} onChange={handleChange("deposit")} />
          </div>
          <div>
            <Label htmlFor="price">Preț per zi</Label>
            <Input id="price" value={form.pricePerDay} onChange={handleChange("pricePerDay")} />
          </div>
          <div>
            <Label htmlFor="advance">Avans plătit</Label>
            <Input id="advance" value={form.advance} onChange={handleChange("advance")} />
          </div>
          <div>
            <Label htmlFor="services">Servicii suplimentare</Label>
            <Input id="services" value={form.services} onChange={handleChange("services")} />
          </div>
          <div className="lg:col-span-2">
            <Label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
              Plan de închiriere
            </Label>
            <div className="mt-1 rounded-md border divide-y">
              <label
                htmlFor="with-deposit-yes"
                className="flex cursor-pointer items-start space-x-3 p-4"
              >
                <input
                  id="with-deposit-yes"
                  type="radio"
                  name="withDeposit"
                  checked={form.withDeposit}
                  onChange={() => setForm((prev) => ({ ...prev, withDeposit: true }))}
                  className="mt-1 h-4 w-4 text-jade focus:ring-jade border-gray-300"
                />
                <div>
                  <div className="font-dm-sans font-medium text-gray-900">
                    Plan cu Garanție
                  </div>
                </div>
              </label>
              <label
                htmlFor="with-deposit-no"
                className="flex cursor-pointer items-start space-x-3 p-4"
              >
                <input
                  id="with-deposit-no"
                  type="radio"
                  name="withDeposit"
                  checked={!form.withDeposit}
                  onChange={() => setForm((prev) => ({ ...prev, withDeposit: false }))}
                  className="mt-1 h-4 w-4 text-jade focus:ring-jade border-gray-300"
                />
                <div>
                  <div className="font-dm-sans font-medium text-gray-900">
                    Plan fără garanție
                  </div>
                </div>
              </label>
            </div>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-2 lg:flex-row lg:justify-end">
            <Button variant="outline" onClick={generateContract}>Generează contract</Button>
            <Button variant="blue" onClick={storeAndGenerateContract}>Salvează rezervare & Generează contract</Button>
            <Button variant="danger" onClick={onClose}>Închide</Button>
          </div>
        </div>
      )}
      {pdfUrl && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleDownload}>
              Descarcă
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              Printează
            </Button>
          </div>
          <div className="h-[800px] overflow-hidden rounded border border-gray-200">
            <iframe
              src={pdfUrl}
              title="Contract PDF"
              className="h-full w-full"
              allow="fullscreen"
            />
          </div>
        </div>
      )}
    </Popup>
  );
};

export default BookingContractForm;

