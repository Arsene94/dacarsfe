"use client";

import {
  type AriaAttributes,
  type ButtonHTMLAttributes,
  type ChangeEvent as ReactChangeEvent,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const normalizeForSearch = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export interface TemplateHelperSelectItem {
  value: string;
  label: string;
  description?: string;
  buttonLabel?: string;
  disabled?: boolean;
  title?: string;
}

export interface TemplateHelperSelectProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "children"> {
  items: TemplateHelperSelectItem[];
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  noResultsMessage?: string;
}

const getFirstEnabledIndex = (items: TemplateHelperSelectItem[]) => {
  for (let index = 0; index < items.length; index += 1) {
    if (!items[index]?.disabled) {
      return index;
    }
  }
  return -1;
};

export function TemplateHelperSelect({
  items,
  value,
  placeholder = "Selectează o opțiune",
  onChange,
  icon,
  disabled = false,
  className,
  buttonClassName,
  emptyMessage = "Nu există opțiuni disponibile",
  searchable = false,
  searchPlaceholder = "Caută opțiuni",
  noResultsMessage = "Nu există rezultate pentru căutarea curentă",
  id,
  onBlur,
  onFocus,
  onClick,
  ...buttonProps
}: TemplateHelperSelectProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [searchQuery, setSearchQuery] = useState("");

  const isDisabled = disabled || items.length === 0;
  const selectedItem = useMemo(
    () => items.find((item) => item.value === value),
    [items, value],
  );
  const normalizedSearch = useMemo(
    () => normalizeForSearch(searchQuery.trim()),
    [searchQuery],
  );
  const visibleItems = useMemo(() => {
    if (!searchable || normalizedSearch.length === 0) {
      return items;
    }

    return items.filter((item) => {
      if (!normalizedSearch) {
        return true;
      }
      const haystacks = [
        item.label,
        item.description,
        item.value,
        item.buttonLabel,
        item.title,
      ]
        .filter((entry): entry is string => Boolean(entry))
        .map((entry) => normalizeForSearch(entry));
      return haystacks.some((entry) => entry.includes(normalizedSearch));
    });
  }, [items, normalizedSearch, searchable]);

  const resetSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const renderedIcon = useMemo(() => {
    if (!icon) {
      return null;
    }
    if (!isValidElement(icon)) {
      return icon;
    }
    const iconElement = icon as ReactElement<
      { className?: string } & AriaAttributes
    >;
    return cloneElement(iconElement, {
      className: cn("h-4 w-4 text-gray-400", iconElement.props.className),
      "aria-hidden": true,
    });
  }, [icon]);

  const closeList = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    resetSearch();
  }, [resetSearch]);

  const openList = useCallback(() => {
    if (isDisabled) {
      return;
    }
    setIsOpen(true);
  }, [isDisabled]);

  const toggleList = useCallback(() => {
    if (isOpen) {
      closeList();
    } else {
      openList();
    }
  }, [closeList, openList, isOpen]);

  const moveActiveIndex = useCallback(
    (direction: 1 | -1) => {
      if (!isOpen) {
        openList();
        return;
      }
      if (visibleItems.length === 0) {
        return;
      }

      let nextIndex = activeIndex;
      for (let step = 0; step < visibleItems.length; step += 1) {
        nextIndex =
          (nextIndex + direction + visibleItems.length) % visibleItems.length;
        if (!visibleItems[nextIndex]?.disabled) {
          setActiveIndex(nextIndex);
          break;
        }
      }
    },
    [activeIndex, isOpen, openList, visibleItems],
  );

  const selectIndex = useCallback(
    (index: number) => {
      const item = visibleItems[index];
      if (!item || item.disabled) {
        return;
      }
      onChange(item.value);
      closeList();
    },
    [closeList, onChange, visibleItems],
  );

  const handleButtonKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveActiveIndex(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveActiveIndex(-1);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!isOpen) {
          openList();
        } else if (activeIndex >= 0) {
          selectIndex(activeIndex);
        }
        return;
      }
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        closeList();
        return;
      }
      if (event.key === "Tab") {
        closeList();
      }
    },
    [activeIndex, closeList, isDisabled, isOpen, moveActiveIndex, openList, selectIndex],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (visibleItems.length === 0) {
      setActiveIndex(-1);
      return;
    }
    const selectedIndex =
      selectedItem && !selectedItem.disabled
        ? visibleItems.findIndex((item) => item.value === selectedItem.value)
        : -1;
    if (selectedIndex >= 0) {
      setActiveIndex(selectedIndex);
      return;
    }
    setActiveIndex(getFirstEnabledIndex(visibleItems));
  }, [isOpen, selectedItem, visibleItems]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) {
      return;
    }
    const option = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen, visibleItems]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (
        target &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        closeList();
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        closeList();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("focusin", handleFocusOut);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("focusin", handleFocusOut);
    };
  }, [closeList, isOpen]);

  const handleButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        return;
      }
      toggleList();
      onClick?.(event);
    },
    [isDisabled, onClick, toggleList],
  );

  const handleFocus = useCallback(
    (event: ReactFocusEvent<HTMLButtonElement>) => {
      onFocus?.(event);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (event: ReactFocusEvent<HTMLButtonElement>) => {
      onBlur?.(event);
    },
    [onBlur],
  );

  const resolvedDisplay = selectedItem?.buttonLabel ?? selectedItem?.label ?? "";
  const displayText = resolvedDisplay.length > 0 ? resolvedDisplay : placeholder;

  const activeDescendant =
    isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  const handleSearchChange = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    [],
  );

  const handleSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveActiveIndex(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveActiveIndex(-1);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (activeIndex >= 0) {
          selectIndex(activeIndex);
        } else if (visibleItems.length === 1) {
          selectIndex(0);
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeList();
      }
    },
    [activeIndex, closeList, moveActiveIndex, selectIndex, visibleItems.length],
  );

  useEffect(() => {
    if (!isOpen || !searchable) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const input = searchInputRef.current;
      if (input) {
        input.focus({ preventScroll: true });
        if (input.value) {
          input.select();
        }
      }
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isOpen, searchable]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        {...buttonProps}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${listboxId}-menu`}
        aria-activedescendant={activeDescendant}
        className={cn(
          "select-trigger flex w-full items-center rounded-lg border border-gray-300 bg-white py-3 pr-10 text-sm font-dm-sans text-[#191919] shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade focus:shadow-md disabled:cursor-not-allowed disabled:opacity-50",
          renderedIcon ? "pl-11" : "pl-4",
          buttonClassName,
        )}
        disabled={isDisabled}
        onClick={handleButtonClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleButtonKeyDown}
      >
        {renderedIcon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
            {renderedIcon}
          </span>
        ) : null}
        <span
          className={cn(
            "flex-1 truncate text-left",
            resolvedDisplay ? "text-[#191919]" : "text-gray-500",
          )}
        >
          {displayText}
        </span>
        <ChevronDown aria-hidden="true" className="absolute right-4 h-4 w-4 text-gray-400" />
      </button>

      {isOpen ? (
        <div
          id={`${listboxId}-menu`}
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl"
        >
          {searchable ? (
            <div className="border-b border-gray-100 px-3 py-2">
              <input
                ref={searchInputRef}
                type="search"
                role="searchbox"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#191919] placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade"
              />
            </div>
          ) : null}
          <div ref={listRef} className="max-h-60 overflow-y-auto py-2">
            {items.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">{emptyMessage}</p>
            ) : visibleItems.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">{noResultsMessage}</p>
            ) : (
              visibleItems.map((item, index) => {
                const isItemSelected = item.value === value;
                const isItemActive = index === activeIndex;
                return (
                  <div
                    key={item.value}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={isItemSelected}
                    data-index={index}
                    className={cn(
                      "mx-2 flex cursor-pointer flex-col rounded-lg px-3 py-2 text-sm transition focus:outline-none",
                      isItemActive ? "bg-emerald-50" : "",
                      item.disabled ? "cursor-not-allowed opacity-60" : "hover:bg-emerald-50",
                    )}
                    title={item.title ?? item.description ?? item.label}
                    onMouseEnter={() => {
                      if (!item.disabled) {
                        setActiveIndex(index);
                      }
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      if (!item.disabled) {
                        selectIndex(index);
                      }
                    }}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-1">
                      <span
                        className={cn(
                          "font-semibold text-[#c23a2b]",
                          isItemActive ? "text-berkeley" : null,
                        )}
                      >
                        {item.label}
                      </span>
                      {item.description ? (
                        <>
                          <span className="text-gray-400">:</span>
                          <span className="text-gray-600">{item.description}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
