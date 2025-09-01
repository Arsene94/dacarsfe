import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses =
      variant === 'outline'
        ? 'border-2'
        : 'bg-jade text-white hover:bg-jade/90';

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center px-8 py-4 font-dm-sans font-semibold rounded-lg transition-all duration-300',
          variantClasses,
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
