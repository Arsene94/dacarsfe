"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface SearchSelectProps<T> {
  /** Selected item shown when the dropdown is closed. */
  value: T | null;
  /** Current search value inside the dropdown. */
  search: string;
  /** Items rendered as options inside the dropdown. */
  items: T[];
  /** Called whenever the search value changes. */
  onSearch: (value: string) => void;
  /** Called when an item is selected from the list. */
  onSelect: (item: T) => void;
  /** Placeholder text for the closed select. */
  placeholder?: string;
  /** Renders a given item inside the options list. */
  renderItem: (item: T) => React.ReactNode;
  /** Optional renderer for the currently selected value. */
  renderValue?: (item: T) => React.ReactNode;
}

/**
 * A small utility component that combines a search input with a selectable
 * dropdown list. It behaves similarly to a traditional select but allows the
 * user to search within the available options.
 */
export function SearchSelect<T>({
  value,
  search,
  items,
  onSearch,
  onSelect,
  placeholder,
  renderItem,
  renderValue,
}: SearchSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const display = value
    ? renderValue
      ? renderValue(value)
      : renderItem(value)
    : <span className="text-gray-400">{placeholder}</span>;

  return (
    <div className="relative" ref={ref}>
      <div
        className="relative w-full pl-4 pr-10 py-3 text-[#191919] border border-gray-300 rounded-lg bg-white flex items-center gap-3 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {display}
        </div>
        <svg
          className="pointer-events-none absolute right-3 h-4 w-4 text-gray-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full border border-gray-300 rounded-lg bg-white shadow-lg">
          <div className="p-2 border-b">
            <Input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Caută..."
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-2 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
              >
                {renderItem(item)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

