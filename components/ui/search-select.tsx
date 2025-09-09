"use client";

import React from "react";
import { Input } from "@/components/ui/input";

interface SearchSelectProps<T> {
  /**
   * Current search value displayed in the input field.
   */
  search: string;
  /**
   * Items that should be rendered in the dropdown list.
   */
  items: T[];
  /**
   * Called whenever the search value changes.
   */
  onSearch: (value: string) => void;
  /**
   * Called when an item is selected from the list.
   */
  onSelect: (item: T) => void;
  /**
   * Placeholder text for the search input.
   */
  placeholder?: string;
  /**
   * Function responsible for rendering an item inside the list.
   */
  renderItem: (item: T) => React.ReactNode;
}

/**
 * A small utility component that combines a search input with a selectable
 * dropdown list. It behaves similarly to a traditional select but allows the
 * user to search within the available options.
 */
export function SearchSelect<T>({
  search,
  items,
  onSearch,
  onSelect,
  placeholder,
  renderItem,
}: SearchSelectProps<T>) {
  return (
    <div className="relative">
      <Input
        type="text"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={placeholder}
      />
      {items.length > 0 && (
        <div className="absolute z-10 mt-2 w-full max-h-60 overflow-y-auto border border-gray-300 rounded-lg bg-white">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-2 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
              onClick={() => onSelect(item)}
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

