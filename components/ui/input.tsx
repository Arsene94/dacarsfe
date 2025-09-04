import * as React from 'react';
import { cn } from '@/lib/utils';
import { InputProps } from '@/types/ui';

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full px-4 py-3 text-[#191919] border border-gray-300 rounded-lg focus:ring-2 focus:ring-jade focus:border-transparent font-dm-sans',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
