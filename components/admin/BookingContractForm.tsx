"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import apiClient from "@/lib/api";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface BookingContractFormProps {
  open: boolean;
  onClose: () => void;
  reservation?: any;
}

const EMPTY_FORM = {
  cnp: "",
  license: "",
  bookingNumber: "",
  name: "",
  phone: "",
  email: "",
  start: "",
  end: "",
  car: null as any,
  deposit: "",
  pricePerDay: "",
  advance: "",
  services: "",
  balance: "",
  withDeposit: true,
};

const STORAGE_BASE =
  process.env.NEXT_PUBLIC_STORAGE_URL ?? "https://backend.dacars.ro/storage";

const BookingContractForm: React.FC<BookingContractFormProps> = ({ open, onClose, reservation }) => {
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [carSearch, setCarSearch] = useState("");
  const [carResults, setCarResults] = useState<any[]>([]);
  const [carSearchActive, setCarSearchActive] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [customerSearchActive, setCustomerSearchActive] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    setForm(
      reservation
        ? { ...EMPTY_FORM, bookingNumber: reservation.id }
        : EMPTY_FORM
    );
    setCarSearch("");
    setCarResults([]);
    setCarSearchActive(false);
    setCustomerSearch("");
    setCustomerResults([]);
    setCustomerSearchActive(false);
    setPdfUrl(null);
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
          : Array.isArray(resp?.items)
          ? resp.items
          : [];
        const normalized = list.map((c: any) => ({
          ...c,
          license_plate: c.license_plate || c.licensePlate || c.plate || "",
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
    [form.start, form.end]
  );

  const fetchCustomers = useCallback(async (query: string) => {
    try {
      const resp = await apiClient.searchCustomersByPhone(query);
      const list = Array.isArray(resp)
        ? resp.flatMap((row: any) =>
            (row.phones || []).map((phone: string) => ({
              id: row.id,
              name: row.latest?.name || row.names?.[0] || "",
              email: row.email,
              phone,
            }))
          )
        : [];
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

  const handleSelectCar = (car: any) => {
    setForm((prev: any) => ({ ...prev, car }));
  };

  const handleSelectCustomer = (customer: any) => {
    setForm((prev: any) => ({
      ...prev,
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
    }));
    setCustomerSearch("");
    setCustomerResults([]);
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleCustomerSearchOpen = useCallback(() => {
    setCustomerSearchActive(true);
  }, []);

  const generateContract = async () => {
    try {
      // build payload explicitly to avoid carrying over read-only properties
      const payload = {
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
        balance: form.balance,
        withDeposit: form.withDeposit,
      };
      const res = await apiClient.generateContract(payload);
      const url = URL.createObjectURL(res);
      setPdfUrl(url);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDownload = () => {
      if (pdfUrl) {
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = 'contract.pdf';
          link.click();
      }
  };

  const handlePrint = () => {
      if (pdfUrl) {
          const printWindow = window.open(pdfUrl);
          printWindow?.print();
      }
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
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
              <Button variant="outline" onClick={generateContract}>Generează contract</Button>
              <Button variant="danger" onClick={onClose}>Închide</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
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
            <SearchSelect
              id="phone"
              value={
                form.phone
                  ? { name: form.name, phone: form.phone, email: form.email }
                  : null
              }
              search={customerSearch}
              items={customerResults}
              onSearch={(v) => {
                setCustomerSearch(v);
                if (!customerSearch && v === "") return;
                setForm((prev: any) => ({ ...prev, phone: v }));
              }}
              onSelect={handleSelectCustomer}
              onOpen={handleCustomerSearchOpen}
              placeholder="Selectează clientul"
              renderItem={(user: any) => (
                <div>
                  <div className="font-dm-sans font-semibold">{user.name}</div>
                  <div className="text-xs">{user.phone} • {user.email}</div>
                </div>
              )}
              renderValue={(user: any) => <span>{user.phone}</span>}
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
              renderItem={(car: any) => (
                <>
                  <Image
                    src={
                      car.image_preview || car.image
                        ? STORAGE_BASE + "/" + (car.image_preview || car.image)
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
                      <div className="text-xs">
                        Preț cu garanție: {car.rental_rate}€ x {car.days} zile =
                        {" "}
                        {car.total_deposit}€
                      </div>
                      <div className="text-xs">
                        Preț fără garanție: {car.rental_rate_casco}€ x {car.days} zile =
                        {" "}
                        {car.total_without_deposit}€
                      </div>
                    </div>
                  </div>
                </>
              )}
              itemClassName={(car: any) =>
                car.available
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }
              renderValue={(car: any) => (
                <div className="flex items-center gap-3">
                  <Image
                    src={
                      car.image_preview || car.image
                        ? STORAGE_BASE + "/" + (car.image_preview || car.image)
                        : "/images/placeholder-car.svg"
                    }
                    alt={car.name}
                    width={64}
                    height={40}
                    className="w-16 h-10 object-cover rounded"
                  />
                  <div className="text-left">
                    <div className="font-dm-sans font-semibold text-gray-700">
                      {car.name}
                    </div>
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
              <Button variant="outline" onClick={generateContract}>Generează contract</Button>
              <Button variant="blue" onClick={onClose}>Salvează rezervare & Generează contract</Button>
              <Button variant="danger" onClick={onClose}>Închide</Button>
          </div>
        </div>
      )}
      {pdfUrl && (
        <div className="mt-4">
          <div className="flex gap-2 mb-2">
            <Button variant="outline" onClick={handleDownload}>Descarcă</Button>
            <Button variant="outline" onClick={handlePrint}>Printează</Button>
          </div>
          <Document file={pdfUrl}>
            <Page pageNumber={1} />
          </Document>
        </div>
      )}
    </Popup>
  );
};

export default BookingContractForm;

