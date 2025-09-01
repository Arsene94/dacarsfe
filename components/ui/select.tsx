import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full px-4 py-3 text-[#191919] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38B275] focus:border-transparent font-dm-sans bg-white',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);

Select.displayName = 'Select';

export { Select };
