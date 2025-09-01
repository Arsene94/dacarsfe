import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full px-4 py-3 text-[#191919] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38B275] focus:border-transparent font-[\'DM_Sans\']',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
