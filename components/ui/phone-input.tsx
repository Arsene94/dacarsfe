"use client";

import React, { useEffect, useState } from "react";
import countries, { Country } from "@/lib/phone-countries";

export interface PhoneInputValue {
  countryCode: string;
  phone: string;
}

interface PhoneInputProps {
  id?: string;
  onChange?: (value: PhoneInputValue) => void;
}

const getFlag = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));

const phonePattern = /^\d{4,15}$/;

const PhoneInput: React.FC<PhoneInputProps> = ({ id, onChange }) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Country>(() => {
    if (typeof navigator !== "undefined") {
      const parts = navigator.language.split("-");
      const found = countries.find((c) => c.code === parts[1]);
      return found || countries[0];
    }
    return countries[0];
  });
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    onChange?.({ countryCode: selected.code, phone });
  }, [selected, phone, onChange]);

  const filtered = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search)
  );

  const handleSelect = (c: Country) => {
    setSelected(c);
    setOpen(false);
    setSearch("");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d+]/g, "");
    if (value.startsWith("+")) {
      const match = countries.find((c) => value.startsWith(c.dialCode));
      if (match) {
        handleSelect(match);
        setPhone(value.replace(match.dialCode, ""));
        return;
      }
    }
    setPhone(value);
  };

  const handleBlur = () => {
    if (phone && !phonePattern.test(phone)) {
      setError(`Număr invalid pentru ${selected.name}`);
    } else {
      setError("");
    }
  };

  return (
    <div className="w-full">
      <div className="flex">
        <div className="relative" data-testid="country-selector">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center px-3 py-3 border border-gray-300 rounded-l-lg bg-white focus:outline-none focus:ring-2 focus:ring-jade"
            aria-label="Selectează țara"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="mr-2">{getFlag(selected.code)}</span>
            <span className="text-sm">{selected.dialCode}</span>
          </button>
          {open && (
            <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border-b border-gray-200 focus:outline-none"
                placeholder="Caută țara"
                aria-label="Caută țara"
              />
              <ul className="max-h-60 overflow-y-auto" role="listbox">
                {filtered.map((c) => (
                  <li
                    key={c.code}
                    onClick={() => handleSelect(c)}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center"
                    role="option"
                  >
                    <span className="mr-2">{getFlag(c.code)}</span>
                    <span className="flex-1 text-sm">{c.name}</span>
                    <span className="text-sm text-gray-500">{c.dialCode}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <input
          id={id}
          type="tel"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-jade focus:border-transparent"
          placeholder="Număr de telefon"
          value={phone}
          onChange={handlePhoneChange}
          onBlur={handleBlur}
          aria-label="Număr de telefon"
        />
      </div>
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default PhoneInput;
