import * as React from 'react';
import { cn } from '@/lib/utils';
import { InputProps } from '@/types/ui';

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'block w-full max-w-full min-w-0 px-4 py-3 text-[#191919] placeholder:text-gray-500 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-jade focus:border-transparent focus:shadow-md transition font-dm-sans',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
