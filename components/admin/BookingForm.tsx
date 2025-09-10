"use client";

import React, { useState, useEffect, useCallback } from "react";
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

interface BookingFormProps {
    open: boolean;
    onClose: () => void;
    bookingInfo: any;
    setBookingInfo: (info: any) => void;
}

const BookingForm: React.FC<BookingFormProps> = ({
    open,
    onClose,
    bookingInfo,
    setBookingInfo,
}) => {
    const [carSearch, setCarSearch] = useState("");
    const [carResults, setCarResults] = useState<any[]>([]);
    const [carSearchActive, setCarSearchActive] = useState(false);

    const [customerSearch, setCustomerSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [customerSearchActive, setCustomerSearchActive] = useState(false);

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
                setCarResults(list);
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
            const data = await apiClient.quotePrice(bookingInfo);

            console.log(data);
        }

        quotePrice();
    }, [bookingInfo]);

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

    const handleDiscount = (
        discountType: string,
        discount: number,
        price_per_day: number,
        days: number,
        total: number,
    ): number => {
        if (discountType === "per_day") {
            return Math.round(discount * days);
        } else if (discountType === "days") {
            return Math.round(price_per_day * discount);
        } else if (discountType === "from_total") {
            return Math.round(total * (discount / 100));
        } else if (discountType === "code") {
            return Math.round(discount);
        } else if (discountType === "fixed_per_day") {
            return Math.round((price_per_day - discount) * days);
        }
        return 0;
    };

    const handleSelectCar = (car: any) => {
        const price = car?.rental_rate
            ? Number(car.rental_rate)
            : bookingInfo.price_per_day || 0;
        const subTotal = (bookingInfo.days || 0) * price;
        const discountValue = handleDiscount(
            bookingInfo.coupon_type || "",
            bookingInfo.coupon_amount || 0,
            price,
            bookingInfo.days || 0,
            subTotal + (bookingInfo.total_services || 0),
        );
        const total =
            subTotal + (bookingInfo.total_services || 0) - discountValue;
        setBookingInfo({
            ...bookingInfo,
            car_id: car.id,
            car_name: car.name,
            car_image: car.image_preview || car.image || "",
            car_license_plate: car.license_plate || "",
            car_transmission: car.transmission?.name || "",
            car_fuel: car.fuel?.name || "",
            price_per_day: price,
            sub_total: subTotal,
            discount_applied: discountValue,
            total,
        });
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

    useEffect(() => {
        setBookingInfo((prev: any) => {
            const subTotal =
                (prev.price_per_day || 0) * (prev.days || 0);
            const discountValue = handleDiscount(
                prev.coupon_type || "",
                prev.coupon_amount || 0,
                prev.price_per_day || 0,
                prev.days || 0,
                subTotal + (prev.total_services || 0),
            );
            const total =
                subTotal + (prev.total_services || 0) - discountValue;
            if (
                subTotal === prev.sub_total &&
                total === prev.total &&
                discountValue === prev.discount_applied
            ) {
                return prev;
            }
            return {
                ...prev,
                sub_total: subTotal,
                total,
                discount_applied: discountValue,
            };
        });
    }, [
        bookingInfo.price_per_day,
        bookingInfo.days,
        bookingInfo.coupon_type,
        bookingInfo.coupon_amount,
        bookingInfo.total_services,
        setBookingInfo,
    ]);

    if (!bookingInfo) return null;

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
                                                {car.license_plate} • {car.transmission?.name} • {car.fuel?.name}
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
                                            {car.license_plate} • {car.transmission?.name} • {car.fuel?.name}
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                    </div>

                    <div>
                        <Label htmlFor="car-deposit">Garantie</Label>
                        <Input id="car-deposit"
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


                    <div>
                        <Label htmlFor="coupon-type">Tip discount</Label>
                        <Select
                            id="coupon-type"
                            value={bookingInfo.coupon_type || ""}
                            onValueChange={(value) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    coupon_type: value,
                                    coupon_amount: 0,
                                    coupon_code: "",
                                })
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
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    ...(bookingInfo.coupon_type === "code"
                                        ? { coupon_code: e.target.value }
                                        : { coupon_amount: Number(e.target.value) }),
                                })
                            }
                        />
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
                                        setBookingInfo({
                                            ...bookingInfo,
                                            with_deposit: true,
                                        })
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
                                        setBookingInfo({
                                            ...bookingInfo,
                                            with_deposit: false,
                                        })
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
                            <Button className="!px-4 py-4" onClick={onClose}>
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
                        <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                            <span>Preț per zi:</span> <span>{bookingInfo.price_per_day}€ x {bookingInfo.days} zile</span>
                        </div>
                        {bookingInfo.total_services > 0 && (
                            <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                <span>Total Servicii:</span> <span>{bookingInfo.total_services}€</span>
                            </div>
                        )}
                        <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                            <span>Subtotal:</span> <span>{bookingInfo.sub_total}€</span>
                        </div>
                        {bookingInfo.discount_applied > 0 && bookingInfo.coupon_type && (
                            <div className="font-dm-sans text-sm">
                                Detalii discount:
                                {bookingInfo.coupon_type === 'per_day' || bookingInfo.coupon_type === 'fixed_per_day' ? (
                                    <ul className="list-disc">
                                        <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                            <span>Preț per zi:</span>{' '}
                                            <span>
                                                {bookingInfo.coupon_type === 'per_day'
                                                    ? Math.round(bookingInfo.price_per_day - bookingInfo.coupon_amount)
                                                    : bookingInfo.coupon_amount}
                                                €
                                            </span>
                                        </li>
                                        <li className="ms-5 flex justify-between border-b border-b-1 mb-1">
                                            <span>Discount aplicat:</span> <span>{bookingInfo.discount_applied}€</span>
                                        </li>
                                    </ul>
                                ) : (
                                    <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                        <span>Discount aplicat:</span> <span>{bookingInfo.discount_applied}€</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {bookingInfo.advance_payment !== 0 && (
                            <>
                                <div className="font-dm-sans text-sm flex justify-between border-b border-b-1 mb-1">
                                    <span>Avans:</span> <span>{bookingInfo.advance_payment}€</span>
                                </div>
                                <div className="font-dm-sans text-sm font-semibold flex justify-between border-b border-b-1 mb-1">
                                    <span>Rest de plată:</span> <span>{bookingInfo.total - bookingInfo.advance_payment}€</span>
                                </div>
                            </>
                        )}
                        <div className="font-dm-sans text-sm font-semibold flex justify-between">
                            <span>Total:</span> <span>{bookingInfo.total}€</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-between mt-6">

            </div>
        </Popup>
    );
};

export default BookingForm;

