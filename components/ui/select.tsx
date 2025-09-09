"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SelectProps } from "@/types/ui";
import { ChevronDown } from "lucide-react";

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            className,
            children,
            placeholder,
            onValueChange,
            onChange,
            value,
            defaultValue,
            ...props
        },
        ref,
    ) => {
        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            onChange?.(e);
            onValueChange?.(e.target.value);
        };

        return (
            <div className="relative">
                <select
                    ref={ref}
                    className={cn(
                        "w-full appearance-none pl-4 pr-10 py-3 text-[#191919] border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent font-dm-sans disabled:cursor-not-allowed disabled:opacity-50",
                        className,
                    )}
                    onChange={handleChange}
                    value={value}
                    defaultValue={defaultValue}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled hidden>
                            {placeholder}
                        </option>
                    )}
                    {children}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            </div>
        );
    },
);

Select.displayName = "Select";

export { Select };
