"use client";

import {
  type ButtonHTMLAttributes,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
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
  id,
  onBlur,
  onFocus,
  onClick,
  ...buttonProps
}: TemplateHelperSelectProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const isDisabled = disabled || items.length === 0;
  const selectedItem = useMemo(
    () => items.find((item) => item.value === value),
    [items, value],
  );

  const renderedIcon = useMemo(() => {
    if (!icon) {
      return null;
    }
    if (!isValidElement(icon)) {
      return icon;
    }
    return cloneElement(icon, {
      className: cn("h-4 w-4 text-gray-400", icon.props.className),
      "aria-hidden": true,
    });
  }, [icon]);

  const closeList = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

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
      if (items.length === 0) {
        return;
      }

      let nextIndex = activeIndex;
      for (let step = 0; step < items.length; step += 1) {
        nextIndex = (nextIndex + direction + items.length) % items.length;
        if (!items[nextIndex]?.disabled) {
          setActiveIndex(nextIndex);
          break;
        }
      }
    },
    [activeIndex, isOpen, items, openList],
  );

  const selectIndex = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item || item.disabled) {
        return;
      }
      onChange(item.value);
      closeList();
    },
    [closeList, items, onChange],
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
    const selectedIndex = selectedItem?.disabled
      ? -1
      : items.findIndex((item) => item.value === selectedItem?.value);
    if (selectedIndex >= 0) {
      setActiveIndex(selectedIndex);
      return;
    }
    setActiveIndex(getFirstEnabledIndex(items));
  }, [isOpen, items, selectedItem]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) {
      return;
    }
    const option = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        closeList();
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        closeList();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("focusin", handleFocusOut);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
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
          <div ref={listRef} className="max-h-60 overflow-y-auto py-2">
            {items.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">{emptyMessage}</p>
            ) : (
              items.map((item, index) => {
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
