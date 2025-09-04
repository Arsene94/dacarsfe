"use client";

import React, { useState, useEffect, useRef } from "react";
import { loadCountries, Country } from "@/lib/phone-codes";

interface PhoneInputProps {
  country: string;
  phone: string;
  onChange: (country: string, phone: string) => void;
  inputId?: string;
}

const getFlagEmoji = (countryCode: string) =>
  countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));

export const PhoneInput: React.FC<PhoneInputProps> = ({
  country,
  phone,
  onChange,
  inputId,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCountry =
    countries.find((c) => c.code === country) ||
    countries[0] || { code: "", name: "", dialCode: "" };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    loadCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (country || countries.length === 0) return;
    const detect = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data && data.country_code) {
          const found = countries.find((c) => c.code === data.country_code);
          if (found) onChange(found.code, phone);
        }
      } catch {
        // ignore
      }
    };
    detect();
  }, [country, countries, phone, onChange]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d+]/g, "");
    if (value.startsWith("+")) {
      const digits = value.slice(1);
      const match = countries
        .slice()
        .sort((a, b) => b.dialCode.length - a.dialCode.length)
        .find((c) => digits.startsWith(c.dialCode.replace("+", "")));
      if (match) {
        const rest = digits.slice(match.dialCode.replace("+", "").length);
        onChange(match.code, rest);
        return;
      }
    }
    onChange(country, value.replace(/\D/g, ""));
  };

  const filtered = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex" ref={containerRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center px-2 py-3 border border-gray-300 rounded-l-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-jade"
        >
          <span className="mr-1">{getFlagEmoji(selectedCountry.code)}</span>
          <span>{selectedCountry.dialCode}</span>
        </button>
        {open && (
          <div className="absolute z-10 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto w-56">
            <input
              type="text"
              className="w-full p-2 border-b outline-none"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ul role="listbox" className="max-h-52 overflow-y-auto">
              {filtered.map((c) => (
                <li
                  key={c.code}
                  role="option"
                  tabIndex={0}
                  onClick={() => {
                    onChange(c.code, phone);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onChange(c.code, phone);
                      setOpen(false);
                    }
                  }}
                  className="px-2 py-1 cursor-pointer hover:bg-gray-100"
                >
                  {getFlagEmoji(c.code)} {c.name} ({c.dialCode})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <input
        id={inputId}
        type="tel"
        className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300"
        value={phone}
        onChange={handlePhoneChange}
        placeholder="712345678"
        pattern="[0-9]{4,15}"
        aria-label="Phone number"
        required
      />
    </div>
  );
};

export default PhoneInput;
