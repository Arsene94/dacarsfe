"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countries, sortedCountries } from '@/lib/phone-countries';
import { Country, PhoneInputProps } from '@/types/phone';

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  required = false,
  className = '',
  placeholder = 'Numărul de telefon',
}) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isValid, setIsValid] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredCountries = useMemo(
    () =>
      countries.filter((country) =>
        country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.prefix.includes(searchTerm) ||
        country.code.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [searchTerm],
  );

  const detectCountryFromNumber = (number: string) => {
    const cleanNumber = number.replace(/\D/g, '');
    return (
      sortedCountries.find((c) =>
        cleanNumber.startsWith(c.prefix.replace('+', '')),
      ) || null
    );
  };

  const validatePhoneNumber = (number: string, country: Country) => {
    if (!number.trim()) return true;
    const cleanNumber = number.replace(/\D/g, '');
    if (country.pattern) {
      return country.pattern.test(number) || country.pattern.test(cleanNumber);
    }
    const prefix = country.prefix.replace('+', '');
    const withoutPrefix = cleanNumber.startsWith(prefix)
      ? cleanNumber.slice(prefix.length)
      : cleanNumber;
    return withoutPrefix.length >= 7 && withoutPrefix.length <= 15;
  };

  const handlePhoneChange = (inputValue: string) => {
    setPhoneNumber(inputValue);
    const detectedCountry = inputValue.startsWith('+')
      ? detectCountryFromNumber(inputValue)
      : null;
    const currentCountry = detectedCountry || selectedCountry;
    if (detectedCountry && detectedCountry.code !== selectedCountry.code) {
      setSelectedCountry(detectedCountry);
    }
    const valid = validatePhoneNumber(inputValue, currentCountry);
    setIsValid(valid);
    const fullNumber = inputValue.startsWith('+')
      ? inputValue
      : `${currentCountry.prefix}${inputValue.replace(/[^\d]/g, '')}`;
    onChange(fullNumber, currentCountry.code);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchTerm('');
    const cleanNumber = phoneNumber.replace(/^\+?\d*/, '').replace(/\D/g, '');
    const newFullNumber = cleanNumber ? `${country.prefix}${cleanNumber}` : '';
    setPhoneNumber(newFullNumber);
    onChange(newFullNumber, country.code);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    if (value && value !== phoneNumber) {
      setPhoneNumber(value);
      const detectedCountry = detectCountryFromNumber(value);
      if (detectedCountry) {
        setSelectedCountry(detectedCountry);
      }
    }
  }, [phoneNumber, value]);

  return (
    <div className={cn('relative', className)}>
      <label className="block text-sm font-dm-sans font-semibold text-gray-700 mb-2">
        <Phone className="h-4 w-4 inline text-jade mr-1" />
        Telefon *
      </label>
      <div className="flex">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-3 border border-gray-300 border-r-0 rounded-l-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300 focus:ring-2 focus:ring-jade focus:border-transparent"
          >
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-sm font-dm-sans font-medium text-gray-700">
              {selectedCountry.prefix}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-500 transition-transform duration-300',
                isDropdownOpen ? 'rotate-180' : '',
              )}
            />
          </button>
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl z-50 max-h-64 overflow-hidden">
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Caută țară..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-jade focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={cn(
                        'w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-jade/10 transition-colors duration-300',
                        selectedCountry.code === country.code ? 'bg-jade/20' : '',
                      )}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-dm-sans font-medium text-gray-900 truncate">
                          {country.name}
                        </div>
                        <div className="text-xs text-gray-500">{country.prefix}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-gray-500 text-sm font-dm-sans">
                    Nu s-au găsit țări
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => handlePhoneChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className={cn(
            'flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-jade focus:border-transparent transition-all duration-300',
            !isValid && 'border-red-500 focus:ring-red-500',
          )}
        />
      </div>
      {!isValid && phoneNumber && (
        <div className="mt-2 text-sm text-red-600 font-dm-sans">
          Formatul numărului de telefon nu este valid pentru {selectedCountry.name}
        </div>
      )}
      <div className="mt-2 text-xs text-gray-500 font-dm-sans">
        Exemplu: {selectedCountry.prefix} 722 123 456
      </div>
    </div>
  );
};

export default PhoneInput;
