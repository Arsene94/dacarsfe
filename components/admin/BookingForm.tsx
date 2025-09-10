"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchSelect } from "@/components/ui/search-select";
import { Button } from "@/components/ui/button";
import { Popup } from "@/components/ui/popup";
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

    useEffect(() => {
        if (!carSearchActive) return;
        const handler = setTimeout(() => {
            fetchCars(carSearch);
        }, 300);
        return () => clearTimeout(handler);
    }, [carSearch, fetchCars, carSearchActive]);

    const handleDiscount = (
        discountType: string,
        discount: number,
        price_per_day: number,
        days: number,
        total: number,
    ): number => {
        if (discountType === "per_day") {
            return Math.round(discount * days); // total discount value
        } else if (discountType === "days") {
            return Math.round(price_per_day * discount); // value of free days
        } else if (discountType === "per_total") {
            return Math.round(total * (discount / 100)); // percentage of total
        } else if (discountType === "code") {
            return Math.round(discount); // flat discount
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

    const handleCarSearchOpen = useCallback(() => {
        setCarSearchActive(true);
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
                        <label className="text-sm font-dm-sans font-semibold text-gray-700">
                            Dată preluare
                        </label>
                        <Input
                            type="datetime-local"
                            value={bookingInfo.rental_start_date}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    rental_start_date: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="text-sm font-dm-sans font-semibold text-gray-700">
                            Dată returnare
                        </label>
                        <Input
                            type="datetime-local"
                            value={bookingInfo.rental_end_date}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    rental_end_date: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-sm font-dm-sans font-semibold text-gray-700">
                            Mașină
                        </label>
                        <SearchSelect
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
                                    <div className="text-left">
                                        <div className="font-dm-sans font-semibold">{car.name}</div>
                                        <div className="text-xs">
                                            {car.license_plate} • {car.transmission?.name} • {car.fuel?.name}
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
                        <label className="text-sm font-dm-sans font-semibold text-gray-700">
                            Nume client
                        </label>
                        <Input
                            type="text"
                            value={bookingInfo.customer_name}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    customer_name: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="text-sm font-dm-sans font-semibold text-gray-700">
                            Email
                        </label>
                        <Input
                            type="email"
                            value={bookingInfo.customer_email}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    customer_email: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="text-sm font-dm-sans font-semibold text-gray-700">
                            Telefon
                        </label>
                        <Input
                            type="text"
                            value={bookingInfo.customer_phone}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    customer_phone: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="text-sm font-dm-sans font-semibold text-gray-700">
                            Cu depozit
                        </label>
                        <Select
                            value={bookingInfo.with_deposit ? "1" : "0"}
                            onValueChange={(v) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    with_deposit: v === "1",
                                })
                            }
                        >
                            <option value="0">Nu</option>
                            <option value="1">Da</option>
                        </Select>
                    </div>

                    <div>
                        <label className="text-sm font-dm-sans font-semibold text-gray-700">
                            Cod cupon
                        </label>
                        <Input
                            type="text"
                            value={bookingInfo.coupon_code || ""}
                            onChange={(e) =>
                                setBookingInfo({
                                    ...bookingInfo,
                                    coupon_code: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="text-sm font-dm-sans font-semibold text-gray-700">
                            Notițe
                        </label>
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

                    <div>
                        <label className="text-sm font-dm-sans font-semibold text-gray-700">
                            Status
                        </label>
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

                <div className="w-1/3 h-fit sticky top-0 space-y-2 p-4 border border-gray-300 rounded-lg bg-gray-50">
                    <div className="font-dm-sans text-sm">
                        Preț per zi: {bookingInfo.price_per_day}€ x {bookingInfo.days} zile
                    </div>
                    {bookingInfo.discount_applied > 0 && (
                        <div className="font-dm-sans text-sm">
                            Discount: {bookingInfo.discount_applied}€
                        </div>
                    )}
                    {bookingInfo.total_services > 0 && (
                        <div className="font-dm-sans text-sm">
                            Total Servicii: {bookingInfo.total_services}€
                        </div>
                    )}
                    <div className="font-dm-sans text-sm">
                        Subtotal: {bookingInfo.sub_total}€
                    </div>
                    {bookingInfo.discount_applied > 0 && bookingInfo.coupon_type && (
                        <div className="font-dm-sans text-sm">
                            Detalii discount:
                            {bookingInfo.coupon_type === 'per_day' ? (
                                <ul className="list-disc">
                                    <li className="ms-5">
                                        Preț per zi: {Math.round(bookingInfo.price_per_day - bookingInfo.coupon_amount)}€
                                    </li>
                                    <li className="ms-5">
                                        Discount aplicat: {bookingInfo.discount_applied}€
                                    </li>
                                </ul>
                            ) : (
                                <div>
                                    Discount aplicat: {bookingInfo.discount_applied}€
                                </div>
                            )}
                        </div>
                    )}
                    {bookingInfo.advance_payment !== 0 && (
                        <>
                            <div className="font-dm-sans text-sm">
                                Avans: {bookingInfo.advance_payment}€
                            </div>
                            <div className="font-dm-sans text-sm font-semibold">
                                Rest de plată: {bookingInfo.total - bookingInfo.advance_payment}€
                            </div>
                        </>
                    )}
                    <div className="font-dm-sans text-sm font-semibold">
                        Total: {bookingInfo.total}€
                    </div>
                </div>
            </div>
            <div className="flex justify-between mt-6">
                <div className="space-x-2">
                    <Button className="!px-4 py-4" variant="danger" onClick={onClose}>
                        Anulează
                    </Button>
                    <Button className="!px-4 py-4" onClick={onClose}>
                        Salvează
                    </Button>
                </div>
            </div>
        </Popup>
    );
};

export default BookingForm;

