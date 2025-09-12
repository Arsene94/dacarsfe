"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import apiClient from "@/lib/api";

interface ReservationPopupProps {
  open: boolean;
  onClose: () => void;
  reservation?: any;
}

const ReservationPopup: React.FC<ReservationPopupProps> = ({ open, onClose, reservation }) => {
  const [form, setForm] = useState<any>({
    cnp: "",
    license: "",
    bookingNumber: "",
    name: "",
    start: "",
    end: "",
    car: null,
    deposit: "",
    pricePerDay: "",
    advance: "",
    services: "",
    balance: "",
    withDeposit: true,
  });

  const [carSearch, setCarSearch] = useState("");
  const [carResults, setCarResults] = useState<any[]>([]);
  const [carSearchActive, setCarSearchActive] = useState(false);

  useEffect(() => {
    if (reservation) {
      setForm({ cnp: "", license: "" });
    } else {
      setForm({
        cnp: "",
        license: "",
        bookingNumber: "",
        name: "",
        start: "",
        end: "",
        car: null,
        deposit: "",
        pricePerDay: "",
        advance: "",
        services: "",
        balance: "",
        withDeposit: true,
      });
    }
  }, [reservation, open]);

  const fetchCars = useCallback(
    async (query: string) => {
      try {
        const resp = await apiClient.getCars({
          search: query,
          start_date: form.start,
          end_date: form.end,
          limit: 100,
        });
        const list = Array.isArray(resp?.data)
          ? resp.data
          : Array.isArray(resp)
          ? resp
          : [];
        setCarResults(list);
      } catch (error) {
        console.error("Error searching cars:", error);
      }
    },
    [form.start, form.end]
  );

  useEffect(() => {
    if (!carSearchActive) return;
    const handler = setTimeout(() => fetchCars(carSearch), 300);
    return () => clearTimeout(handler);
  }, [carSearch, carSearchActive, fetchCars]);

  const handleSelectCar = (car: any) => {
    setForm((prev: any) => ({ ...prev, car }));
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <Popup open={open} onClose={onClose} className="max-w-2xl">
      {reservation ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="cnp">CNP</Label>
            <Input id="cnp" value={form.cnp} onChange={handleChange("cnp")} />
          </div>
          <div>
            <Label htmlFor="license">Număr permis</Label>
            <Input id="license" value={form.license} onChange={handleChange("license")} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={onClose}>Închide</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
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
          <div className="col-span-2">
            <Label htmlFor="car-select">Mașină</Label>
            <SearchSelect
              id="car-select"
              value={form.car}
              search={carSearch}
              items={carResults}
              onSearch={setCarSearch}
              onSelect={handleSelectCar}
              onOpen={() => setCarSearchActive(true)}
              placeholder="Selectează mașina"
              renderItem={(car) => <div>{car.name}</div>}
              renderValue={(car) => <span>{car.name}</span>}
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
          <div>
            <Label htmlFor="balance">Rest de plată</Label>
            <Input id="balance" value={form.balance} onChange={handleChange("balance")} />
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
                  checked={form.withDeposit}
                  onChange={() => setForm((prev: any) => ({ ...prev, withDeposit: true }))}
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
                  onChange={() => setForm((prev: any) => ({ ...prev, withDeposit: false }))}
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
          <div className="col-span-2 flex justify-end gap-2">
            <Button onClick={onClose}>Închide</Button>
          </div>
        </div>
      )}
    </Popup>
  );
};

export default ReservationPopup;

