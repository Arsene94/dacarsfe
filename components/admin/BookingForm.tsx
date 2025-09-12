"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchSelect } from "@/components/ui/search-select";
import { Button } from "@/components/ui/button";
import { Popup } from "@/components/ui/popup";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/api";

const STORAGE_BASE =
    process.env.NEXT_PUBLIC_STORAGE_URL ?? "https://backend.dacars.ro/storage";

const parsePrice = (raw: any): number => {
    if (raw == null) return 0;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
    const parsed = parseFloat(String(raw).replace(/[^\d.,]/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
};

interface BookingFormProps {
    open: boolean;
    onClose: () => void;
    bookingInfo: any;
    setBookingInfo: (info: any) => void;
    onUpdated?: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({
    open,
    onClose,
    bookingInfo,
    setBookingInfo,
    onUpdated,
}) => {
    const [carSearch, setCarSearch] = useState("");
    const [carResults, setCarResults] = useState<any[]>([]);
    const [carSearchActive, setCarSearchActive] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [selectedServices, setSelectedServices] = useState<number[]>([]);

    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [customerSearchActive, setCustomerSearchActive] = useState(false);
    const [quote, setQuote] = useState<any | null>(null);
    const originalTotals = useRef<{ subtotal: number; total: number }>({
        subtotal: 0,
        total: 0,
    });

    const fetchCars = useCallback(
        async (query: string) => {
            try {
                const resp = await apiClient.getCars({
                    search: query,
                    start_date: bookingInfo?.rental_start_date,
                    end_date: bookingInfo?.rental_end_date,
                    limit: 100,
                });
                const list = Array.isArray(resp?.data)
                    ? resp.data
                    : Array.isArray(resp)
                        ? resp
                        : Array.isArray(resp?.items)
                            ? resp.items
                            : [];
                const normalized = list.map((c: any) => ({
                    ...c,
                    license_plate:
                        c.license_plate || c.licensePlate || c.plate || "",
                    transmission: c.transmission?.name
                        ? c.transmission
                        : { name: c.transmission_name || c.transmission || "" },
                    fuel: c.fuel?.name
                        ? c.fuel
                        : { name: c.fuel_name || c.fuel || "" },
                }));
                setCarResults(normalized);
            } catch (error) {
                console.error("Error searching cars:", error);
            }
        },
        [bookingInfo?.rental_start_date, bookingInfo?.rental_end_date],
    );

    const fetchCustomers = useCallback(async (query: string) => {
        try {
            const resp = await apiClient.searchCustomersByPhone(query);
            const list = Array.isArray(resp)
                ? resp.flatMap((row: any) =>
                      (row.phones || []).map((phone: string) => {
                          return {
                              name: row.latest?.name || row.names?.[0] || "",
                              email: row.email,
                              phone,
                          };
                      })
                  )
                : [];
            setCustomerResults(list);
        } catch (error) {
            console.error("Error searching customers:", error);
        }
    }, []);

    useEffect(() => {
        const quotePrice = async () => {
            try {
                const data = await apiClient.quotePrice({
                    car_id: bookingInfo.car_id,
                    rental_start_date: bookingInfo.rental_start_date,
                    rental_end_date: bookingInfo.rental_end_date,
                    base_price: bookingInfo.base_price,
                    base_price_casco: bookingInfo.base_price_casco,
                    original_price_per_day: bookingInfo.original_price_per_day,
                    coupon_type: bookingInfo.coupon_type,
                    coupon_amount: bookingInfo.coupon_amount,
                    coupon_code: bookingInfo.coupon_code,
                    service_ids: bookingInfo.service_ids ?? [],
                    with_deposit: bookingInfo.with_deposit,
                });
                setQuote(data);
                setBookingInfo((prev: any) => ({
                    ...prev,
                    days: data.days,
                    price_per_day: data.price_per_day,
                    base_price: data.rental_rate,
                    base_price_casco: data.rental_rate_casco,
                    sub_total: prev.with_deposit
                        ? data.sub_total
                        : data.sub_total_casco,
                    total: prev.with_deposit ? data.total : data.total_casco,
                    discount_applied: data.discount,
                    total_services: data.total_services,
                }));
            } catch (error) {
                console.error("Error quoting price:", error);
            }
        };

        if (
            bookingInfo?.car_id &&
            bookingInfo?.rental_start_date &&
            bookingInfo?.rental_end_date
        ) {
            quotePrice();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        bookingInfo.car_id,
        bookingInfo.rental_start_date,
        bookingInfo.rental_end_date,
        bookingInfo.coupon_type,
        bookingInfo.coupon_amount,
        bookingInfo.coupon_code,
        bookingInfo.service_ids,
        bookingInfo.with_deposit,
    ]);


    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await apiClient.getServices();
                const list = Array.isArray(res?.data)
                    ? res.data
                    : Array.isArray(res)
                        ? res
                        : [];
                const mapped = list.map((s: any) => ({
                    id: s.id,
                    name: s.name ?? "",
                    price: parsePrice(s.price),
                }));
                setServices(mapped);
            } catch (error) {
                console.error("Error fetching services:", error);
            }
        };

        fetchServices();
    }, []);

    useEffect(() => {
        if (!carSearchActive) return;

        if (bookingInfo.rental_start_date.trim().length < 0 || bookingInfo.rental_end_date.trim().length < 0) return;
        const handler = setTimeout(() => {
            fetchCars(carSearch);
        }, 300);
        return () => clearTimeout(handler);
    }, [carSearch, fetchCars, carSearchActive, bookingInfo.rental_start_date, bookingInfo.rental_end_date]);

    useEffect(() => {
        if (!customerSearchActive) return;
        if (customerSearch.trim().length === 0) {
            setCustomerResults([]);
            return;
        }
        const handler = setTimeout(() => {
            fetchCustomers(customerSearch);
        }, 300);
        return () => clearTimeout(handler);
    }, [customerSearch, fetchCustomers, customerSearchActive]);

    // Populate customer details only when a suggestion is selected

    const recalcTotals = useCallback((info: any) => {
        const type =
            info.coupon_type === "per_total"
                ? "from_total"
                : info.coupon_type || "fixed_per_day";

        const updated: any = {
            ...info,
            coupon_type: type,
        };

        if (type === "fixed_per_day" && info.coupon_amount != null) {
            const amount = parsePrice(info.coupon_amount);
            updated.base_price = amount;
            updated.base_price_casco = amount;
        } else if (info.original_price_per_day != null) {
            const original = parsePrice(info.original_price_per_day);
            updated.base_price = original;
            updated.base_price_casco = original;
        }

        return updated;
    }, []);

    useEffect(() => {
        if (!open || !bookingInfo.car_id) return;
        if (
            bookingInfo.car_license_plate &&
            bookingInfo.car_transmission &&
            bookingInfo.car_fuel
        )
            return;
        let ignore = false;
        const load = async () => {
            try {
                const res = await apiClient.getCarForBooking({
                    car_id: bookingInfo.car_id,
                    start_date: bookingInfo.rental_start_date,
                    end_date: bookingInfo.rental_end_date,
                });
                const car = Array.isArray(res?.data)
                    ? res.data[0]
                    : Array.isArray(res)
                        ? res[0]
                        : res;
                if (!car || ignore) return;
                const price = parsePrice(
                    car.rental_rate ?? bookingInfo.price_per_day,
                );
                const updated = {
                    car_name: car.name ?? bookingInfo.car_name,
                    car_image:
                        car.image_preview ||
                        car.image ||
                        bookingInfo.car_image ||
                        "",
                    car_license_plate:
                        car.license_plate ||
                        car.licensePlate ||
                        car.plate ||
                        "",
                    car_transmission:
                        typeof car.transmission === "string"
                            ? car.transmission
                            : car.transmission?.name ||
                              car.transmission_name ||
                              "",
                    car_fuel:
                        typeof car.fuel === "string"
                            ? car.fuel
                            : car.fuel?.name || car.fuel_name || "",
                    price_per_day: price,
                    base_price: parsePrice(car.rental_rate),
                    base_price_casco: parsePrice(car.rental_rate_casco),
                };
                setBookingInfo((prev: any) =>
                    recalcTotals({ ...prev, ...updated }),
                );
            } catch (err) {
                console.error("Error loading car:", err);
            }
        };
        load();
        return () => {
            ignore = true;
        };
    }, [
        open,
        bookingInfo.car_id,
        bookingInfo.car_license_plate,
        bookingInfo.car_transmission,
        bookingInfo.car_fuel,
        bookingInfo.car_image,
        bookingInfo.car_name,
        bookingInfo.price_per_day,
        bookingInfo.rental_start_date,
        bookingInfo.rental_end_date,
        recalcTotals,
        setBookingInfo,
    ]);

    const handleSelectCar = (car: any) => {
        const price = car?.rental_rate
            ? Number(car.rental_rate)
            : bookingInfo.price_per_day || 0;
        const updated = recalcTotals({
            ...bookingInfo,
            car_id: car.id,
            car_name: car.name,
            car_image: car.image_preview || car.image || "",
            car_license_plate:
                car.license_plate || car.licensePlate || car.plate || "",
            car_transmission:
                typeof car.transmission === "string"
                    ? car.transmission
                    : car.transmission?.name || "",
            car_fuel:
                typeof car.fuel === "string" ? car.fuel : car.fuel?.name || "",
            price_per_day: price,
            base_price: parsePrice(car.rental_rate),
            base_price_casco: parsePrice(car.rental_rate_casco),
        });
        setBookingInfo(updated);
        setCarSearch("");
        setCarResults([]);
    };

    const handleSelectCustomer = (customer: any) => {
        setBookingInfo({
            ...bookingInfo,
            customer_phone: customer.phone || "",
            customer_name: customer.name || "",
            customer_email: customer.email || "",
            customer_id: customer.id ?? bookingInfo.customer_id,
        });
        setCustomerSearch("");
        setCustomerResults([]);
    };

    const handleCarSearchOpen = useCallback(() => {

        setCarSearchActive(true);
    }, []);

    const handleCustomerSearchOpen = useCallback(() => {
        setCustomerSearchActive(true);
    }, []);

    const toggleService = (id: number) => {
        setSelectedServices((prev) =>
            prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
        );
    };

    useEffect(() => {
        const total = selectedServices.reduce((sum, id) => {
            const svc = services.find((s: any) => s.id === id);
            return sum + (svc?.price || 0);
        }, 0);
        setBookingInfo((prev: any) =>
            recalcTotals({
                ...prev,
                service_ids: selectedServices,
                total_services: total,
            }),
        );
    }, [selectedServices, services, recalcTotals, setBookingInfo]);

    useEffect(() => {
        if (!open) return;
        const ids = Array.isArray(bookingInfo?.service_ids)
            ? bookingInfo.service_ids
            : Array.isArray(bookingInfo?.services)
                ? bookingInfo.services.map((s: any) => s.id)
                : [];
        setSelectedServices((prev) =>
            ids.length === prev.length && ids.every((id: any) => prev.includes(id))
                ? prev
                : ids,
        );
    }, [open, bookingInfo?.service_ids, bookingInfo?.services]);

    useEffect(() => {
        if (!open) return;
        originalTotals.current = {
            subtotal: (bookingInfo.sub_total || 0) + (bookingInfo.total_services || 0),
            total:
                bookingInfo.total ||
                (bookingInfo.sub_total || 0) + (bookingInfo.total_services || 0),
        };
        setBookingInfo((prev: any) => recalcTotals(prev));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, recalcTotals, setBookingInfo]);

    if (!bookingInfo) return null;

    const days = quote?.days ?? bookingInfo.days ?? 0;
    const baseRate = bookingInfo.with_deposit
        ? quote?.rental_rate ?? bookingInfo.price_per_day ?? 0
        : quote?.rental_rate_casco ?? bookingInfo.price_per_day ?? 0;
    const discountedRate = quote?.price_per_day ?? baseRate;
    const discountedSubtotal = bookingInfo.with_deposit
        ? quote?.sub_total ?? 0
        : quote?.sub_total_casco ?? 0;
    const discount = quote?.discount ?? 0;
    const discountedTotal = bookingInfo.with_deposit
        ? quote?.total ?? 0
        : quote?.total_casco ?? 0;
    const originalSubtotal =
        originalTotals.current.subtotal || discountedSubtotal;
    const originalTotal = originalTotals.current.total || discountedTotal;
    const restToPay = discountedTotal - (bookingInfo.advance_payment || 0);

    const handleUpdateBooking = async () => {
        try {
            await apiClient.updateBooking(bookingInfo.id, bookingInfo);
            onClose();
            onUpdated?.();
        } catch (error) {
            console.error("Failed to update booking:", error);
        }
    }

    return (
        <Popup
            open={open}
            onClose={onClose}
            className="max-w-5xl w-full max-h-[80vh] overflow-y-auto"
        >
            <h3 className="text-lg font-poppins font-semibold text-berkeley mb-4">
                Editează rezervarea
            </h3>
            <div className="flex items-start gap-6">
                <div className="w-2/3 grid grid-cols-2 gap-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
                    <div>
                        <Label htmlFor="rental-start-date">Dată preluare</Label>
                        <Input
                            id="rental-start-date"
                            type="datetime-local"
                            value={bookingInfo.rental_start_date || ""}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    rental_start_date: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <Label htmlFor="rental-end-date">Dată returnare</Label>
                        <Input
                            id="rental-end-date"
                            type="datetime-local"
                            value={bookingInfo.rental_end_date || ""}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    rental_end_date: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="col-span-2">
                        <Label htmlFor="car-select">Mașină</Label>
                        <SearchSelect
                            id="car-select"
                            value={
                                bookingInfo.car_id
                                    ? {
                                          id: bookingInfo.car_id,
                                          name: bookingInfo.car_name,
                                          image_preview: bookingInfo.car_image,
                                          license_plate: bookingInfo.car_license_plate,
                                          transmission: { name: bookingInfo.car_transmission },
                                          fuel: { name: bookingInfo.car_fuel },
                                      }
                                    : null
                            }
                            search={carSearch}
                            items={carResults}
                            onSearch={setCarSearch}
                            onSelect={handleSelectCar}
                            onOpen={handleCarSearchOpen}
                            placeholder="Selectează mașina"
                            renderItem={(car) => (
                                <>
                                    <Image
                                        src={
                                            car.image_preview || car.image
                                                ?
                                                      STORAGE_BASE +
                                                      "/" +
                                                      (car.image_preview || car.image)
                                                : "/images/placeholder-car.svg"
                                        }
                                        alt={car.name}
                                        width={64}
                                        height={40}
                                        className="w-16 h-10 object-cover rounded"
                                    />
                                    <div className="flex justify-between items-end w-full">
                                        <div>
                                            <div className="font-dm-sans font-semibold">{car.name}</div>
                                            <div className="text-xs">
                                                {car.license_plate} • {typeof car.transmission === "string"
                                                    ? car.transmission
                                                    : car.transmission?.name} • {typeof car.fuel === "string"
                                                    ? car.fuel
                                                    : car.fuel?.name}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs">Preț cu garanție: {car.rental_rate}€ x {car.days} zile = {car.total_deposit}€</div>
                                            <div className="text-xs">Preț fără garanție: {car.rental_rate_casco}€ x {car.days} zile = {car.total_without_deposit}€</div>
                                        </div>
                                    </div>
                                </>
                            )}
                            itemClassName={(car) =>
                                car.available
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                            }
                            renderValue={(car) => (
                                <div className="flex items-center gap-3">
                                    <Image
                                        src={
                                            car.image_preview || car.image
                                                ?
                                                      STORAGE_BASE +
                                                      "/" +
                                                      (car.image_preview || car.image)
                                                : "/images/placeholder-car.svg"
                                        }
                                        alt={car.name}
                                        width={64}
                                        height={40}
                                        className="w-16 h-10 object-cover rounded"
                                    />
                                    <div className="text-left">
                                        <div className="font-dm-sans font-semibold text-gray-700">{car.name}</div>
                                        <div className="text-xs text-gray-600">
                                            {car.license_plate} • {typeof car.transmission === "string"
                                                ? car.transmission
                                                : car.transmission?.name} • {typeof car.fuel === "string"
                                                ? car.fuel
                                                : car.fuel?.name}
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                    </div>

                      <div>
                          <Label htmlFor="car-deposit">Garantie</Label>
                          <Input
                              id="car-deposit"
                              type="text"
                              value={bookingInfo.car_deposit || 0}
                              onChange={(e) =>
                                  setBookingInfo({
                                      ...bookingInfo,
                                      car_deposit: e.target.value,
                                  })
                              }
                          />
                      </div>

                      <div>
                          <Label htmlFor="customer-name">Nume client</Label>
                          <Input
                              id="customer-name"
                              type="text"
                              value={bookingInfo.customer_name || ""}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    customer_name: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <Label htmlFor="customer-email">Email</Label>
                        <Input
                            id="customer-email"
                            type="email"
                            value={bookingInfo.customer_email || ""}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    customer_email: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <Label htmlFor="customer-phone">Telefon</Label>
                        <SearchSelect
                            id="customer-phone"
                            value={
                                bookingInfo.customer_phone
                                    ? {
                                          id: bookingInfo.customer_id,
                                          name: bookingInfo.customer_name,
                                          phone: bookingInfo.customer_phone,
                                          email: bookingInfo.customer_email,
                                      }
                                    : null
                            }
                            search={customerSearch}
                            items={customerResults}
                            onSearch={(v) => {
                                setCustomerSearch(v);
                                if (!customerSearch && v === "") return;
                                setBookingInfo((prev: any) => ({
                                    ...prev,
                                    customer_phone: v,
                                    customer_id: undefined,
                                }));
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


                    <div className="col-span-2">
                        <Label htmlFor="coupon-type">Tip discount</Label>
                        <Select
                            id="coupon-type"
                            value={bookingInfo.coupon_type || ""}
                            onValueChange={(value) =>
                                setBookingInfo((prev: any) =>
                                    recalcTotals({
                                        ...prev,
                                        coupon_type: value,
                                        coupon_amount: 0,
                                        coupon_code: "",
                                    }),
                                )
                            }
                            placeholder="Selectează"
                        >
                            <option value="fixed_per_day">Pret fix pe zi</option>
                            <option value="per_day">Reducere pret pe zi</option>
                            <option value="days">Zile</option>
                            <option value="from_total">Din total</option>
                            <option value="code">Cupon</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="coupon-value">
                            {bookingInfo.coupon_type === "code" ? "Cod cupon" : "Valoare"}
                        </Label>
                        <Input
                            id="coupon-value"
                            type={bookingInfo.coupon_type === "code" ? "text" : "number"}
                            value={
                                bookingInfo.coupon_type === "code"
                                    ? bookingInfo.coupon_code || ""
                                    : bookingInfo.coupon_amount || ""
                            }
                            onChange={(e) => {
                                const val =
                                    bookingInfo.coupon_type === "code"
                                        ? e.target.value
                                        : Number(e.target.value);
                                setBookingInfo((prev: any) =>
                                    recalcTotals({
                                        ...prev,
                                        coupon_type: prev.coupon_type || "fixed_per_day",
                                        ...((prev.coupon_type || "fixed_per_day") === "code"
                                            ? { coupon_code: val }
                                            : { coupon_amount: val }),
                                    }),
                                );
                            }}
                        />
                    </div>
                    <div>
                        <Label htmlFor="advance-payment">Plată în avans</Label>
                        <Input
                            id="advance-payment"
                            type="number"
                            value={bookingInfo.advance_payment || 0}
                            onChange={(e) =>
                                setBookingInfo((prev: any) =>
                                    recalcTotals({
                                        ...prev,
                                        advance_payment: Number(e.target.value) || 0,
                                    }),
                                )
                            }
                        />
                    </div>

                    <div className="col-span-2">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 mb-2">
                            Servicii suplimentare
                        </h4>
                        <div className="space-y-2">
                            {services.map((s) => (
                                <label key={s.id} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-jade"
                                        checked={selectedServices.includes(s.id)}
                                        onChange={() => toggleService(s.id)}
                                    />
                                    <span className="text-sm text-gray-700">
                                        {s.name} - {s.price}€
                                    </span>
                                </label>
                            ))}
                            {services.length === 0 && (
                                <p className="text-sm text-gray-600">Niciun serviciu disponibil</p>
                            )}
                        </div>
                    </div>

                    <div className="col-span-2">
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
                                    checked={!!bookingInfo.with_deposit}
                                    onChange={() =>
                                        setBookingInfo((prev: any) =>
                                            recalcTotals({
                                                ...prev,
                                                with_deposit: true,
                                                price_per_day:
                                                    quote?.rental_rate != null
                                                        ? parsePrice(quote.rental_rate)
                                                        : prev.price_per_day,
                                                original_price_per_day:
                                                    quote?.rental_rate != null
                                                        ? parsePrice(quote.rental_rate)
                                                        : prev.original_price_per_day,
                                            }),
                                        )
                                    }
                                    className="mt-1 h-4 w-4 text-jade focus:ring-jade border-gray-300"
                                />
                                <div>
                                    <div className="font-dm-sans font-medium text-gray-900">
                                        Plan cu Garanție
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Alege acest plan și achită o garanție în valoare de: {bookingInfo.car_deposit ?? 0}€ pentru închiriere.
                                    </p>
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
                                    checked={!bookingInfo.with_deposit}
                                    onChange={() =>
                                        setBookingInfo((prev: any) =>
                                            recalcTotals({
                                                ...prev,
                                                with_deposit: false,
                                                price_per_day:
                                                    quote?.rental_rate_casco != null
                                                        ? parsePrice(quote.rental_rate_casco)
                                                        : prev.price_per_day,
                                                original_price_per_day:
                                                    quote?.rental_rate_casco != null
                                                        ? parsePrice(quote.rental_rate_casco)
                                                        : prev.original_price_per_day,
                                            }),
                                        )
                                    }
                                    className="mt-1 h-4 w-4 text-jade focus:ring-jade border-gray-300"
                                />
                                <div>
                                    <div className="font-dm-sans font-medium text-gray-900">
                                        Plan fără garanție
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Alege acest plan dacă nu vrei să plătești garanție pentru închiriere.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="w-1/3 h-fit space-y-2">
                    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 border-b border-gray-300 pb-2">
                            Publicare
                        </h4>
                        <div className="mt-2 space-x-2">
                            <Button className="!px-4 py-4" onClick={handleUpdateBooking}>
                                Salvează
                            </Button>
                            <Button className="!px-4 py-4" variant="danger" onClick={onClose}>
                                Anulează
                            </Button>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 border-b border-gray-300 pb-2">
                            Păstrează prețul vechi
                        </h4>
                        <div className="mt-2">
                            <Input
                                type="checkbox"
                                className="w-5 h-5"
                                checked={bookingInfo.keep_old_price ?? true}
                                onChange={(e) =>
                                    setBookingInfo({
                                        ...bookingInfo,
                                        keep_old_price: e.target.checked,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 border-b border-gray-300 pb-2">
                            Trimite email de confirmare
                        </h4>
                        <div className="mt-2">
                            <Input
                                type="checkbox"
                                className="w-5 h-5"
                                checked={bookingInfo.send_email ?? true}
                                onChange={(e) =>
                                    setBookingInfo({
                                        ...bookingInfo,
                                        send_email: e.target.checked,
                                    })
                                }/>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 border-b border-gray-300 pb-2">
                            Status
                        </h4>
                        <div className="mt-2">
                            <Select
                                value={bookingInfo.status || ""}
                                onValueChange={(v) =>
                                    setBookingInfo({
                                        ...bookingInfo,
                                        status: v,
                                    })
                                }
                                placeholder="Selectează status"
                            >
                                <option value="reserved">Rezervat</option>
                                <option value="pending">În așteptare</option>
                                <option value="cancelled">Anulat</option>
                                <option value="completed">Finalizat</option>
                                <option value="no_answer">Fără răspuns</option>
                                <option value="waiting_advance_payment">Așteaptă avans</option>
                            </Select>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 border-b border-gray-300 pb-2">
                            Notițe
                        </h4>
                        <div className="mt-2">
                            <Input
                                type="text"
                                value={bookingInfo.note || ""}
                                onChange={(e) =>
                                    setBookingInfo({
                                        ...bookingInfo,
                                        note: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                        <h4 className="font-dm-sans text-base font-semibold text-gray-700 border-b border-gray-300 pb-2">
                            Rezumat plată
                        </h4>
                        {quote && (
                            <>
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Preț per zi:</span>
                                    <span>{baseRate}€ x {days} zile</span>
                                </div>
                                {quote.total_services > 0 && (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Total Servicii:</span> <span>{quote.total_services}€</span>
                                    </div>
                                )}
                        <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                            <span>Subtotal:</span>
                            <span>{originalSubtotal}€</span>
                        </div>
                        {bookingInfo.advance_payment !== 0 && (
                            <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                <span>Avans:</span> <span>{bookingInfo.advance_payment}€</span>
                            </div>
                        )}
                        <div className="font-dm-sans text-sm font-semibold flex justify-between">
                            <span>Total:</span>
                            <span>{originalTotal}€</span>
                        </div>
                                {discount !== 0 && discountedTotal > 0 && (
                                    <div className="font-dm-sans text-sm">
                                        Detalii discount:
                                        <ul className="list-disc">
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Preț nou pe zi:</span>
                                                <span>{Math.round(discountedRate)}€ x {days} zile</span>
                                            </li>
                                            {discount > 0 && (
                                                <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                    <span>Discount aplicat:</span>
                                                    <span>{discount}€</span>
                                                </li>
                                            )}
                                            <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                                <span>Total:</span>
                                                <span>{discountedTotal}€</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                                {bookingInfo.advance_payment !== 0 && (
                                    <div className="font-dm-sans text-sm font-semibold flex justify-between border-b border-b-1 mb-1">
                                        <span>Rest de plată:</span>
                                        <span>{restToPay}€</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex justify-between mt-6">

            </div>
        </Popup>
    );
};

export default BookingForm;

