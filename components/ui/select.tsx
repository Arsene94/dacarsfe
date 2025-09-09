"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SelectProps } from "@/types/ui";

const chevronDownSvg = encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#6B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>",
);

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
                    "w-full appearance-none pl-4 pr-10 py-3 text-[#191919] border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent font-dm-sans disabled:cursor-not-allowed disabled:opacity-50",
                    className,
                )}
                style={{
                    backgroundImage: `url("data:image/svg+xml,${chevronDownSvg}")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1rem",
                }}
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
