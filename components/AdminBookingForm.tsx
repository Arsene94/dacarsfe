"use client";

import React from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";

const STORAGE_BASE =
    process.env.NEXT_PUBLIC_STORAGE_URL ?? "https://backend.dacars.ro/storage";

interface AdminBookingFormProps {
    bookingInfo: any;
    setBookingInfo: (info: any) => void;
    carResults: any[];
    carSearch: string;
    setCarSearch: (value: string) => void;
    onSelectCar: (car: any) => void;
    onCarSearchOpen: () => void;
}

const AdminBookingForm: React.FC<AdminBookingFormProps> = ({
    bookingInfo,
    setBookingInfo,
    carResults,
    carSearch,
    setCarSearch,
    onSelectCar,
    onCarSearchOpen,
}) => {
    const updateDates = (changes: any) => {
        const updated = { ...bookingInfo, ...changes };
        if (updated.rental_start_date && updated.rental_end_date) {
            const start = new Date(updated.rental_start_date);
            const end = new Date(updated.rental_end_date);
            const diffMs = end.getTime() - start.getTime();
            const days = diffMs > 0 ? Math.ceil(diffMs / 86400000) : 0;
            const subTotal = days * (updated.price_per_day || 0);
            const total =
                subTotal +
                (updated.total_services || 0) -
                (updated.coupon_amount || 0);
            updated.days = days;
            updated.sub_total = subTotal;
            updated.total = total;
        }
        setBookingInfo(updated);
    };

    return (
        <div className="flex items-start gap-6">
            <div className="w-2/3 grid grid-cols-2 gap-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
                <div>
                    <label className="text-sm font-sans font-semibold text-gray-700">
                        Mașină
                    </label>
                    <SearchSelect
                        value=
                            {bookingInfo.car_id
                                ? {
                                      id: bookingInfo.car_id,
                                      name: bookingInfo.car_name,
                                      image_preview: bookingInfo.car_image,
                                      license_plate: bookingInfo.car_license_plate,
                                      transmission: { name: bookingInfo.car_transmission },
                                      fuel: { name: bookingInfo.car_fuel },
                                  }
                                : null}
                        search={carSearch}
                        items={carResults}
                        onSearch={setCarSearch}
                        onSelect={onSelectCar}
                        onOpen={onCarSearchOpen}
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
                                    <div className="font-sans font-semibold">{car.name}</div>
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
                                    <div className="font-sans font-semibold text-gray-700">
                                        {car.name}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {car.license_plate} • {car.transmission?.name} • {car.fuel?.name}
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                </div>
                <div>
                    <label className="text-sm font-sans font-semibold text-gray-700">
                        ID client
                    </label>
                    <Input
                        type="text"
                        value={bookingInfo.customer_id}
                        onChange={(e) =>
                            setBookingInfo({ ...bookingInfo, customer_id: e.target.value })
                        }
                    />
                </div>
                <div>
                    <label className="text-sm font-sans font-semibold text-gray-700">
                        Nume client
                    </label>
                    <Input
                        type="text"
                        value={bookingInfo.customer_name}
                        onChange={(e) =>
                            setBookingInfo({ ...bookingInfo, customer_name: e.target.value })
                        }
                    />
                </div>
                <div>
                    <label className="text-sm font-sans font-semibold text-gray-700">
                        Email
                    </label>
                    <Input
                        type="email"
                        value={bookingInfo.customer_email}
                        onChange={(e) =>
                            setBookingInfo({ ...bookingInfo, customer_email: e.target.value })
                        }
                    />
                </div>
                <div>
                    <label className="text-sm font-sans font-semibold text-gray-700">
                        Telefon
                    </label>
                    <Input
                        type="text"
                        value={bookingInfo.customer_phone}
                        onChange={(e) =>
                            setBookingInfo({ ...bookingInfo, customer_phone: e.target.value })
                        }
                    />
                </div>
                <div>
                    <label className="text-sm font-sans font-semibold text-gray-700">
                        Vârsta client
                    </label>
                    <Input
                        type="number"
                        value={bookingInfo.customer_age}
                        onChange={(e) =>
                            setBookingInfo({ ...bookingInfo, customer_age: e.target.value })
                        }
                    />
                </div>
                <div>
                    <label className="text-sm font-sans font-semibold text-gray-700">
                        Data preluare
                    </label>
                    <Input
                        type="datetime-local"
                        value={bookingInfo.rental_start_date}
                        onChange={(e) => updateDates({ rental_start_date: e.target.value })}
                    />
                </div>
                <div>
                    <label className="text-sm font-sans font-semibold text-gray-700">
                        Data returnare
                    </label>
                    <Input
                        type="datetime-local"
                        value={bookingInfo.rental_end_date}
                        onChange={(e) => updateDates({ rental_end_date: e.target.value })}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={bookingInfo.with_deposit}
                        onChange={(e) =>
                            setBookingInfo({
                                ...bookingInfo,
                                with_deposit: e.target.checked,
                            })
                        }
                    />
                    <label className="text-sm font-sans font-semibold text-gray-700">
                        Cu depozit
                    </label>
                </div>
                <div>
                    <label className="text-sm font-sans font-semibold text-gray-700">
                        Coupon
                    </label>
                    <Input
                        type="text"
                        value={bookingInfo.coupon_code}
                        onChange={(e) =>
                            setBookingInfo({ ...bookingInfo, coupon_code: e.target.value })
                        }
                    />
                </div>
                <div>
                    <label className="text-sm font-sans font-semibold text-gray-700">
                        Notițe
                    </label>
                    <Input
                        type="text"
                        value={bookingInfo.note || ""}
                        onChange={(e) =>
                            setBookingInfo({ ...bookingInfo, note: e.target.value })
                        }
                    />
                </div>
                <div>
                    <label className="text-sm font-sans font-semibold text-gray-700">
                        Status
                    </label>
                    <Input
                        type="text"
                        value={bookingInfo.status}
                        onChange={(e) =>
                            setBookingInfo({ ...bookingInfo, status: e.target.value })
                        }
                    />
                </div>
            </div>
            <div className="w-1/3 h-fit sticky top-0 space-y-2 p-4 border border-gray-300 rounded-lg bg-gray-50">
                <div className="font-sans text-sm">
                    Preț per zi: {bookingInfo.price_per_day}€ x {bookingInfo.days} zile
                </div>
                {bookingInfo.coupon_amount > 0 && (
                    <div className="font-sans text-sm">
                        Discount: {bookingInfo.coupon_amount}€
                    </div>
                )}
                {bookingInfo.total_services > 0 && (
                    <div className="font-sans text-sm">
                        Total Servicii: {bookingInfo.total_services}€
                    </div>
                )}
                <div className="font-sans text-sm">
                    Subtotal: {bookingInfo.sub_total}€
                </div>
                <div className="font-sans text-sm font-semibold">
                    Total: {bookingInfo.total}€
                </div>
            </div>
        </div>
    );
};

export default AdminBookingForm;
