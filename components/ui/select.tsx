import * as React from 'react';
import { cn } from '@/lib/utils';

type SelectOption = {
  value: string;
  label: string;
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, options, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full px-4 py-3 text-[#191919] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38B275] focus:border-transparent font-dm-sans bg-white',
        className
      )}
      {...props}
    >
      {options
        ? options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        : children}
    </select>
  )
);

Select.displayName = 'Select';

export { Select };
