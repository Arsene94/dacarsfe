"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SelectProps } from "@/types/ui";

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
            <select
                ref={ref}
                className={cn(
                    "w-full py-3 text-[#191919] border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent font-dm-sans disabled:cursor-not-allowed disabled:opacity-50 pl-4",
                    className,
                    "pr-8",
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
        );
    },
);

Select.displayName = "Select";

export { Select };
